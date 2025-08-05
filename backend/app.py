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
import re

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

def normalize_2d_coordinates(mol, target_bond_length=1.5):
    """
    Normalize 2D coordinates of an RDKit molecule to ensure consistent bond lengths.
    
    Args:
        mol: RDKit Mol object
        target_bond_length (float): Target bond length in Angstroms (default: 1.5)
    
    Returns:
        RDKit Mol object with normalized coordinates
    """
    try:
        if mol is None or mol.GetNumConformers() == 0:
            return mol
        
        # Get the 2D conformer
        conf = mol.GetConformer()
        
        # Calculate current average bond length
        total_bond_length = 0.0
        num_bonds = 0
        
        for bond in mol.GetBonds():
            begin_idx = bond.GetBeginAtomIdx()
            end_idx = bond.GetEndAtomIdx()
            
            begin_pos = conf.GetAtomPosition(begin_idx)
            end_pos = conf.GetAtomPosition(end_idx)
            
            # Calculate Euclidean distance
            bond_length = ((begin_pos.x - end_pos.x) ** 2 + 
                          (begin_pos.y - end_pos.y) ** 2) ** 0.5
            total_bond_length += bond_length
            num_bonds += 1
        
        if num_bonds == 0:
            return mol
        
        # Calculate current average bond length
        current_avg_bond_length = total_bond_length / num_bonds
        
        # Calculate scaling factor
        if current_avg_bond_length > 0:
            scale_factor = target_bond_length / current_avg_bond_length
        else:
            scale_factor = 1.0
        
        # Apply scaling to all atom positions
        for atom_idx in range(mol.GetNumAtoms()):
            pos = conf.GetAtomPosition(atom_idx)
            new_pos = Chem.rdGeometry.Point3D(
                pos.x * scale_factor,
                pos.y * scale_factor,
                pos.z
            )
            conf.SetAtomPosition(atom_idx, new_pos)
        
        return mol
    except Exception as e:
        # Return original molecule if normalization fails
        return mol

def prepare_molecule(smiles, target_bond_length=1.5):
    """Parse SMILES, generate 2D coords, normalize bond lengths."""
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        try:
            AllChem.Compute2DCoords(mol, canonOrient=True)
        except Exception:
            AllChem.Compute2DCoords(mol)
        mol = normalize_2d_coordinates(mol, target_bond_length)
        return mol
    except Exception as e:
        print(f"[prepare_molecule] Error: {e}")
        return None

def render_molecule_svg(mol, image_size):
    """Render molecule to SVG using RDKit MolDraw2DSVG."""
    try:
        drawer = Draw.MolDraw2DSVG(image_size[0], image_size[1])
        drawer.DrawMolecule(mol)
        drawer.FinishDrawing()
        return drawer.GetDrawingText()
    except Exception as e:
        print(f"[render_molecule_svg] Error: {e}")
        return None

def svg_to_png(svg_data):
    """Convert SVG data to PNG bytes using cairosvg."""
    try:
        import cairosvg
        return cairosvg.svg2png(bytestring=svg_data.encode('utf-8'))
    except Exception as e:
        print(f"[svg_to_png] Error: {e}")
        return None

def render_molecule_png(mol, image_size):
    """Render molecule to PNG using RDKit's MolToImage."""
    try:
        return Draw.MolToImage(
            mol,
            size=image_size,
            kekulize=True,
            wedgeBonds=True,
            fitImage=True,
            useCoords=True
        )
    except Exception as e:
        print(f"[render_molecule_png] Error: {e}")
        try:
            return Draw.MolToImage(
                mol,
                size=image_size,
                kekulize=True,
                wedgeBonds=True,
                fitImage=True
            )
        except Exception as e2:
            print(f"[render_molecule_png fallback] Error: {e2}")
            return None

def image_to_base64(img_or_bytes):
    """Convert PIL.Image or PNG bytes to base64 string."""
    import base64
    import io
    try:
        if hasattr(img_or_bytes, 'save'):
            buffer = io.BytesIO()
            img_or_bytes.save(buffer, format='PNG')
            img_bytes = buffer.getvalue()
        else:
            img_bytes = img_or_bytes
        return base64.b64encode(img_bytes).decode()
    except Exception as e:
        print(f"[image_to_base64] Error: {e}")
        return None

def blank_png_base64(size=(300, 300)):
    from PIL import Image
    img = Image.new("RGBA", size, (255, 255, 255, 0))
    return image_to_base64(img)

def generate_molecule_image(smiles_string, image_size=(300, 300)):
    """
    Generate a 2D molecule image from a SMILES string with consistent rendering.
    Returns: base64 encoded PNG or a blank PNG if all rendering fails.
    """
    try:
        mol = prepare_molecule(smiles_string)
        if mol is None:
            return blank_png_base64(image_size)
        # Try SVG rendering first
        svg_data = render_molecule_svg(mol, image_size)
        if svg_data:
            png_bytes = svg_to_png(svg_data)
            if png_bytes:
                b64 = image_to_base64(png_bytes)
                if b64:
                    return b64
        # Fallback to PNG rendering
        img = render_molecule_png(mol, image_size)
        if img:
            b64 = image_to_base64(img)
            if b64:
                return b64
        # Final fallback: blank image
        return blank_png_base64(image_size)
    except Exception as e:
        print(f"[generate_molecule_image] Error: {e}")
        return blank_png_base64(image_size)

def parse_sdf_file(sdf_content):
    """
    Parse SDF file content and extract molecules using RDKit's SDF reader.
    
    Args:
        sdf_content (str): The content of the SDF file
    
    Returns:
        list: List of molecules with their SMILES and images
    """
    molecules = []
    
    try:
        # Create a temporary file to use with SDMolSupplier
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sdf', delete=False) as tmp_file:
            tmp_file.write(sdf_content)
            tmp_file_path = tmp_file.name
        
        # Read molecules from the temporary file
        suppl = Chem.SDMolSupplier(tmp_file_path)
        
        for i, mol in enumerate(suppl):
            if mol is not None:
                try:
                    # Get molecule name
                    mol_name = mol.GetProp('_Name') if mol.HasProp('_Name') else f"Molecule_{i+1}"
                    
                    # Convert to SMILES
                    smiles = Chem.MolToSmiles(mol)
                    
                    # Generate image
                    image_data = generate_molecule_image(smiles, (200, 200))
                    
                    molecules.append({
                        'name': mol_name,
                        'smiles': smiles,
                        'image': image_data
                    })
                    
                except Exception as e:
                    continue
            else:
                continue
        
        # Clean up temporary file
        try:
            os.unlink(tmp_file_path)
        except Exception:
            pass
        
    except Exception as e:
        pass
    
    return molecules

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
            inventory_data['cas_number'].astype(str).str.lower().str.contains(query, na=False) |
            inventory_data['smiles'].astype(str).str.lower().str.contains(query, na=False)
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
                private_df['cas_number'].astype(str).str.lower().str.contains(query, na=False) |
                private_df['smiles'].astype(str).str.lower().str.contains(query, na=False)
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

@app.route('/api/solvent/search', methods=['GET'])
def search_solvents():
    """Search solvents in the Solvent.xlsx file"""
    query = request.args.get('q', '').lower()
    search_type = request.args.get('type', 'all')  # all, name, alias, cas, boiling_point, class
    class_filter = request.args.get('class_filter', '').lower()
    bp_filter = request.args.get('bp_filter', '')
    
    solvent_path = os.path.join(os.path.dirname(__file__), '..', 'Solvent.xlsx')
    
    if not os.path.exists(solvent_path):
        return jsonify({'error': 'Solvent database not found'}), 404
    
    try:
        df = pd.read_excel(solvent_path)
        
        # Handle NaN values
        df = df.fillna('')
        
        # Start with all data
        results = df.copy()
        
        # Apply text search if query provided
        if query and search_type == 'all':
            text_filter = (
                df['Name'].astype(str).str.lower().str.contains(query, na=False) |
                df['Alias'].astype(str).str.lower().str.contains(query, na=False) |
                df['CAS Number'].astype(str).str.lower().str.contains(query, na=False)
            )
            results = results[text_filter]
        
        # Apply class filter if provided
        if class_filter:
            class_mask = df['Chemical Class'].astype(str).str.lower().str.contains(class_filter, na=False)
            results = results[class_mask]
        
        # Apply boiling point filter if provided
        if bp_filter:
            try:
                if bp_filter.startswith('>'):
                    bp_value = float(bp_filter[1:].strip())
                    bp_mask = df['Boiling point'] > bp_value
                elif bp_filter.startswith('<'):
                    bp_value = float(bp_filter[1:].strip())
                    bp_mask = df['Boiling point'] < bp_value
                else:
                    # Try to parse as exact value
                    bp_value = float(bp_filter)
                    tolerance = 5  # ±5°C tolerance
                    bp_mask = (df['Boiling point'] >= bp_value - tolerance) & (df['Boiling point'] <= bp_value + tolerance)
                
                results = results[bp_mask]
            except ValueError:
                # If boiling point filter is invalid, return empty results
                results = pd.DataFrame()
        
        # Convert to list of dictionaries with consistent field names
        solvent_results = []
        for _, row in results.iterrows():
            solvent_results.append({
                'name': row['Name'],
                'alias': row['Alias'],
                'cas': row['CAS Number'],
                'molecular_weight': row['Molecular_weight'],
                'smiles': row['SMILES'],
                'boiling_point': row['Boiling point'],
                'chemical_class': row['Chemical Class'],
                'density': row['Density (g/mL)'],
                'tier': row['Tier'],
                'source': 'solvent_database'
            })
        
        return jsonify(solvent_results)
        
    except Exception as e:
        return jsonify({'error': f'Error searching solvents: {str(e)}'}), 500

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

@app.route('/api/inventory/private/check', methods=['POST'])
def check_private_inventory():
    """Check if a chemical exists in private inventory by name, alias, CAS, or SMILES"""
    chemical = request.json
    private_path = os.path.join(os.path.dirname(__file__), '..', 'Private_Inventory.xlsx')
    
    if not os.path.exists(private_path):
        return jsonify({'exists': False}), 200
    
    try:
        df = pd.read_excel(private_path)
        
        # Check for matches by name, alias, CAS, or SMILES
        name_match = df['chemical_name'].str.lower() == chemical.get('name', '').lower()
        alias_match = df['common_name'].str.lower() == chemical.get('alias', '').lower()
        cas_match = df['cas_number'].astype(str) == str(chemical.get('cas', ''))
        smiles_match = df['smiles'].astype(str).str.lower() == str(chemical.get('smiles', '')).lower()
        
        exists = (name_match | alias_match | cas_match | smiles_match).any()
        return jsonify({'exists': bool(exists)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

@app.route('/api/experiment/analytical/template', methods=['POST'])
def export_analytical_template():
    try:
        data = request.get_json()
        compounds = data.get('compounds', [])
        
        if not compounds:
            return jsonify({'error': 'No compounds provided'}), 400
        
        # Create a new workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Analytical Data"
        
        # Add headers - Well, Sample ID, then compound columns
        headers = ['Well', 'Sample ID']
        for i, compound in enumerate(compounds, 1):
            headers.extend([f'Name_{i}', f'Area_{i}'])
        
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        
        # Generate 96 wells (8 rows x 12 columns)
        rows = ["A", "B", "C", "D", "E", "F", "G", "H"]
        columns = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
        
        # Get ELN number from context for sample IDs
        context = current_experiment.get('context', {})
        eln_number = context.get('eln_number', 'ELN-001')
        
        row_num = 2
        for row in rows:
            for col in columns:
                well = f"{row}{col}"
                sample_id = f"{eln_number}-{well}"
                
                # Add well and sample ID
                ws.cell(row=row_num, column=1, value=well)
                ws.cell(row=row_num, column=2, value=sample_id)
                
                # Add compound name and area columns
                for compound_idx, compound in enumerate(compounds):
                    # Cpd_(number)_Name column
                    ws.cell(row=row_num, column=3 + (compound_idx * 2), value=compound)
                    # Cmpd_(number)_area column (empty for user to fill)
                    ws.cell(row=row_num, column=4 + (compound_idx * 2), value="")
                
                row_num += 1
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
            wb.save(tmp_file.name)
            tmp_file_path = tmp_file.name
        
        # Read the file and return it
        with open(tmp_file_path, 'rb') as f:
            file_content = f.read()
        
        # Clean up temporary file
        os.unlink(tmp_file_path)
        
        return send_file(
            io.BytesIO(file_content),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'Analytical_Template_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/experiment/analytical/upload', methods=['POST'])
def upload_analytical_data():
    try:
        print("Upload endpoint called")
        
        if 'file' not in request.files:
            print("No file in request.files")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        print(f"File received: {file.filename}")
        
        if file.filename == '':
            print("Empty filename")
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        allowed_extensions = {'.xlsx', '.xls', '.csv'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        print(f"File extension: {file_ext}")
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'}), 400
        
        # Read the file based on its type
        try:
            print("Attempting to read file")
            if file_ext == '.csv':
                df = pd.read_csv(file)
            else:  # Excel files
                df = pd.read_excel(file)
            print(f"File read successfully. Shape: {df.shape}")
        except Exception as e:
            print(f"Error reading file: {str(e)}")
            return jsonify({'error': f'Error reading file: {str(e)}'}), 400
        
        # Basic validation - check if file has expected structure
        if len(df.columns) < 2:
            print(f"File has insufficient columns: {len(df.columns)}")
            return jsonify({'error': 'File must have at least 2 columns (Well and Sample ID)'}), 400
        
        # Validate area columns (columns containing "Area_" in their names)
        area_columns = [col for col in df.columns if col.startswith('Area_')]
        print(f"Found area columns: {area_columns}")
        
        # Check if area columns contain only numerical data
        invalid_area_columns = []
        for col in area_columns:
            try:
                # Convert to numeric, coercing errors to NaN
                numeric_col = pd.to_numeric(df[col], errors='coerce')
                # Check if there are any NaN values (indicating non-numeric data)
                if numeric_col.isna().any():
                    invalid_area_columns.append(col)
                    print(f"Column {col} contains non-numeric data")
            except Exception as e:
                invalid_area_columns.append(col)
                print(f"Error validating column {col}: {str(e)}")
        
        if invalid_area_columns:
            return jsonify({
                'error': f'Area columns must contain only numerical data. Invalid columns: {", ".join(invalid_area_columns)}'
            }), 400
        
        print(f"Current experiment state before upload: {list(current_experiment.keys())}")
        
        # Store the uploaded data in the current experiment
        uploaded_data = {
            'filename': file.filename,
            'upload_date': datetime.now().isoformat(),
            'data': df.to_dict('records'),
            'columns': df.columns.tolist(),
            'shape': df.shape,
            'area_columns': area_columns  # Add area columns information
        }
        
        # Add to analytical data without overwriting existing data
        if 'analytical_data' not in current_experiment:
            current_experiment['analytical_data'] = {}
        
        # If analytical_data is a list (old format), convert it to new format
        if isinstance(current_experiment['analytical_data'], list):
            old_uploads = current_experiment['analytical_data']
            current_experiment['analytical_data'] = {
                'selectedCompounds': [],
                'uploadedFiles': old_uploads
            }
        
        if 'uploadedFiles' not in current_experiment['analytical_data']:
            current_experiment['analytical_data']['uploadedFiles'] = []
        
        current_experiment['analytical_data']['uploadedFiles'].append(uploaded_data)
        
        print(f"Upload successful. Current experiment keys: {list(current_experiment.keys())}")
        
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': file.filename,
            'rows': len(df),
            'columns': len(df.columns),
            'area_columns': area_columns
        }), 200
        
    except Exception as e:
        print(f"Unexpected error in upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/api/experiment/materials/upload', methods=['POST'])
def upload_materials_from_excel():
    """Upload materials from Excel file"""
    try:
        print("Materials upload endpoint called")
        
        if 'file' not in request.files:
            print("No file in request.files")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        print(f"File received: {file.filename}")
        
        if file.filename == '':
            print("Empty filename")
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        allowed_extensions = {'.xlsx', '.xls'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        print(f"File extension: {file_ext}")
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'}), 400
        
        # Read the Excel file
        try:
            print("Attempting to read Excel file")
            excel_file = pd.ExcelFile(file)
            print(f"Excel sheets: {excel_file.sheet_names}")
        except Exception as e:
            print(f"Error reading Excel file: {str(e)}")
            return jsonify({'error': f'Error reading Excel file: {str(e)}'}), 400
        
        # Look for Materials sheet
        if 'Materials' not in excel_file.sheet_names:
            return jsonify({'error': 'No "Materials" sheet found in the Excel file'}), 400
        
        # Read the Materials sheet
        try:
            materials_df = pd.read_excel(file, sheet_name='Materials')
            print(f"Materials sheet read successfully. Shape: {materials_df.shape}")
        except Exception as e:
            print(f"Error reading Materials sheet: {str(e)}")
            return jsonify({'error': f'Error reading Materials sheet: {str(e)}'}), 400
        
        # Extract materials from the sheet
        materials = []
        for index, row in materials_df.iterrows():
            # Skip empty rows
            if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
                continue
            
            # Extract material data based on expected columns
            material = {
                'name': str(row.get('Name', row.iloc[1] if len(row) > 1 else '')).strip(),
                'alias': str(row.get('Alias', '')).strip(),
                'cas': str(row.get('CAS', '')).strip(),
                'smiles': str(row.get('SMILES', '')).strip(),
                'molecular_weight': str(row.get('Molecular Weight', '')).strip(),
                'barcode': str(row.get('Lot number', '')).strip(),
                'role': str(row.get('Role', '')).strip(),
                'source': 'excel_upload'
            }
            
            # Only add if name is not empty
            if material['name'] and material['name'] != 'nan':
                materials.append(material)
        
        if not materials:
            return jsonify({'error': 'No valid materials found in the Materials sheet'}), 400
        
        print(f"Extracted {len(materials)} materials from Excel file")
        
        # Get current materials
        current_materials = current_experiment.get('materials', [])
        
        # Check for duplicates and add new materials
        added_materials = []
        skipped_materials = []
        
        for material in materials:
            # Check if material already exists (by name, CAS, or SMILES)
            is_duplicate = any(
                existing['name'] == material['name'] or
                (existing.get('cas') and material.get('cas') and existing['cas'] == material['cas']) or
                (existing.get('smiles') and material.get('smiles') and existing['smiles'] == material['smiles'])
                for existing in current_materials
            )
            
            if is_duplicate:
                skipped_materials.append(material['alias'] or material['name'])
            else:
                added_materials.append(material)
                current_materials.append(material)
        
        # Update the experiment materials
        current_experiment['materials'] = current_materials
        
        return jsonify({
            'message': 'Materials uploaded successfully',
            'filename': file.filename,
            'total_materials': len(materials),
            'added_materials': len(added_materials),
            'skipped_materials': len(skipped_materials),
            'added_material_names': [m['alias'] or m['name'] for m in added_materials],
            'skipped_material_names': skipped_materials
        }), 200
        
    except Exception as e:
        print(f"Unexpected error in materials upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Materials upload failed: {str(e)}'}), 500

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

@app.route('/api/upload/sdf', methods=['POST'])
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

@app.route('/api/experiment/heatmap', methods=['GET', 'POST'])
def experiment_heatmap():
    """Handle heatmap data persistence"""
    global current_experiment
    
    if request.method == 'GET':
        return jsonify(current_experiment.get('heatmap_data', {}))
    
    elif request.method == 'POST':
        data = request.get_json()
        current_experiment['heatmap_data'] = data
        return jsonify({'message': 'Heatmap data saved successfully'})

@app.route('/api/experiment/reset', methods=['POST'])
def reset_experiment():
    """Reset current experiment"""
    global current_experiment
    current_experiment = {
        'context': {},
        'materials': [],
        'procedure': [],
        'analytical_data': [],
        'results': [],
        'heatmap_data': {}
    }
    return jsonify({'message': 'Experiment reset'})

if __name__ == '__main__':
    # Load inventory on startup
    load_inventory()
    app.run(debug=True, port=5000) 