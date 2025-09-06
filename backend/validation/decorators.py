"""
Validation decorators for Flask routes.
"""
import functools
import logging
from flask import request, current_app, jsonify
from marshmallow import Schema
from typing import Callable, Any, Optional, Type, Union

from .utils import validate_data, validate_response_data, ValidationError

logger = logging.getLogger(__name__)

def validate_request(schema: Union[Type[Schema], Schema], 
                    strict_mode: Optional[bool] = None) -> Callable:
    """
    Decorator to validate request data against a schema.
    
    Args:
        schema: Marshmallow schema class or instance
        strict_mode: Override app config for validation strictness
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Determine strict mode
            is_strict = strict_mode
            if is_strict is None:
                is_strict = current_app.config.get('VALIDATION_STRICT', False)
            
            # Get schema instance
            schema_instance = schema() if isinstance(schema, type) else schema
            
            # Get request data
            if request.is_json:
                request_data = request.get_json()
            else:
                request_data = request.form.to_dict()
            
            # Validate data
            endpoint_name = f"{request.method} {request.endpoint}"
            try:
                validated_data, errors = validate_data(
                    schema_instance, 
                    request_data, 
                    is_strict, 
                    endpoint_name
                )
                
                # If validation fails in strict mode, ValidationError will be raised
                # In warn-only mode, we continue with original data but log warnings
                if errors and not is_strict:
                    logger.warning(f"Validation warnings for {endpoint_name}: {errors}")
                
                # Replace request data with validated data for downstream use
                # In warn-only mode, this is the original data
                request.validated_json = validated_data
                
            except ValidationError as e:
                # Return validation error response in strict mode
                return jsonify({
                    'error': 'Validation Error',
                    'message': e.message,
                    'details': e.errors,
                    'status_code': 400
                }), 400
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

def validate_response(schema: Union[Type[Schema], Schema],
                     strict_mode: Optional[bool] = None) -> Callable:
    """
    Decorator to validate response data against a schema.
    
    Args:
        schema: Marshmallow schema class or instance
        strict_mode: Override app config for validation strictness
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Execute the original function
            response = func(*args, **kwargs)
            
            # Determine strict mode
            is_strict = strict_mode
            if is_strict is None:
                is_strict = current_app.config.get('VALIDATION_STRICT', False)
            
            # Get schema instance
            schema_instance = schema() if isinstance(schema, type) else schema
            
            # Extract response data for validation
            if hasattr(response, 'get_json'):
                # Flask Response object
                response_data = response.get_json()
                status_code = response.status_code
            elif isinstance(response, tuple):
                # Tuple response (data, status_code)
                response_data = response[0].get_json() if hasattr(response[0], 'get_json') else response[0]
                status_code = response[1] if len(response) > 1 else 200
            else:
                # Direct data response
                response_data = response
                status_code = 200
            
            # Only validate successful responses (2xx status codes)
            if 200 <= status_code < 300 and response_data is not None:
                endpoint_name = f"{request.method} {request.endpoint}"
                
                try:
                    validated_data, errors = validate_response_data(
                        schema_instance,
                        response_data,
                        is_strict,
                        endpoint_name
                    )
                    
                    if errors and not is_strict:
                        logger.warning(f"Response validation warnings for {endpoint_name}: {errors}")
                
                except ValidationError as e:
                    # In strict mode, log error but don't break the response
                    # Response validation errors shouldn't break the API
                    logger.error(f"Response validation error for {endpoint_name}: {e.message}")
                    if is_strict:
                        # Add validation error header for debugging
                        if hasattr(response, 'headers'):
                            response.headers['X-Validation-Error'] = 'Response validation failed'
            
            return response
        return wrapper
    return decorator

def validate_query_params(schema: Union[Type[Schema], Schema],
                         strict_mode: Optional[bool] = None) -> Callable:
    """
    Decorator to validate query parameters against a schema.
    
    Args:
        schema: Marshmallow schema class or instance
        strict_mode: Override app config for validation strictness
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Determine strict mode
            is_strict = strict_mode
            if is_strict is None:
                is_strict = current_app.config.get('VALIDATION_STRICT', False)
            
            # Get schema instance
            schema_instance = schema() if isinstance(schema, type) else schema
            
            # Get query parameters
            query_data = request.args.to_dict()
            
            # Validate data
            endpoint_name = f"{request.method} {request.endpoint}"
            try:
                validated_data, errors = validate_data(
                    schema_instance,
                    query_data,
                    is_strict,
                    endpoint_name
                )
                
                if errors and not is_strict:
                    logger.warning(f"Query parameter validation warnings for {endpoint_name}: {errors}")
                
                # Store validated query params for downstream use
                request.validated_args = validated_data
                
            except ValidationError as e:
                return jsonify({
                    'error': 'Query Parameter Validation Error',
                    'message': e.message,
                    'details': e.errors,
                    'status_code': 400
                }), 400
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

def skip_validation_if_disabled(func: Callable) -> Callable:
    """
    Decorator to skip validation entirely if validation is disabled in config.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Check if validation is globally disabled
        if not current_app.config.get('VALIDATION_ENABLED', True):
            return func(*args, **kwargs)
        
        # Proceed with validation
        return func(*args, **kwargs)
    return wrapper
