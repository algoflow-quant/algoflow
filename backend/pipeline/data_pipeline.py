from typing import List, Dict, Optional
from datetime import datetime, date
import pandas as pd
import yfinance as yf


class DataPipeline:
    """
    Main data pipeline with date range and incremental scraping
    """

    def __init__(self):
        pass
    
    
    def scrape_tickers(self) -> None:
        nasdaq_url = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"
        
        # Read the nasdaq url file with | as the separator
        df = pd.read_csv(nasdaq_url, sep='|')
        
        # Extract the Symbol column to a list
        tickers = df['Symbol'].tolist()
        
        # Return ticker list
        return tickers
        

    def scrape_date_range(
        self,
        tickers: List[str],
        start_date: date,
        end_date: date,
        interval: str = '1d'
    ):# -> Dict[str, pd.DataFrame]:
        """
        Scrape historical data for a specific date range.

        Args:
            tickers: List of ticker symbols
            start_date: Start date
            end_date: End date
            interval: Data interval (1d only)

        Returns:
            Dictionary mapping tickers to data
        """
        pass

    def scrape_incremental(
        self,
        tickers: List[str],
        last_update: Optional[datetime] = None
    ):# -> Dict[str, pd.DataFrame]:
        """
        Scrape until last_update

        Args:
            tickers: List of ticker symbols
            last_update: Timestamp of last update (if None, gets today's data)

        Returns:
            Dictionary mapping tickers to the data
        """
        pass
    
    
if __name__ == "__main__":
    pipeline = DataPipeline()
    pipeline.scrape_tickers()