"""
Simple rate limiting for uploads.
"""
import time
from collections import defaultdict, deque
from flask import request, current_app

# Simple in-memory rate limiter
upload_attempts = defaultdict(deque)
api_attempts = defaultdict(deque)

def is_rate_limited(ip: str, limit_type: str = 'api') -> tuple[bool, str]:
    """
    Check if IP is rate limited.
    
    Args:
        ip: Client IP address
        limit_type: 'api' for general API calls, 'upload' for file uploads
    
    Returns:
        (is_limited, error_message)
    """
    now = time.time()
    
    # Get rate limits from config
    if limit_type == 'upload':
        window = current_app.config.get('UPLOAD_RATE_WINDOW', 300)  # 5 minutes
        max_requests = current_app.config.get('UPLOAD_RATE_LIMIT', 10)  # 10 uploads per 5 min
        attempts = upload_attempts[ip]
    else:
        window = current_app.config.get('API_RATE_WINDOW', 60)  # 1 minute
        max_requests = current_app.config.get('API_RATE_LIMIT', 100)  # 100 requests per minute (default matches config)
        attempts = api_attempts[ip]
    
    # Remove old attempts outside the window
    while attempts and attempts[0] < now - window:
        attempts.popleft()
    
    # Check if limit exceeded
    if len(attempts) >= max_requests:
        return True, f"Rate limit exceeded: {max_requests} {limit_type} requests per {window} seconds"
    
    # Record this attempt
    attempts.append(now)
    
    # Log in debug mode for development
    if current_app.config.get('DEBUG', False):
        current_app.logger.debug(f"Rate limit check for IP {ip}: {len(attempts)}/{max_requests} {limit_type} requests in {window}s window")
    
    return False, ""

def apply_rate_limits():
    """Apply rate limiting to current request."""
    if not current_app.config.get('RATE_LIMITING_ENABLED', True):
        return None
    
    # Get client IP
    ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
    if ',' in ip:
        ip = ip.split(',')[0].strip()  # Take first IP if multiple
    
    # Determine limit type based on endpoint
    limit_type = 'upload' if '/upload' in request.path else 'api'
    
    # Check rate limit
    is_limited, error_msg = is_rate_limited(ip, limit_type)
    
    if is_limited:
        from flask import jsonify
        current_app.logger.warning(f"Rate limit exceeded for IP {ip}: {error_msg}")
        return jsonify({
            'error': 'Rate Limit Exceeded',
            'message': error_msg,
            'status_code': 429
        }), 429
    
    return None
