"""
Validation utilities and custom exceptions.
"""
import logging
from typing import Any, Dict, List, Optional
from marshmallow import ValidationError as MarshmallowValidationError

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom validation error for strict mode."""
    def __init__(self, message: str, errors: Dict[str, Any] = None):
        self.message = message
        self.errors = errors or {}
        super().__init__(message)

class ValidationWarning(Warning):
    """Custom validation warning for warn-only mode."""
    pass

def log_validation_error(endpoint: str, request_data: Any, errors: Dict[str, Any], 
                        strict_mode: bool = False) -> None:
    """Log validation errors with appropriate level."""
    if strict_mode:
        logger.error(f"Validation error in {endpoint}: {errors}")
        logger.debug(f"Request data: {request_data}")
    else:
        logger.warning(f"Validation warning in {endpoint}: {errors}")
        logger.debug(f"Request data: {request_data}")

def format_validation_errors(errors: Dict[str, Any]) -> str:
    """Format marshmallow validation errors into a readable string."""
    formatted_errors = []
    
    def flatten_errors(error_dict: Dict[str, Any], prefix: str = "") -> None:
        for key, value in error_dict.items():
            current_key = f"{prefix}.{key}" if prefix else key
            
            if isinstance(value, dict):
                flatten_errors(value, current_key)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, str):
                        formatted_errors.append(f"{current_key}: {item}")
                    elif isinstance(item, dict):
                        flatten_errors(item, current_key)
            else:
                formatted_errors.append(f"{current_key}: {value}")
    
    flatten_errors(errors)
    return "; ".join(formatted_errors)

def validate_data(schema, data: Any, strict_mode: bool = False, 
                 endpoint: str = "unknown") -> tuple[Any, Optional[Dict[str, Any]]]:
    """
    Validate data against a schema.
    
    Args:
        schema: Marshmallow schema instance
        data: Data to validate
        strict_mode: Whether to raise exceptions on validation errors
        endpoint: Endpoint name for logging
    
    Returns:
        Tuple of (validated_data, errors)
        
    Raises:
        ValidationError: If strict_mode is True and validation fails
    """
    try:
        validated_data = schema.load(data)
        return validated_data, None
    except MarshmallowValidationError as e:
        errors = e.messages
        log_validation_error(endpoint, data, errors, strict_mode)
        
        if strict_mode:
            raise ValidationError(
                f"Validation failed for {endpoint}: {format_validation_errors(errors)}",
                errors
            )
        
        # In warn-only mode, return original data with errors for logging
        return data, errors

def validate_response_data(schema, data: Any, strict_mode: bool = False,
                         endpoint: str = "unknown") -> tuple[Any, Optional[Dict[str, Any]]]:
    """
    Validate response data against a schema.
    Similar to validate_data but for responses.
    """
    try:
        # For responses, we typically want to dump (serialize) the data
        validated_data = schema.dump(data)
        return validated_data, None
    except Exception as e:
        errors = {"serialization_error": str(e)}
        log_validation_error(f"{endpoint} (response)", data, errors, strict_mode)
        
        if strict_mode:
            raise ValidationError(
                f"Response validation failed for {endpoint}: {str(e)}",
                errors
            )
        
        # In warn-only mode, return original data
        return data, errors
