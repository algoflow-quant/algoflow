import pytest
import sys
from sec_data_pipeline.yfinance.yfinance_pipeline import YfinancePipeline
from unittest.mock import patch, MagicMock
import pandas as pd

# fixture is a mock API that is usable across functions
# fake tickers for scrape_metadata
@pytest.fixture
def fake_ticker():
    # Fake API response of Ticker
    fake_info = {
        "symbol": "APPL",
        "longName": "Apple Inc.",
        "exchange": "NASDAQ",
        "currentPrice": 150.0,
        "targetMeanPrice": 180.0,
        "freeCashflow": 1000000000,
        "marketCap": 5000000000,
    }
    fake_ticker = MagicMock() # Mock object of the API
    fake_ticker.info = fake_info # Mock the info attribute
    return fake_ticker

# fake dataframe for OHLCD test
@pytest.fixture
def fake_data():
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


# test that function works
def test_yfinance_pipeline(fake_ticker):
    # Covers real API with our mock
    with patch("sec_data_pipeline.yfinance.yfinance_pipeline.yf.Ticker", return_value=fake_ticker):
        pipeline = YfinancePipeline()
        result = pipeline.scrape_metadata(["APPL"])

    # Make test cases for fields with calculations
    assert result["ticker"] == ["APPL"]
    assert result["target_price_upside"] == (180 - 150) / 150
    assert result["free_cash_flow_yield"] == 1000000 / 5000000
    

def test_scrape_date_range(fake_data):
    with patch("sec_data_pipeline.yfinance.yfinance_pipeline.yf.download", return_value=fake_data):
        pipeline = YfinancePipeline()
        result = pipeline.scrape_date_range(ticker='APPL', start_date='2024-01-01', end_date='2024-01-03', interval='1d')
        
        # checks that our scraped_date_range matches our original fake_data
        assert result is fake_data


def test_no_data_error():
    with patch("sec_data_pipeline.yfinance.yfinance_pipeline.yf.download", return_value=None):
        pipeline = YfinancePipeline()

        # Tests if it raises an error
        with pytest.raises(ValueError): 
            pipeline.scrape_date_range(ticker = 'APPL', start_date = '2024-01-03', end_date = '2024-01-03', interval = '1d')


def test_flattening_multiindex(fake_data):
    with patch("sec_data_pipeline.yfinance.yfinance_pipeline.yf.download", return_value=fake_data):
        pipeline = YfinancePipeline()
        result = pipeline.scrape_date_range(ticker = 'APPL', start_date = '2024-01-03', end_date = '2024-01-03', interval = '1d')

        # Tests if columns got flattened (No longer Multi-Index)
        assert not isinstance(result.columns, pd.MultiIndex)
        # Tests if columns still good
        assert 'Open' in result.columns
        assert 'Close' in result.columns





# Error handling commented out as it was removed in version 2.0
"""
@pytest.fixture
def empty_ticker():
    empty_ticker = {}
    empty_ticker = MagicMock()
    empty_ticker.info = empty_ticker
    return empty_ticker

def test_invalid_info(fake_ticker, empty_ticker):
        none_info = MagicMock()
        none_info.info = None

        with patch("data_pipeline.sec_data_pipeline.yfinance_pipeline.yf.Ticker", side_effect=[empty_ticker, none_info, fake_ticker]):
            pipeline = YfinancePipeline()
            result = pipeline.scrape_metadata(["Invalid", "None", "APPL"])
        
        assert "Invalid" not in result
        assert "None" not in result
        assert "APPL" in result
"""
"""
# test for empty ticker (no data)
def test_error_catching(fake_ticker):
    with patch("data_pipeline.sec_data_pipeline.yfinance_pipeline.yf.Ticker", side_effect=[Exception("failed"), fake_ticker]):
        pipeline = YfinancePipeline()
        result = pipeline.scrape_metadata(["Invalid", "APPL"])
    
    assert "Invalid" not in result
    assert "APPL" in result

# scrape_date_range
"""