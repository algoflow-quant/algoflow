import pytest
import sys
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline
from unittest.mock import patch, MagicMock
import pandas as pd

# fixture is a mock API that is usable across functions
# fake tickers for scrape_metadata
@pytest.fixture
def fake_ticker():
    # Fake API response of stock.info
    fake_info = {
        "symbol": "APPL",
        "longName": "Apple Inc.",
        "exchange": "NASDAQ",
        "currentPrice": 150.0,
        "targetMeanPrice": 180.0,
        "freeCashflow": 1000000000,
        "marketCap": 5000000000,
    }
    fake_ticker = MagicMock() # Makes a fake object
    fake_ticker.info = fake_info # Mock the info attribute
    return fake_ticker

@pytest.fixture
def empty_ticker():
    empty_ticker = {}
    return empty_ticker


def test_yfinance_pipeline(fake_ticker):
    """
    Success test of scrape_metadata
    Args: fake_ticker
    Asserts:
        ticker value is the passed "APPL"
        target price upside calculation is correct
        free cash flow yeild calculation is correct
    """
    # patch covers real API with our fake_info
    with patch("sec_data_pipeline.yfinance.yfinance_pipeline.yf.Ticker", return_value=fake_ticker):
        pipeline = YfinancePipeline()
        result = pipeline.scrape_metadata(["APPL"])
    #assert is the test cases
    assert result["ticker"] == ["APPL"]
    assert result["target_price_upside"] == (180 - 150) / 150
    assert result["free_cash_flow_yield"] == 1000000 / 5000000

def test_invalid_info(empty_ticker):
        """
        Error raising test for scrape_metadata
        scrape_metaData - invalid info wont be added to dict
        Args: empty_ticker - ticker dict with no content
        tests: 
            invalid ticker raises an exception instead of passing bad data"""

        with patch("sec_data_pipeline.yfinance.yfinance_pipeline.yf.Ticker", side_effect=[empty_ticker, None]):
            pipeline = YfinancePipeline()
            with pytest.raises(Exception):
                result = pipeline.scrape_metadata(["Invalid", None])



# fake dataframe for OHLCD test
@pytest.fixture
def fake_data():
    # Fake api response of yf.dowload
    dates = pd.date_range(start='2024-01-01', periods=3, freq='D')
    data = {
        'Open': [150.0, 151.0, 152.0],
        'High': [152.0, 153.0, 154.0],
        'Low': [149.0, 150.0, 151.0],
        'Close': [151.0, 152, 153.0],
        'Volume': [1000000, 1100000, 1200000]
    }

    df = pd.DataFrame(data, index=dates)
    new_columns = [('Open', 'APPL'), ('High', 'APPL'), ('Low', 'APPL'), ('Close', 'APPL'), ('Volume', 'APPL')]
    df.columns =pd.MultiIndex.from_tuples(new_columns)

    return df


def test_scrape_date_range(fake_data):
    """
    Success test of scrape_date_range
    Args: fake_data
    Tests: result from object pipeline is the same as fake_data
    """
    with patch("sec_data_pipeline.yfinance.yfinance_pipeline.yf.download", return_value=fake_data):
        pipeline = YfinancePipeline()
        result = pipeline.scrape_date_range(ticker='APPL', start_date='2024-01-01', end_date='2024-01-03', interval='1d')
        
        assert result is fake_data

def test_no_data_error():
    """
    Test scrape date_range to raise error when no data is passed for yf.download
    Args: None
    Tests: that an error is raised
    """
    with patch("sec_data_pipeline.yfinance.yfinance_pipeline.yf.download", return_value=None):
        pipeline = YfinancePipeline()

        # Tests if it raises an error
        with pytest.raises(ValueError): 
            pipeline.scrape_date_range(ticker = 'APPL', start_date = '2024-01-03', end_date = '2024-01-03', interval = '1d')

def test_flattening_multiindex(fake_data):
    """
    Tests scrape_date_range Flatten Multiindex
    Args: fake_data
    Tests: 
        result is not a pandas multiindex
        open still exists in columns
        close is still in results columns
    """
    with patch("sec_data_pipeline.yfinance.yfinance_pipeline.yf.download", return_value=fake_data):
        pipeline = YfinancePipeline()
        result = pipeline.scrape_date_range(ticker = 'APPL', start_date = '2024-01-03', end_date = '2024-01-03', interval = '1d')

        # Tests if columns got flattened (No longer Multi-Index)
        assert not isinstance(result.columns, pd.MultiIndex)
        # Tests if columns still good
        assert 'Open' in result.columns
        assert 'Close' in result.columns