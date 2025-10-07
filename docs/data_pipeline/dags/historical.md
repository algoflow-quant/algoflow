# Historical Parallel DAG

Bulk historical data loading with parallel per-ticker execution.

## Trigger

Manual via Airflow UI

## Parameters

- **years_back**: 1-10 years (default: 10)
- **ticker_source**: sp500, russell3000, nasdaq, all
- **ticker_limit**: Limit tickers (0 = no limit)

## Task Flow

1. Get tickers from source
2. Validate tickers in parallel
3. Register securities in database
4. Download OHLCV data
5. Validate OHLCV quality
6. Insert to database
7. Download metadata
8. Insert metadata

## Configuration

- Max parallel tasks: 20
- Retry: 2-3 attempts with exponential backoff
- Trigger rule: `all_done` (continues on failures)
