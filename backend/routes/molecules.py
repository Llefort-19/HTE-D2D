"""
Molecules routes blueprint.
Handles molecule image generation and SDF file uploads.
"""
from flask import Blueprint, request, jsonify
from app_original import (
    generate_molecule_image, parse_sdf_file
)

# Create blueprint
molecules_bp = Blueprint('molecules', __name__, url_prefix='/api')

@molecules_bp.route('/molecule/image', methods=['POST'])
def get_molecule_image():
    """Generate molecule image from SMILES string"""
    # Optional validation in warn-only mode
    try:
        from validation.utils import validate_data
        from validation.schemas import MoleculeImageRequestSchema
        
        schema = MoleculeImageRequestSchema()
        validated_data, errors = validate_data(
            schema, request.get_json(), strict_mode=False,
            endpoint="POST /api/molecule/image"
        )
        data = validated_data
    except Exception as e:
        # If validation fails, use original data and log warning
        import logging
        logging.warning(f"Molecule image request validation failed: {e}")
        data = request.get_json()
    
    smiles = data.get('smiles', '').strip()
    
    if not smiles:
        return jsonify({'error': 'SMILES string is required'}), 400
    
    # Get optional image size
    width = data.get('width', 300)
    height = data.get('height', 300)
    
    # Generate image
    image_data = generate_molecule_image(smiles, (width, height))
    
    if image_data is None:
        return jsonify({'error': 'Invalid SMILES string'}), 400
    
    return jsonify({
        'image': image_data,
        'format': 'png',
        'size': {'width': width, 'height': height}
    })

@molecules_bp.route('/upload/sdf', methods=['POST'])
def upload_sdf():
    """Upload and parse SDF file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.sdf'):
        return jsonify({'error': 'File must be in SDF format'}), 400
    
    try:
        # Read file content
        sdf_content = file.read().decode('utf-8')
        
        # Parse SDF file
        molecules = parse_sdf_file(sdf_content)
        
        if not molecules:
            return jsonify({'error': 'No valid molecules found in SDF file'}), 400
        
        # Assign ID-based names to all molecules
        for i, molecule in enumerate(molecules):
            molecule['name'] = f"ID-{(i+1):02d}"
        
        return jsonify({
            'molecules': molecules,
            'total_molecules': len(molecules)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error processing SDF file: {str(e)}'}), 500
