# Current
Using pytest
conftest.py
    Shows the project root directory to pythons import path
    Can also be used to share fixtures

## pytest
imports
MagicMock: lets us make a fake object.
patch: temporarily replaces API during the test.
fixtures: make objects sharable between functions

## Unit tests
Coverage = full covereage hits all different code paths
    If there's an if statement, tests for both True and False branches
    If there's a try/except, need tests that trigger the exception
    If there's a loop, need tests with different list sizes
See coverage with pytest-cov
    > pytest --cov sec_data_pipeline.yfinance.yfinance_pipeline     #last file is the one we see
    > pytest --cov sec_data_pipeline.yfinance.yfinance_pipeline --cov-report=term-missing     #shows the lines we haven't hit yet

For success testing we mainly need to test feilds that have attached calculations or feilds that handle logic

### Test structure
Make fake object/api usually as a fixture

test_function(fake_object):
    with patch("path", return_value=fake_object):
        object of class we testing
        result = object.function_we_testing()
    assert result = whatever we test



# Later
## Later