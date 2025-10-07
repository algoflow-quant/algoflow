# Native python imports
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Tuple
from io import StringIO

# Third-party imports
import pandas as pd
from airflow.decorators import dag, task #type: ignore
from airflow.models.param import Param #type: ignore

# Custom imports
from utils.database import get_database_url
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline
from sec_master_db.clients.yfinance_client import YfinanceClient
from loguru import logger


@dag(
    dag_id='yfinance_daily_parallel',
    description='Daily parallel stock updates (automatic at market close)',
    # Time-based scheduling: runs daily at 9:30 PM UTC (4:30 PM EST) on weekdays
    schedule='30 21 * * 1-5',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    default_args={
        'owner': 'data-team',
        'retries': 2,
        'retry_delay': timedelta(minutes=2),
        'retry_exponential_backoff': True,
        'max_active_tis_per_dag': 20,  # Allow 20 parallel ticker updates
        'depends_on_past': False,
        'trigger_rule': 'all_done',  # Continue even if some tickers fail
    },
    tags=['yfinance', 'daily', 'parallel', 'scheduled'],
    params={
        'days_back': Param(
            default=5,
            type='integer',
            minimum=1,
            maximum=30,
            description='Number of days to look back (default: 5 to catch weekends)'
        ),
        'update_metadata': Param(
            default=False,
            type='boolean',
            description='Force metadata update (auto-updates on Mondays)'
        ),
        'ticker_limit': Param(
            default=0,
            type='integer',
            minimum=0,
            maximum=5000,
            description='Limit number of tickers (0 = no limit, for testing)'
        ),
    },
)
def yfinance_daily_parallel():
    """
    Daily parallel stock data updates (automatic scheduling)

    Features:
    - Scheduled: Runs daily at 9:30 PM UTC (4:30 PM EST) on weekdays
    - Parallel execution: Each ticker processed independently (~30 at a time)
    - Smart date detection: Downloads last 5 days (catches weekends/holidays)
    - Fault tolerant: Individual ticker failures don't block others
    - Weekly metadata: Auto-updates on Mondays only
    """

    @task
    def get_existing_tickers(**context) -> List[str]:
        """Get all tickers from database that use yfinance provider"""
        logger.info("Getting all yfinance tickers from database...")

        try:
            limit = context['params']['ticker_limit']

            client = YfinanceClient(get_database_url())
            tickers = client.get_tickers()

            if not tickers:
                logger.warning("No tickers found in database")
                return []

            # Apply limit for testing
            if limit > 0:
                tickers = tickers[:limit]
                logger.info(f"Limited to {limit} tickers for testing")

            logger.success(f"Found {len(tickers)} tickers to update")
            return tickers

        except Exception as e:
            logger.error(f"Could not get tickers from DB: {e}")
            return []

    @task(
        retries=2,
        retry_delay=timedelta(minutes=1),
        map_index_template="{{ task.op_kwargs['ticker'] }}"
    )
    def download_ticker_ohlcv(ticker: str, **context) -> Dict[str, Any]:
        """Download recent OHLCV data for single ticker (MAPPED TASK)"""
        days_back = context['params']['days_back']

        pipeline = YfinancePipeline()

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)

        logger.debug(f"Downloading {ticker} from {start_date} to {end_date}")

        # Let exceptions propagate - Airflow will handle retries and failure
        df = pipeline.scrape_date_range(
            ticker=ticker,
            start_date=start_date,
            end_date=end_date,
            interval='1d'
        )

        if df is None or df.empty:
            # This is expected behavior, not an error - return safely
            logger.info(f"No new data for {ticker}")
            return {
                'ticker': ticker,
                'success': True,  # This IS success - ticker checked, no new data
                'rows': 0,
                'data': None
            }

        logger.success(f"Downloaded {len(df)} rows for {ticker}")

        return {
            'ticker': ticker,
            'success': True,
            'rows': len(df),
            'data': df.to_json(date_format='iso', orient='split')
        }

    @task(
        retries=1,
        retry_delay=timedelta(minutes=1),
        map_index_template="{{ task.op_kwargs['download_result']['ticker'] }}"
    )
    def validate_ticker_ohlcv(download_result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate OHLCV data quality (MAPPED TASK)"""
        ticker = download_result['ticker']

        # Skip validation if no data to validate
        if not download_result['success'] or download_result['data'] is None:
            return download_result

        # Deserialize DataFrame
        df = pd.read_json(StringIO(download_result['data']), orient='split')

        pipeline = YfinancePipeline()
        validation = pipeline.validate_ohlcv(df, ticker)

        if not validation['valid']:
            failed_str = ', '.join(validation['failed_checks'])
            logger.error(
                f"✗ {ticker} validation failed - "
                f"{validation['failed']}/{validation['total_checks']} checks failed. "
                f"Failed: {failed_str}"
            )
            return {
                'ticker': ticker,
                'success': False,
                'rows': 0,
                'message': f"Validation failed: {failed_str}"
            }

        logger.debug(
            f"✓ {ticker} validated - "
            f"{validation['passed']}/{validation['total_checks']} checks passed"
        )
        return download_result

    @task(
        retries=2,
        retry_delay=timedelta(minutes=1),
        map_index_template="{{ task.op_kwargs['validated_data']['ticker'] }}"
    )
    def insert_ticker_ohlcv(validated_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert validated OHLCV data (MAPPED TASK)"""
        ticker = validated_data['ticker']

        # Skip if validation failed or no data
        if not validated_data['success'] or validated_data['data'] is None:
            return {
                'ticker': ticker,
                'success': True,  # Success = processed correctly (no data to insert)
                'rows_inserted': 0
            }

        # Deserialize DataFrame
        df = pd.read_json(StringIO(validated_data['data']), orient='split')
        df = df.reset_index().rename(columns={'index': 'Date'})

        client = YfinanceClient(get_database_url())
        result = client.insert_ohlcv(ticker, df)

        if not result['success']:
            raise ValueError(f"Insert failed: {result['message']}")

        logger.success(f"✓ Inserted {result['rows_affected']} rows for {ticker}")

        return {
            'ticker': ticker,
            'success': True,
            'rows_inserted': result['rows_affected']
        }

    @task
    def check_metadata_update(**context) -> Dict[str, Any]:
        """Determine if metadata should be updated"""
        manual_update = context['params'].get('update_metadata', False)
        is_monday = datetime.now().weekday() == 0

        should_update = manual_update or is_monday

        if should_update:
            logger.info(f"Metadata update: Monday={is_monday}, Manual={manual_update}")
        else:
            logger.info("Skipping metadata update (only on Mondays or manual trigger)")

        return {
            'should_update': should_update,
            'reason': 'monday' if is_monday else 'manual' if manual_update else 'skipped'
        }

    @task(
        retries=2,
        retry_delay=timedelta(minutes=2),
        map_index_template="{{ task.op_kwargs['ticker'] }}"
    )
    def download_ticker_metadata(ticker: str, metadata_decision: Dict[str, Any]) -> Dict[str, Any]:
        """Download metadata for single ticker (MAPPED TASK)"""

        # Skip if metadata update not scheduled
        if not metadata_decision['should_update']:
            return {
                'ticker': ticker,
                'success': True,  # Success = processed correctly (skipped as intended)
                'skipped': True
            }

        # Let exceptions propagate - Airflow will handle retries and failure
        pipeline = YfinancePipeline()
        metadata = pipeline.scrape_metadata(ticker)

        logger.success(f"✓ Downloaded metadata for {ticker}")

        return {
            'ticker': ticker,
            'success': True,
            'metadata': metadata,
            'skipped': False
        }

    @task(
        retries=2,
        retry_delay=timedelta(minutes=1),
        map_index_template="{{ task.op_kwargs['metadata_result']['ticker'] }}"
    )
    def insert_ticker_metadata(metadata_result: Dict[str, Any]) -> Dict[str, Any]:
        """Insert metadata to database (MAPPED TASK)"""
        ticker = metadata_result['ticker']

        # Skip if not downloaded
        if metadata_result.get('skipped') or not metadata_result['success']:
            return metadata_result

        metadata = metadata_result['metadata']

        client = YfinanceClient(get_database_url())
        result = client.insert_metadata(ticker, metadata)

        if not result['success']:
            raise ValueError(f"Insert failed: {result['message']}")

        logger.success(f"✓ Inserted metadata for {ticker}")

        return {
            'ticker': ticker,
            'success': True,
            'skipped': False
        }

    @task
    def generate_summary(
        ohlcv_results: List[Dict[str, Any]],
        metadata_results: List[Dict[str, Any]],
        metadata_decision: Dict[str, Any]
    ):
        """Generate comprehensive summary report"""

        # OHLCV stats
        ohlcv_success = sum(1 for r in ohlcv_results if r.get('success') and r.get('rows_inserted', 0) > 0)
        ohlcv_no_data = sum(1 for r in ohlcv_results if r.get('success') and r.get('rows_inserted', 0) == 0)
        total_rows = sum(r.get('rows_inserted', 0) for r in ohlcv_results)

        # Note: Failed tasks won't appear in results due to Airflow failure handling
        # trigger_rule='all_done' ensures summary runs even with failures

        summary = f"""
        ═══════════════════════════════════════════════════════════
        Daily Update Complete - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        ═══════════════════════════════════════════════════════════

        OHLCV Data:
        ✓ Success:     {ohlcv_success:4d} tickers ({total_rows} rows inserted)
        No new data: {ohlcv_no_data:4d} tickers
        (Check Airflow UI for any failed tasks)
        """

        # Metadata stats (only if updated)
        if metadata_decision['should_update']:
            metadata_success = sum(1 for r in metadata_results if r.get('success') and not r.get('skipped'))
            metadata_skipped = sum(1 for r in metadata_results if r.get('skipped'))

            summary += f"""
        Metadata Update ({metadata_decision['reason']}):
        ✓ Success: {metadata_success:4d} tickers
        (Check Airflow UI for any failed tasks)
            """
        else:
            summary += """
        Metadata: Skipped (only updates on Mondays)
            """

        summary += "\n        ═══════════════════════════════════════════════════════════"

        logger.info(summary)
        return summary

    # TASK FLOW - PARALLEL EXECUTION

    # Setup: Get tickers to update
    tickers = get_existing_tickers()

    # Parallel OHLCV processing
    ohlcv_downloads = download_ticker_ohlcv.expand(ticker=tickers)
    validated_ohlcv = validate_ticker_ohlcv.expand(download_result=ohlcv_downloads)
    ohlcv_inserts = insert_ticker_ohlcv.expand(validated_data=validated_ohlcv)

    # Metadata decision (sequential)
    metadata_decision = check_metadata_update()

    # Parallel metadata processing (conditional on decision)
    metadata_downloads = download_ticker_metadata.expand(
        ticker=tickers,
        metadata_decision=metadata_decision
    )
    metadata_inserts = insert_ticker_metadata.expand(metadata_result=metadata_downloads)

    # Summary report
    summary = generate_summary(ohlcv_inserts, metadata_inserts, metadata_decision)


# Create DAG instance
dag_instance = yfinance_daily_parallel()
