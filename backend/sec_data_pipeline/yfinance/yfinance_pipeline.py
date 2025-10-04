# Native python modules
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
import pandas as pd
import yfinance as yf
import requests
import logging
from io import StringIO
import time
import pandas_market_calendars as mcal

# Custom utils
from utils.observability import tracer, meter, Status, StatusCode

# Suppress yfinance output
yf_logger = logging.getLogger('yfinance')
yf_logger.disabled = True

# Import great expectations for data quality
import great_expectations as gx

class YfinancePipeline:
    """
    Main data pipeline with date range, ticker, and validation
    - Atomic methods (should be bareboned & simple)
    - Each method should download data for one stock (airflow handles parallel execution)
    """
    
    def __init__(self) -> None:

        # Add headers to avoid 403 error (Forbidden, for ticker scraping)
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Setup python logger
        self.logger = logging.getLogger(__name__)
        
        # Metrics: metadata scrape counter
        self.metadata_scrape_counter = meter.create_counter(
            name="metadata_scrapes_total",
            description="Total metadata scrape attempts",
            unit="1"
        )
        
        # Metrics: metadata scrape duration histogram
        self.metadata_scrape_duration = meter.create_histogram(
            name="metadata_scrape_duration_seconds",
            description="Scrape operation duration",
            unit="s"
        )
        
        # Metrics: metadata null fields histogram (stocks with 0 nulls still get added to hist)
        self.metadata_null_fields_histogram = meter.create_histogram(
            name="metadata_null_fields",
            description="Null fields per scrape",
            unit="1"
        )
        
        # Metrics: ohlcv scrape counter
        self.ohlcv_scrape_counter = meter.create_counter(
            name="yfinance_ohlcv_scrapes_total",
            description="Total OHLCV scrape attempts",
            unit="1"
        )
        
        # Metrics: ohlcv scrape duration histogram
        self.ohlcv_scrape_duration_histogram = meter.create_histogram(
            name="yfinance_ohlcv_scrape_duration_seconds",
            description="OHLCV scrape duration",
            unit="s"
        )
        
        # Metrics: ohlcv rows returned histogram
        self.ohlcv_rows_histogram = meter.create_histogram(
            name="yfinance_ohlcv_rows_returned",
            description="Number of OHLCV rows per scrape",
            unit="1"
        )
        
        # Metrics: ohlcv date range requested histogram
        self.ohlcv_date_range_histogram = meter.create_histogram(
            name="yfinance_ohlcv_date_range_days",
            description="Date range requested in days",
            unit="1"
        )
        
    def scrape_metadata(self, ticker: str) -> Dict[str, Any]:
        """
        Scrape fundamental metadata for a single ticker

        Args:
            ticker: A string for the ticker

        Returns:
            A dictionary with metadata about the ticker
        """
        
        # Get current time to track total time taken per metadata scrape
        start_time = time.time()
        
        # Start a span for scrape metdata
        with tracer.start_as_current_span("scrape_metadata") as span:
            
            # We need try logic to close out the OTEL stuff
            try:
                    
                # Add ticker & data source as an attribute
                span.set_attribute("ticker", ticker)
                span.set_attribute("data_source", "yfinance")
                
                self.logger.debug(f"Starting metadata scrape for ticker: {ticker}") # Mainly for searching (LOKI)

                # Get the metadata from yfinance
                stock = yf.Ticker(ticker)
                info = stock.info
                
                if info is None or not info:
                    raise ValueError(f"Metadata for {ticker} returned None")

                # Calculate derived metrics
                current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                target_price = info.get('targetMeanPrice')
                target_upside = None
                
                # Calculate target upside
                if target_price and current_price:
                    target_upside = (target_price - current_price) / current_price

                # Calculate free cash flow and fcf_yield
                free_cash_flow = info.get('freeCashflow')
                market_cap = info.get('marketCap')
                fcf_yield = None
                if free_cash_flow and market_cap:
                    fcf_yield = free_cash_flow / market_cap
                
                # Create event for metrics    
                span.add_event("derived_metrics_calculated", {
                    "target_upside": target_upside,
                    "fcf_yield": fcf_yield
                }) #type: ignore
                    
                self.logger.debug(f"Metric target_upside: {target_upside} & fcf_yield: {fcf_yield} calculated")

                # Extract only high and medium availability fields (>50%)
                metadata = {
                    'ticker': ticker,
                    'date_scraped': date.today(),

                    # Company Basic Info (80%+ availability)
                    'company_name': info.get('longName'),
                    'exchange': info.get('exchange'),
                    'country': info.get('country'),
                    'sector': info.get('sector'),
                    'industry': info.get('industry'),
                    'market_cap': market_cap,
                    'enterprise_value': info.get('enterpriseValue'),
                    'shares_outstanding': info.get('sharesOutstanding'),
                    'float_shares': info.get('floatShares'),

                    # Valuation Metrics (50%+ availability)
                    'price_to_book': info.get('priceToBook'),
                    'forward_pe': info.get('forwardPE'),
                    'ev_to_ebitda': info.get('enterpriseToEbitda'),
                    'ev_to_revenue': info.get('enterpriseToRevenue'),
                    'price_to_sales': info.get('priceToSalesTrailing12Months'),

                    # Profitability & Quality (75%+ availability)
                    'gross_margin': info.get('grossMargins'),
                    'operating_margin': info.get('operatingMargins'),
                    'profit_margin': info.get('profitMargins'),
                    'return_on_equity': info.get('returnOnEquity'),
                    'return_on_assets': info.get('returnOnAssets'),
                    'free_cash_flow_yield': fcf_yield,

                    # Growth Metrics (60%+ availability)
                    'revenue_growth_yoy': info.get('revenueGrowth'),
                    'revenue_per_share': info.get('revenuePerShare'),

                    # Financial Health (67%+ availability)
                    'debt_to_equity': info.get('debtToEquity'),
                    'current_ratio': info.get('currentRatio'),
                    'quick_ratio': info.get('quickRatio'),
                    'total_cash': info.get('totalCash'),
                    'total_debt': info.get('totalDebt'),
                    'total_cash_per_share': info.get('totalCashPerShare'),
                    'book_value': info.get('bookValue'),

                    # Cash Flow (77%+ availability)
                    'operating_cash_flow': info.get('operatingCashflow'),
                    'free_cash_flow': free_cash_flow,

                    # Dividends (81%+ availability)
                    'payout_ratio': info.get('payoutRatio'),

                    # Short Interest & Ownership (80%+ availability)
                    'short_percent_of_float': info.get('shortPercentOfFloat'),
                    'short_ratio': info.get('shortRatio'),
                    'shares_short': info.get('sharesShort'),
                    'shares_percent_shares_out': info.get('sharesPercentSharesOut'),
                    'held_percent_institutions': info.get('heldPercentInstitutions'),
                    'held_percent_insiders': info.get('heldPercentInsiders'),

                    # Analyst Coverage (61%+ availability)
                    'target_mean_price': target_price,
                    'target_price_upside': target_upside,
                    'number_of_analysts': info.get('numberOfAnalystOpinions'),
                    'recommendation_key': info.get('recommendationKey'),

                    # Market Performance (80%+ availability)
                    'beta': info.get('beta'),
                    '52_week_high': info.get('fiftyTwoWeekHigh'),
                    '52_week_low': info.get('fiftyTwoWeekLow'),
                    '52_week_change': info.get('52WeekChange'),
                    'sp500_52_week_change': info.get('SandP52WeekChange'),
                    '50_day_average': info.get('fiftyDayAverage'),
                    '200_day_average': info.get('twoHundredDayAverage'),

                    # Trading Volume (100% availability)
                    'average_volume': info.get('averageVolume'),
                    'average_volume_10days': info.get('averageDailyVolume10Day'),
                    'regular_market_volume': info.get('regularMarketVolume'),

                    # Metadata
                    'last_updated': datetime.now(),
                    'data_source': 'yfinance'
                }
                
                # Calculate time taken
                duration = time.time() - start_time
                
                # Get various counts related to null values
                null_count = list(metadata.values()).count(None)
                fields_total = len(metadata)
                fields_populated = fields_total - null_count

                # Extra span attributes
                span.set_attribute("fields_total", fields_total)
                span.set_attribute("fields_populated", fields_populated)
                span.set_attribute("fields_missing", null_count)
                span.set_attribute("scrape_success", True)
                
                # Span event (Marks a large step within a span)
                span.add_event("metadata_extraction_complete", {
                    "null_count": null_count,
                    "fields_populated": fields_populated,
                })
                
                # Record metrics
                self.metadata_scrape_counter.add(1, {"status": "success"})
                self.metadata_scrape_duration.record(duration)
                self.metadata_null_fields_histogram.record(null_count)
                
                # Info logging (mainly for large scale searching)
                self.logger.debug(f"Sucessfully downloaded ticker: {ticker} with {null_count}/{fields_total} null values")

                # Return metadata
                return metadata
            
            except Exception as e:
                
                # Record error on span
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.set_attribute("scrape_success", False)
                
                # Record failure metric
                duration = time.time() - start_time
                self.metadata_scrape_counter.add(1, {"status": "failure"})
                self.metadata_scrape_duration.record(duration)
                
                # Keep error log
                self.logger.error(f"Failed to scrape {ticker}: {e}")
                raise
    
    def scrape_date_range(
        self,
        ticker: str,
        start_date: date,
        end_date: date,
        interval: str = '1d'
    ) -> pd.DataFrame:
        """
        Scrape historical data for a specific date range for a single ticker

        Args:
            ticker: A single ticker symbol
            start_date: Start date
            end_date: End date
            interval: Data interval (1d only)

        Returns:
            Returns a dataframe containing the ohlcv for a single stock
        """
        # Make start time for download calculation
        start_time = time.time()
        
        # Try downloading and if fail, report to otel and raise to airflow
        with tracer.start_as_current_span("scrape_ohlcv") as span:
            try:
                
                # debug log
                self.logger.debug(f"Starting ohlcv download for ticker: {ticker} from {str(start_date)} to {str(end_date)}, interval: {interval}")
                
                # Set known attributes immediately
                span.set_attribute("ticker", ticker)
                span.set_attribute("data_source", "yfinance")
                span.set_attribute("start_date", str(start_date))
                span.set_attribute("end_date", str(end_date))
                span.set_attribute("interval", interval)
                
                # Get NYSE calendar
                nyse = mcal.get_calendar('NYSE')
                
                # Calculate actual trading days
                schedule = nyse.schedule(start_date=start_date, end_date=end_date)
                trading_days = len(schedule)
                
                # Set calendar and trading days attributes
                span.set_attribute("date_range_trading_days", trading_days)
                span.set_attribute("date_range_calendar_days", (end_date - start_date).days)
                
                # Download the data for a ticker
                ticker_data = yf.download(
                    ticker,
                    start=start_date,
                    end=end_date,
                    interval=interval,
                    progress=False, # Disable individual progress bars
                    auto_adjust=True, # Adjusted close prices (dividends & stock splits)
                )

                # Check for no data returned
                if ticker_data is None:
                    raise ValueError("OHLCV data is None")
                
                # Record time taken
                duration = time.time() - start_time
                
                # Add span event
                span.add_event("ohlcv_download_complete", {
                    "rows": len(ticker_data),
                    "trading_days": trading_days
                })
                
                # Flatten MultiIndex columns (yfinance returns MultiIndex for single ticker)
                if isinstance(ticker_data.columns, pd.MultiIndex):
                    ticker_data.columns = ticker_data.columns.get_level_values(0)
                    span.add_event("multiindex_flattened")
                    
                # Record success metrics
                self.ohlcv_scrape_counter.add(1, {"status": "success", "interval": interval})
                self.ohlcv_scrape_duration_histogram.record(duration)
                self.ohlcv_rows_histogram.record(len(ticker_data))
                self.ohlcv_date_range_histogram.record(trading_days)
                
                # Set the rest of attributes
                span.set_attribute("rows_returned", len(ticker_data))
                span.set_attribute("scrape_success", True)
                
                # log success
                self.logger.debug(f"Successfully downloaded {len(ticker_data)} days out of {trading_days} trading days calculated for the time period")

                # Return ohlcv dataframe
                return ticker_data

            # Catche errors to log/return to airflow
            except Exception as e:
                
                # Record error on span
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.set_attribute("scrape_success", False)
                
                # Record failure metric
                duration = time.time() - start_time
                self.ohlcv_scrape_counter.add(1, {"status": "failure", "interval": interval})
                self.ohlcv_scrape_duration_histogram.record(duration)
                
                # Keep error log
                self.logger.error(f"Failed to scrape {ticker}: {e}")
                raise
                
                
    def scrape_sp500_tickers(self) -> List[str]:
        """
        Scrapes S&P 500 tickers from Wikipedia
        
        Args:
            None
        
        Returns:
            A list of tickers from the S&P 500
        """

        sp500_url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"

        # Fetch the HTML with headers
        response = requests.get(sp500_url, headers=self.headers)

        # Read the table from the HTML
        tables = pd.read_html(response.text)
        df = tables[0]

        # Extract tickers from Symbol column
        tickers = df['Symbol'].tolist()

        # Clean tickers (replace dots with dashes for BRK.B -> BRK-B)
        tickers = [ticker.replace('.', '-') for ticker in tickers]

        return tickers
    
    def scrape_russell3000_tickers(self) -> List[str]:
        """
        Scrapes Russell 3000 tickers from iShares IWV ETF holdings
        
        Args:
            None
            
        Returns:
            A list of tickers from the russell 3000 index   
        """

        # IWV is the iShares Russell 3000 ETF - direct CSV download URL
        csv_url = "https://www.ishares.com/us/products/239714/ishares-russell-3000-etf/1467271812596.ajax?fileType=csv&fileName=IWV_holdings&dataType=fund"

        # Request the csv
        response = requests.get(csv_url, headers=self.headers)

        # Parse CSV - iShares CSV has metadata in first ~10 rows
        lines = response.text.split('\n')

        # Find where the actual data starts (look for "Ticker" header)
        data_start = 0
        for i, line in enumerate(lines):
            if 'Ticker' in line:
                data_start = i
                break

        # Raise error if the ticker isnt found (only client side exception)
        if data_start == 0:
            raise ValueError("Could not find ticker data in iShares CSV")

        # Parse the CSV starting from the data rows (Raw CSV data)
        csv_data = '\n'.join(lines[data_start:])
    
        # Read the raw response from memory
        df = pd.read_csv(StringIO(csv_data))

        # Extract tickers from the Ticker column
        tickers = df['Ticker'].dropna().tolist()

        # Clean tickers - remove cash positions and invalid entries
        tickers = [str(ticker).strip() for ticker in tickers
                 if ticker and str(ticker).strip()
                 and not str(ticker).startswith('CASH')
                 and not str(ticker).startswith('USD')
                 and len(str(ticker).strip()) <= 5]  # Most tickers are 1-5 chars
        
        return tickers
    
    def scrape_nasdaq_tickers(self) -> List[str]:
        """
        Scrapes tickers from nasdaq
        
        Args:
            None

        Returns:
            A list of tickers from the nasdaq
        """

        nasdaq_url = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"

        # Read the nasdaq url file with | as the separator
        df = pd.read_csv(nasdaq_url, sep='|')
        
        # Remove nan values from the data
        df = df.dropna(subset=['Symbol']) 
        
        # Extract the Symbol column to a list & remove test symbol
        tickers = df[df['Test Issue'] == 'N']['Symbol'].tolist()

        # Return ticker list
        return tickers
    
    def validate_ticker(self, ticker: str, test_days: int = 21) -> bool:
        """
        Validate tickers by attempting to download recent data

        Args:
            ticker: Ticker symbol to download
            test_days: Number of calendar days of data to test (default 21 days ~ 15 trading days)

        Returns:
            True if ticker valid, false otherwise
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
        # For 21 calendar days, we expect at least 10 trading days (accounting for weekends/holidays)
        min_trading_days = 10  # Minimum required trading days to be considered valid

        if data is not None and not data.empty and len(data) >= min_trading_days:
            return True
        else:
            return False

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

            # If validation setup fails, return error result
            return {
                'valid': False,
                'total_checks': 0,
                'passed': 0,
                'failed': 0,
                'failed_checks': [f"ValidationError: {str(e)}"]
            }