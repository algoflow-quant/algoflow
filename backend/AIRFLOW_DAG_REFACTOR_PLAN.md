# Airflow DAG Refactor Plan - Atomic Methods + Parallel Execution

## 📊 Current State Analysis

### Your Atomic Methods (Client)
✅ **Perfect for Airflow:**
- `insert_security(ticker, groupings)` → Returns dict, raises on error
- `insert_ohlcv(ticker, df)` → Returns dict, raises on error
- `insert_metadata(ticker, metadata)` → Returns dict, raises on error
- `get_tickers(groupings)` → Returns list
- `get_security_id(ticker)` → Returns int or raises

### Your Atomic Methods (Pipeline)
✅ **Perfect for Airflow:**
- `scrape_date_range(ticker, start, end)` → Returns DataFrame or None
- `scrape_metadata(ticker)` → Returns dict
- `validate_ohlcv(df, ticker)` → Returns bool
- `validate_ticker(ticker)` → Returns bool

### Current DAG Issues
❌ **Batching prevents parallelization:**
```python
# Current: Sequential batches of 50 tickers
for i in range(0, len(tickers), batch_size):
    batch = tickers[i:i + batch_size]
    ohlcv_data = pipeline.scrape_date_range(tickers=batch, ...)
```

❌ **Methods expect lists, not single tickers:**
```python
pipeline.scrape_date_range(tickers=batch, ...)  # Takes list
client.insert_securities([ticker], groupings)   # Takes list
```

❌ **No validation in download flow**

---

## 🎯 Refactored DAG Structure

### Key Changes

1. **Task Mapping** → Parallel execution per ticker
2. **Single-ticker operations** → Match atomic methods
3. **Data validation** → Separate task with Great Expectations
4. **XCom optimization** → Serialize DataFrames as JSON
5. **Granular retries** → Per-ticker retry logic

---

## 🚀 New DAG Architecture

```
┌─────────────────────────────────────────┐
│  Setup (Run Once)                       │
│  ├─ get_tickers()                       │
│  └─ validate_tickers()                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Per-Ticker (Mapped - Parallel)         │
│                                          │
│  register_security(ticker_data)         │
│         ▼                                │
│  download_ohlcv(ticker)                 │
│         ▼                                │
│  validate_ohlcv_data(download_result)   │
│         ▼                                │
│  insert_ohlcv(validated_data)           │
│         ▼                                │
│  download_metadata(ticker)              │
│         ▼                                │
│  insert_metadata(metadata_result)       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Cleanup (Run Once)                     │
│  └─ generate_report(results)            │
└─────────────────────────────────────────┘
```

---

## 📝 Refactored Tasks

### 1. Setup Tasks (No Changes Needed)

```python
@task
def get_tickers(**context) -> Dict[str, List[str]]:
    """Returns: {'AAPL': ['sp500', 'tech'], 'MSFT': [...]}"""
    # Keep current implementation
    pass

@task
def validate_tickers(ticker_groupings: dict) -> Dict[str, List[str]]:
    """Returns: {'AAPL': ['sp500'], ...} (only valid tickers)"""
    # Keep current implementation
    pass
```

### 2. Per-Ticker Tasks (NEW - Mapped)

#### Register Security (Mapped)
```python
@task(retries=2, retry_delay=timedelta(minutes=1))
def register_security(ticker_data: tuple) -> Dict[str, Any]:
    """
    Register single ticker in database.

    Args:
        ticker_data: (ticker, [groupings])

    Returns:
        {'ticker': 'AAPL', 'groupings': ['sp500'], 'registered': True}
    """
    ticker, groupings = ticker_data
    client = YfinanceClient(get_database_url())

    result = client.insert_security(ticker, groupings)

    if not result['success'] and result['rows_affected'] == 0:
        logger.info(f"{ticker} already exists")

    return {
        'ticker': ticker,
        'groupings': groupings,
        'registered': True
    }
```

#### Download OHLCV (Mapped)
```python
@task(retries=3, retry_delay=timedelta(minutes=2))
def download_ohlcv(ticker_data: Dict, **context) -> Dict[str, Any]:
    """
    Download historical OHLCV for single ticker.

    Args:
        ticker_data: {'ticker': 'AAPL', ...}

    Returns:
        {
            'ticker': 'AAPL',
            'rows': 2500,
            'data': '<serialized_df>'  # JSON string
        }
    """
    ticker = ticker_data['ticker']
    years_back = context['params']['years_back']

    pipeline = YfinancePipeline()

    end_date = date.today()
    start_date = end_date - timedelta(days=365 * years_back)

    df = pipeline.scrape_date_range(ticker, start_date, end_date)

    if df is None or df.empty:
        raise ValueError(f"No OHLCV data for {ticker}")

    return {
        'ticker': ticker,
        'rows': len(df),
        'data': df.to_json(date_format='iso', orient='split')
    }
```

#### Validate OHLCV (Mapped - NEW!)
```python
@task(retries=1)
def validate_ohlcv_data(download_result: Dict) -> Dict[str, Any]:
    """
    Validate OHLCV data quality with Great Expectations.

    Args:
        download_result: {'ticker': 'AAPL', 'data': '<json>'}

    Returns:
        Same dict if valid

    Raises:
        ValueError: If validation fails
    """
    ticker = download_result['ticker']
    df = pd.read_json(download_result['data'], orient='split')

    pipeline = YfinancePipeline()
    is_valid = pipeline.validate_ohlcv(df, ticker)

    if not is_valid:
        raise ValueError(f"OHLCV validation failed for {ticker}")

    logger.info(f"✓ {ticker} passed validation ({len(df)} rows)")
    return download_result
```

#### Insert OHLCV (Mapped)
```python
@task(retries=3, retry_delay=timedelta(minutes=1))
def insert_ohlcv_data(validated_data: Dict) -> Dict[str, Any]:
    """
    Insert validated OHLCV data to database.

    Args:
        validated_data: {'ticker': 'AAPL', 'data': '<json>'}

    Returns:
        {'ticker': 'AAPL', 'rows_inserted': 2500, 'success': True}
    """
    ticker = validated_data['ticker']
    df = pd.read_json(validated_data['data'], orient='split')

    client = YfinanceClient(get_database_url())
    result = client.insert_ohlcv(ticker, df)

    if not result['success']:
        raise ValueError(f"Insert failed: {result['message']}")

    return {
        'ticker': ticker,
        'rows_inserted': result['rows_affected'],
        'success': True
    }
```

#### Download Metadata (Mapped)
```python
@task(retries=3, retry_delay=timedelta(minutes=2))
def download_metadata(ohlcv_result: Dict) -> Dict[str, Any]:
    """
    Download metadata for single ticker.

    Args:
        ohlcv_result: {'ticker': 'AAPL', ...}

    Returns:
        {'ticker': 'AAPL', 'metadata': {...}}
    """
    ticker = ohlcv_result['ticker']

    pipeline = YfinancePipeline()
    metadata = pipeline.scrape_metadata(ticker)

    return {
        'ticker': ticker,
        'metadata': metadata
    }
```

#### Insert Metadata (Mapped)
```python
@task(retries=3, retry_delay=timedelta(minutes=1))
def insert_metadata_data(metadata_result: Dict) -> Dict[str, Any]:
    """
    Insert metadata to database.

    Args:
        metadata_result: {'ticker': 'AAPL', 'metadata': {...}}

    Returns:
        {'ticker': 'AAPL', 'success': True}
    """
    ticker = metadata_result['ticker']
    metadata = metadata_result['metadata']

    client = YfinanceClient(get_database_url())
    result = client.insert_metadata(ticker, metadata)

    if not result['success']:
        raise ValueError(f"Metadata insert failed: {result['message']}")

    return {
        'ticker': ticker,
        'success': True
    }
```

### 3. Cleanup Task (Modified)

```python
@task
def generate_report(ohlcv_results: List[Dict], metadata_results: List[Dict]):
    """
    Generate summary from all results.

    Args:
        ohlcv_results: List of per-ticker results
        metadata_results: List of per-ticker results
    """
    ohlcv_success = sum(1 for r in ohlcv_results if r.get('success'))
    metadata_success = sum(1 for r in metadata_results if r.get('success'))

    report = f"""
    Pipeline Complete:

    OHLCV Data:
    - Processed: {len(ohlcv_results)} tickers
    - Success: {ohlcv_success}
    - Failed: {len(ohlcv_results) - ohlcv_success}

    Metadata:
    - Processed: {len(metadata_results)} tickers
    - Success: {metadata_success}
    - Failed: {len(metadata_results) - metadata_success}
    """

    logger.info(report)
    return report
```

---

## 🔄 Task Flow with Parallelization

```python
# Setup
tickers_dict = get_tickers()
valid_tickers_dict = validate_tickers(tickers_dict)

# Convert to list of tuples for mapping
ticker_list = [(t, g) for t, g in valid_tickers_dict.items()]

# Parallel per-ticker processing
registered = register_security.expand(ticker_data=ticker_list)
ohlcv_downloads = download_ohlcv.expand(ticker_data=registered)
validated_ohlcv = validate_ohlcv_data.expand(download_result=ohlcv_downloads)
ohlcv_inserts = insert_ohlcv_data.expand(validated_data=validated_ohlcv)
metadata_downloads = download_metadata.expand(ohlcv_result=ohlcv_inserts)
metadata_inserts = insert_metadata_data.expand(metadata_result=metadata_downloads)

# Cleanup
report = generate_report(ohlcv_inserts, metadata_inserts)
```

---

## ⚡ Parallelization Control

### DAG-Level Configuration
```python
@dag(
    # ... other params ...
    default_args={
        'owner': 'data-team',
        'retries': 2,
        'retry_delay': timedelta(minutes=5),
        'retry_exponential_backoff': True,
        'max_active_tis_per_dag': 20,  # Max 20 parallel tasks
    },
)
```

### Task-Level Configuration
```python
@task(
    retries=3,
    retry_delay=timedelta(minutes=2),
    execution_timeout=timedelta(minutes=10),
    pool='yfinance_api',  # Resource pool for rate limiting
)
def download_ohlcv(ticker_data: Dict):
    pass
```

---

## 🎛️ How Parallelization Works

### `.expand()` Magic

```python
# Sequential (OLD):
for ticker in ['AAPL', 'MSFT', 'GOOGL']:
    download_ohlcv(ticker)  # One at a time

# Parallel (NEW):
ticker_list = [{'ticker': 'AAPL'}, {'ticker': 'MSFT'}, {'ticker': 'GOOGL'}]
results = download_ohlcv.expand(ticker_data=ticker_list)
# Creates 3 task instances, runs up to 20 in parallel!
```

### Airflow UI View
```
download_ohlcv [AAPL]  ✓ Running
download_ohlcv [MSFT]  ✓ Running
download_ohlcv [GOOGL] ✓ Running
download_ohlcv [TSLA]  ⏳ Queued
download_ohlcv [NVDA]  ⏳ Queued
...
```

---

## 📊 Performance Comparison

### Current (Sequential Batches)
- 500 tickers, batch_size=50
- 10 batches run sequentially
- Each batch takes ~5 minutes
- **Total: 50 minutes**

### New (Parallel Mapping)
- 500 tickers, max_active_tis=20
- 20 tickers process simultaneously
- Each ticker takes ~5 minutes
- **Total: ~125 minutes / 20 = ~7 minutes** (85% faster!)

---

## 🔧 Required Pipeline Changes

### NONE! Your methods are already atomic:

✅ `scrape_date_range(ticker, start, end)` - Already takes single ticker
✅ `scrape_metadata(ticker)` - Already takes single ticker
✅ `validate_ohlcv(df, ticker)` - Already works per-ticker
✅ `validate_ticker(ticker)` - Already works per-ticker

### Required Client Changes

**OLD (Takes list):**
```python
client.insert_securities([ticker], groupings)
```

**NEW (Already exists!):**
```python
client.insert_security(ticker, groupings)  # Use this!
```

---

## 🚨 Important Notes

### 1. XCom Size Limits
- Airflow XCom default limit: 48KB
- 10 years OHLCV = ~2500 rows = ~500KB serialized
- **Solution:** Already using JSON serialization (efficient)

### 2. Rate Limiting
- yfinance has rate limits
- **Solution:** Use `pool='yfinance_api'` with max_active_runs
- Or add `time.sleep(0.1)` between API calls

### 3. Database Connections
- Don't reuse client instances across tasks
- **Solution:** Create new client in each task (already doing this)

### 4. Memory Management
- No batching = each task processes 1 ticker
- **Solution:** Airflow handles cleanup between tasks

---

## ✅ Migration Checklist

- [ ] Update `register_tickers` to use `.insert_security()` (singular)
- [ ] Split `download_historical_data` into per-ticker task
- [ ] Add `validate_ohlcv_data` task (NEW)
- [ ] Split `download_metadata` into per-ticker task
- [ ] Update task flow to use `.expand()`
- [ ] Add parallelization limits (`max_active_tis`)
- [ ] Test with `ticker_limit=5` first
- [ ] Monitor Airflow UI for parallel execution
- [ ] Gradually increase to full ticker list

---

## 🎯 Final DAG Structure

```python
# Setup (Sequential)
tickers_dict = get_tickers()
valid_tickers_dict = validate_tickers(tickers_dict)
ticker_list = convert_to_list(valid_tickers_dict)

# Per-Ticker (Parallel with .expand())
registered = register_security.expand(ticker_data=ticker_list)
ohlcv_dl = download_ohlcv.expand(ticker_data=registered)
ohlcv_val = validate_ohlcv_data.expand(download_result=ohlcv_dl)
ohlcv_ins = insert_ohlcv_data.expand(validated_data=ohlcv_val)
meta_dl = download_metadata.expand(ohlcv_result=ohlcv_ins)
meta_ins = insert_metadata_data.expand(metadata_result=meta_dl)

# Cleanup (Sequential)
report = generate_report(ohlcv_ins, meta_ins)
```

**Result:** Up to 20 tickers processing simultaneously! 🚀
