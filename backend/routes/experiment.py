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
    
    return jsonify(current_experiment['context'])

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
