## v2.0.0 (2025-09-26)

### Feat

- fixed yfinance pipeline and restructured files
- add database install script and schema
- **data-pipeline**: improve metadata scraping reliability
- **data-pipeline**: added code to remove tickers that yfinance doesnt have, added balnk methods in orchestrator, removed bad tickerse
- **data-pipeline**: removed nan from ticker-list & fixed nan in scrape function
- **data-pipeline**: added ticker list caching and json methods
- add database install script and schema
- **data-pipeline**: improve metadata scraping reliability
- **data-pipeline**: added code to remove tickers that yfinance doesnt have, added balnk methods in orchestrator, removed bad tickerse
- **data-pipeline**: removed nan from ticker-list & fixed nan in scrape function
- **data-pipeline**: added ticker list caching and json methods
- **db**: added ohlcv table

### Fix

- **data-pipeline**: removed nan from ticker list json
- **sec_master**: fixed database schema and added security master
    - added security master table
    - replaced ticker with security_id in ohlcv
    - replaced ticker with secutity_id in stock_meta_data
    - made schemas yfinance for every table
    - changed indexes
- **data-pipeline**: removed nan from ticker list json
- **ci**: add permissions to merge restriction workflow
- **ci**: increase commit header length limit to 140 chars
- **ci**: added permissions to GitHub Action commit linting workflow

### Refactor

- **data-pipeline**: added orchesrator file and added comment in data-pipeline
- **data-pipeline**: added orchesrator file and added comment in data-pipeline

## v1.0.0 (2025-09-21)
