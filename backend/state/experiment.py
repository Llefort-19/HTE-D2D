"""
Experiment state management.
Handles the global current_experiment state with thread safety.
"""
import threading
from typing import Dict, Any, List

# Thread lock for experiment state
_experiment_lock = threading.RLock()

# Global experiment state
_current_experiment = {
    'context': {},
    'materials': [],
    'procedure': [],
    'procedure_settings': {
        'reactionConditions': {
            'temperature': '',
            'time': '',
            'pressure': '',
            'wavelength': '',
            'remarks': ''
        },
        'analyticalDetails': {
            'uplcNumber': '',
            'method': '',
            'duration': '',
            'remarks': ''
        }
    },
    'analytical_data': {
        'selectedCompounds': [],
        'uploadedFiles': []
    },
    'results': []
}

def get_current_experiment() -> Dict[str, Any]:
    """Get a copy of the current experiment state."""
    with _experiment_lock:
        # Return a deep copy to prevent external modifications
        import copy
        return copy.deepcopy(_current_experiment)

def update_experiment_context(context: Dict[str, Any]) -> None:
    """Update experiment context."""
    with _experiment_lock:
        _current_experiment['context'] = context

def update_experiment_materials(materials: List[Dict[str, Any]]) -> None:
    """Update experiment materials."""
    with _experiment_lock:
        _current_experiment['materials'] = materials

def update_experiment_procedure(procedure: List[Dict[str, Any]]) -> None:
    """Update experiment procedure."""
    with _experiment_lock:
        _current_experiment['procedure'] = procedure

def update_experiment_procedure_settings(settings: Dict[str, Any]) -> None:
    """Update experiment procedure settings."""
    with _experiment_lock:
        _current_experiment['procedure_settings'] = settings

def update_experiment_analytical_data(analytical_data: Dict[str, Any]) -> None:
    """Update experiment analytical data."""
    with _experiment_lock:
        _current_experiment['analytical_data'] = analytical_data

def update_experiment_results(results: List[Dict[str, Any]]) -> None:
    """Update experiment results."""
    with _experiment_lock:
        _current_experiment['results'] = results

def update_experiment_heatmap_data(heatmap_data: Dict[str, Any]) -> None:
    """Update experiment heatmap data."""
    with _experiment_lock:
        _current_experiment['heatmap_data'] = heatmap_data

def reset_experiment() -> None:
    """Reset experiment to initial state."""
    with _experiment_lock:
        global _current_experiment
        _current_experiment = {
            'context': {},
            'materials': [],
            'procedure': [],
            'procedure_settings': {
                'reactionConditions': {
                    'temperature': '',
                    'time': '',
                    'pressure': '',
                    'wavelength': '',
                    'remarks': ''
                },
                'analyticalDetails': {
                    'uplcNumber': '',
                    'method': '',
                    'duration': '',
                    'remarks': ''
                }
            },
            'analytical_data': {
                'selectedCompounds': [],
                'uploadedFiles': []
            },
            'results': []
        }

# For backward compatibility, provide direct access to the state
# This will be removed in future phases when all code uses the functions above
class ExperimentState:
    """Backward compatibility wrapper for experiment state."""
    
    def __getitem__(self, key):
        with _experiment_lock:
            return _current_experiment[key]
    
    def __contains__(self, key):
        with _experiment_lock:
            return key in _current_experiment
    
    def __setitem__(self, key, value):
        with _experiment_lock:
            _current_experiment[key] = value
    
    def get(self, key, default=None):
        with _experiment_lock:
            return _current_experiment.get(key, default)
    
    def keys(self):
        with _experiment_lock:
            return _current_experiment.keys()
    
    def values(self):
        with _experiment_lock:
            return _current_experiment.values()
    
    def items(self):
        with _experiment_lock:
            return _current_experiment.items()

# Global instance for backward compatibility
current_experiment = ExperimentState()
