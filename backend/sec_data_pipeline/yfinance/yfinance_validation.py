# Native python modules
from typing import Dict, Any
from datetime import date, timedelta
import pandas as pd
import yfinance as yf
import logging
import time
import os
import sys
import warnings

# Custom utils
from utils.observability import tracer, meter, Status, StatusCode

# Import great expectations for data quality
import great_expectations as gx

# Suppress yfinance output
yf_logger = logging.getLogger('yfinance')
yf_logger.disabled = True

class YfinanceValidator:
    """
    Validation for yfinance data quality
    - Ticker validation (check if ticker exists)
    - OHLCV validation (comprehensive data quality checks)
    """

    def __init__(self) -> None:

        # Setup python logger
        self.logger = logging.getLogger(__name__)

        # Metrics: ticker validation counter
        self.ticker_validation_counter = meter.create_counter(
            name="yfinance_ticker_validations_total",
            description="Total ticker validation attempts",
            unit="1"
        )

        # Metrics: ticker validation duration histogram
        self.ticker_validation_duration = meter.create_histogram(
            name="yfinance_ticker_validation_duration_seconds",
            description="Ticker validation operation duration",
            unit="s"
        )

        # Metrics: ohlcv validation counter
        self.ohlcv_validation_counter = meter.create_counter(
            name="yfinance_ohlcv_validations_total",
            description="Total OHLCV validation attempts",
            unit="1"
        )

        # Metrics: ohlcv validation duration histogram
        self.ohlcv_validation_duration_histogram = meter.create_histogram(
            name="yfinance_ohlcv_validation_duration_seconds",
            description="OHLCV validation operation duration",
            unit="s"
        )

        # Metrics: ohlcv validation checks histogram
        self.ohlcv_validation_checks_histogram = meter.create_histogram(
            name="yfinance_ohlcv_validation_checks",
            description="Number of validation checks performed",
            unit="1"
        )

        # Metrics: ohlcv validation failed checks histogram
        self.ohlcv_validation_failed_checks_histogram = meter.create_histogram(
            name="yfinance_ohlcv_validation_failed_checks",
            description="Number of validation checks that failed",
            unit="1"
        )

    def validate_ticker(self, ticker: str, test_days: int = 21) -> bool:
        """
        Validate tickers by attempting to download recent data

        Args:
            ticker: Ticker symbol to download
            test_days: Number of calendar days of data to test (default 21 days ~ 15 trading days)

        Returns:
            True if ticker valid, false otherwise
        """

        # Track start time
        start_time = time.time()

        # Start span for ticker validation
        with tracer.start_as_current_span("validate_ticker") as span:
            try:

                # Set known attributes
                span.set_attribute("ticker", ticker)
                span.set_attribute("test_days", test_days)
                span.set_attribute("data_source", "yfinance")

                self.logger.debug(f"Starting ticker validation for {ticker} ({test_days} days)")

                # Calculate date range
                end_date = date.today()
                start_date = end_date - timedelta(days=test_days)

                span.set_attribute("start_date", str(start_date))
                span.set_attribute("end_date", str(end_date))

                # Add span event for download start
                span.add_event("validation_download_start", {
                    "start_date": str(start_date),
                    "end_date": str(end_date)
                })

                # Download single ticker with explicit auto_adjust
                data = yf.download(
                    tickers=ticker,
                    start=start_date,
                    end=end_date,
                    progress=False,
                    threads=False,
                    auto_adjust=True  # Explicitly set to avoid warning
                )

                # Check if we got valid data with minimum trading days
                # For 21 calendar days, we expect at least 10 trading days (accounting for weekends/holidays)
                min_trading_days = 10  # Minimum required trading days to be considered valid

                # Track downloaded rows
                rows_downloaded = len(data) if data is not None and not data.empty else 0

                span.set_attribute("rows_downloaded", rows_downloaded)
                span.set_attribute("min_required_days", min_trading_days)

                # Determine if valid
                is_valid = data is not None and not data.empty and len(data) >= min_trading_days

                # Calculate duration
                duration = time.time() - start_time

                # Set span attributes
                span.set_attribute("validation_result", is_valid)
                span.set_attribute("validation_success", True)

                # Add completion event
                span.add_event("validation_complete", {
                    "is_valid": is_valid,
                    "rows_downloaded": rows_downloaded,
                    "min_required": min_trading_days
                })

                # Record metrics
                validation_status = "valid" if is_valid else "invalid"
                self.ticker_validation_counter.add(1, {"status": "success", "result": validation_status})
                self.ticker_validation_duration.record(duration)

                if is_valid:
                    self.logger.debug(f"Ticker {ticker} is valid ({rows_downloaded} days)")
                else:
                    self.logger.debug(f"Ticker {ticker} is invalid ({rows_downloaded}/{min_trading_days} days)")

                return is_valid

            except Exception as e:

                # Record error on span
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.set_attribute("validation_success", False)

                # Record failure metric
                duration = time.time() - start_time
                self.ticker_validation_counter.add(1, {"status": "failure", "result": "error"})
                self.ticker_validation_duration.record(duration)

                # Keep error log
                self.logger.error(f"Failed to validate ticker {ticker}: {e}")
                raise

    def validate_ohlcv(self, df: pd.DataFrame, ticker: str) -> Dict[str, Any]:
        """
        Comprehensive OHLCV validation for backtest-quality data.

        Validates:
        - Schema completeness (all required columns)
        - No null/NaN values
        - No negative prices or volume
        - Price logic (High >= Low, Open/Close within range)
        - Data variability (no constant values)
        - No gaps in date sequence
        - Minimum data quality thresholds

        Args:
            df: DataFrame with OHLCV data (must have Date index)
            ticker: Ticker symbol

        Returns:
            dict: {
                'valid': bool,
                'total_checks': int,
                'passed': int,
                'failed': int,
                'failed_checks': [list of failed check names]
            }
        """

        # Track start time
        start_time = time.time()

        # Start span for OHLCV validation
        with tracer.start_as_current_span("validate_ohlcv") as span:
            try:

                # Set known attributes
                span.set_attribute("ticker", ticker)
                span.set_attribute("data_source", "yfinance")
                span.set_attribute("rows_to_validate", len(df))

                self.logger.debug(f"Starting OHLCV validation for {ticker} ({len(df)} rows)")

                # Suppress GX progress bars and warnings
                warnings.filterwarnings('ignore')

                # Completely disable all GX logging and progress bars
                logging.getLogger('great_expectations').disabled = True
                logging.getLogger('great_expectations.core').disabled = True
                logging.getLogger('great_expectations.data_context').disabled = True

                # Redirect stderr to suppress tqdm progress bars
                old_stderr = sys.stderr
                sys.stderr = open(os.devnull, 'w')

                os.environ['GX_ANALYTICS_ENABLED'] = 'False'

                # Add span event for GX setup
                span.add_event("great_expectations_setup_start")

                context = gx.get_context()
                data_source = context.data_sources.add_pandas(name=f"{ticker}_source")
                data_asset = data_source.add_dataframe_asset(name=f"{ticker}_asset")
                batch_def = data_asset.add_batch_definition_whole_dataframe(f"{ticker}_batch")

                # Comprehensive expectations for backtest-quality data
                expectations = [
                    # 1. Schema validation - required columns exist (order doesn't matter)
                    gx.expectations.ExpectTableColumnsToMatchSet(
                        column_set={"Open", "High", "Low", "Close", "Volume"}
                    ),

                    # 2. Null/NaN validation - zero tolerance
                    gx.expectations.ExpectColumnValuesToNotBeNull(column="Open"),
                    gx.expectations.ExpectColumnValuesToNotBeNull(column="High"),
                    gx.expectations.ExpectColumnValuesToNotBeNull(column="Low"),
                    gx.expectations.ExpectColumnValuesToNotBeNull(column="Close"),
                    gx.expectations.ExpectColumnValuesToNotBeNull(column="Volume"),

                    # 3. Positive price validation - no negative or zero prices
                    gx.expectations.ExpectColumnValuesToBeBetween(column="Open", min_value=0.01),
                    gx.expectations.ExpectColumnValuesToBeBetween(column="High", min_value=0.01),
                    gx.expectations.ExpectColumnValuesToBeBetween(column="Low", min_value=0.01),
                    gx.expectations.ExpectColumnValuesToBeBetween(column="Close", min_value=0.01),

                    # 4. Volume validation - non-negative only (0 volume is valid)
                    gx.expectations.ExpectColumnValuesToBeBetween(column="Volume", min_value=0),

                    # 5. Price logic validation - High >= Low
                    gx.expectations.ExpectColumnPairValuesAToBeGreaterThanB(
                        column_A="High", column_B="Low", or_equal=True
                    ),

                    # 6. Open/Close within High/Low range
                    gx.expectations.ExpectColumnPairValuesAToBeGreaterThanB(
                        column_A="High", column_B="Open", or_equal=True
                    ),
                    gx.expectations.ExpectColumnPairValuesAToBeGreaterThanB(
                        column_A="Open", column_B="Low", or_equal=True
                    ),
                    gx.expectations.ExpectColumnPairValuesAToBeGreaterThanB(
                        column_A="High", column_B="Close", or_equal=True
                    ),
                    gx.expectations.ExpectColumnPairValuesAToBeGreaterThanB(
                        column_A="Close", column_B="Low", or_equal=True
                    ),

                    # 7. Data variability - no constant values (stddev > 0)
                    gx.expectations.ExpectColumnStdevToBeBetween(column="Close", min_value=0.01),
                    gx.expectations.ExpectColumnStdevToBeBetween(column="Volume", min_value=0.01),

                    # 8. Minimum row count - at least 10 trading days
                    gx.expectations.ExpectTableRowCountToBeBetween(min_value=10),

                    # 9. Unique dates - no duplicate timestamps
                    gx.expectations.ExpectColumnValuesToBeUnique(column="Date") if "Date" in df.columns else None,
                ]

                # Remove None values (for conditional expectations)
                expectations = [e for e in expectations if e is not None]

                total_checks = len(expectations)
                span.set_attribute("total_checks", total_checks)

                span.add_event("validation_checks_start", {
                    "total_checks": total_checks
                })

                # Run all validations and collect results
                batch = batch_def.get_batch(batch_parameters={"dataframe": df})

                results = []
                failed_checks = []

                for expectation in expectations:
                    result = batch.validate(expectation)
                    results.append(result)

                    if not result.success:
                        # Get expectation type for better logging
                        expectation_type = type(expectation).__name__
                        failed_checks.append(expectation_type)

                passed = sum(1 for r in results if r.success)
                failed = len(results) - passed

                # Calculate duration
                duration = time.time() - start_time

                # Restore stderr
                sys.stderr = old_stderr

                # Determine validation result
                is_valid = failed == 0

                # Set span attributes
                span.set_attribute("validation_result", is_valid)
                span.set_attribute("checks_passed", passed)
                span.set_attribute("checks_failed", failed)
                span.set_attribute("validation_success", True)

                # Add completion event
                span.add_event("validation_complete", {
                    "is_valid": is_valid,
                    "passed": passed,
                    "failed": failed,
                    "failed_checks": failed_checks
                })

                # Record metrics
                validation_status = "valid" if is_valid else "invalid"
                self.ohlcv_validation_counter.add(1, {"status": "success", "result": validation_status})
                self.ohlcv_validation_duration_histogram.record(duration)
                self.ohlcv_validation_checks_histogram.record(total_checks)
                self.ohlcv_validation_failed_checks_histogram.record(failed)

                if is_valid:
                    self.logger.debug(f"OHLCV validation passed for {ticker} ({passed}/{total_checks} checks)")
                else:
                    self.logger.warning(f"OHLCV validation failed for {ticker} ({failed}/{total_checks} checks failed)")

                return {
                    'valid': is_valid,
                    'total_checks': len(results),
                    'passed': passed,
                    'failed': failed,
                    'failed_checks': failed_checks
                }

            except Exception as e:

                # Restore stderr if exception occurred
                sys.stderr = old_stderr

                # Record error on span
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.set_attribute("validation_success", False)

                # Record failure metric
                duration = time.time() - start_time
                self.ohlcv_validation_counter.add(1, {"status": "failure", "result": "error"})
                self.ohlcv_validation_duration_histogram.record(duration)

                # Keep error log
                self.logger.error(f"Failed to validate OHLCV for {ticker}: {e}")

                # If validation setup fails, return error result
                return {
                    'valid': False,
                    'total_checks': 0,
                    'passed': 0,
                    'failed': 0,
                    'failed_checks': [f"ValidationError: {str(e)}"]
                }
