# Adds the project root to the system path
# Conftest file can also share fixtures between files
import sys
from pathlib import Path

path = Path(__file__).parent

root = path.parent.parent.parent

sys.path.insert(0, str(root))