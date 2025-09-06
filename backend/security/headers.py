"""
Security headers middleware.
"""
from flask import current_app

def add_security_headers(response):
    """Add security headers to response."""
    
    # Content Security Policy
    if not current_app.config.get('DEBUG', False):
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
    
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'DENY'
    
    # XSS protection
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Referrer policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # HSTS for HTTPS (only in production)
    if not current_app.config.get('DEBUG', False):
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    return response
