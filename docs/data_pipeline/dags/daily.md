# Daily Parallel DAG

Incremental daily updates for existing securities.

## Schedule

Weekdays at 9:30 PM UTC (after market close)

## Task Flow

1. Get tickers from database
2. Download latest OHLCV data
3. Validate OHLCV quality
4. Insert to database
5. Update metadata

## Configuration

- Max parallel tasks: 20
- Retry: 2-3 attempts 
- Auto-runs weekdays only
