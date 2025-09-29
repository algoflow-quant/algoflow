# Native python modules
from datetime import datetime, timedelta, date
from typing import List, DefaultDict
from collections import defaultdict
import math
import sys
sys.path.append('/opt/airflow/plugins') # add plugins to path (airflow plugins)

# Airflow modules(type ignore due to incompatible version for now, works on airflow but not python 3.12)
from airflow.decorators import dag, task  # type: ignore
from airflow.models.param import Param  # type: ignore

# Custom python modules
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline
from sec_master_db.clients.yfinance_client import YfinanceClient 
from utils.database import get_database_url

# import loguru
from loguru import logger

# Helper function for get_tickers {ticker, groupings}
def add_tickers_to_groupings(tickers: List[str], group_name: str, ticker_groupings: DefaultDict[str, List[str]]) -> int:
      """Add tickers to groupings dict with their source."""
      
      # Default dict creates missing key with a default value when you try to accesss it
      for ticker in tickers:
          ticker_groupings[ticker].append(group_name)
      return len(tickers)
  
  
@dag(
    # Airflow docs outline how to set up arguments in the dag decorator
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
        
        # Get parameters from context(context is how airflow passes stuff from user to task)
        source = context['params']['ticker_source']
        limit = context['params']['ticker_limit']

        logger.info(f"Getting tickers from source: {source}")

        # Instantiate a yfpipline
        pipeline = YfinancePipeline()

        # Map source names to their scraper methods in pipeline
        TICKER_SOURCES = {
            'sp500': pipeline._scrape_sp500_tickers,
            'russell3000': pipeline._scrape_russell3000_tickers,
            'nasdaq': pipeline._scrape_nasdaq_tickers,
        }
        
        # ticker.keys if all (keys is all the indexes) or else the individual function
        sources_to_process = TICKER_SOURCES.keys() if source == 'all' else [source]

        # Make the ticker groupings dict format
        ticker_groupings = defaultdict(list)
        
        # Process each source
        for src in sources_to_process:
            if src in TICKER_SOURCES: # check if exists
                scraper_func = TICKER_SOURCES[src] # Extract the function by passing the key
                tickers = scraper_func()  # Call the function
                count = add_tickers_to_groupings(tickers, src, ticker_groupings) # Add the tickers to ticker groupings
                logger.info(f"Got {count} {src.upper()} tickers")

        # Apply limit if specified
        if limit > 0:
            # Get first N tickers from the dictionary
            limited_tickers = dict(list(ticker_groupings.items())[:limit]) # Get ticker dict in a list and get up uuntil limit and make a dict again
            ticker_groupings = limited_tickers
            logger.info(f"Limited to {limit} tickers")

        logger.success(f"Total tickers scraped and ready to process: {len(ticker_groupings)}")
        return ticker_groupings

    @task
    def validate_tickers(ticker_groupings: dict):
        """Validate tickers with yfinance and preserve groupings"""
        
        logger.info(f"Validating {len(ticker_groupings)} tickers...")

        # Instantiate yfinance pipeline and get ticker list
        pipeline = YfinancePipeline()
        ticker_list = list(ticker_groupings.keys())
        
        # Call the validate tickers function from the pipeline
        validation_result = pipeline.validate_tickers(ticker_list)

        # Create a new dictionary with only valid tickers and their groupings
        valid_ticker_groupings = {}
        for ticker in validation_result['valid']:
            # Make sure returned ticker matches whats passed in
            if ticker in ticker_groupings:
                valid_ticker_groupings[ticker] = ticker_groupings[ticker] # make the dict of {ticker, list[str]}

        logger.success(f"Valid: {len(valid_ticker_groupings)}, "
                    f"Invalid: {len(validation_result['invalid'])}")

        # Log invalid tickers if not too many
        if validation_result['invalid'] and len(validation_result['invalid']) <= 20:
            logger.warning(f"Invalid tickers: {validation_result['invalid']}")

        return valid_ticker_groupings

    @task
    def register_tickers(ticker_groupings: dict):
        """Register tickers in securities table with groupings"""
        
        # return if ticker groupings is empty
        if not ticker_groupings:
            logger.warning("ticker grouping is missing from register tickers task as argument")
            return ticker_groupings

        logger.info(f"Registering {len(ticker_groupings)} tickers in database")

        # Use environment variable for database connection
        client = YfinanceClient(get_database_url())

        # Register each ticker with its specific groupings
        try:
            success_count = 0
            for ticker, groupings in ticker_groupings.items(): # get ticker and grouping in an iterator that returns (ticker, grouping)
                result = client.insert_securities([ticker], groupings) # use insert security method
                if result['success']:
                    logger.debug(f"Successfully inserted ticker: {ticker}")
                    success_count += 1
                else:
                    logger.warning(f"Failed to register {ticker}")

            logger.success(f"Registered {success_count}/{len(ticker_groupings)} tickers")

        except Exception as e:
            logger.error(f"Failed to register tickers: {e}")

        return ticker_groupings

    @task
    def download_historical_data(ticker_groupings: dict, **context):
        """Download historical OHLCV data"""
        
        # Get parameter from context
        years_back = context['params']['years_back']

        # If the ticker groupings is empty
        if not ticker_groupings:
            logger.warning("No valid tickers to process")
            return {'success': 0, 'failed': 0}

        # Get ticker list from groupings
        tickers = list(ticker_groupings.keys())
        logger.info(f"Downloading {years_back} years of data for {len(tickers)} tickers")

        pipeline = YfinancePipeline()
        
        # Use environment variable for database connection
        client = YfinanceClient(get_database_url())

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=365 * years_back)

        logger.info(f"Date range: {start_date} to {end_date}")

        # Process in batches to minimize memory usage (important for historical data)
        batch_size = 50  # Smaller batches for historical data (10 years per ticker = ~2500 rows each)
        success_count = 0
        failed_count = 0

        # Split tickers into batches
        for i in range(0, len(tickers), batch_size): # 0 to ticker length step by batch size(50)
            batch = tickers[i:i + batch_size] # Get ticker batch
            batch_num = (i // batch_size) + 1 # Get the current iteration (calculated from i)
            total_batches = math.ceil(len(tickers) / batch_size) # Get the total number of batches

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
                if df is not None and not df.empty: # Check if not none and the data isnt empty
                    try:
                        result = client.insert_ohlcv(ticker, df)
                        
                        # If insertion went through with no error
                        if result.get('success'):
                            logger.debug(f"Successfully inserted historical data for ticker: {ticker}")
                            success_count += 1
                        else:
                            # Insertion went through but came back with error
                            failed_count += 1
                            logger.error(f"Failed to insert {ticker}: {result.get('error')}")
                    
                    # Catch python level error
                    except Exception as e:
                        failed_count += 1
                        logger.error(f"Error inserting {ticker}: {str(e)}")
                # Or no data was returned
                else:
                    failed_count += 1
                    logger.warning(f"No data for {ticker}")

            logger.info(f"Batch {batch_num} complete: {success_count} success, {failed_count} failed so far")

        logger.success(f"OHLCV complete: {success_count} success, {failed_count} failed")
        
        # Return basic success metrics
        return {'success': success_count, 'failed': failed_count}

    @task
    def download_metadata(ticker_groupings: dict):
        """Download fundamental metadata in batches"""
        
        # If ticker groupings is empty
        if not ticker_groupings:
            logger.warning("No valid tickers to process")
            return {'success': 0, 'failed': 0}

        # Get ticker list
        tickers = list(ticker_groupings.keys())
        logger.info(f"Downloading metadata for {len(tickers)} tickers")

        # Make a yfpipeline
        pipeline = YfinancePipeline()
        
        # Use environment variable for database connection
        client = YfinanceClient(get_database_url())

        # Process in batches to minimize memory usage
        batch_size = 100  # Larger batches for metadata since it's less data per ticker than OHLCV
        success_count = 0
        failed_count = 0

        # Split tickers into batches
        for i in range(0, len(tickers), batch_size): # 0 to len(tickers) incrementing by 100
            batch = tickers[i:i + batch_size] # Get ticker batch
            batch_num = (i // batch_size) + 1 # Current batch num
            total_batches = math.ceil(len(tickers) / batch_size) # Total batches using ceiling division

            logger.info(f"Processing metadata batch {batch_num}/{total_batches} ({len(batch)} tickers)")

            # Download metadata for this batch only
            metadata_dict = pipeline.scrape_metadata(batch)

            # Insert into database for this batch
            for ticker, metadata in metadata_dict.items():
                try:
                    
                    # Insert metadata
                    result = client.insert_metadata(ticker, metadata)
                    
                    # DB insert success
                    if result.get('success'):
                        logger.debug(f"Successfully inserted ticker: {ticker}")
                        success_count += 1
                        
                    # DB insert failure
                    else:
                        failed_count += 1
                        logger.error(f"Failed to insert metadata for {ticker}")
                        
                # Python level error
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error inserting metadata for {ticker}: {str(e)}")

            # Clear the batch data from memory
            del metadata_dict
            logger.info(f"Metadata batch {batch_num} complete: {success_count} success, {failed_count} failed so far")

        logger.success(f"Metadata complete: {success_count} success, {failed_count} failed")
        
        # Return success and fail count
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