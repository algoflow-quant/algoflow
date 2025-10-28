## v2.3.0 (2025-10-28)

### Feat

- added dal, abac, refactored loading animation, and ran prettier
- added footer with mobile responsiveness
- added member delete and settings
- added member manager
- added organization sidebar and updated header
- added organization create feature
- added bento grid with animations
- made landing page & configured header
- add jupyter:
- add live coding experience
- add live coding experience
- add code color for light/dark and file tabs
- add team invite feature
- fixed ui and added notifcations
- add team members crud
- add team members crud
- add notifcations with admin features
- configured teams and projects
- configured teams and projects
- added shadcn dashboard and configured teams/projects
- add glowing streak around login, register, and waitlsit cards
- implemented login, register, waitlist, supabase, and auth for the lab route.
- add supabase to infrastructure for frontend
- add header to frontend, working navbar

### Fix

- added example env var
- fixed supabase cli
- fixed realtime issues
- fixed bugs causing broken avatar url
- resolve TypeScript errors and add read-only presence hook
- fixed bugs causing realtime collab to not work
- fixed spacing on navlink and auth
- used chadcn for dropdown

### Refactor

- changed directory structure

## v2.2.0 (2025-10-08)

### Feat

- **frontend**: ran create-next-app and organized folders

## v2.1.4 (2025-10-07)

### Fix

- **docs**: use two-job workflow for GitHub Pages deployment

## v2.1.3 (2025-10-07)

### Fix

- **docs**: add Python path for mkdocstrings and fix broken link

## v2.1.2 (2025-10-07)

### Fix

- **docs**: update mkdocs dependencies to fix autorefs compatibility

## v2.1.1 (2025-10-07)

### Fix

- **ci**: change --follow-tags to --tags to force push tags when pushing

## v2.1.0 (2025-10-07)

### Feat

- add lgtm stack with grafana dashboard & docker-compose obesrvability
- **airflow**: add airflow and dags to manage etl pipelines
- **yfinance-db-client**: added and manually test get tickers
- **docker**: add docker setup with postgres, adminer, and dozzle
- **db-client**: completed the update_security_metadata method
- **db-client**: completed the insert metadata method
- **db-client**: completed the insert ohlcv_data method
- **db-client**: completed the insert_securities method
- **db-client**: completed get_security_id method
- **db-client**: added class and empty methods for yfinance db client

### Fix

- **ci**: changed app to pat token
- removed try catch blocks and added more logs
- fixed airflow docker, added db function to update securities table
- renamed docker db contianer name
- fixed bug in db client and added manual tests to jupyter

### Refactor

- modified directory structure and fixed bugs
- **dag**: refectored daily dag and perfected data pipeline
- **dag**: refacttored historical dag
- **client**: refactored client and removed multiple ticker storage methods
- **pipeline**: refactored yfinance pipline and made methods only take single tickers
- **dag**: refactored dag files, fixed airflow docker setup, removed update security metdata

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
