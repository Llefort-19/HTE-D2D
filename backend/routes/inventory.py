"""
Inventory routes blueprint.
Handles inventory and private inventory operations.
"""
import os
import pandas as pd
from flask import Blueprint, request, jsonify
from state import inventory_data, load_inventory

# Create blueprint
inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')

@inventory_bp.route('', methods=['GET'])
def get_inventory():
    """Get all chemicals from inventory with optional pagination"""
    if not inventory_data:
        if not load_inventory():
            return jsonify({'error': 'Failed to load inventory'}), 500
    
    if inventory_data:
        # Get pagination parameters
        page = request.args.get('page', type=int)
        limit = request.args.get('limit', type=int)
        fields = request.args.get('fields', '').split(',') if request.args.get('fields') else None
        
        # Clean the data before JSON serialization
        records = inventory_data.to_dict('records')
        cleaned_records = []
        
        for record in records:
            cleaned_record = {}
            for key, value in record.items():
                if pd.isna(value) or (hasattr(value, 'year') and pd.isna(value)):
                    cleaned_record[key] = None
                elif hasattr(value, 'isoformat'):
                    cleaned_record[key] = value.isoformat()
                else:
                    cleaned_record[key] = value
            cleaned_records.append(cleaned_record)
        
        # Apply field filtering if requested
        if fields and fields[0]:  # Check if fields is not empty
            filtered_records = []
            for record in cleaned_records:
                filtered_record = {field: record.get(field) for field in fields if field in record}
                filtered_records.append(filtered_record)
            cleaned_records = filtered_records
        
        # Apply pagination if requested
        if page is not None and limit is not None:
            total = len(cleaned_records)
            start = (page - 1) * limit
            end = start + limit
            paginated_records = cleaned_records[start:end]
            
            return jsonify({
                'data': paginated_records,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'pages': (total + limit - 1) // limit,
                    'has_next': end < total,
                    'has_prev': page > 1
                }
            })
        
        # Return all data (backward compatible)
        return jsonify(cleaned_records)
    else:
        return jsonify([])

@inventory_bp.route('/search', methods=['GET'])
def search_inventory():
    """Search chemicals in both main and private inventory"""
    query = request.args.get('q', '').lower()
    
    # Main inventory
    if not inventory_data:
        if not load_inventory():
            return jsonify({'error': 'Failed to load inventory'}), 500
    
    main_results = pd.DataFrame()
    if inventory_data:
        main_results = inventory_data[
            inventory_data['chemical_name'].str.lower().str.contains(query, na=False) |
            inventory_data['alias'].str.lower().str.contains(query, na=False) |
            inventory_data['cas_number'].astype(str).str.lower().str.contains(query, na=False) |
            inventory_data['smiles'].astype(str).str.lower().str.contains(query, na=False)
        ]
    
    # Private inventory
    private_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Private_Inventory.xlsx')
    private_results = pd.DataFrame()
    if os.path.exists(private_path):
        try:
            # Read private inventory without parsing dates to avoid NaTType issues
            private_df = pd.read_excel(private_path, parse_dates=False)
            
            # Convert all columns to string to avoid any datetime/NaT issues
            for col in private_df.columns:
                private_df[col] = private_df[col].astype(str)
                # Replace 'nan' strings with None for better JSON handling
                private_df[col] = private_df[col].replace('nan', None)
            
            private_results = private_df[
                private_df['chemical_name'].str.lower().str.contains(query, na=False) |
                private_df['alias'].str.lower().str.contains(query, na=False) |
                private_df['cas_number'].astype(str).str.lower().str.contains(query, na=False) |
                private_df['smiles'].astype(str).str.lower().str.contains(query, na=False)
            ]
        except Exception as e:
            print(f"Error loading private inventory: {e}")
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
    
    # Clean the data before JSON serialization to handle NaT values
    if not combined.empty:
        # Convert DataFrame to records and clean any problematic values
        records = combined.to_dict('records')
        cleaned_records = []
        
        for record in records:
            cleaned_record = {}
            for key, value in record.items():
                # Handle pandas NaT values and other problematic types
                if pd.isna(value) or (hasattr(value, 'year') and pd.isna(value)):
                    cleaned_record[key] = None
                elif hasattr(value, 'isoformat'):  # datetime objects
                    cleaned_record[key] = value.isoformat()
                else:
                    cleaned_record[key] = value
            cleaned_records.append(cleaned_record)
        
        return jsonify(cleaned_records)
    else:
        return jsonify([])

@inventory_bp.route('/private/add', methods=['POST'])
def add_to_private_inventory():
    """Add chemical to private inventory"""
    chemical = request.json
    private_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Private_Inventory.xlsx')
    headers = ['chemical_name', 'alias', 'cas_number', 'molecular_weight', 'smiles', 'barcode']

    # Create file if it doesn't exist
    if not os.path.exists(private_path):
        from openpyxl import Workbook
        wb = Workbook()
        # Remove the default sheet and create a new one with the correct name
        wb.remove(wb.active)
        ws = wb.create_sheet("Private Inventory")
        ws.append(headers)
        wb.save(private_path)

    # Load and check for duplicates
    df = pd.read_excel(private_path)
    
    # Ensure the DataFrame has only the correct columns
    required_columns = ['chemical_name', 'alias', 'cas_number', 'molecular_weight', 'smiles', 'barcode']
    for col in required_columns:
        if col not in df.columns:
            df[col] = ''
    
    # Remove any extra columns that shouldn't be there
    df = df[required_columns]
    
    if ((df['chemical_name'].str.lower() == chemical['name'].lower()) | 
        (df['cas_number'].astype(str) == str(chemical.get('cas', '')))).any():
        return jsonify({'message': 'Already exists'}), 200

    # Append and save
    new_row = {
        'chemical_name': chemical['name'],
        'alias': chemical.get('alias', ''),
        'cas_number': chemical.get('cas', ''),
        'molecular_weight': chemical.get('molecular_weight', ''),
        'smiles': chemical.get('smiles', ''),
        'barcode': chemical.get('barcode', '')
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    df.to_excel(private_path, index=False)
    return jsonify({'message': 'Added'}), 200

@inventory_bp.route('/private/fix-structure', methods=['POST'])
def fix_private_inventory_structure():
    """Force fix the private inventory structure to have only the correct columns"""
    private_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Private_Inventory.xlsx')
    
    try:
        if os.path.exists(private_path):
            # Read existing data
            df = pd.read_excel(private_path)
            
            # Define the correct columns
            required_columns = ['chemical_name', 'alias', 'cas_number', 'molecular_weight', 'smiles', 'barcode']
            
            # Create a new DataFrame with only the required columns
            new_df = pd.DataFrame()
            
            # Copy data from existing columns if they exist
            for col in required_columns:
                if col in df.columns:
                    new_df[col] = df[col]
                else:
                    new_df[col] = ''
            
            # Save the corrected structure
            new_df.to_excel(private_path, index=False)
            
            return jsonify({'message': 'Private inventory structure fixed successfully'}), 200
        else:
            return jsonify({'message': 'No private inventory file found'}), 404
    except Exception as e:
        return jsonify({'error': f'Failed to fix structure: {str(e)}'}), 500

@inventory_bp.route('/private/check', methods=['POST'])
def check_private_inventory():
    """Check if a chemical exists in private inventory by name, alias, CAS, or SMILES"""
    chemical = request.json
    private_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Private_Inventory.xlsx')
    
    if not os.path.exists(private_path):
        return jsonify({'exists': False}), 200
    
    try:
        df = pd.read_excel(private_path)
        
        # Check for matches by name, alias, CAS, or SMILES
        name_match = df['chemical_name'].str.lower() == chemical.get('name', '').lower()
        alias_match = df['alias'].str.lower() == chemical.get('alias', '').lower()
        cas_match = df['cas_number'].astype(str) == str(chemical.get('cas', ''))
        smiles_match = df['smiles'].astype(str).str.lower() == str(chemical.get('smiles', '')).lower()
        
        exists = (name_match | alias_match | cas_match | smiles_match).any()
        return jsonify({'exists': bool(exists)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
