# type: ignore

# Native python modules
from typing import List
import pandas as pd
import requests
from io import StringIO

class YfinanceTickers:
    """
    Ticker list scraping from public sources
    - Scrapes S&P 500, Russell 3000, NASDAQ ticker lists
    - Validates and cleans ticker symbols
    """

    # Validation constants
    MAX_TICKER_LENGTH = 5  # Maximum ticker symbol length

    def __init__(self) -> None:
        # Add headers to avoid 403 error (Forbidden, for ticker scraping)
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    def scrape_sp500_tickers(self) -> List[str]:
        """
        Scrapes S&P 500 constituents from Wikipedia's List of S&P 500 companies.

        Pulls the Symbol column from the first table and converts dots to dashes
        for yfinance compatibility (BRK.B → BRK-B).

        Returns:
            List of ~500 ticker symbols
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
        Scrapes Russell 3000 tickers from iShares IWV ETF holdings CSV.

        The CSV has metadata rows at the top, so we scan for the "Ticker" header
        before parsing. Filters out CASH, USD positions, and symbols >5 characters.

        Returns:
            List of ~3000 US equity tickers

        Raises:
            ValueError: If Ticker column not found in CSV
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
                 and len(str(ticker).strip()) <= self.MAX_TICKER_LENGTH]

        return tickers

    def scrape_nasdaq_tickers(self) -> List[str]:
        """
        Scrapes NASDAQ-listed tickers from the official NASDAQ Trader symbol directory.

        The file is pipe-delimited with a "Test Issue" flag that we use to filter out
        test symbols.

        Returns:
            List of ~3000+ NASDAQ-listed tickers
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
