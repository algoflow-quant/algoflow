-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create OHLCV table for daily data
CREATE TABLE ohlcv_data (
    ticker VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open DECIMAL(20, 8) NOT NULL,
    high DECIMAL(20, 8) NOT NULL,
    low DECIMAL(20, 8) NOT NULL,
    close DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 8) NOT NULL,
    PRIMARY KEY (ticker, date)
);

-- Convert to TimescaleDB hypertable with partitioning
SELECT create_hypertable('ohlcv_data', 'date',
    partitioning_column => 'ticker',
    number_partitions => 4,
    if_not_exists => TRUE
);

-- Enable compression for data older than 30 days
ALTER TABLE ohlcv_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'ticker',
    timescaledb.compress_orderby = 'date DESC'
);

-- Add compression policy (compresses chunks older than 30 days)
SELECT add_compression_policy('ohlcv_data', INTERVAL '30 days');

CREATE TABLE stock_metadata (
    -- Primary Keys & Identifiers
    ticker VARCHAR(20) NOT NULL,
    date_scraped DATE NOT NULL,
    PRIMARY KEY (ticker, date_scraped),

    -- Company Basic Info (80%+ availability)
    company_name VARCHAR(255),
    exchange VARCHAR(50),
    country VARCHAR(100),
    sector VARCHAR(100),
    industry VARCHAR(150),
    market_cap DECIMAL(20,2),
    enterprise_value DECIMAL(20,2),
    shares_outstanding BIGINT,
    float_shares BIGINT,

    -- Valuation Metrics (50%+ availability)
    price_to_book DECIMAL(10,4),
    forward_pe DECIMAL(10,4),
    ev_to_ebitda DECIMAL(10,4),
    ev_to_revenue DECIMAL(10,4),
    price_to_sales DECIMAL(10,4),

    -- Profitability & Quality (75%+ availability)
    gross_margin DECIMAL(10,4),
    operating_margin DECIMAL(10,4),
    profit_margin DECIMAL(10,4),
    return_on_equity DECIMAL(10,4),
    return_on_assets DECIMAL(10,4),
    free_cash_flow_yield DECIMAL(10,4),

    -- Growth Metrics (60%+ availability)
    revenue_growth_yoy DECIMAL(10,4),
    revenue_per_share DECIMAL(10,4),

    -- Financial Health (67%+ availability)
    debt_to_equity DECIMAL(10,4),
    current_ratio DECIMAL(10,4),
    quick_ratio DECIMAL(10,4),
    total_cash DECIMAL(20,2),
    total_debt DECIMAL(20,2),
    total_cash_per_share DECIMAL(10,4),
    book_value DECIMAL(10,4),

    -- Cash Flow (77%+ availability)
    operating_cash_flow DECIMAL(20,2),
    free_cash_flow DECIMAL(20,2),

    -- Dividends (81%+ availability)
    payout_ratio DECIMAL(10,4),

    -- Short Interest & Ownership (80%+ availability)
    short_percent_of_float DECIMAL(10,4),
    short_ratio DECIMAL(10,4),
    shares_short BIGINT,
    shares_percent_shares_out DECIMAL(10,4),
    held_percent_institutions DECIMAL(10,4),
    held_percent_insiders DECIMAL(10,4),

    -- Analyst Coverage (61%+ availability)
    target_mean_price DECIMAL(10,2),
    target_price_upside DECIMAL(10,4),
    number_of_analysts INT,
    recommendation_key VARCHAR(50),

    -- Market Performance (80%+ availability)
    beta DECIMAL(10,4),
    fifty_two_week_high DECIMAL(10,2),
    fifty_two_week_low DECIMAL(10,2),
    fifty_two_week_change DECIMAL(10,4),
    sp500_52_week_change DECIMAL(10,4),
    fifty_day_average DECIMAL(10,2),
    two_hundred_day_average DECIMAL(10,2),

    -- Trading Volume (100% availability)
    average_volume BIGINT,
    average_volume_10days BIGINT,
    regular_market_volume BIGINT,

    -- Metadata
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(50) DEFAULT 'yfinance'
);

-- Essential indexes for queries
CREATE INDEX idx_ticker ON stock_metadata(ticker);
CREATE INDEX idx_date_scraped ON stock_metadata(date_scraped);
CREATE INDEX idx_sector_industry ON stock_metadata(sector, industry);
CREATE INDEX idx_market_cap ON stock_metadata(market_cap DESC);
CREATE INDEX idx_volume ON stock_metadata(average_volume DESC);
CREATE INDEX idx_short_interest ON stock_metadata(short_percent_of_float DESC);
CREATE INDEX idx_profitability ON stock_metadata(return_on_equity DESC, profit_margin
DESC);
CREATE INDEX idx_valuation ON stock_metadata(forward_pe, price_to_book);