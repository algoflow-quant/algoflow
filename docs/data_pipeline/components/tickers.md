# Ticker Scrapers

Methods for scraping ticker lists from public sources.

## Sources

### S&P 500
- Source: Wikipedia
- Count: ~500 tickers
- Cleaned: Replaces dots with dashes (BRK.B → BRK-B)

### Russell 3000
- Source: iShares IWV ETF holdings CSV
- Count: ~3000 tickers
- Filters: Removes CASH, USD, and symbols >5 characters

### NASDAQ
- Source: NASDAQ Trader official list
- Count: ~3000+ tickers
- Filters: Removes test issues

## Validation

Each ticker is validated by attempting a 21-day test download. Valid tickers must return ≥10 trading days of data.
