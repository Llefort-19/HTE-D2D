"""
State management module for HTE App.
Provides thread-safe access to global application state.
"""
from .experiment import current_experiment, reset_experiment
from .inventory import inventory_data, load_inventory

__all__ = [
    'current_experiment',
    'reset_experiment', 
    'inventory_data',
    'load_inventory'
]
