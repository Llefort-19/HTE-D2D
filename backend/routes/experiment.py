"""
Experiment routes blueprint.
Handles experiment context, materials, procedure, and results operations.
"""
from flask import Blueprint, request, jsonify
from state import current_experiment
from validation import (
    validate_request, validate_response,
    ExperimentContextSchema, MaterialsListSchema, ProcedureListSchema,
    ProcedureSettingsSchema, AnalyticalDataSchema, ResultsSchema,
    HeatmapDataSchema, SuccessResponseSchema
)

# Create blueprint
experiment_bp = Blueprint('experiment', __name__, url_prefix='/api/experiment')

@experiment_bp.route('/context', methods=['GET', 'POST'])
def experiment_context():
    """Get or update experiment context"""
    if request.method == 'POST':
        # Optional validation in warn-only mode
        try:
            from validation.utils import validate_data
            from validation.schemas import ExperimentContextSchema
            
            schema = ExperimentContextSchema()
            validated_data, errors = validate_data(
                schema, request.json, strict_mode=False, 
                endpoint="POST /api/experiment/context"
            )
            current_experiment['context'] = validated_data
        except Exception as e:
            # If validation fails, use original data and log warning
            import logging
            logging.warning(f"Context validation failed: {e}")
            current_experiment['context'] = request.json
            
        return jsonify({'message': 'Context updated'})
    
    # Get context and ensure all fields are present with proper format
    context = current_experiment.get('context', {}).copy()
    
    # Ensure all required fields exist
    default_context = {
        'author': '',
        'date': '',
        'project': '',
        'eln': '',
        'objective': ''
    }
    
    # Merge defaults with existing context
    for key, default_value in default_context.items():
        if key not in context:
            context[key] = default_value
    
    # Fix date format if needed - be very conservative
    from datetime import datetime
    if 'date' in context and context['date']:
        date_str = str(context['date'])
        import re

        # Only normalize dates that are clearly malformed or contain timezone info
        if ('GMT' in date_str or 'UTC' in date_str):
            # Convert timezone-aware dates to local date
            context['date'] = datetime.now().strftime('%Y-%m-%d')
        elif date_str and not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            # Only try to normalize if it's a clearly invalid format
            try:
                # If it's already in a standard format, leave it alone
                datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                # Only fix if parsing as YYYY-MM-DD fails
                try:
                    date_formats = ['%m/%d/%Y', '%d/%m/%Y', '%d-%m-%Y', '%m-%d-%Y']
                    parsed_date = None
                    for fmt in date_formats:
                        try:
                            parsed_date = datetime.strptime(date_str, fmt)
                            break
                        except ValueError:
                            continue

                    if parsed_date:
                        context['date'] = parsed_date.strftime('%Y-%m-%d')
                    # Don't change the date if we can't parse it - preserve the original
                except:
                    pass  # Keep original date if parsing fails

    # Ensure date field always exists
    if not context.get('date'):
        context['date'] = datetime.now().strftime('%Y-%m-%d')

    return jsonify(context)

@experiment_bp.route('/materials', methods=['GET', 'POST'])
def experiment_materials():
    """Get or update experiment materials"""
    if request.method == 'POST':
        # Optional validation in warn-only mode
        try:
            from validation.utils import validate_data
            from validation.schemas import MaterialSchema
            
            # Validate each material in the list
            materials_data = request.json
            if isinstance(materials_data, list):
                validated_materials = []
                schema = MaterialSchema()
                for i, material in enumerate(materials_data):
                    validated_material, errors = validate_data(
                        schema, material, strict_mode=False,
                        endpoint=f"POST /api/experiment/materials[{i}]"
                    )
                    validated_materials.append(validated_material)
                current_experiment['materials'] = validated_materials
            else:
                current_experiment['materials'] = materials_data
        except Exception as e:
            # If validation fails, use original data and log warning
            import logging
            logging.warning(f"Materials validation failed: {e}")
            current_experiment['materials'] = request.json
            
        return jsonify({'message': 'Materials updated'})
    
    return jsonify(current_experiment['materials'])

@experiment_bp.route('/procedure', methods=['GET', 'POST'])
def experiment_procedure():
    """Get or update experiment procedure (96-well plate)"""
    if request.method == 'POST':
        current_experiment['procedure'] = request.json
        return jsonify({'message': 'Procedure updated'})
    
    return jsonify(current_experiment['procedure'])

@experiment_bp.route('/procedure-settings', methods=['GET', 'POST'])
def experiment_procedure_settings():
    """Get or update experiment procedure settings (reaction conditions and analytical details)"""
    if request.method == 'POST':
        current_experiment['procedure_settings'] = request.json
        return jsonify({'message': 'Procedure settings updated'})
    
    return jsonify(current_experiment.get('procedure_settings', {
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
    }))

@experiment_bp.route('/analytical', methods=['GET', 'POST'])
def experiment_analytical():
    """Get or update analytical data"""
    try:
        if request.method == 'POST':
            # Handle selected compounds update
            if 'selectedCompounds' in request.json:
                if 'analytical_data' not in current_experiment:
                    current_experiment['analytical_data'] = {}
                current_experiment['analytical_data']['selectedCompounds'] = request.json['selectedCompounds']
                return jsonify({'message': 'Selected compounds updated'})
            else:
                # Handle other analytical data updates
                current_experiment['analytical_data'] = request.json
                return jsonify({'message': 'Analytical data updated'})
        
        # Return the analytical data structure that frontend expects
        analytical_data = current_experiment.get('analytical_data', {})
        if isinstance(analytical_data, list):
            # If it's a list (old format), convert to new format
            return jsonify({
                'selectedCompounds': [],
                'uploadedFiles': analytical_data
            })
        else:
            # Return the analytical data as is
            return jsonify(analytical_data)
    except Exception as e:
        print(f"Error in experiment_analytical: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@experiment_bp.route('/results', methods=['GET', 'POST'])
def experiment_results():
    """Get or update experiment results"""
    if request.method == 'POST':
        current_experiment['results'] = request.json
        return jsonify({'message': 'Results updated'})
    
    return jsonify(current_experiment['results'])

@experiment_bp.route('/heatmap', methods=['GET', 'POST'])
def experiment_heatmap():
    """Handle heatmap data persistence"""
    if request.method == 'GET':
        return jsonify(current_experiment.get('heatmap_data', {}))
    
    elif request.method == 'POST':
        data = request.get_json()
        current_experiment['heatmap_data'] = data
        return jsonify({'message': 'Heatmap data saved successfully'})

@experiment_bp.route('/reset', methods=['POST'])
def reset_experiment():
    """Reset current experiment"""
    from state.experiment import reset_experiment
    reset_experiment()
    return jsonify({'message': 'Experiment reset'})
