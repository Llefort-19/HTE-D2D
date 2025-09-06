"""
File upload security validation.
"""
import os
import re
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
from werkzeug.utils import secure_filename
from flask import current_app

# Dangerous file extensions that should never be allowed
DANGEROUS_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.msi', '.dll',
    '.jar', '.class', '.war', '.ear', '.jsp', '.php', '.asp', '.aspx',
    '.js', '.vbs', '.ps1', '.sh', '.py', '.pl', '.rb', '.go'
}

# MIME type validation mapping
ALLOWED_MIME_TYPES = {
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.xls': ['application/vnd.ms-excel', 'application/excel'],
    '.csv': ['text/csv', 'application/csv', 'text/plain'],
    '.sdf': ['chemical/x-mdl-sdfile', 'text/plain', 'application/octet-stream']
}

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for secure storage."""
    if not filename:
        return 'untitled'
    
    # Use werkzeug's secure_filename as base
    safe_name = secure_filename(filename)
    
    # Additional sanitization
    safe_name = re.sub(r'[^\w\-_\.]', '_', safe_name)
    safe_name = re.sub(r'_+', '_', safe_name)  # Collapse multiple underscores
    safe_name = safe_name.strip('_.')  # Remove leading/trailing _ and .
    
    # Ensure we have a name
    if not safe_name:
        safe_name = 'untitled'
    
    # Limit length
    if len(safe_name) > 100:
        name, ext = os.path.splitext(safe_name)
        safe_name = name[:90] + ext
    
    return safe_name

def validate_file_extension(filename: str) -> tuple[bool, str]:
    """Validate file extension is allowed."""
    if not filename:
        return False, "No filename provided"
    
    ext = os.path.splitext(filename.lower())[1]
    
    # Check dangerous extensions
    if ext in DANGEROUS_EXTENSIONS:
        return False, f"File type {ext} is not allowed for security reasons"
    
    # Check allowed extensions from config
    allowed_extensions = current_app.config.get('ALLOWED_EXTENSIONS', {'.xlsx', '.xls', '.csv', '.sdf'})
    if ext not in allowed_extensions:
        return False, f"File type {ext} is not allowed. Allowed types: {', '.join(allowed_extensions)}"
    
    return True, ""

def validate_file_size(file_size: int) -> tuple[bool, str]:
    """Validate file size is within limits."""
    max_size = current_app.config.get('MAX_CONTENT_LENGTH', 25 * 1024 * 1024)  # 25MB default
    
    if file_size > max_size:
        return False, f"File size {file_size} bytes exceeds maximum allowed size of {max_size} bytes"
    
    return True, ""

def validate_mime_type(file_content: bytes, filename: str) -> tuple[bool, str]:
    """Validate MIME type matches file extension."""
    try:
        # Get file extension
        ext = os.path.splitext(filename.lower())[1]
        
        # Skip MIME validation if libmagic not available or extension not in our mapping
        if not MAGIC_AVAILABLE or ext not in ALLOWED_MIME_TYPES:
            return True, ""  # Allow if we don't have specific rules or magic unavailable
        
        # Try to detect MIME type
        try:
            mime_type = magic.from_buffer(file_content, mime=True)
        except:
            # If magic fails, allow the file but log warning
            current_app.logger.warning(f"Could not detect MIME type for {filename}")
            return True, ""
        
        allowed_mimes = ALLOWED_MIME_TYPES[ext]
        if mime_type not in allowed_mimes:
            return False, f"File content type {mime_type} does not match expected types for {ext}: {', '.join(allowed_mimes)}"
        
        return True, ""
        
    except Exception as e:
        current_app.logger.warning(f"MIME type validation failed for {filename}: {e}")
        return True, ""  # Allow file but log the issue

def validate_file_upload(file, max_size: int = None) -> tuple[bool, str, str]:
    """
    Comprehensive file upload validation.
    
    Returns:
        (is_valid, error_message, sanitized_filename)
    """
    if not file:
        return False, "No file provided", ""
    
    filename = file.filename
    if not filename:
        return False, "No filename provided", ""
    
    # Sanitize filename first
    safe_filename = sanitize_filename(filename)
    
    # Validate extension
    ext_valid, ext_error = validate_file_extension(filename)
    if not ext_valid:
        return False, ext_error, safe_filename
    
    # Read file content for size and MIME validation
    file.seek(0)  # Ensure we're at the start
    file_content = file.read()
    file.seek(0)  # Reset for future reads
    
    # Validate file size
    actual_size = len(file_content)
    if max_size:
        size_valid, size_error = validate_file_size(min(actual_size, max_size))
    else:
        size_valid, size_error = validate_file_size(actual_size)
    
    if not size_valid:
        return False, size_error, safe_filename
    
    # Validate MIME type
    mime_valid, mime_error = validate_mime_type(file_content, filename)
    if not mime_valid:
        return False, mime_error, safe_filename
    
    return True, "", safe_filename
