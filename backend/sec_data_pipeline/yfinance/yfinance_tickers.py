# Native python modules
from typing import List
import pandas as pd
import requests
import logging
from io import StringIO
import time

# Custom utils
from utils.observability import tracer, meter, Status, StatusCode

class YfinanceTickerScraper:
    """
    Ticker list scraping for yfinance provider
    - S&P 500 from Wikipedia
    - Russell 3000 from iShares ETF holdings
    - NASDAQ from NASDAQ Trader
    """

    def __init__(self) -> None:

        # Add headers to avoid 403 error (Forbidden, for ticker scraping)
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        # Setup python logger
        self.logger = logging.getLogger(__name__)

        # Metrics: ticker list scrape counter
        self.ticker_list_scrape_counter = meter.create_counter(
            name="yfinance_ticker_list_scrapes_total",
            description="Total ticker list scrape attempts",
            unit="1"
        )

        # Metrics: ticker list scrape duration histogram
        self.ticker_list_scrape_duration = meter.create_histogram(
            name="yfinance_ticker_list_scrape_duration_seconds",
            description="Ticker list scrape operation duration",
            unit="s"
        )

        # Metrics: ticker count histogram
        self.ticker_count_histogram = meter.create_histogram(
            name="yfinance_ticker_list_count",
            description="Number of tickers returned per scrape",
            unit="1"
        )

    def scrape_sp500_tickers(self) -> List[str]:
        """
        Scrapes S&P 500 tickers from Wikipedia

        Args:
            None

        Returns:
            A list of tickers from the S&P 500
        """

        # Track start time
        start_time = time.time()

        # Start span for ticker list scraping
        with tracer.start_as_current_span("scrape_sp500_tickers") as span:
            try:

                # Set known attributes
                span.set_attribute("data_source", "wikipedia")
                span.set_attribute("index", "sp500")
                span.set_attribute("scrape_method", "html_table")

                self.logger.debug("Starting S&P 500 ticker scrape from Wikipedia")

                # Wikipedia URL
                sp500_url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"

                # Add span event for HTTP request
                span.add_event("http_request_start", {"url": sp500_url})

                # Fetch the HTML with headers
                response = requests.get(sp500_url, headers=self.headers)

                # Check response status
                span.set_attribute("http_status_code", response.status_code)

                if response.status_code != 200:
                    raise ValueError(f"HTTP {response.status_code} from Wikipedia")

                span.add_event("http_request_complete", {
                    "status_code": response.status_code,
                    "content_length": len(response.text)
                })

                # Read the table from the HTML
                tables = pd.read_html(response.text)
                df = tables[0]

                # Extract tickers from Symbol column
                tickers = df['Symbol'].tolist()

                # Track pre-cleaning count
                raw_count = len(tickers)
                span.add_event("tickers_extracted", {"raw_count": raw_count})

                # Clean tickers (replace dots with dashes for BRK.B -> BRK-B)
                tickers = [ticker.replace('.', '-') for ticker in tickers]

                # Calculate duration
                duration = time.time() - start_time

                # Set span attributes
                span.set_attribute("tickers_raw_count", raw_count)
                span.set_attribute("tickers_cleaned_count", len(tickers))
                span.set_attribute("scrape_success", True)

                # Add completion event
                span.add_event("ticker_cleaning_complete", {
                    "raw_count": raw_count,
                    "cleaned_count": len(tickers)
                })

                # Record metrics
                self.ticker_list_scrape_counter.add(1, {"status": "success", "index": "sp500"})
                self.ticker_list_scrape_duration.record(duration)
                self.ticker_count_histogram.record(len(tickers))

                self.logger.info(f"Successfully scraped {len(tickers)} S&P 500 tickers in {duration:.2f}s")

                return tickers

            except Exception as e:

                # Record error on span
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.set_attribute("scrape_success", False)

                # Record failure metric
                duration = time.time() - start_time
                self.ticker_list_scrape_counter.add(1, {"status": "failure", "index": "sp500"})
                self.ticker_list_scrape_duration.record(duration)

                # Keep error log
                self.logger.error(f"Failed to scrape S&P 500 tickers: {e}")
                raise

    def scrape_russell3000_tickers(self) -> List[str]:
        """
        Scrapes Russell 3000 tickers from iShares IWV ETF holdings

        Args:
            None

        Returns:
            A list of tickers from the russell 3000 index
        """

        # Track start time
        start_time = time.time()

        # Start span for ticker list scraping
        with tracer.start_as_current_span("scrape_russell3000_tickers") as span:
            try:

                # Set known attributes
                span.set_attribute("data_source", "ishares")
                span.set_attribute("index", "russell3000")
                span.set_attribute("scrape_method", "csv_download")
                span.set_attribute("etf_ticker", "IWV")

                self.logger.debug("Starting Russell 3000 ticker scrape from iShares IWV ETF")

                # IWV is the iShares Russell 3000 ETF - direct CSV download URL
                csv_url = "https://www.ishares.com/us/products/239714/ishares-russell-3000-etf/1467271812596.ajax?fileType=csv&fileName=IWV_holdings&dataType=fund"

                # Add span event for HTTP request
                span.add_event("http_request_start", {"url": csv_url})

                # Request the csv
                response = requests.get(csv_url, headers=self.headers)

                # Check response status
                span.set_attribute("http_status_code", response.status_code)

                if response.status_code != 200:
                    raise ValueError(f"HTTP {response.status_code} from iShares")

                span.add_event("http_request_complete", {
                    "status_code": response.status_code,
                    "content_length": len(response.text)
                })

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

                span.add_event("csv_header_found", {"header_line": data_start})

                # Parse the CSV starting from the data rows (Raw CSV data)
                csv_data = '\n'.join(lines[data_start:])

                # Read the raw response from memory
                df = pd.read_csv(StringIO(csv_data))

                # Extract tickers from the Ticker column
                tickers = df['Ticker'].dropna().tolist()

                # Track pre-cleaning count
                raw_count = len(tickers)
                span.add_event("tickers_extracted", {"raw_count": raw_count})

                # Clean tickers - remove cash positions and invalid entries
                tickers = [str(ticker).strip() for ticker in tickers
                         if ticker and str(ticker).strip()
                         and not str(ticker).startswith('CASH')
                         and not str(ticker).startswith('USD')
                         and len(str(ticker).strip()) <= 5]  # Most tickers are 1-5 chars

                # Calculate duration
                duration = time.time() - start_time

                # Calculate filtered count
                filtered_count = raw_count - len(tickers)

                # Set span attributes
                span.set_attribute("tickers_raw_count", raw_count)
                span.set_attribute("tickers_cleaned_count", len(tickers))
                span.set_attribute("tickers_filtered_count", filtered_count)
                span.set_attribute("scrape_success", True)

                # Add completion event
                span.add_event("ticker_cleaning_complete", {
                    "raw_count": raw_count,
                    "cleaned_count": len(tickers),
                    "filtered_count": filtered_count
                })

                # Record metrics
                self.ticker_list_scrape_counter.add(1, {"status": "success", "index": "russell3000"})
                self.ticker_list_scrape_duration.record(duration)
                self.ticker_count_histogram.record(len(tickers))

                self.logger.info(f"Successfully scraped {len(tickers)} Russell 3000 tickers in {duration:.2f}s ({filtered_count} filtered)")

                return tickers

            except Exception as e:

                # Record error on span
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.set_attribute("scrape_success", False)

                # Record failure metric
                duration = time.time() - start_time
                self.ticker_list_scrape_counter.add(1, {"status": "failure", "index": "russell3000"})
                self.ticker_list_scrape_duration.record(duration)

                # Keep error log
                self.logger.error(f"Failed to scrape Russell 3000 tickers: {e}")
                raise

    def scrape_nasdaq_tickers(self) -> List[str]:
        """
        Scrapes tickers from nasdaq

        Args:
            None

        Returns:
            A list of tickers from the nasdaq
        """

        # Track start time
        start_time = time.time()

        # Start span for ticker list scraping
        with tracer.start_as_current_span("scrape_nasdaq_tickers") as span:
            try:

                # Set known attributes
                span.set_attribute("data_source", "nasdaq_trader")
                span.set_attribute("index", "nasdaq")
                span.set_attribute("scrape_method", "csv_download")

                self.logger.debug("Starting NASDAQ ticker scrape from NASDAQ Trader")

                # NASDAQ URL
                nasdaq_url = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"

                # Add span event for HTTP request
                span.add_event("http_request_start", {"url": nasdaq_url})

                # Read the nasdaq url file with | as the separator
                df = pd.read_csv(nasdaq_url, sep='|')

                span.add_event("csv_download_complete", {
                    "rows": len(df)
                })

                # Remove nan values from the data
                df = df.dropna(subset=['Symbol'])

                # Track count after dropna
                after_dropna = len(df)

                # Extract the Symbol column to a list & remove test symbol
                tickers = df[df['Test Issue'] == 'N']['Symbol'].tolist()

                # Track counts
                raw_count = after_dropna
                test_issues_filtered = after_dropna - len(tickers)

                # Calculate duration
                duration = time.time() - start_time

                # Set span attributes
                span.set_attribute("tickers_raw_count", raw_count)
                span.set_attribute("tickers_cleaned_count", len(tickers))
                span.set_attribute("test_issues_filtered", test_issues_filtered)
                span.set_attribute("scrape_success", True)

                # Add completion event
                span.add_event("ticker_filtering_complete", {
                    "raw_count": raw_count,
                    "cleaned_count": len(tickers),
                    "test_issues_removed": test_issues_filtered
                })

                # Record metrics
                self.ticker_list_scrape_counter.add(1, {"status": "success", "index": "nasdaq"})
                self.ticker_list_scrape_duration.record(duration)
                self.ticker_count_histogram.record(len(tickers))

                self.logger.info(f"Successfully scraped {len(tickers)} NASDAQ tickers in {duration:.2f}s ({test_issues_filtered} test issues filtered)")

                # Return ticker list
                return tickers

            except Exception as e:

                # Record error on span
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.set_attribute("scrape_success", False)

                # Record failure metric
                duration = time.time() - start_time
                self.ticker_list_scrape_counter.add(1, {"status": "failure", "index": "nasdaq"})
                self.ticker_list_scrape_duration.record(duration)

                # Keep error log
                self.logger.error(f"Failed to scrape NASDAQ tickers: {e}")
                raise
