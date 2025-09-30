# Native python imports
from datetime import datetime, timedelta, date

# 3rd party libary imports
# We have the ignore because airflow isnt supported for python 3.12. Only airflow runs python3.10
from airflow.decorators import dag, task  # type: ignore
from airflow.models.param import Param  # type: ignore

# Custom imports
from utils.database import get_database_url
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline
from sec_master_db.clients.yfinance_client import YfinanceClient

# Initialize logger with loguru
from loguru import logger

@dag(
    # Airflow docs outline how to set up arguments in the dag decorator
    dag_id='yfinance_daily',
    description='Daily update for existing tickers',
    schedule_interval='30 21 * * 1-5',  # 9:30 PM UTC (4:30 PM EST) on weekdays
    start_date=datetime(2024, 1, 1),
    catchup=False,
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
    """Daily update DAG - with optional manual trigger"""

    @task
    def get_existing_tickers():
        """Get ALL tickers from database that use yfinance provider"""
        logger.info("Getting all yfinance tickers from database...")

        try:
            # Initialize a db client
            client = YfinanceClient(get_database_url())
            
            # Get existing tickers in the securities master
            tickers = client.get_tickers()

            if tickers:
                logger.success(f"Found {len(tickers)} tickers to update")
                return tickers
            else:
                logger.warning("get_tickers method in yfclient returned empty ticker list")
                raise Exception("Ticker list is empty")

        except Exception as e:
            logger.error(f"Could not get tickers from DB: {e}")
            return []

    @task
    def download_recent_data(tickers: list, **context):
        """Download recent OHLCV data"""
        
        # Get parameters from context(context is airflows way of passing stuff from gui to task)
        days_back = context['params']['days_back']

        # Exit early if there are no tickers to be updated
        if not tickers:
            logger.warning("No tickers to update")
            return {'success': 0, 'failed': 0, 'no_data': 0}

        logger.info(f"Downloading {days_back} day(s) of data for {len(tickers)} tickers")

        # Instantiate a pipeline instance
        pipeline = YfinancePipeline()
        
        # Use environment variable from docker
        client = YfinanceClient(get_database_url())

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)

        # No need to skip weekends anymore since we're downloading multiple days
        # The yfinance API will only return trading days

        logger.info(f"Date range: {start_date} to {end_date}")

        # Download data (no batching needed for daily, a few updates per stock)
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
        
        
        # Loop through (ticker, pd.dataframe) and attempt to store all OHLCV data
        for ticker, df in ohlcv_data.items():
            # Check if valid data
            if df is not None and not df.empty:
                try:
                    # For daily updates, update existing tickers
                    result = client.insert_ohlcv(ticker, df)
                    if result['success']: 
                        success_count += 1
                        logger.debug(f"Updated {ticker}: {len(df)} rows")
                    else:
                        failed_count += 1
                        logger.error(f"Failed to update {ticker}: {result.get('message', 'Unknown error')}")
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error updating {ticker}: {str(e)}")
            else:
                no_data_count += 1
                logger.debug(f"No new data for {ticker}")

        logger.success(f"Update complete: {success_count} success, "
                    f"{failed_count} failed, {no_data_count} no data")

        return {
            'success': success_count,
            'failed': failed_count,
            'no_data': no_data_count
        }

    @task
    def update_metadata(tickers: list, **context):
        """Update metadata weekly (on Mondays) or when manually triggered"""

        # Get parameter from context (update_metadata & days_back are the params)
        manual_update = context['params'].get('update_metadata', False)

        # Check if today is Monday (weekday() == 0)
        is_monday = datetime.now().weekday() == 0

        # Update if manually requested OR if it's Monday
        should_update = manual_update or is_monday

        # If it aint monday
        if not should_update:
            logger.info("Skipping metadata update (only updates on Mondays or when forced)")
            return {'skipped': True}

        logger.info(f"Running metadata update (Monday: {is_monday}, Manual: {manual_update})")

        # No tickers passed into airflow task
        if not tickers:
            logger.warning("No tickers passed from previous airflow task")
            return {'success': 0, 'failed': 0}

        logger.info(f"Updating metadata for {len(tickers)} tickers")

        # Make a pipeline instance
        pipeline = YfinancePipeline()
        
        # Use environment variable from docker
        client = YfinanceClient(get_database_url())

        # Download metadata (no batching needed for daily update)
        metadata_dict = pipeline.scrape_metadata(tickers)

        success_count = 0
        failed_count = 0

        # Loop through (ticker, metadata_dict)
        for ticker, metadata in metadata_dict.items():
            try:
                # Try insert in db
                result = client.insert_metadata(ticker, metadata)
                if result['success']:
                    success_count += 1
                else:
                    logger.warning(f"Error storing ticker {ticker} in sec master")
                    failed_count += 1
            except Exception as e:
                failed_count += 1
                logger.error(f"Error updating metadata for {ticker}: {str(e)}")

        logger.success(f"Metadata update: {success_count} success, {failed_count} failed")
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
                logger.error(f"High failure rate: {failure_rate:.1%}")

        return summary

    # Task flow - tasks will get params from context
    tickers = get_existing_tickers()
    ohlcv = download_recent_data(tickers)
    metadata = update_metadata(tickers)
    summary = generate_summary(ohlcv, metadata)

# Create DAG instance
dag_instance = yfinance_daily()