"""Test pagination functionality."""
import json
import unittest
from app_factory import app

class TestPagination(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        
    def test_backward_compatibility(self):
        """Test that no params returns all data as before."""
        response = self.client.get('/api/inventory')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)  # Should be array, not paginated object
        
    def test_pagination_structure(self):
        """Test pagination returns proper structure."""
        response = self.client.get('/api/inventory?page=1&limit=5')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('data', data)
        self.assertIn('pagination', data)
        self.assertIn('total', data['pagination'])
        
if __name__ == '__main__':
    unittest.main()
