# YfinanceValidation

Validates ticker symbols and OHLCV data quality using yfinance test downloads and Great Expectations.

!!! info "Component Separation"
    This class handles validation only. For ticker lists see [YfinanceTickers](tickers.md), for data scraping see [YfinancePipeline](yfinance_pipeline.md).

## Validation Checks

| Category | Checks | Purpose |
|----------|--------|---------|
| Schema | Required columns (Open, High, Low, Close, Volume) | Ensure complete data structure |
| Nulls | Zero NaN/null tolerance | Catch incomplete data |
| Price Logic | High ≥ Low, Open/Close within range, all prices > $0.01 | Detect bad data or API errors |
| Data Quality | Std dev > 0.01, min 10 rows, unique dates | Catch constant values and duplicates |
| Volume | Non-negative (0 allowed) | Validate trading activity |

!!! info "Why 18 Checks?"
    Schema (1) + Nulls (5) + Price bounds (4) + Price logic (4) + Data quality (3) + Unique dates (1) = 18 total checks

## How It Works

Runs 18 Great Expectations checks to catch API glitches, incomplete data, and bad values before they hit the database. Checks cover schema completeness, null values, price logic (High >= Low, Open/Close within bounds), data quality (stddev > 0.01, min 10 rows, unique dates), and reasonable values (prices > $0.01, volume >= 0).

Returns a dict with validation results including which checks passed/failed. If the Great Expectations framework itself fails, raises an exception for Airflow to retry.

!!! warning "Validation Failures"
    All failures raise exceptions - no silent errors. Airflow retries automatically with exponential backoff.

## Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `TICKER_VALIDATION_TEST_DAYS` | 21 | Calendar days for ticker test |
| `MIN_TRADING_DAYS_FOR_VALIDATION` | 10 | Minimum trading days required |
| `MIN_OHLCV_ROWS_FOR_VALIDATION` | 10 | Minimum rows for validation |
| `MIN_PRICE_VALUE` | 0.01 | Minimum valid price |
| `MIN_STDDEV_VALUE` | 0.01 | Minimum standard deviation |

## Ticker Validation

Each ticker is validated by downloading 21 calendar days of data (about 15 trading days). Valid tickers must return ≥10 trading days back. Catches delisted stocks, bad symbols, and API issues before bulk downloading.

!!! info "Why 21 Days?"
    21 calendar days = ~15 trading days. Accounts for weekends, holidays, and newly listed stocks.

## API Reference

::: sec_data_pipeline.yfinance.yfinance_validation.YfinanceValidation
    options:
      show_source: true
