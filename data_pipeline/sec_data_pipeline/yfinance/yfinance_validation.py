# type: ignore

# Native python modules
from typing import Dict, Any
from datetime import date, timedelta
import pandas as pd
import yfinance as yf
import logging

# Suppress yfinance output
yf_logger = logging.getLogger('yfinance')
yf_logger.disabled = True

# Import great expectations for data quality
import great_expectations as gx

class YfinanceValidation:
    """
    Validation for ticker symbols and OHLCV data quality
    - Ticker validation with test downloads
    - OHLCV validation with Great Expectations
    """

    # Validation constants
    TICKER_VALIDATION_TEST_DAYS = 21  # Calendar days to test ticker validity
    MIN_TRADING_DAYS_FOR_VALIDATION = 10  # Minimum trading days required for valid ticker
    MIN_OHLCV_ROWS_FOR_VALIDATION = 10  # Minimum rows required for OHLCV validation
    MIN_PRICE_VALUE = 0.01  # Minimum valid price (prevents zero/negative prices)
    MIN_STDDEV_VALUE = 0.01  # Minimum standard deviation (detects constant values)

    def validate_ticker(self, ticker: str, test_days: int = 21) -> bool:
        """
        Validates a ticker by test-downloading recent data and checking if yfinance
        returns enough trading days. Catches delisted stocks, bad symbols, and API
        issues before bulk downloading.

        Downloads 21 calendar days (about 15 trading days) and checks if we got
        at least 10 trading days back. Threshold accounts for weekends, holidays,
        and newly listed stocks.

        Args:
            ticker: Symbol to validate
            test_days: Calendar days to test (default 21)

        Returns:
            True if yfinance returned >=10 trading days, False otherwise
        """

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=test_days)

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
        if data is not None and not data.empty and len(data) >= self.MIN_TRADING_DAYS_FOR_VALIDATION:
            return True
        else:
            return False

    def validate_ohlcv(self, df: pd.DataFrame, ticker: str) -> Dict[str, Any]:
        """
        Runs 18 Great Expectations checks on OHLCV data to catch API glitches,
        incomplete data, and bad values before they hit the database.

        Checks cover schema completeness, null values, price logic (High >= Low,
        Open/Close within bounds), data quality (stddev > 0.01, min 10 rows,
        unique dates), and reasonable values (prices > $0.01, volume >= 0).

        Args:
            df: DataFrame with Open, High, Low, Close, Volume columns
            ticker: Symbol for error messages

        Returns:
            Dict with validation results:
                - valid (bool): True if all checks passed
                - total_checks (int): Should be 18
                - passed (int): Checks that passed
                - failed (int): Checks that failed
                - failed_checks (list): Names of failed expectations

        Raises:
            Exception: If Great Expectations framework fails
        """
        # type: ignore - Great Expectations type stubs incomplete

        # Suppress GX progress bars and warnings
        import warnings
        import logging
        import os
        import sys

        warnings.filterwarnings('ignore')

        # Completely disable all GX logging and progress bars
        logging.getLogger('great_expectations').disabled = True
        logging.getLogger('great_expectations.core').disabled = True
        logging.getLogger('great_expectations.data_context').disabled = True

        # Redirect stderr to suppress tqdm progress bars
        old_stderr = sys.stderr
        sys.stderr = open(os.devnull, 'w')

        os.environ['GX_ANALYTICS_ENABLED'] = 'False'

        try:
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
                gx.expectations.ExpectColumnValuesToBeBetween(column="Open", min_value=self.MIN_PRICE_VALUE),
                gx.expectations.ExpectColumnValuesToBeBetween(column="High", min_value=self.MIN_PRICE_VALUE),
                gx.expectations.ExpectColumnValuesToBeBetween(column="Low", min_value=self.MIN_PRICE_VALUE),
                gx.expectations.ExpectColumnValuesToBeBetween(column="Close", min_value=self.MIN_PRICE_VALUE),

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
                gx.expectations.ExpectColumnStdevToBeBetween(column="Close", min_value=self.MIN_STDDEV_VALUE),
                gx.expectations.ExpectColumnStdevToBeBetween(column="Volume", min_value=self.MIN_STDDEV_VALUE),

                # 8. Minimum row count - at least 10 trading days
                gx.expectations.ExpectTableRowCountToBeBetween(min_value=self.MIN_OHLCV_ROWS_FOR_VALIDATION),

                # 9. Unique dates - no duplicate timestamps
                gx.expectations.ExpectColumnValuesToBeUnique(column="Date") if "Date" in df.columns else None,
            ]

            # Remove None values (for conditional expectations)
            expectations = [e for e in expectations if e is not None]

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

            # Restore stderr
            sys.stderr = old_stderr

            return {
                'valid': failed == 0,
                'total_checks': len(results),
                'passed': passed,
                'failed': failed,
                'failed_checks': failed_checks
            }

        except Exception as e:
            # Restore stderr
            sys.stderr = old_stderr

            # If validation setup fails, raise exception for Airflow to retry
            raise Exception(f"OHLCV validation framework failed for {ticker}: {str(e)}") from e
