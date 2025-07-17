from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import os
import json
from datetime import datetime
import tempfile
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils.dataframe import dataframe_to_rows
from rdkit import Chem
from rdkit.Chem import Draw
from rdkit.Chem import AllChem
from PIL import Image
import io
import base64

app = Flask(__name__)
CORS(app)

# Global variables to store data
inventory_data = None
current_experiment = {
    'context': {},
    'materials': [],
    'procedure': [],
    'analytical_data': [],
    'results': []
}

def generate_molecule_image(smiles_string, image_size=(300, 300)):
    """
    Generate a 2D molecule image from a SMILES string.
    
    Args:
        smiles_string (str): The SMILES string representation of the molecule
        image_size (tuple): Size of the output image (width, height)
    
    Returns:
        str: Base64 encoded image data or None if SMILES is invalid
    """
    mol = Chem.MolFromSmiles(smiles_string)
    if mol is None:
        return None
    
    # Generate 2D coordinates
    AllChem.Compute2DCoords(mol)
    
    # Create image
    img = Draw.MolToImage(mol, size=image_size)
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return img_str

def load_inventory():
    """Load inventory from Excel file"""
    global inventory_data
    try:
        inventory_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Inventory.xlsx')
        inventory_data = pd.read_excel(inventory_path)
        return True
    except Exception:
        return False

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    """Get all chemicals from inventory"""
    if inventory_data is None:
        if not load_inventory():
            return jsonify({'error': 'Failed to load inventory'}), 500
    
    chemicals = inventory_data.to_dict('records') if inventory_data is not None else []
    return jsonify(chemicals)

@app.route('/api/inventory/search', methods=['GET'])
def search_inventory():
    """Search chemicals in both main and private inventory"""
    query = request.args.get('q', '').lower()
    
    # Main inventory
    if inventory_data is None:
        if not load_inventory():
            return jsonify({'error': 'Failed to load inventory'}), 500
    
    main_results = pd.DataFrame()
    if inventory_data is not None:
        main_results = inventory_data[
            inventory_data['chemical_name'].str.lower().str.contains(query, na=False) |
            inventory_data['common_name'].str.lower().str.contains(query, na=False) |
            inventory_data['cas_number'].astype(str).str.lower().str.contains(query, na=False)
        ]
    
    # Private inventory
    private_path = os.path.join(os.path.dirname(__file__), '..', 'Private_Inventory.xlsx')
    private_results = pd.DataFrame()
    if os.path.exists(private_path):
        try:
            private_df = pd.read_excel(private_path)
            private_results = private_df[
                private_df['chemical_name'].str.lower().str.contains(query, na=False) |
                private_df['common_name'].str.lower().str.contains(query, na=False) |
                private_df['cas_number'].astype(str).str.lower().str.contains(query, na=False)
            ]
        except Exception:
            pass
    
    # Combine with main inventory priority
    if not main_results.empty and not private_results.empty:
        # Get names and CAS from main results to filter out duplicates from private
        main_names = set(main_results['chemical_name'].str.lower())
        main_cas = set(main_results['cas_number'].astype(str).str.lower())
        
        # Filter private results to exclude duplicates
        private_filtered = private_results[
            ~(private_results['chemical_name'].str.lower().isin(main_names) |
              private_results['cas_number'].astype(str).str.lower().isin(main_cas))
        ]
        
        # Combine main results with filtered private results
        combined = pd.concat([main_results, private_filtered], ignore_index=True)
    elif not main_results.empty:
        combined = main_results
    elif not private_results.empty:
        combined = private_results
    else:
        combined = pd.DataFrame()
    
    return jsonify(combined.to_dict('records') if not combined.empty else [])

@app.route('/api/inventory/private/add', methods=['POST'])
def add_to_private_inventory():
    chemical = request.json
    private_path = os.path.join(os.path.dirname(__file__), '..', 'Private_Inventory.xlsx')
    headers = ['chemical_name', 'common_name', 'cas_number', 'molecular_weight', 'smiles', 'barcode', 'date_added', 'notes']

    # Create file if it doesn't exist
    if not os.path.exists(private_path):
        wb = Workbook()
        ws = wb.active
        if ws is None:
            ws = wb.create_sheet("Private Inventory")
        else:
            ws.title = "Private Inventory"
        ws.append(headers)
        wb.save(private_path)

    # Load and check for duplicates
    df = pd.read_excel(private_path)
    if ((df['chemical_name'].str.lower() == chemical['name'].lower()) | 
        (df['cas_number'].astype(str) == str(chemical.get('cas', '')))).any():
        return jsonify({'message': 'Already exists'}), 200

    # Append and save
    new_row = {
        'chemical_name': chemical['name'],
        'common_name': chemical.get('alias', ''),
        'cas_number': chemical.get('cas', ''),
        'molecular_weight': chemical.get('molecular_weight', ''),
        'smiles': chemical.get('smiles', ''),
        'barcode': chemical.get('barcode', ''),
        'date_added': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'notes': chemical.get('notes', '')
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    df.to_excel(private_path, index=False)
    return jsonify({'message': 'Added'}), 200

@app.route('/api/experiment/context', methods=['GET', 'POST'])
def experiment_context():
    """Get or update experiment context"""
    global current_experiment
    
    if request.method == 'POST':
        current_experiment['context'] = request.json
        return jsonify({'message': 'Context updated'})
    
    return jsonify(current_experiment['context'])

@app.route('/api/experiment/materials', methods=['GET', 'POST'])
def experiment_materials():
    """Get or update experiment materials"""
    global current_experiment
    
    if request.method == 'POST':
        current_experiment['materials'] = request.json
        return jsonify({'message': 'Materials updated'})
    
    return jsonify(current_experiment['materials'])

@app.route('/api/experiment/procedure', methods=['GET', 'POST'])
def experiment_procedure():
    """Get or update experiment procedure (96-well plate)"""
    global current_experiment
    
    if request.method == 'POST':
        current_experiment['procedure'] = request.json
        return jsonify({'message': 'Procedure updated'})
    
    return jsonify(current_experiment['procedure'])

@app.route('/api/experiment/analytical', methods=['GET', 'POST'])
def experiment_analytical():
    """Get or update analytical data"""
    global current_experiment
    
    if request.method == 'POST':
        current_experiment['analytical_data'] = request.json
        return jsonify({'message': 'Analytical data updated'})
    
    return jsonify(current_experiment['analytical_data'])

@app.route('/api/experiment/results', methods=['GET', 'POST'])
def experiment_results():
    """Get or update experiment results"""
    global current_experiment
    
    if request.method == 'POST':
        current_experiment['results'] = request.json
        return jsonify({'message': 'Results updated'})
    
    return jsonify(current_experiment['results'])

@app.route('/api/experiment/export', methods=['POST'])
def export_experiment():
    """Export experiment data to Excel format"""
    # Create a new workbook
    wb = Workbook()
    
    # Remove default sheet
    if wb.active:
        wb.remove(wb.active)
    
    # Context sheet
    ws_context = wb.create_sheet("Context")
    context_data = [
        ['Author', current_experiment['context'].get('author', '')],
        ['Date', current_experiment['context'].get('date', '')],
        ['Project', current_experiment['context'].get('project', '')],
        ['ELN', current_experiment['context'].get('eln', '')],
        ['Objective', current_experiment['context'].get('objective', '')]
    ]
    
    for row in context_data:
        ws_context.append(row)
    
    # Materials sheet
    ws_materials = wb.create_sheet("Materials")
    if current_experiment.get('materials'):
        # Add headers
        headers = ['Nr', 'Name', 'Alias', 'CAS', 'SMILES', 'Lot number', 'Role', 
                  'Quantification level', 'Analytical wavelength', 'RRF to IS']
        ws_materials.append(headers)
        
        # Add materials
        for i, material in enumerate(current_experiment['materials'], 1):
            row = [
                i,
                material.get('name', ''),
                material.get('alias', ''),
                material.get('cas', ''),
                material.get('smiles', ''),
                material.get('lot_number', ''),
                material.get('role', ''),
                material.get('quantification_level', ''),
                material.get('analytical_wavelength', ''),
                material.get('rrf_to_is', '')
            ]
            ws_materials.append(row)
    
    # Procedure sheet
    ws_procedure = wb.create_sheet("Procedure")
    if current_experiment.get('procedure'):
        # Add headers for 96-well plate
        headers = ['Nr', 'Well', 'ID']
        # Add compound columns (up to 15 compounds)
        for i in range(1, 16):
            headers.extend([f'Compound-{i}_name', f'Compound-{i}_mmol'])
        # Add reagent columns (up to 5 reagents)
        for i in range(1, 6):
            headers.extend([f'Reagent-{i}_name', f'Reagent-{i}_mmol'])
        # Add solvent columns (up to 3 solvents)
        for i in range(1, 4):
            headers.extend([f'Solvent-{i}_name', f'Solvent-{i}_uL'])
        
        ws_procedure.append(headers)
        
        # Add procedure data
        for i, well_data in enumerate(current_experiment['procedure'], 1):
            row = [i, well_data.get('well', ''), well_data.get('id', '')]
            
            # Add compounds
            for j in range(1, 16):
                row.extend([
                    well_data.get(f'compound_{j}_name', ''),
                    well_data.get(f'compound_{j}_mmol', '')
                ])
            
            # Add reagents
            for j in range(1, 6):
                row.extend([
                    well_data.get(f'reagent_{j}_name', ''),
                    well_data.get(f'reagent_{j}_mmol', '')
                ])
            
            # Add solvents
            for j in range(1, 4):
                row.extend([
                    well_data.get(f'solvent_{j}_name', ''),
                    well_data.get(f'solvent_{j}_ul', '')
                ])
            
            ws_procedure.append(row)
    
    # Analytical data sheet
    ws_analytical = wb.create_sheet("Analytical data (1)")
    if current_experiment.get('analytical_data'):
        # Add headers
        headers = ['Nr', 'Well', 'ID']
        for i in range(1, 16):
            headers.extend([f'Compound-{i}_name', f'Compound-{i}_area'])
        
        ws_analytical.append(headers)
        
        # Add analytical data
        for i, analytical_data in enumerate(current_experiment['analytical_data'], 1):
            row = [i, analytical_data.get('well', ''), analytical_data.get('id', '')]
            
            for j in range(1, 16):
                row.extend([
                    analytical_data.get(f'compound_{j}_name', ''),
                    analytical_data.get(f'compound_{j}_area', '')
                ])
            
            ws_analytical.append(row)
    
    # Results sheet
    ws_results = wb.create_sheet("Results (1)")
    if current_experiment.get('results'):
        # Add headers
        headers = ['Nr', 'Well', 'ID', 'Conversion_%', 'Yield_%', 'Selectivity_%']
        ws_results.append(headers)
        
        # Add results data
        for i, result_data in enumerate(current_experiment['results'], 1):
            row = [
                i,
                result_data.get('well', ''),
                result_data.get('id', ''),
                result_data.get('conversion_percent', ''),
                result_data.get('yield_percent', ''),
                result_data.get('selectivity_percent', '')
            ]
            ws_results.append(row)
    
    # Well Contents sheet - Detailed view of each well
    ws_well_contents = wb.create_sheet("Well Contents")
    
    # Create a mapping of materials by name for quick lookup
    materials_map = {}
    for material in current_experiment.get('materials', []):
        materials_map[material.get('name', '').lower()] = material
    
    # Initialize well contents data
    well_contents = {}
    for col in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']:
        for row in range(1, 13):
            well = f'{col}{row}'
            well_contents[well] = {
                'compounds': [],
                'reagents': [],
                'solvents': []
            }
    
    # Fill in well contents from procedure data
    if current_experiment.get('procedure'):
        for well_data in current_experiment['procedure']:
            well = well_data.get('well', '')
            if well in well_contents:
                # Process materials array
                materials = well_data.get('materials', [])
                
                for material in materials:
                    name = material.get('name', '')
                    amount = material.get('amount', '')
                    alias = material.get('alias', '')
                    cas = material.get('cas', '')
                    
                    if name and amount:
                        # For now, treat all materials as compounds
                        # You can add logic here to distinguish compounds, reagents, solvents
                        well_contents[well]['compounds'].append({
                            'name': name,
                            'amount': amount,
                            'alias': alias,
                            'cas': cas
                        })
    
    # Find the maximum number of compounds across all wells to determine column count
    max_compounds = 0
    for well in well_contents:
        compounds_count = len(well_contents[well]['compounds'])
        reagents_count = len(well_contents[well]['reagents'])
        solvents_count = len(well_contents[well]['solvents'])
        total_materials = compounds_count + reagents_count + solvents_count
        max_compounds = max(max_compounds, total_materials)
    
    # Create header row
    headers = ['Well']
    for i in range(1, max_compounds + 1):
        headers.extend([f'Compound_{i}_Name', f'Compound_{i}_Alias', f'Compound_{i}_CAS', f'Compound_{i}_Amount'])
    
    ws_well_contents.append(headers)
    
    # Add data for each well (all 96 wells)
    for col in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']:
        for row in range(1, 13):
            well = f'{col}{row}'
            contents = well_contents[well]
            
            # Combine all materials into a single list
            all_materials = []
            all_materials.extend(contents['compounds'])
            all_materials.extend(contents['reagents'])
            all_materials.extend(contents['solvents'])
            
            # Create row data
            row_data = [well]
            
            # Add materials to columns (4 columns per material)
            for i in range(max_compounds):
                if i < len(all_materials):
                    material = all_materials[i]
                    row_data.extend([
                        material['name'],
                        material.get('alias', ''),
                        material.get('cas', ''),
                        material['amount']
                    ])
                else:
                    # Fill empty columns
                    row_data.extend(['', '', '', ''])
            
            ws_well_contents.append(row_data)
    
    # Save to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        wb.save(tmp.name)
        tmp_path = tmp.name
    
    return send_file(tmp_path, as_attachment=True, 
                    download_name=f'HTE_experiment_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')

@app.route('/api/molecule/image', methods=['POST'])
def get_molecule_image():
    """Generate molecule image from SMILES string"""
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

@app.route('/api/experiment/reset', methods=['POST'])
def reset_experiment():
    """Reset current experiment"""
    global current_experiment
    current_experiment = {
        'context': {},
        'materials': [],
        'procedure': [],
        'analytical_data': [],
        'results': []
    }
    return jsonify({'message': 'Experiment reset'})

if __name__ == '__main__':
    # Load inventory on startup
    load_inventory()
    app.run(debug=True, port=5000) 