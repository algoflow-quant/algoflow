# Native python modules
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Tuple, DefaultDict
from collections import defaultdict
from io import StringIO
import sys
import warnings
import logging

sys.path.append('/opt/airflow/plugins') # add plugins to path (airflow plugins)

# Third-party modules
import pandas as pd
import yfinance as yf

# Airflow modules (type ignore due to incompatible version for now, works on airflow but not python 3.12)
from airflow.decorators import dag, task  # type: ignore
from airflow.models.param import Param  # type: ignore

# Custom python modules
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline
from sec_master_db.clients.yfinance_client import YfinanceClient
from utils.database import get_database_url

# Logging
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
    dag_id='yfinance_historical_parallel',
    description='Download historical stock data with parallel per-ticker execution',
    schedule_interval=None,  # Manual trigger via UI
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    default_args={
        'owner': 'data-team',
        'retries': 2,
        'retry_delay': timedelta(minutes=5),
        'retry_exponential_backoff': True,
        'max_active_tis_per_dag': 20,
        'depends_on_past': False,
        'trigger_rule': 'all_done',  # Continue even if upstream tasks fail
    },
    tags=['yfinance', 'historical', 'parallel'],
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
def yfinance_historical_parallel():
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
            'sp500': pipeline.scrape_sp500_tickers,
            'russell3000': pipeline.scrape_russell3000_tickers,
            'nasdaq': pipeline.scrape_nasdaq_tickers,
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
    def convert_to_ticker_list(ticker_groupings: dict) -> List[Tuple[str, List[str]]]:
        """Convert ticker groupings dict to list of tuples for task mapping"""
        logger.info(f"Converting {len(ticker_groupings)} tickers to list format")

        ticker_list = [(ticker, groupings) for ticker, groupings in ticker_groupings.items()]

        logger.success(f"Converted {len(ticker_list)} tickers for parallel processing")
        return ticker_list

    @task(retries=2, retry_delay=timedelta(minutes=1))
    def validate_single_ticker(ticker_data: Tuple[str, List[str]]) -> Dict[str, Any]:
        """Validate single ticker with yfinance (MAPPED TASK)"""
        ticker, groupings = ticker_data

        pipeline = YfinancePipeline()
        is_valid = pipeline.validate_ticker(ticker)

        if is_valid:
            logger.debug(f"✓ {ticker} is valid")
            return {
                'ticker': ticker,
                'groupings': groupings,
                'valid': True
            }
        else:
            logger.warning(f"✗ {ticker} is invalid")
            return {
                'ticker': ticker,
                'groupings': groupings,
                'valid': False
            }

    @task
    def filter_valid_tickers(validation_results: List[Dict[str, Any]]) -> List[Tuple[str, List[str]]]:
        """Filter out invalid tickers and return list of valid ticker tuples"""
        valid_tickers = []
        invalid_tickers = []

        for result in validation_results:
            if result['valid']:
                valid_tickers.append((result['ticker'], result['groupings']))
            else:
                invalid_tickers.append(result['ticker'])

        logger.success(f"Valid: {len(valid_tickers)}, Invalid: {len(invalid_tickers)}")

        if invalid_tickers and len(invalid_tickers) <= 20:
            logger.warning(f"Invalid tickers: {invalid_tickers}")

        return valid_tickers

    @task(retries=2, retry_delay=timedelta(minutes=1))
    def register_security(ticker_data: Tuple[str, List[str]]) -> Dict[str, Any]:
        """Register single ticker in database (MAPPED TASK)"""
        ticker, groupings = ticker_data

        client = YfinanceClient(get_database_url())
        result = client.insert_security(ticker, groupings)

        if not result['success'] and result['rows_affected'] == 0:
            logger.info(f"{ticker} already exists")
        else:
            logger.debug(f"✓ Registered {ticker} with groupings: {groupings}")

        return {
            'ticker': ticker,
            'groupings': groupings,
            'registered': True
        }

    @task(retries=3, retry_delay=timedelta(minutes=2))
    def download_ohlcv(ticker_data: Dict[str, Any], **context) -> Dict[str, Any]:
        """Download historical OHLCV for single ticker (MAPPED TASK)"""
        ticker = ticker_data['ticker']
        years_back = context['params']['years_back']

        pipeline = YfinancePipeline()

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=365 * years_back)

        # Download OHLCV data
        df = pipeline.scrape_date_range(ticker, start_date, end_date)

        if df is None or df.empty:
            raise ValueError(f"No OHLCV data for {ticker}")

        logger.debug(f"✓ Downloaded {len(df)} rows for {ticker}")

        return {
            'ticker': ticker,
            'rows': len(df),
            'data': df.to_json(date_format='iso', orient='split')
        }

    @task(retries=1, retry_delay=timedelta(minutes=1))
    def validate_ohlcv_data(download_result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate OHLCV data quality with Great Expectations (MAPPED TASK)"""
        ticker = download_result['ticker']

        # Deserialize DataFrame from JSON (using StringIO to avoid deprecation warning)
        df = pd.read_json(StringIO(download_result['data']), orient='split')

        pipeline = YfinancePipeline()
        validation_result = pipeline.validate_ohlcv(df, ticker)

        if not validation_result['valid']:
            failed_checks_str = ', '.join(validation_result['failed_checks'])
            logger.error(
                f"✗ {ticker} validation failed - "
                f"{validation_result['failed']}/{validation_result['total_checks']} checks failed. "
                f"Failed checks: {failed_checks_str}"
            )
            raise ValueError(
                f"OHLCV validation failed for {ticker}: "
                f"{validation_result['failed']} checks failed. "
                f"Failed: {failed_checks_str}"
            )

        logger.info(
            f"✓ {ticker} passed validation - "
            f"{validation_result['passed']}/{validation_result['total_checks']} checks passed "
            f"({len(df)} rows)"
        )
        return download_result

    @task(retries=3, retry_delay=timedelta(minutes=1))
    def insert_ohlcv_data(validated_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert validated OHLCV data to database (MAPPED TASK)"""
        ticker = validated_data['ticker']

        # Deserialize DataFrame from JSON
        df = pd.read_json(StringIO(validated_data['data']), orient='split')

        # Reset index to make Date a column (required by client)
        df = df.reset_index().rename(columns={'index': 'Date'})

        client = YfinanceClient(get_database_url())
        result = client.insert_ohlcv(ticker, df)

        if not result['success']:
            raise ValueError(f"Insert failed: {result['message']}")

        logger.debug(f"✓ Inserted {result['rows_affected']} rows for {ticker}")

        return {
            'ticker': ticker,
            'rows_inserted': result['rows_affected'],
            'success': True
        }

    @task(retries=3, retry_delay=timedelta(minutes=2))
    def download_metadata(ohlcv_result: Dict[str, Any]) -> Dict[str, Any]:
        """Download metadata for single ticker (MAPPED TASK)"""
        ticker = ohlcv_result['ticker']

        pipeline = YfinancePipeline()
        metadata = pipeline.scrape_metadata(ticker)

        logger.debug(f"✓ Downloaded metadata for {ticker}")

        return {
            'ticker': ticker,
            'metadata': metadata
        }

    @task(retries=3, retry_delay=timedelta(minutes=1))
    def insert_metadata_data(metadata_result: Dict[str, Any]) -> Dict[str, Any]:
        """Insert metadata to database (MAPPED TASK)"""
        ticker = metadata_result['ticker']
        metadata = metadata_result['metadata']

        client = YfinanceClient(get_database_url())
        result = client.insert_metadata(ticker, metadata)

        if not result['success']:
            raise ValueError(f"Metadata insert failed: {result['message']}")

        logger.debug(f"✓ Inserted metadata for {ticker}")

        return {
            'ticker': ticker,
            'success': True
        }

    @task
    def generate_report(ohlcv_results: List[Dict[str, Any]], metadata_results: List[Dict[str, Any]]):
        """Generate summary report from all per-ticker results"""
        ohlcv_success = sum(1 for r in ohlcv_results if r.get('success'))
        metadata_success = sum(1 for r in metadata_results if r.get('success'))

        total_rows_inserted = sum(r.get('rows_inserted', 0) for r in ohlcv_results)

        report = f"""
        Pipeline Complete:

        OHLCV Data:
        - Processed: {len(ohlcv_results)} tickers
        - Success: {ohlcv_success}
        - Failed: {len(ohlcv_results) - ohlcv_success}
        - Total rows inserted: {total_rows_inserted}

        Metadata:
        - Processed: {len(metadata_results)} tickers
        - Success: {metadata_success}
        - Failed: {len(metadata_results) - metadata_success}
        """

        logger.info(report)
        return report

    # TASK FLOW WITH PARALLEL EXECUTION

    # Setup tasks (sequential)
    tickers_dict = get_tickers()
    ticker_list = convert_to_ticker_list(tickers_dict)

    # Parallel validation using .expand()
    validation_results = validate_single_ticker.expand(ticker_data=ticker_list)
    valid_ticker_list = filter_valid_tickers(validation_results)

    # Per-ticker parallel processing using .expand()
    registered = register_security.expand(ticker_data=valid_ticker_list)
    ohlcv_downloads = download_ohlcv.expand(ticker_data=registered)
    validated_ohlcv = validate_ohlcv_data.expand(download_result=ohlcv_downloads)
    ohlcv_inserts = insert_ohlcv_data.expand(validated_data=validated_ohlcv)
    metadata_downloads = download_metadata.expand(ohlcv_result=ohlcv_inserts)
    metadata_inserts = insert_metadata_data.expand(metadata_result=metadata_downloads)

    # Cleanup task (sequential)
    report = generate_report(ohlcv_inserts, metadata_inserts)

# Create DAG instance
dag_instance = yfinance_historical_parallel()