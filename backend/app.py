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

def load_inventory():
    """Load inventory from Excel file"""
    global inventory_data
    try:
        # Look for Inventory.xlsx in the parent directory (root of the project)
        import os
        inventory_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Inventory.xlsx')
        inventory_data = pd.read_excel(inventory_path)
        return True
    except Exception as e:
        print(f"Error loading inventory: {e}")
        return False

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    """Get all chemicals from inventory"""
    if inventory_data is None:
        if not load_inventory():
            return jsonify({'error': 'Failed to load inventory'}), 500
    
    # Convert to list of dictionaries
    chemicals = inventory_data.to_dict('records')
    return jsonify(chemicals)

@app.route('/api/inventory/search', methods=['GET'])
def search_inventory():
    """Search chemicals in inventory"""
    query = request.args.get('q', '').lower()
    
    if inventory_data is None:
        if not load_inventory():
            return jsonify({'error': 'Failed to load inventory'}), 500
    
    # Filter by chemical name or common name
    filtered = inventory_data[
        inventory_data['chemical_name'].str.lower().str.contains(query, na=False) |
        inventory_data['common_name'].str.lower().str.contains(query, na=False)
    ]
    
    return jsonify(filtered.to_dict('records'))

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
    try:
        # Create a new workbook
        wb = Workbook()
        
        # Remove default sheet
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
        if current_experiment['materials']:
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
        if current_experiment['procedure']:
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
        if current_experiment['analytical_data']:
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
        if current_experiment['results']:
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
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
            wb.save(tmp.name)
            tmp_path = tmp.name
        
        return send_file(tmp_path, as_attachment=True, 
                        download_name=f'HTE_experiment_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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