"""
Solvent routes blueprint.
Handles solvent database operations.
"""
import os
import re
import pandas as pd
from flask import Blueprint, request, jsonify

# Create blueprint
solvent_bp = Blueprint('solvent', __name__, url_prefix='/api/solvent')

@solvent_bp.route('/search', methods=['GET'])
def search_solvents():
    """Search solvents in the Solvent.xlsx file"""
    query = request.args.get('q', '').lower()
    search_type = request.args.get('type', 'all')  # all, name, alias, cas, boiling_point, class
    class_filter = request.args.get('class_filter', '').lower()
    bp_filter = request.args.get('bp_filter', '')
    tier_filter = request.args.get('tier_filter', '')
    
    solvent_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Solvent.xlsx')
    
    if not os.path.exists(solvent_path):
        return jsonify({'error': 'Solvent database not found'}), 404
    
    try:
        df = pd.read_excel(solvent_path)
        
        # Handle NaN values
        df = df.fillna('')
        
        # Start with all data
        results = df.copy()
        
        # Apply text search if query provided
        if query:
            text_filter = (
                df['Name'].astype(str).str.lower().str.contains(query, na=False) |
                df['Alias'].astype(str).str.lower().str.contains(query, na=False) |
                df['CAS Number'].astype(str).str.lower().str.contains(query, na=False)
            )
            results = results[text_filter]
            print(f"Text filter results: {len(results)} matches found")
        
        # Apply class filter if provided
        if class_filter:
            print(f"Applying class filter: '{class_filter}'")
            # More flexible class matching - check if the class filter is contained in the chemical class
            # Also handle common variations and plural forms
            class_variations = [class_filter]
            if class_filter.endswith('s'):
                class_variations.append(class_filter[:-1])  # Remove 's' for singular
            else:
                class_variations.append(class_filter + 's')  # Add 's' for plural
            
            # Create a more flexible filter
            class_mask = results['Chemical Class'].astype(str).str.lower().str.contains('|'.join(class_variations), na=False)
            print(f"Class filter results: {class_mask.sum()} matches found")
            print(f"Available classes in filtered data: {results['Chemical Class'].astype(str).unique()}")
            results = results[class_mask]
        
        # Apply boiling point filter if provided
        if bp_filter:
            try:
                if bp_filter.startswith('>'):
                    bp_value = float(bp_filter[1:].strip())
                    bp_mask = results['Boiling point'] > bp_value
                elif bp_filter.startswith('<'):
                    bp_value = float(bp_filter[1:].strip())
                    bp_mask = results['Boiling point'] < bp_value
                else:
                    # Try to parse as exact value
                    bp_value = float(bp_filter)
                    tolerance = 5  # ±5°C tolerance
                    bp_mask = (results['Boiling point'] >= bp_value - tolerance) & (results['Boiling point'] <= bp_value + tolerance)
                
                print(f"Boiling point filter results: {bp_mask.sum()} matches found")
                results = results[bp_mask]
            except ValueError:
                # If boiling point filter is invalid, return empty results
                print("Invalid boiling point filter value")
                results = pd.DataFrame()
        
        # Apply tier filter if provided
        if tier_filter:
            try:
                max_tier = int(tier_filter)
                # Extract numeric part from "Tier X" format
                tier_numeric = results['Tier'].astype(str).str.extract(r'Tier\s*(\d+)')[0].astype(float)
                tier_mask = tier_numeric <= max_tier
                results = results[tier_mask]
            except ValueError:
                # If tier filter is invalid, return empty results
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

@solvent_bp.route('/tiers', methods=['GET'])
def get_solvent_tiers():
    """Get all available solvent tiers from the database"""
    solvent_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Solvent.xlsx')
    
    if not os.path.exists(solvent_path):
        return jsonify({'error': 'Solvent database not found'}), 404
    
    try:
        df = pd.read_excel(solvent_path)
        df = df.fillna('')
        
        # Get unique tiers
        tiers = df['Tier'].astype(str).unique()
        tiers = [tier.strip() for tier in tiers if tier.strip() and tier.strip().lower() != 'nan']
        
        # Extract numeric part from "Tier X" format and convert to integers
        tier_numbers = []
        for tier in tiers:
            try:
                # Extract number from "Tier X" format
                match = re.search(r'Tier\s*(\d+)', tier, re.IGNORECASE)
                if match:
                    tier_numbers.append(int(match.group(1)))
            except (ValueError, AttributeError):
                continue
        
        # Sort and convert back to strings
        tier_numbers.sort()
        tiers = [str(tier) for tier in tier_numbers]
        
        return jsonify(tiers)
        
    except Exception as e:
        return jsonify({'error': f'Error getting solvent tiers: {str(e)}'}), 500

@solvent_bp.route('/classes', methods=['GET'])
def get_solvent_classes():
    """Get all available solvent classes from the database"""
    solvent_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Solvent.xlsx')
    
    if not os.path.exists(solvent_path):
        return jsonify({'error': 'Solvent database not found'}), 404
    
    try:
        df = pd.read_excel(solvent_path)
        df = df.fillna('')
        
        # Get unique chemical classes
        classes = df['Chemical Class'].astype(str).unique()
        classes = [cls.strip() for cls in classes if cls.strip() and cls.strip().lower() != 'nan']
        
        # Sort classes alphabetically
        classes.sort()
        
        return jsonify(classes)
        
    except Exception as e:
        return jsonify({'error': f'Error getting solvent classes: {str(e)}'}), 500
