"""
Kit routes blueprint.
Handles kit analysis and application operations.
"""
import os
import pandas as pd
from flask import Blueprint, request, jsonify
from state import current_experiment
from app_original import (
    apply_kit_design_to_procedure, calculate_well_mappings, calculate_flexible_well_mappings
)

# Create blueprint
kit_bp = Blueprint('kit', __name__, url_prefix='/api/experiment/kit')

@kit_bp.route('/analyze', methods=['POST'])
def analyze_kit():
    """Analyze kit Excel file and return materials and design data"""
    try:
        print("Kit analyze endpoint called")
        
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
        
        # Look for Design sheet
        if 'Design' not in excel_file.sheet_names:
            return jsonify({'error': 'No "Design" sheet found in the Excel file'}), 400
        
        # Read the Materials sheet
        try:
            materials_df = pd.read_excel(file, sheet_name='Materials')
            print(f"Materials sheet read successfully. Shape: {materials_df.shape}")
        except Exception as e:
            print(f"Error reading Materials sheet: {str(e)}")
            return jsonify({'error': f'Error reading Materials sheet: {str(e)}'}), 400
        
        # Read the Design sheet
        try:
            design_df = pd.read_excel(file, sheet_name='Design')
            print(f"Design sheet read successfully. Shape: {design_df.shape}")
        except Exception as e:
            print(f"Error reading Design sheet: {str(e)}")
            return jsonify({'error': f'Error reading Design sheet: {str(e)}'}), 400
        
        # Extract materials from the Materials sheet
        materials = []
        for index, row in materials_df.iterrows():
            # Skip empty rows
            if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
                continue
            
            # Extract material data based on expected columns (support both old and new column names)
            # Helper function to clean and validate field values
            def clean_field(value):
                if pd.isna(value):
                    return ''
                str_value = str(value).strip()
                # Return empty string for common "empty" representations
                if str_value.lower() in ['nan', 'null', 'none', '']:
                    return ''
                return str_value
            
            material = {
                'name': clean_field(row.get('chemical_name', row.get('Chemical_Name', row.get('Name', row.iloc[1] if len(row) > 1 else '')))),
                'alias': clean_field(row.get('alias', row.get('Alias', ''))),
                'cas': clean_field(row.get('cas_number', row.get('CAS_Number', row.get('CAS', '')))),
                'smiles': clean_field(row.get('smiles', row.get('SMILES', ''))),
                'molecular_weight': clean_field(row.get('molecular_weight', row.get('Molecular_Weight', row.get('Molecular Weight', '')))),
                'barcode': clean_field(row.get('barcode', row.get('Barcode', row.get('Lot number', '')))),
                'role': clean_field(row.get('role', row.get('Role', ''))),
                'source': 'kit_upload'
            }
            
            # Only add if name or alias is not empty (allow materials with just alias)
            if (material.get('name') and material.get('name') != 'nan') or (material.get('alias') and material.get('alias') != 'nan'):
                materials.append(material)
                print(f"Added material: name='{material.get('name', '')}', alias='{material.get('alias', '')}'")
            else:
                print(f"Skipped material: name='{material.get('name', '')}', alias='{material.get('alias', '')}' (both empty)")
        
        if not materials:
            return jsonify({'error': 'No valid materials found in the Materials sheet'}), 400
        
        # Extract design data from the Design sheet
        design_data = {}
        kit_wells = set()
        
        for index, row in design_df.iterrows():
            # Skip empty rows
            if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
                continue
            
            well = str(row.get('Well', row.iloc[0])).strip()
            if not well or well == 'nan':
                continue
            
            kit_wells.add(well)
            
            # Extract compounds and amounts from the row
            well_materials = []
            
            # Look for compound columns (e.g., "Compound 1 name", "Compound 1 amount")
            col_index = 2  # Start after Well and ID columns
            while col_index < len(row):
                if col_index + 1 < len(row):
                    compound_name = str(row.iloc[col_index]).strip()
                    compound_amount = str(row.iloc[col_index + 1]).strip()
                    
                    if compound_name and compound_name != 'nan' and compound_amount and compound_amount != 'nan':
                        # Find the material in our materials list
                        material = next((m for m in materials if m.get('name') == compound_name or m.get('alias') == compound_name), None)
                        if material:
                            # Include all material fields to ensure proper matching with materials list
                            well_materials.append({
                                'name': material.get('name', ''),
                                'alias': material.get('alias', ''),
                                'cas': material.get('cas', ''),
                                'smiles': material.get('smiles', ''),
                                'molecular_weight': material.get('molecular_weight', ''),
                                'barcode': material.get('barcode', ''),
                                'role': material.get('role', ''),
                                'amount': compound_amount,
                                'unit': 'μmol'  # Default unit
                            })
                            if well in ['A1', 'A12', 'B1', 'B12']:  # Debug corner wells
                                print(f"DEBUG: Well {well}: Added '{compound_name}' -> material '{material.get('alias', '')}'")
                        else:
                            if well in ['A1', 'A12', 'B1', 'B12']:  # Debug corner wells
                                print(f"DEBUG: Well {well}: Compound '{compound_name}' NOT FOUND in materials")
                
                col_index += 2  # Move to next compound pair
            
            if well_materials:
                design_data[well] = well_materials
        
        # Determine kit size based on wells that actually have content
        if not design_data:
            return jsonify({'error': 'No wells with materials found in the Design sheet'}), 400
        
        # Use only wells that have materials for kit size calculation
        content_wells = list(design_data.keys())
        
        # Parse well positions to determine kit dimensions
        rows = set()
        cols = set()
        
        for well in content_wells:
            if len(well) >= 2:
                row_letter = well[0]
                col_number = int(well[1:])
                rows.add(row_letter)
                cols.add(col_number)
        
        # For kit size calculation, determine the full range from min to max
        # This accounts for kits that may have empty wells within the range
        if rows and cols:
            min_row = min(rows)
            max_row = max(rows)
            min_col = min(cols)
            max_col = max(cols)
            
            # Calculate the full kit dimensions (min to max range)
            kit_rows = ord(max_row) - ord(min_row) + 1
            kit_cols = max_col - min_col + 1
            total_possible_wells = kit_rows * kit_cols
            
            # Generate all possible wells in the kit range
            all_kit_wells = []
            for row_ord in range(ord(min_row), ord(max_row) + 1):
                for col_num in range(min_col, max_col + 1):
                    well = f"{chr(row_ord)}{col_num}"
                    all_kit_wells.append(well)
        else:
            kit_rows = len(rows)
            kit_cols = len(cols)
            total_possible_wells = len(content_wells)
            all_kit_wells = sorted(list(content_wells))
        
        kit_size = {
            'rows': kit_rows,
            'columns': kit_cols,
            'total_wells': total_possible_wells,
            'content_wells': len(content_wells),
            'row_range': f"{min(rows)}-{max(rows)}" if len(rows) > 1 else min(rows),
            'col_range': f"{min(cols)}-{max(cols)}" if len(cols) > 1 else str(min(cols)),
            'wells': sorted(all_kit_wells)
        }
        
        print(f"Kit analysis complete: {len(materials)} materials, {len(design_data)} wells with content")
        print(f"Kit size calculated: rows={kit_rows}, columns={kit_cols}, total_wells={total_possible_wells}")
        print(f"Content wells with materials: {sorted(content_wells)}")
        print(f"Full kit range: {min(rows) if rows else 'N/A'}-{max(rows) if rows else 'N/A'} × {min(cols) if cols else 'N/A'}-{max(cols) if cols else 'N/A'}")
        print(f"All kit wells: {sorted(all_kit_wells)}")
        
        return jsonify({
            'materials': materials,
            'design': design_data,
            'kit_size': kit_size,
            'filename': file.filename
        }), 200
        
    except Exception as e:
        print(f"Unexpected error in kit analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Kit analysis failed: {str(e)}'}), 500

@kit_bp.route('/apply', methods=['POST'])
def apply_kit():
    """Apply kit to experiment with specified positioning"""
    try:
        print("Kit apply endpoint called")
        
        data = request.json
        materials = data.get('materials', [])
        design = data.get('design', {})
        position = data.get('position', '')
        kit_size = data.get('kit_size', {})
        destination_plate = data.get('destination_plate', '96')
        
        if not materials or not design or not position:
            return jsonify({'error': 'Missing required data: materials, design, or position'}), 400
        
        print(f"Applying kit with position: {position} on {destination_plate}-well plate")
        
        # Get current experiment data
        current_materials = current_experiment.get('materials', [])
        current_procedure = current_experiment.get('procedure', [])
        
        # Add materials to experiment (avoiding duplicates)
        added_materials = []
        skipped_materials = []
        
        for material in materials:
            # Check if material already exists (by name, CAS, or SMILES)
            is_duplicate = any(
                (existing.get('name') and material.get('name') and existing.get('name') == material.get('name')) or
                (existing.get('cas') and material.get('cas') and existing.get('cas') == material.get('cas')) or
                (existing.get('smiles') and material.get('smiles') and existing.get('smiles') == material.get('smiles'))
                for existing in current_materials
            )
            
            if is_duplicate:
                skipped_materials.append(material.get('alias') or material.get('name', 'Unknown'))
            else:
                added_materials.append(material)
                current_materials.append(material)
        
        # Apply design to procedure based on position
        new_procedure_data = apply_kit_design_to_procedure(design, position, kit_size, current_procedure, destination_plate)
        
        # Update experiment
        current_experiment['materials'] = current_materials
        current_experiment['procedure'] = new_procedure_data
        
        return jsonify({
            'message': 'Kit applied successfully',
            'added_materials': len(added_materials),
            'skipped_materials': len(skipped_materials),
            'procedure_wells_updated': len([w for w in new_procedure_data if any(m.get('source') == 'kit_upload' for m in w.get('materials', []))])
        }), 200
        
    except Exception as e:
        print(f"Unexpected error in kit application: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Kit application failed: {str(e)}'}), 500
