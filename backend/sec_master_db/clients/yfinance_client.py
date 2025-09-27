import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging
from typing import Optional, List, Dict
import pandas as pd

class YfinanceClient:
    def __init__(self, db_url: Optional[str] = None):
        """
        Initialize with a db_url or defualt to the local dev
        """
        self.db_url = db_url or os.getenv(
              'SEC_MASTER_DB_URL_PROD',
              'postgresql://user:pass@localhost/sec_master_dev'  # Dev default
          )
        # Set up connection
        self.engine = create_engine(self.db_url)
        self.Session = sessionmaker(bind=self.engine)
        
        # Logger
        self.logger = logging.getLogger(self.__class__.__name__)
        
        
    # Ticker management methods    
    def insert_tickers(self, tickers: List[str], groupings: List[str]):
        """
        Insert tickers into securities table with groupings, ticker, and date_created
        """
        pass
    
    def get_tickers(self, groupings: str = None) -> List[str]:
        """Get all tickers, optionally filtered by multiple groupings"""
        pass
      
    def get_security_id(self, ticker: str, _provider: str = 'yfinance') -> int:
        """
        get the security id for a ticker/provider combo
        """
      
    # Metadata insertion methods
    def update_security_metadata(self, ticker: str, metadata: Dict):
        """
        update security table with extra data
        uses UPSERT normally and INSERT on conflict
        """
        pass
    
    # Data storage
    def insert_ohlcv(self, ticker: str, data: pd.DataFrame):
        """
        Insert OHLCV data for a single ticker
        """
    
    def insert_metadata(self, metadata_dict: Dict[str, Dict]):
        """
        Insert metadata for a ticker
        """
    