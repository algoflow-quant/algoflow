-- Trigger to automatically update security statistics when OHLCV data is inserted
CREATE OR REPLACE FUNCTION security_master.update_security_stats_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Update statistics for all affected securities
    WITH affected_securities AS (
        SELECT DISTINCT security_id
        FROM new_table
    ),
    stats AS (
        SELECT
            o.security_id,
            MIN(o.date) as min_date,
            MAX(o.date) as max_date,
            COUNT(*) as bar_count
        FROM yfinance.ohlcv_data o
        WHERE o.security_id IN (SELECT security_id FROM affected_securities)
        GROUP BY o.security_id
    )
    UPDATE security_master.securities s
    SET
        start_data = stats.min_date,
        end_data = stats.max_date,
        bar_count = stats.bar_count,
        created_at = CURRENT_TIMESTAMP
    FROM stats
    WHERE s.security_id = stats.security_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_security_stats_after_insert ON yfinance.ohlcv_data;

-- Create trigger that fires after INSERT on OHLCV table
CREATE TRIGGER update_security_stats_after_insert
    AFTER INSERT ON yfinance.ohlcv_data
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION security_master.update_security_stats_on_insert();