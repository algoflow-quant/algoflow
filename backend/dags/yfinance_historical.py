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
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline  # type: ignore
from sec_master_db.clients.yfinance_client import YfinanceClient  # type: ignore 
from utils.logger import get_logger  # type: ignore

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
            enum=['sp500', 'russell3000', 'nasdaq', 'all'],
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
        """Get tickers based on source selection with grouping information"""
        # Get parameters from context
        source = context['params']['ticker_source']
        limit = int(context['params']['ticker_limit'])

        logger.info(f"Getting tickers from source: {source}")

        pipeline = YfinancePipeline()

        # Dictionary to track which groupings each ticker belongs to
        ticker_groupings = {}

        if source in ['sp500', 'all']:
            sp500 = pipeline._scrape_sp500_tickers()
            for ticker in sp500:
                if ticker not in ticker_groupings:
                    ticker_groupings[ticker] = []
                ticker_groupings[ticker].append('sp500')
            logger.info(f"Got {len(sp500)} S&P 500 tickers")

        if source in ['russell3000', 'all']:
            russell = pipeline._scrape_russell3000_tickers()
            for ticker in russell:
                if ticker not in ticker_groupings:
                    ticker_groupings[ticker] = []
                ticker_groupings[ticker].append('russell3000')
            logger.info(f"Got {len(russell)} Russell 3000 tickers")

        if source in ['nasdaq', 'all']:
            nasdaq = pipeline._scrape_nasdaq_tickers()
            for ticker in nasdaq:
                if ticker not in ticker_groupings:
                    ticker_groupings[ticker] = []
                ticker_groupings[ticker].append('nasdaq')
            logger.info(f"Got {len(nasdaq)} NASDAQ tickers")

        # Apply limit if specified
        if limit > 0:
            # Get first N tickers from the dictionary
            limited_tickers = dict(list(ticker_groupings.items())[:limit])
            ticker_groupings = limited_tickers
            logger.info(f"Limited to {limit} tickers")

        logger.info(f"Total tickers to process: {len(ticker_groupings)}")
        return ticker_groupings

    @task
    def validate_tickers(ticker_groupings: dict):
        """Validate tickers with yfinance and preserve groupings"""
        logger.info(f"Validating {len(ticker_groupings)} tickers...")

        pipeline = YfinancePipeline()
        ticker_list = list(ticker_groupings.keys())
        validation_result = pipeline.validate_tickers(ticker_list)

        # Create a new dictionary with only valid tickers and their groupings
        valid_ticker_groupings = {}
        for ticker in validation_result['valid']:
            if ticker in ticker_groupings:
                valid_ticker_groupings[ticker] = ticker_groupings[ticker]

        logger.info(f"Valid: {len(valid_ticker_groupings)}, "
                    f"Invalid: {len(validation_result['invalid'])}")

        # Log invalid tickers if not too many
        if validation_result['invalid'] and len(validation_result['invalid']) <= 20:
            logger.warning(f"Invalid tickers: {validation_result['invalid']}")

        return valid_ticker_groupings

    @task
    def register_tickers(ticker_groupings: dict):
        """Register tickers in securities table with groupings"""
        if not ticker_groupings:
            return ticker_groupings

        logger.info(f"Registering {len(ticker_groupings)} tickers in database")

        # Use environment variable for database connection
        import os
        db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@algoflow_sec_master_postgres:5432/sec_master_dev')
        client = YfinanceClient(db_url)

        # Register each ticker with its specific groupings
        try:
            success_count = 0
            for ticker, groupings in ticker_groupings.items():
                result = client.insert_securities([ticker], groupings)
                if result['success']:
                    success_count += 1
                else:
                    logger.warning(f"Failed to register {ticker}")

            logger.info(f"Registered {success_count}/{len(ticker_groupings)} tickers")

        except Exception as e:
            logger.error(f"Failed to register tickers: {e}")

        return ticker_groupings

    @task
    def download_historical_data(ticker_groupings: dict, **context):
        """Download historical OHLCV data"""
        # Get parameter from context
        years_back = int(context['params']['years_back'])

        if not ticker_groupings:
            logger.warning("No valid tickers to process")
            return {'success': 0, 'failed': 0}

        tickers = list(ticker_groupings.keys())
        logger.info(f"Downloading {years_back} years of data for {len(tickers)} tickers")

        pipeline = YfinancePipeline()
        # Use environment variable for database connection
        import os
        db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@algoflow_sec_master_postgres:5432/sec_master_dev')
        client = YfinanceClient(db_url)

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=365 * years_back)

        logger.info(f"Date range: {start_date} to {end_date}")

        # Process in batches to minimize memory usage (important for historical data!)
        batch_size = 50  # Smaller batches for historical data (10 years per ticker = ~2500 rows each)
        success_count = 0
        failed_count = 0

        # Split tickers into batches
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(tickers) + batch_size - 1) // batch_size

            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} tickers)")

            # Download data for this batch only
            ohlcv_data = pipeline.scrape_date_range(
                tickers=batch,
                start_date=start_date,
                end_date=end_date,
                interval='1d'
            )

            # Insert into database for this batch
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

            # Clear the batch data from memory
            del ohlcv_data
            logger.info(f"Batch {batch_num} complete: {success_count} success, {failed_count} failed so far")

        logger.info(f"OHLCV complete: {success_count} success, {failed_count} failed")
        return {'success': success_count, 'failed': failed_count}

    @task
    def download_metadata(ticker_groupings: dict):
        """Download fundamental metadata in batches"""
        if not ticker_groupings:
            logger.warning("No valid tickers to process")
            return {'success': 0, 'failed': 0}

        tickers = list(ticker_groupings.keys())
        logger.info(f"Downloading metadata for {len(tickers)} tickers")

        pipeline = YfinancePipeline()
        # Use environment variable for database connection
        import os
        db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@algoflow_sec_master_postgres:5432/sec_master_dev')
        client = YfinanceClient(db_url)

        # Process in batches to minimize memory usage
        batch_size = 100  # Larger batches for metadata since it's less data per ticker than OHLCV
        success_count = 0
        failed_count = 0

        # Split tickers into batches
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(tickers) + batch_size - 1) // batch_size

            logger.info(f"Processing metadata batch {batch_num}/{total_batches} ({len(batch)} tickers)")

            # Download metadata for this batch only
            metadata_dict = pipeline.scrape_metadata(batch)

            # Insert into database for this batch
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

            # Clear the batch data from memory
            del metadata_dict
            logger.info(f"Metadata batch {batch_num} complete: {success_count} success, {failed_count} failed so far")

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