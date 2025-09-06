"""
Baseline tests for HTE App backend to ensure refactoring doesn't break functionality.
These tests capture current behavior before any changes are made.
"""
import os
import sys
import json
import tempfile
import unittest
from unittest.mock import patch, MagicMock

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the app factory
from app_factory import app

class TestHTEAppBaseline(unittest.TestCase):
    """Test suite to capture current API behavior before refactoring."""
    
    def setUp(self):
        """Set up test client and mock data."""
        self.app = app
        self.client = app.test_client()
        self.app.config['TESTING'] = True
        
        # Mock inventory data as pandas DataFrame
        import pandas as pd
        self.mock_inventory = pd.DataFrame([
            {
                'chemical_name': 'Test Chemical 1',
                'alias': 'TC1',
                'cas_number': '123-45-6',
                'molecular_weight': '100.0',
                'smiles': 'CCO',
                'barcode': 'BAR001'
            },
            {
                'chemical_name': 'Test Chemical 2', 
                'alias': 'TC2',
                'cas_number': '789-01-2',
                'molecular_weight': '200.0',
                'smiles': 'CCN',
                'barcode': 'BAR002'
            }
        ])
        
        # Mock experiment data
        self.mock_experiment = {
            'context': {
                'author': 'Test Author',
                'date': '2025-01-01',
                'project': 'Test Project',
                'eln': 'ELN-001',
                'objective': 'Test Objective'
            },
            'materials': [
                {
                    'name': 'Test Material',
                    'alias': 'TM',
                    'cas': '111-22-3',
                    'smiles': 'CCC',
                    'role': 'Reactant'
                }
            ],
            'procedure': [
                {
                    'well': 'A1',
                    'materials': [
                        {
                            'name': 'Test Material',
                            'amount': '1.0',
                            'unit': 'mmol'
                        }
                    ]
                }
            ],
            'results': []
        }

    def test_inventory_endpoint_structure(self):
        """Test that inventory endpoint returns expected structure."""
        with patch('app.inventory_data', self.mock_inventory):
            response = self.client.get('/api/inventory')
            self.assertEqual(response.status_code, 200)
            
            data = json.loads(response.data)
            self.assertIsInstance(data, list)
            if data:  # Only test if data exists
                self.assertIn('chemical_name', data[0])
                self.assertIn('cas_number', data[0])

    def test_inventory_search_structure(self):
        """Test that inventory search returns expected structure."""
        with patch('app.inventory_data', self.mock_inventory):
            response = self.client.get('/api/inventory/search?q=test')
            self.assertEqual(response.status_code, 200)
            
            data = json.loads(response.data)
            self.assertIsInstance(data, list)

    def test_experiment_context_crud(self):
        """Test experiment context GET/POST operations."""
        # Test GET
        response = self.client.get('/api/experiment/context')
        self.assertEqual(response.status_code, 200)
        
        # Test POST
        test_context = {
            'author': 'Test Author',
            'project': 'Test Project',
            'eln': 'ELN-001'
        }
        response = self.client.post('/api/experiment/context',
                                  data=json.dumps(test_context),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Verify data was stored
        response = self.client.get('/api/experiment/context')
        data = json.loads(response.data)
        self.assertEqual(data['author'], 'Test Author')

    def test_experiment_materials_crud(self):
        """Test experiment materials GET/POST operations."""
        # Test GET
        response = self.client.get('/api/experiment/materials')
        self.assertEqual(response.status_code, 200)
        
        # Test POST
        test_materials = [
            {
                'name': 'Test Material',
                'cas': '111-22-3',
                'role': 'Reactant'
            }
        ]
        response = self.client.post('/api/experiment/materials',
                                  data=json.dumps(test_materials),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Verify data was stored
        response = self.client.get('/api/experiment/materials')
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'Test Material')

    def test_experiment_procedure_crud(self):
        """Test experiment procedure GET/POST operations."""
        # Test GET
        response = self.client.get('/api/experiment/procedure')
        self.assertEqual(response.status_code, 200)
        
        # Test POST
        test_procedure = [
            {
                'well': 'A1',
                'materials': [
                    {
                        'name': 'Test Material',
                        'amount': '1.0'
                    }
                ]
            }
        ]
        response = self.client.post('/api/experiment/procedure',
                                  data=json.dumps(test_procedure),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Verify data was stored
        response = self.client.get('/api/experiment/procedure')
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['well'], 'A1')

    def test_experiment_results_crud(self):
        """Test experiment results GET/POST operations."""
        # Test GET
        response = self.client.get('/api/experiment/results')
        self.assertEqual(response.status_code, 200)
        
        # Test POST
        test_results = [
            {
                'well': 'A1',
                'conversion_percent': '85.5',
                'yield_percent': '78.2'
            }
        ]
        response = self.client.post('/api/experiment/results',
                                  data=json.dumps(test_results),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Verify data was stored
        response = self.client.get('/api/experiment/results')
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['well'], 'A1')

    def test_molecule_image_endpoint(self):
        """Test molecule image generation endpoint."""
        test_data = {
            'smiles': 'CCO',
            'width': 300,
            'height': 300
        }
        response = self.client.post('/api/molecule/image',
                                  data=json.dumps(test_data),
                                  content_type='application/json')
        
        # Should return 200 or 400 (depending on RDKit availability)
        self.assertIn(response.status_code, [200, 400])
        
        if response.status_code == 200:
            data = json.loads(response.data)
            self.assertIn('image', data)
            self.assertIn('format', data)

    def test_experiment_reset(self):
        """Test experiment reset functionality."""
        # First, add some data
        test_context = {'author': 'Test Author'}
        self.client.post('/api/experiment/context',
                        data=json.dumps(test_context),
                        content_type='application/json')
        
        # Reset experiment
        response = self.client.post('/api/experiment/reset')
        self.assertEqual(response.status_code, 200)
        
        # Verify data was cleared
        response = self.client.get('/api/experiment/context')
        data = json.loads(response.data)
        self.assertEqual(data, {})

    def test_error_handling_structure(self):
        """Test that error responses have expected structure."""
        # Test invalid endpoint
        response = self.client.get('/api/nonexistent')
        self.assertEqual(response.status_code, 404)
        
        # Test invalid JSON
        response = self.client.post('/api/experiment/context',
                                  data='invalid json',
                                  content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_cors_headers(self):
        """Test that CORS headers are present."""
        response = self.client.get('/api/inventory')
        self.assertIn('Access-Control-Allow-Origin', response.headers)

    def test_file_upload_structure(self):
        """Test file upload endpoint structure (without actual file)."""
        # Test missing file
        response = self.client.post('/api/experiment/analytical/upload')
        self.assertEqual(response.status_code, 400)
        
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_export_endpoint_structure(self):
        """Test export endpoint returns file."""
        response = self.client.post('/api/experiment/export')
        # Should return 200 with Excel file or 500 if no data
        self.assertIn(response.status_code, [200, 500])
        
        if response.status_code == 200:
            self.assertIn('application/vnd.openxmlformats', response.headers.get('Content-Type', ''))

    def test_solvent_endpoints_structure(self):
        """Test solvent-related endpoints structure."""
        # Test solvent search
        response = self.client.get('/api/solvent/search?q=water')
        # Should return 200 or 404 (if Solvent.xlsx doesn't exist)
        self.assertIn(response.status_code, [200, 404])
        
        # Test solvent tiers
        response = self.client.get('/api/solvent/tiers')
        self.assertIn(response.status_code, [200, 404])
        
        # Test solvent classes
        response = self.client.get('/api/solvent/classes')
        self.assertIn(response.status_code, [200, 404])

    def test_analytical_data_structure(self):
        """Test analytical data endpoint structure."""
        # Test GET
        response = self.client.get('/api/experiment/analytical')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        # Should have expected structure
        self.assertIsInstance(data, dict)
        self.assertIn('selectedCompounds', data)
        self.assertIn('uploadedFiles', data)

    def test_heatmap_endpoint_structure(self):
        """Test heatmap endpoint structure."""
        # Test GET
        response = self.client.get('/api/experiment/heatmap')
        self.assertEqual(response.status_code, 200)
        
        # Test POST
        test_heatmap = {'data': 'test'}
        response = self.client.post('/api/experiment/heatmap',
                                  data=json.dumps(test_heatmap),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_procedure_settings_structure(self):
        """Test procedure settings endpoint structure."""
        # Test GET
        response = self.client.get('/api/experiment/procedure-settings')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn('reactionConditions', data)
        self.assertIn('analyticalDetails', data)
        
        # Test POST
        test_settings = {
            'reactionConditions': {
                'temperature': '25',
                'time': '24'
            }
        }
        response = self.client.post('/api/experiment/procedure-settings',
                                  data=json.dumps(test_settings),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 200)

if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
