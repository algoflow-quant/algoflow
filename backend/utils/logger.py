import logging
import sys
import os
from pathlib import Path


class ContextFormatter(logging.Formatter):
    """Formatter that automatically adds file and function names"""

    def format(self, record):
        # Get just the filename without path and extension
        filename = Path(record.pathname).stem

        # Add file.function to the record
        record.context = f"{filename}.{record.funcName}"

        return super().format(record)


def get_logger(name=None):
    """
    Get a logger that automatically includes file/function context

    Args:
        name: Logger name (usually __name__) __name__ is the file name

    Returns:
        Logger instance with context formatting
    """
    logger = logging.getLogger(name or __name__)

    # Only configure if not already configured
    if not logger.handlers:
        # Get log level from environment, default to INFO
        log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
        numeric_level = getattr(logging, log_level, logging.INFO)
        logger.setLevel(numeric_level)

        # Format: timestamp - file.function - level - message
        formatter = ContextFormatter(
            '%(asctime)s - %(context)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

        # Console handler
        console = logging.StreamHandler(sys.stdout)
        console.setLevel(numeric_level)
        console.setFormatter(formatter)

        logger.addHandler(console)
        logger.propagate = False

    return logger