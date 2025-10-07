# Data Validation

Great Expectations validation framework for OHLCV data quality.

## Validation Checks

### Schema
- Required columns: Open, High, Low, Close, Volume

### Null Checks
- Zero tolerance for NaN/null values

### Price Logic
- High ≥ Low
- Open/Close within High/Low range
- Prices > $0.01

### Data Quality
- Standard deviation > 0.01 (detects constant values)
- Minimum 10 rows
- Unique dates (no duplicates)

### Volume
- Non-negative (0 allowed)

## Constants

Defined in `YfinancePipeline` class:
- `TICKER_VALIDATION_TEST_DAYS = 21`
- `MIN_TRADING_DAYS_FOR_VALIDATION = 10`
- `MIN_OHLCV_ROWS_FOR_VALIDATION = 10`
- `MIN_PRICE_VALUE = 0.01`
- `MIN_STDDEV_VALUE = 0.01`
- `MAX_TICKER_LENGTH = 5`

## Error Handling

Validation failures raise exceptions for Airflow to retry. Failed validations are logged with specific check names.
