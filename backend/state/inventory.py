"""
Inventory state management.
Handles the global inventory_data state with thread safety.
"""
import os
import threading
import pandas as pd
from typing import Optional

# Thread lock for inventory state
_inventory_lock = threading.RLock()

# Global inventory state
_inventory_data: Optional[pd.DataFrame] = None

def get_inventory_data() -> Optional[pd.DataFrame]:
    """Get a copy of the inventory data."""
    with _inventory_lock:
        return _inventory_data.copy() if _inventory_data is not None else None

def set_inventory_data(data: pd.DataFrame) -> None:
    """Set the inventory data."""
    with _inventory_lock:
        global _inventory_data
        _inventory_data = data

def load_inventory() -> bool:
    """Load inventory from Excel file."""
    try:
        # Get the data root path from config
        from config import get_config
        config = get_config()
        inventory_path = config.INVENTORY_PATH
        
        # Read Excel file without parsing dates to avoid NaTType issues
        df = pd.read_excel(inventory_path, parse_dates=False)
        
        # Convert all columns to string to avoid any datetime/NaT issues
        for col in df.columns:
            df[col] = df[col].astype(str)
            # Replace 'nan' strings with None for better JSON handling
            df[col] = df[col].replace('nan', None)
        
        set_inventory_data(df)
        return True
    except Exception as e:
        print(f"Error loading inventory: {e}")
        return False

def is_inventory_loaded() -> bool:
    """Check if inventory is loaded."""
    with _inventory_lock:
        return _inventory_data is not None

# For backward compatibility, provide direct access to the state
# This will be removed in future phases when all code uses the functions above
class InventoryState:
    """Backward compatibility wrapper for inventory state."""
    
    def __bool__(self):
        with _inventory_lock:
            return _inventory_data is not None
    
    def __getitem__(self, key):
        with _inventory_lock:
            if _inventory_data is None:
                raise KeyError("Inventory not loaded")
            return _inventory_data[key]
    
    def __setitem__(self, key, value):
        with _inventory_lock:
            if _inventory_data is None:
                _inventory_data = pd.DataFrame()
            _inventory_data[key] = value
    
    def __getattr__(self, name):
        with _inventory_lock:
            if _inventory_data is None:
                raise AttributeError(f"Inventory not loaded, cannot access {name}")
            return getattr(_inventory_data, name)

# Global instance for backward compatibility
inventory_data = InventoryState()
