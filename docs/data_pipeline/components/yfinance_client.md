# YfinanceClient

Database client for sec_master operations. Main performance win is bulk inserts with psycopg2 execute_values.

## Quick Start

=== "Basic Usage"
    ```python
    from sec_master_db.clients.yfinance_client import YfinanceClient
    from utils.database import get_database_url

    client = YfinanceClient(get_database_url())

    # Register security
    client.insert_security('AAPL', ['sp500', 'nasdaq'])

    # Bulk insert OHLCV (252 rows in <1 second)
    result = client.insert_ohlcv('AAPL', df)

    # Insert metadata
    client.insert_metadata('AAPL', metadata_dict)
    ```

=== "Get Tickers"
    ```python
    # Get all tickers
    all_tickers = client.get_tickers()

    # Get S&P 500 tickers only
    sp500 = client.get_tickers(['sp500'])

    # Get multiple groupings
    combined = client.get_tickers(['sp500', 'nasdaq'])
    ```

## Key Features

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| Bulk inserts | `execute_values` with 1000-row batches | 10-100x faster than individual inserts |
| Upsert pattern | `ON CONFLICT UPDATE/DO NOTHING` | Safe to re-run, idempotent operations |
| Session management | Create/use/close per operation | Automatic cleanup, no connection leaks |
| Error handling | Rollback + raise with context | Clean failures, Airflow can retry |

## Database Schema

| Table | Purpose | Key Constraints |
|-------|---------|-----------------|
| `security_master.securities` | Ticker registry with groupings | UNIQUE (ticker, provider) |
| `yfinance.ohlcv_data` | Price data (TimescaleDB hypertable) | UNIQUE (security_id, date) |
| `yfinance.stock_metadata` | 50+ fundamental fields | UNIQUE (security_id, date_scraped) |

!!! success "Performance"
    TimescaleDB hypertable partitioning makes time-series queries 10-100x faster than regular PostgreSQL tables

## API Reference

::: sec_master_db.clients.yfinance_client.YfinanceClient
    options:
      show_source: true
