# YfinancePipeline

Handles OHLCV and metadata scraping from yfinance. Each method processes one ticker - Airflow does the parallelization.

!!! info "Component Separation"
    Pipeline focuses on data scraping. For ticker lists see [YfinanceTickers](tickers.md), for validation see [YfinanceValidation](validation.md).

## Quick Start

```python
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline
from datetime import date

pipeline = YfinancePipeline()

# Download OHLCV data
df = pipeline.scrape_date_range('AAPL', date(2024, 1, 1), date.today())

# Get metadata (50+ fundamental fields)
meta = pipeline.scrape_metadata('AAPL')
```

## Data Scraping

| Type | Configuration | Returns |
|------|--------------|---------|
| OHLCV | `auto_adjust=True`, flattened MultiIndex | DataFrame with Date, Open, High, Low, Close, Volume |
| Metadata | 50+ fields via yfinance `.info` | Dict with company info, valuation, profitability, analyst coverage |

!!! success "Adjusted Prices"
    `auto_adjust=True` handles stock splits and dividends automatically - no manual adjustments needed

## API Reference

::: sec_data_pipeline.yfinance.yfinance_pipeline.YfinancePipeline
    options:
      show_source: true
