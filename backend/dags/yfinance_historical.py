"""
YFinance Historical Data DAG
Download historical data with configurable date range (default: 10 years)
"""
from airflow.decorators import dag, task  # type: ignore
from airflow.models.param import Param  # type: ignore
from datetime import datetime, timedelta, date

# Import your modules
import sys
sys.path.append('/opt/airflow/plugins')
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline
from sec_master_db.clients.yfinance_client import YfinanceClient
from utils.logger import get_logger

# Use your custom logger
logger = get_logger(__name__)

@dag(
    dag_id='yfinance_historical',
    description='Download historical stock data with date range',
    schedule_interval=None,  # Manual trigger via UI
    start_date=datetime(2024, 1, 1),
    catchup=False,
    default_args={
        'owner': 'data-team',
        'retries': 2,
        'retry_delay': timedelta(minutes=10),
        'retry_exponential_backoff': True,
    },
    tags=['yfinance', 'historical'],
    params={
        'years_back': Param(
            default=10,
            type='integer',
            minimum=1,
            maximum=10,
            description='Years of historical data to download'
        ),
        'ticker_source': Param(
            default='sp500',
            enum=['sp500', 'russell2000', 'nasdaq', 'all'],
            description='Which ticker list to use'
        ),
        'ticker_limit': Param(
            default=0,
            type='integer',
            minimum=0,
            maximum=5000,
            description='Limit number of tickers (0 = no limit)'
        ),
    },
)
def yfinance_historical():
    """Historical data download with Airflow UI parameters"""

    @task
    def get_tickers(**context):
        """Get tickers based on source selection"""
        # Get parameters from context
        source = context['params']['ticker_source']
        limit = int(context['params']['ticker_limit'])

        logger.info(f"Getting tickers from source: {source}")

        pipeline = YfinancePipeline()

        tickers = []
        if source in ['sp500', 'all']:
            sp500 = pipeline._scrape_sp500_tickers()
            tickers.extend(sp500)
            logger.info(f"Got {len(sp500)} S&P 500 tickers")

        if source in ['russell2000', 'all']:
            russell = pipeline._scrape_russell2000_tickers()
            tickers.extend(russell)
            logger.info(f"Got {len(russell)} Russell 2000 tickers")

        if source in ['nasdaq', 'all']:
            nasdaq = pipeline._scrape_nasdaq_tickers()
            tickers.extend(nasdaq)
            logger.info(f"Got {len(nasdaq)} NASDAQ tickers")

        # Remove duplicates
        tickers = list(set(tickers))

        # Apply limit if specified
        if limit > 0:
            tickers = tickers[:limit]
            logger.info(f"Limited to {limit} tickers")

        logger.info(f"Total tickers to process: {len(tickers)}")
        return tickers

    @task
    def validate_tickers(tickers: list):
        """Validate tickers with yfinance"""
        logger.info(f"Validating {len(tickers)} tickers...")

        pipeline = YfinancePipeline()
        validation_result = pipeline.validate_tickers(tickers)

        logger.info(f"Valid: {len(validation_result['valid'])}, "
                    f"Invalid: {len(validation_result['invalid'])}")

        # Log invalid tickers if not too many
        if validation_result['invalid'] and len(validation_result['invalid']) <= 20:
            logger.warning(f"Invalid tickers: {validation_result['invalid']}")

        return validation_result['valid']

    @task
    def register_tickers(tickers: list):
        """Register tickers in securities table before downloading data"""
        if not tickers:
            return tickers

        logger.info(f"Registering {len(tickers)} tickers in database")

        # Use the postgres container when running in Docker
        db_url = 'postgresql://postgres:postgres@postgres:5432/sec_master_dev'
        client = YfinanceClient(db_url)

        # Register all tickers at once (insert_securities expects a list)
        try:
            result = client.insert_securities(tickers, ['yfinance'])
            if result['success']:
                logger.info(f"Registered {result['count']} tickers")
        except Exception as e:
            logger.error(f"Failed to register tickers: {e}")

        return tickers

    @task
    def download_historical_data(tickers: list, **context):
        """Download historical OHLCV data"""
        # Get parameter from context
        years_back = int(context['params']['years_back'])

        if not tickers:
            logger.warning("No valid tickers to process")
            return {'success': 0, 'failed': 0}

        logger.info(f"Downloading {years_back} years of data for {len(tickers)} tickers")

        pipeline = YfinancePipeline()
        # Use the postgres container when running in Docker
        db_url = 'postgresql://postgres:postgres@postgres:5432/sec_master_dev'
        client = YfinanceClient(db_url)

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=365 * years_back)

        logger.info(f"Date range: {start_date} to {end_date}")

        # Download data
        ohlcv_data = pipeline.scrape_date_range(
            tickers=tickers,
            start_date=start_date,
            end_date=end_date,
            interval='1d'
        )

        # Insert into database
        success_count = 0
        failed_count = 0

        for ticker, df in ohlcv_data.items():
            if df is not None and not df.empty:
                try:
                    result = client.insert_ohlcv(ticker, df)
                    if result.get('success'): # type: ignore
                        success_count += 1
                    else:
                        failed_count += 1
                        logger.error(f"Failed to insert {ticker}: {result.get('error')}") # type: ignore
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error inserting {ticker}: {str(e)}")
            else:
                failed_count += 1
                logger.warning(f"No data for {ticker}")

        logger.info(f"OHLCV complete: {success_count} success, {failed_count} failed")
        return {'success': success_count, 'failed': failed_count}

    @task
    def download_metadata(tickers: list):
        """Download fundamental metadata"""
        if not tickers:
            logger.warning("No valid tickers to process")
            return {'success': 0, 'failed': 0}

        logger.info(f"Downloading metadata for {len(tickers)} tickers")

        pipeline = YfinancePipeline()
        # Use the postgres container when running in Docker
        db_url = 'postgresql://postgres:postgres@postgres:5432/sec_master_dev'
        client = YfinanceClient(db_url)

        # Download metadata
        metadata_dict = pipeline.scrape_metadata(tickers)

        # Insert into database
        success_count = 0
        failed_count = 0

        for ticker, metadata in metadata_dict.items():
            try:
                result = client.insert_metadata(ticker, metadata)
                if result.get('success'):
                    success_count += 1
                else:
                    failed_count += 1
                    logger.error(f"Failed to insert metadata for {ticker}")
            except Exception as e:
                failed_count += 1
                logger.error(f"Error inserting metadata for {ticker}: {str(e)}")

        logger.info(f"Metadata complete: {success_count} success, {failed_count} failed")
        return {'success': success_count, 'failed': failed_count}

    @task
    def generate_report(ohlcv_result: dict, metadata_result: dict):
        """Generate summary report"""
        total_ohlcv = ohlcv_result['success'] + ohlcv_result['failed']
        total_metadata = metadata_result['success'] + metadata_result['failed']

        report = f"""
        Pipeline Complete:

        OHLCV Data:
        - Processed: {total_ohlcv} tickers
        - Success: {ohlcv_result['success']}
        - Failed: {ohlcv_result['failed']}

        Metadata:
        - Processed: {total_metadata} tickers
        - Success: {metadata_result['success']}
        - Failed: {metadata_result['failed']}
        """

        logger.info(report)
        return report

    # Task flow - tasks will get params from context
    tickers = get_tickers()
    valid_tickers = validate_tickers(tickers)
    registered_tickers = register_tickers(valid_tickers)

    # Parallel download
    ohlcv = download_historical_data(registered_tickers)
    metadata = download_metadata(registered_tickers)

    # Generate report
    report = generate_report(ohlcv, metadata)

# Create DAG instance
dag_instance = yfinance_historical()