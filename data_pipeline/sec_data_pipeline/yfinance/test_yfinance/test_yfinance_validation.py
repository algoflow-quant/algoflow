import pytest
import sys
from sec_data_pipeline.yfinance.yfinance_validation import YfinanceValidation
from unittest.mock import patch, MagicMock
import pandas as pd

@pytest.fixture
def tickers():
    # mocks yf.download for a 30 day period
    dates = pd.date_range(start="2020-01-01", periods=30)
    fake_data = pd.DataFrame({
        "Open": [71.54] * 30,
        "High": [72.59] * 30,
        "Low": [71.29] * 30,
        "Close": [72.53] * 30,
        "Volume": [135480400] * 30
    }, index=dates)
    return fake_data

@pytest.fixture
def empty_tickers():
    # empty data for yf.dowload
    dates = pd.date_range(start="2020-01-01", periods=0)
    empty_data = pd.DataFrame()
    return empty_data


def test_validate_ticker(tickers):
    """
    Success test validate_tickers
    Args: tickers - dataframe with OHLCV
    Tests:
        Passing valid tickers data through validate tickers returns true
    """
    with patch("sec_data_pipeline.yfinance.yfinance_validation.yf.download", return_value = tickers):
        validate = YfinanceValidation()
        result = validate.validate_ticker(ticker = ["APPL"], test_days = 30)

    assert result is True

def test_empty_ticker(empty_tickers):
    """
    Test validate_tickers that when given empty dowload data it returns false
    Args: empty_tickers - nothing really
    Tests:
        Passing invalid tickers data through validate tickers returns false
    """
    with patch("sec_data_pipeline.yfinance.yfinance_validation.yf.download", return_value = empty_tickers):
        validate = YfinanceValidation()
        result = validate.validate_ticker(ticker = ["APPL"], test_days = 30)

    assert result is False


@pytest.fixture
def valid_ohlcv():
    # more valid mock of yf.download
    dates = pd.date_range(start="2020-01-01", periods=10)
    fake_data = pd.DataFrame({
        "Open": [71, 72, 73, 74, 75, 76, 75, 74, 73, 72],
        "High": [72, 73, 74, 75, 76, 77, 76, 75, 74, 73],
        "Low": [70, 71, 72, 73, 74, 75, 74, 73, 72, 71],
        "Close": [71, 72, 73, 74, 75, 76, 75, 74, 73, 72],
        "Volume": [12,2423,3465345,235234,253,523,634,2345,64,634]
    }, index = dates)
    return fake_data

def test_validate_ohlcv(valid_ohlcv):
    """
    Success test of validate_ohlcv
    Args: valid_ohlcv - DataFrame containing more valid data
    Tests:
        value valid is True meaning all expectations passed
        value failed is 0 for no failed expectations
    """
    validate = YfinanceValidation()
    results = validate.validate_ohlcv(valid_ohlcv, ticker = ["APPL"])

    assert results['valid'] is True
    assert results['failed'] is 0

def test_invalid_ohlcv(empty_tickers):
    """
    Tests validate_ohlcv to not approve of empty dataset being passed
    Args: empty_tickers - empty dataset
    Tests: value valid is false meaning that it did not pass expectations
    """
    validate = YfinanceValidation()
    result = validate.validate_ohlcv(empty_tickers, ticker = ["APPL"])

    assert result["valid"] is False

def test_exception():
    """
    Tests validate_ohlcv error handling
    Args: None
    Tests: passing invalid datatype will raise error for airflow
    """
    validate = YfinanceValidation()
    with pytest.raises(Exception):
        result = validate.validate_ohlcv(None, ticker=["APPL"])

