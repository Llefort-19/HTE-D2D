"""
Configuration module for HTE App backend.
Provides environment-driven configuration with sensible defaults.
"""
import os
from pathlib import Path

class Config:
    """Base configuration class with common settings."""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    TESTING = False
    
    # File upload settings
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 25 * 1024 * 1024))  # 25MB default
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.csv', '.sdf'}
    
    # CORS settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    CORS_HEADERS = ['Content-Type', 'Authorization']
    
    # Data file paths
    DATA_ROOT_PATH = os.environ.get('DATA_ROOT_PATH', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    INVENTORY_PATH = os.path.join(DATA_ROOT_PATH, 'Inventory.xlsx')
    PRIVATE_INVENTORY_PATH = os.path.join(DATA_ROOT_PATH, 'Private_Inventory.xlsx')
    SOLVENT_PATH = os.path.join(DATA_ROOT_PATH, 'Solvent.xlsx')
    
    # RDKit settings
    RDKIT_ENABLED = os.environ.get('RDKIT_ENABLED', 'True').lower() == 'true'
    
    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Cache settings
    CACHE_ENABLED = os.environ.get('CACHE_ENABLED', 'True').lower() == 'true'
    CACHE_TTL = int(os.environ.get('CACHE_TTL', 300))  # 5 minutes default
    
    # Pagination settings
    DEFAULT_PAGE_SIZE = int(os.environ.get('DEFAULT_PAGE_SIZE', 100))
    MAX_PAGE_SIZE = int(os.environ.get('MAX_PAGE_SIZE', 1000))
    
    # Validation settings
    VALIDATION_ENABLED = os.environ.get('VALIDATION_ENABLED', 'True').lower() == 'true'
    VALIDATION_STRICT = os.environ.get('VALIDATION_STRICT', 'False').lower() == 'true'
    VALIDATION_LOG_WARNINGS = os.environ.get('VALIDATION_LOG_WARNINGS', 'True').lower() == 'true'
    
    # Security settings
    RATE_LIMITING_ENABLED = os.environ.get('RATE_LIMITING_ENABLED', 'True').lower() == 'true'
    API_RATE_LIMIT = int(os.environ.get('API_RATE_LIMIT', 100))  # requests per minute
    API_RATE_WINDOW = int(os.environ.get('API_RATE_WINDOW', 60))  # seconds
    UPLOAD_RATE_LIMIT = int(os.environ.get('UPLOAD_RATE_LIMIT', 10))  # uploads per 5 min
    UPLOAD_RATE_WINDOW = int(os.environ.get('UPLOAD_RATE_WINDOW', 300))  # seconds
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration."""
        pass

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'https://yourdomain.com').split(',')
    LOG_LEVEL = 'WARNING'
    VALIDATION_STRICT = True

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    CORS_ORIGINS = ['http://localhost:3000']
    # Use test data paths
    DATA_ROOT_PATH = os.path.join(os.path.dirname(__file__), 'test_data')
    INVENTORY_PATH = os.path.join(DATA_ROOT_PATH, 'test_inventory.xlsx')
    PRIVATE_INVENTORY_PATH = os.path.join(DATA_ROOT_PATH, 'test_private_inventory.xlsx')
    SOLVENT_PATH = os.path.join(DATA_ROOT_PATH, 'test_solvent.xlsx')

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment."""
    config_name = os.environ.get('FLASK_ENV', 'default')
    return config.get(config_name, config['default'])
