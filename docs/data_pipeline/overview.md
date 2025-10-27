# Data Pipeline Overview

Airflow-based pipeline that pulls securities data from yfinance and stores it in PostgreSQL with TimescaleDB.

## Architecture

```mermaid
graph TB
    subgraph "Airflow DAGs"
        H[yfinance_historical_parallel.py]
        D[yfinance_daily_parallel.py]
    end
    
    subgraph "YfinancePipeline"
        S1[scrape_sp500_tickers]
        S2[scrape_russell3000_tickers]
        S3[scrape_nasdaq_tickers]
        V[validate_ticker]
        SD[scrape_date_range]
        VO[validate_ohlcv]
        M[scrape_metadata]
    end
    
    subgraph "YfinanceClient"
        IS[insert_security]
        IO[insert_ohlcv]
        IM[insert_metadata]
        GT[get_tickers]
    end
    
    subgraph "Database"
        SEC[(securities table)]
        OHLCV[(ohlcv_data hypertable)]
        META[(stock_metadata)]
    end
    
    H --> S1 & S2 & S3
    S1 & S2 & S3 --> V
    V --> IS
    IS --> SEC
    SEC --> SD
    SD --> VO
    VO --> IO
    IO --> OHLCV
    OHLCV --> M
    M --> IM
    IM --> META
    
    D --> GT
    GT --> SD
```

!!! info "Architecture Components"
    Three main layers: DAGs orchestrate workflows, Pipeline scrapes/validates data, Client handles database operations

The pipeline has five main components:

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **DAGs** | Workflow orchestration | Airflow `.expand()` for parallelization, max 20 concurrent tasks |
| **Client** | Database operations | Bulk inserts with `execute_values`, upsert patterns |
| **Pipeline** | Data scraping orchestration | yfinance integration, coordinates tickers & validation |
| **Tickers** | Ticker discovery & registration | Scrapes ticker lists from multiple sources |
| **Validation** | Data quality assurance | 18 Great Expectations checks on OHLCV data |

## Key Features

| Feature | Implementation | Benefit |
|---------|----------------|---------|
| Parallel Execution | Airflow `.expand()` with 20 concurrent tasks | Process multiple tickers simultaneously |
| Bulk Inserts | `psycopg2.extras.execute_values` with 1000-row batches | 10-100x faster than individual inserts |
| Data Validation | 18 Great Expectations checks | Catch bad data before database insertion |
| Error Handling | Raise exceptions instead of error dicts | Airflow handles retries automatically |

## DAG Workflows

=== "Historical DAG"
    Manual trigger for initial setup or backfills:

    1. Scrape ticker lists from Wikipedia, iShares, NASDAQ
    2. Validate each ticker with test download
    3. Register valid tickers in `securities` table
    4. Download OHLCV data for date range
    5. Validate OHLCV with Great Expectations
    6. Bulk insert to `ohlcv_data` hypertable
    7. Download and insert metadata

=== "Daily DAG"
    Auto-runs weekdays at 9:30 PM UTC:

    1. Get tickers from `securities` table
    2. Download latest OHLCV data
    3. Validate and insert
    4. Update metadata

## Configuration

| Variable | Example | Purpose |
|----------|---------|---------|
| `SEC_MASTER_DB_URL` | `postgresql://user:pass@localhost:5432/sec_master_dev` | Database connection string |

## Deployment

```bash
# Start Airflow and PostgreSQL
docker compose -f infrastructure/docker-compose.data-pipeline.yml up -d

# Access Airflow UI
# http://localhost:8080 (admin/admin)
```

## Performance

| Metric | Value | Purpose |
|--------|-------|---------|
| Batch size | 1000 rows | Bulk insert optimization |
| Parallelism | 20 tasks | Max concurrent ticker processing |
| Retry strategy | 2-3 attempts | Exponential backoff for transient failures |
| Rate limiting | `max_active_tis_per_dag` | Avoid API throttling |
