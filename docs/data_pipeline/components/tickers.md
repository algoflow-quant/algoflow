# YfinanceTickers

Scrapes ticker lists from public sources (S&P 500, Russell 3000, NASDAQ).

!!! info "Component Separation"
    This class handles ticker list scraping only. For data scraping see [YfinancePipeline](yfinance_pipeline.md), for validation see [YfinanceValidation](validation.md).

## Sources

| Source | Method | Count | Cleaning |
|--------|--------|-------|----------|
| S&P 500 | Wikipedia table scrape | ~500 | Replace dots with dashes (BRK.B → BRK-B) |
| Russell 3000 | iShares IWV ETF CSV | ~3000 | Remove CASH, USD, symbols >5 chars |
| NASDAQ | NASDAQ Trader official list | ~3000+ | Remove test issues |

## How It Works

=== "S&P 500"
    Pulls the Symbol column from Wikipedia's List of S&P 500 companies table. Converts dots to dashes for yfinance compatibility.

    !!! example "BRK.B → BRK-B"
        yfinance uses dashes for class shares, not dots

=== "Russell 3000"
    Downloads iShares IWV ETF holdings CSV. The CSV has metadata rows at the top, so we scan for the "Ticker" header before parsing. Filters out CASH, USD positions, and symbols >5 characters.

    !!! warning "CSV Structure"
        First ~10 rows are metadata - scan for "Ticker" before parsing

=== "NASDAQ"
    Uses the official NASDAQ Trader pipe-delimited file. Filters out test symbols using the "Test Issue" flag.

    !!! success "Official Source"
        Direct from NASDAQ, updated daily

## API Reference

::: sec_data_pipeline.yfinance.yfinance_tickers.YfinanceTickers
    options:
      show_source: true
