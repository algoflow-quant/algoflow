"""
YFinance Daily Update DAG
Download today's data for existing tickers (manual trigger)
"""
from airflow.decorators import dag, task  # type: ignore
from airflow.models.param import Param  # type: ignore
from datetime import datetime, timedelta, date

# Import your modules
import sys
sys.path.append('/opt/airflow/plugins')
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline  # type: ignore
from sec_master_db.clients.yfinance_client import YfinanceClient  # type: ignore 
from airflow.providers.postgres.hooks.postgres import PostgresHook  # type: ignore
from utils.logger import get_logger  # type: ignore

logger = get_logger(__name__)

@dag(
    dag_id='yfinance_daily',
    description='Daily update for existing tickers',
    schedule_interval='30 21 * * 1-5',  # 9:30 PM UTC (4:30 PM EST) on weekdays
    start_date=datetime(2024, 1, 1),
    catchup=False,
    is_paused_upon_creation=True,  # Don't run immediately when turned on
    default_args={
        'owner': 'data-team',
        'retries': 3,
        'retry_delay': timedelta(minutes=5),
    },
    tags=['yfinance', 'daily'],
    params={
        'days_back': Param(
            default=5,
            type='integer',
            minimum=1,
            maximum=30,
            description='Number of days to update (default: 5 to catch up after weekends)'
        ),
        'update_metadata': Param(
            default=False,  # Metadata now auto-updates on Mondays only
            type='boolean',
            description='Force metadata update (auto-updates on Mondays)'
        ),
    },
)
def yfinance_daily():
    """Daily update DAG - manual trigger"""

    @task
    def get_existing_tickers():
        """Get ALL tickers from database that use yfinance provider"""
        logger.info("Getting all yfinance tickers from database...")

        try:
            # Use environment variable for database connection
            import os
            from sqlalchemy import create_engine, text

            db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@algoflow_sec_master_postgres:5432/sec_master_dev')
            engine = create_engine(db_url)

            # Get ALL tickers with yfinance provider
            sql = text("""
                SELECT DISTINCT ticker
                FROM security_master.securities
                WHERE ticker IS NOT NULL
                AND provider = 'yfinance'
                ORDER BY ticker;
            """)

            with engine.connect() as conn:
                result = conn.execute(sql)
                tickers = [row[0] for row in result]

            logger.info(f"Found {len(tickers)} tickers to update")
            return tickers

        except Exception as e:
            logger.error(f"Could not get tickers from DB: {e}")
            return []

    @task
    def download_recent_data(tickers: list, **context):
        """Download recent OHLCV data"""
        # Get parameters from context
        days_back = int(context['params']['days_back'])

        if not tickers:
            logger.warning("No tickers to update")
            return {'success': 0, 'failed': 0, 'no_data': 0}

        logger.info(f"Downloading {days_back} day(s) of data for {len(tickers)} tickers")

        pipeline = YfinancePipeline()
        # Use environment variable for database connection
        import os
        db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@algoflow_sec_master_postgres:5432/sec_master_dev')
        client = YfinanceClient(db_url)

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)

        # No need to skip weekends anymore since we're downloading multiple days
        # The yfinance API will only return trading days anyway

        logger.info(f"Date range: {start_date} to {end_date}")

        # Download data (no batching needed for daily - it's small)
        ohlcv_data = pipeline.scrape_date_range(
            tickers=tickers,
            start_date=start_date,
            end_date=end_date,
            interval='1d'
        )

        # Insert/update database
        success_count = 0
        failed_count = 0
        no_data_count = 0

        for ticker, df in ohlcv_data.items():
            if df is not None and not df.empty:
                try:
                    # For daily updates, we might want to update existing records
                    result = client.insert_ohlcv(ticker, df)
                    if result['success']:  # type: ignore
                        success_count += 1
                        logger.debug(f"Updated {ticker}: {len(df)} rows")
                    else:
                        failed_count += 1
                        logger.error(f"Failed to update {ticker}: {result.get('message', 'Unknown error')}") # type: ignore
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error updating {ticker}: {str(e)}")
            else:
                no_data_count += 1
                logger.debug(f"No new data for {ticker}")

        logger.info(f"Update complete: {success_count} success, "
                    f"{failed_count} failed, {no_data_count} no data")

        return {
            'success': success_count,
            'failed': failed_count,
            'no_data': no_data_count
        }

    @task
    def update_metadata(tickers: list, **context):
        """Update metadata weekly (on Mondays) or when manually triggered"""
        from datetime import datetime

        # Get parameter from context
        manual_update = bool(context['params'].get('update_metadata', False))

        # Check if today is Monday (weekday() == 0)
        is_monday = datetime.now().weekday() == 0

        # Update if manually requested OR if it's Monday
        should_update = manual_update or is_monday

        if not should_update:
            logger.info("Skipping metadata update (only updates on Mondays or when forced)")
            return {'skipped': True}

        logger.info(f"Running metadata update (Monday: {is_monday}, Manual: {manual_update})")

        if not tickers:
            return {'success': 0, 'failed': 0}

        logger.info(f"Updating metadata for {len(tickers)} tickers")

        pipeline = YfinancePipeline()
        # Use environment variable for database connection
        import os
        db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@algoflow_sec_master_postgres:5432/sec_master_dev')
        client = YfinanceClient(db_url)

        # Download metadata (no batching needed for daily update)
        metadata_dict = pipeline.scrape_metadata(tickers)

        success_count = 0
        failed_count = 0

        for ticker, metadata in metadata_dict.items():
            try:
                result = client.insert_metadata(ticker, metadata)
                if result['success']:
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                failed_count += 1
                logger.error(f"Error updating metadata for {ticker}: {str(e)}")

        logger.info(f"Metadata update: {success_count} success, {failed_count} failed")
        return {'success': success_count, 'failed': failed_count}

    @task
    def generate_summary(ohlcv_result: dict, metadata_result: dict):
        """Generate update summary"""
        summary = f"""
        Daily Update Complete:

        OHLCV Data:
        - Success: {ohlcv_result['success']}
        - Failed: {ohlcv_result['failed']}
        - No new data: {ohlcv_result['no_data']}
        """

        if not metadata_result.get('skipped'):
            summary += f"""
        Metadata:
        - Success: {metadata_result.get('success', 0)}
        - Failed: {metadata_result.get('failed', 0)}
            """

        logger.info(summary)

        # Alert if too many failures
        total = ohlcv_result['success'] + ohlcv_result['failed'] + ohlcv_result['no_data']
        if total > 0:
            failure_rate = ohlcv_result['failed'] / total
            if failure_rate > 0.1:  # More than 10% failures
                logger.warning(f"High failure rate: {failure_rate:.1%}")

        return summary

    # Task flow - tasks will get params from context
    tickers = get_existing_tickers()
    ohlcv = download_recent_data(tickers)
    metadata = update_metadata(tickers)
    summary = generate_summary(ohlcv, metadata)

# Create DAG instance
dag_instance = yfinance_daily()