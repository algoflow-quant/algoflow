# Adds the project root to the system path
# Conftest file can also share fixtures between files
import sys
from pathlib import Path
import warnings

path = Path(__file__).parent

root = path.parent.parent.parent

sys.path.insert(0, str(root))

#suppress great excpectations warning
warnings.filterwarnings(
    "ignore",
    category=DeprecationWarning,
    module="great_expectations.data_context.types.base"
)