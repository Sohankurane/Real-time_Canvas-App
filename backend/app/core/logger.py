import logging
import sys
from datetime import datetime
from pathlib import Path
from app.core.config import settings


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for console output"""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }

    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset_color = self.COLORS['RESET']
        
        # Format: [TIME] [LEVEL] [MODULE] Message
        record.levelname = f"{log_color}{record.levelname}{reset_color}"
        return super().format(record)


def setup_logger(name: str = "canvas_app") -> logging.Logger:
    """Setup and configure application logger"""
    
    logger = logging.getLogger(name)
    
    # Set log level based on DEBUG setting
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    logger.setLevel(log_level)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Console Handler with colors
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_formatter = ColoredFormatter(
        fmt='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File Handler (Optional - creates logs directory)
    try:
        logs_dir = Path("logs")
        logs_dir.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(
            logs_dir / f"app_{datetime.now().strftime('%Y%m%d')}.log"
        )
        file_handler.setLevel(logging.INFO)
        file_formatter = logging.Formatter(
            fmt='[%(asctime)s] [%(levelname)s] [%(name)s.%(funcName)s:%(lineno)d] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        logger.warning(f"Could not create file handler: {e}")
    
    return logger


# Create global logger instance
logger = setup_logger()


# Convenience functions for different log levels
def debug(msg: str, **kwargs):
    """Log debug message"""
    logger.debug(msg, extra=kwargs)


def info(msg: str, **kwargs):
    """Log info message"""
    logger.info(msg, extra=kwargs)


def warning(msg: str, **kwargs):
    """Log warning message"""
    logger.warning(msg, extra=kwargs)


def error(msg: str, exc_info=False, **kwargs):
    """Log error message"""
    logger.error(msg, exc_info=exc_info, extra=kwargs)


def critical(msg: str, exc_info=True, **kwargs):
    """Log critical message"""
    logger.critical(msg, exc_info=exc_info, extra=kwargs)
