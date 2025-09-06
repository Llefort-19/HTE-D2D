"""
Flask application factory for HTE App.
Creates and configures the Flask application with proper error handling and logging.
"""
import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify, request
from flask_cors import CORS

from config import get_config

def create_app(config_name=None):
    """Create and configure Flask application."""
    app = Flask(__name__)
    
    # Load configuration
    config_class = get_config() if config_name is None else config_name
    app.config.from_object(config_class)
    
    # Initialize extensions
    CORS(app, 
         origins=app.config['CORS_ORIGINS'],
         methods=app.config['CORS_METHODS'],
         allow_headers=app.config['CORS_HEADERS'])
    
    # Configure logging
    configure_logging(app)
    
    # Apply security measures
    apply_security_measures(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Import state management
    from state import load_inventory
    
    # Initialize inventory on startup
    with app.app_context():
        try:
            load_inventory()
            app.logger.info("Inventory loaded successfully")
        except Exception as e:
            app.logger.warning(f"Failed to load inventory: {e}")
    
    return app

def configure_logging(app):
    """Configure application logging."""
    if not app.debug and not app.testing:
        # Create logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        # File handler with rotation
        file_handler = RotatingFileHandler('logs/hte_app.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('HTE App startup')

def apply_security_measures(app):
    """Apply security measures to the application."""
    from security.headers import add_security_headers
    from security.rate_limiting import apply_rate_limits
    
    # Add security headers to all responses
    @app.after_request
    def security_headers(response):
        return add_security_headers(response)
    
    # Apply rate limiting to all requests
    @app.before_request
    def rate_limiting():
        return apply_rate_limits()

def register_blueprints(app):
    """Register all blueprints with the application."""
    from routes.inventory import inventory_bp
    from routes.experiment import experiment_bp
    from routes.solvent import solvent_bp
    from routes.molecules import molecules_bp
    from routes.kit import kit_bp
    from routes.uploads import uploads_bp
    from routes.export import export_bp
    
    app.register_blueprint(inventory_bp)
    app.register_blueprint(experiment_bp)
    app.register_blueprint(solvent_bp)
    app.register_blueprint(molecules_bp)
    app.register_blueprint(kit_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(export_bp)

def register_error_handlers(app):
    """Register error handlers for consistent error responses."""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle bad request errors."""
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description) if hasattr(error, 'description') else 'Invalid request',
            'status_code': 400
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle not found errors."""
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found',
            'status_code': 404
        }), 404
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        """Handle file too large errors."""
        return jsonify({
            'error': 'File Too Large',
            'message': f'File size exceeds maximum allowed size of {app.config["MAX_CONTENT_LENGTH"]} bytes',
            'status_code': 413
        }), 413
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle internal server errors."""
        app.logger.error(f'Internal server error: {error}')
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status_code': 500
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle all unhandled exceptions."""
        app.logger.error(f'Unhandled exception: {e}', exc_info=True)
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status_code': 500
        }), 500

# Create the application instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=app.config['DEBUG'], port=5000)
