from typing import List, Dict, Optional
from datetime import datetime, date
import pandas as pd
import yfinance as yf
import os
import json


class DataPipeline:
    """
    Main data pipeline with date range and incremental scraping
    """

    def __init__(self):
        # Load/download tickers
        self.tickers = self.load_tickers()
    
    def save_tickers(self, tickers: List[str], filename: str = "tickers.json") -> None:
        """Save tickers to JSON with extra data"""
        data = {
            "source": "nasdaq",
            "updated": datetime.now().isoformat(),
            "count": len(tickers),
            "tickers": tickers
        }
        filepath = os.path.join(os.path.dirname(__file__), filename)
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"Saved {len(tickers)} tickers to {filename}")
        
    def load_tickers(self, filename: str = "tickers.json") -> List[str]:
        """Load tickers from JSON file"""
        filepath = os.path.join(os.path.dirname(__file__), filename)

        if not os.path.exists(filepath):
            print("No saved tickers found, fetching fresh...")
            tickers = self._scrape_tickers()
            self.save_tickers(tickers, filename)
            return tickers

        with open(filepath, 'r') as f:
            data = json.load(f)

        print(f"Loaded {data['count']} tickers from {data['updated']}")
        return data['tickers']

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
    
    def _scrape_tickers(self) -> List[str]:
        nasdaq_url = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"
        
        # Read the nasdaq url file with | as the separator
        df = pd.read_csv(nasdaq_url, sep='|')
        
        # Remove nan values from the data
        df = df.dropna(subset=['Symbol']) 
        
        # Extract the Symbol column to a list & remove test symbol
        tickers = df[df['Test Issue'] == 'N']['Symbol'].tolist()
        
        
        # Return ticker list
        return tickers
    
    
if __name__ == "__main__":
    pipeline = DataPipeline()