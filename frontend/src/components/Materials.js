import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [message, setMessage] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoleculeModal, setShowMoleculeModal] = useState(false);
  const [currentMolecule, setCurrentMolecule] = useState({ smiles: '', name: '' });
  const [moleculeImage, setMoleculeImage] = useState(null);
  const [moleculeLoading, setMoleculeLoading] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    alias: '',
    cas: '',
    molecular_weight: '',
    smiles: '',
    barcode: ''
  });




  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearch && !event.target.closest('.search-container')) {
        setShowSearch(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSearch]);

  const loadMaterials = async () => {
    try {
      const response = await axios.get('/api/experiment/materials');
      setMaterials(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading materials:', error);
      setMaterials([]);
    }
  };



  const searchInventory = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }

    try {
      setSearchLoading(true);
      console.log('🔍 Searching for:', query);
      
      const url = `http://localhost:5000/api/inventory/search?q=${encodeURIComponent(query)}`;
      console.log('🌐 API URL:', url);
      
      const response = await axios.get(url);
      console.log('📡 Response status:', response.status);
      console.log('📦 Response data:', response.data);
      console.log('📦 Response data type:', typeof response.data);
      console.log('📦 Is Array?', Array.isArray(response.data));
      console.log('📦 Response data length:', response.data?.length);
      
      // Parse JSON string if response.data is a string
      let parsedData = response.data;
      if (typeof response.data === 'string') {
        try {
          // Replace NaN with null before parsing
          const cleanedData = response.data.replace(/:\s*NaN/g, ': null');
          parsedData = JSON.parse(cleanedData);
          console.log('🔧 Parsed JSON data:', parsedData);
        } catch (parseError) {
          console.error('❌ Error parsing JSON:', parseError);
          parsedData = [];
        }
      }
      
      const results = Array.isArray(parsedData) ? parsedData : [];
      console.log('✅ Processed results:', results);
      console.log('✅ Results length:', results.length);
      
      setSearchResults(results);
      setShowSearch(true); // Always show results container, even if empty
      
    } catch (error) {
      console.error('❌ Error searching inventory:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      setSearchResults([]);
      setShowSearch(false);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    console.log('📝 Search input changed:', query);
    setSearchQuery(query);
    // Don't search automatically - wait for button click
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const handleSearchClick = () => {
    console.log('🔘 Search button clicked');
    console.log('📝 Search query:', searchQuery);
    console.log('📏 Query length:', searchQuery.length);
    
    if (searchQuery.length >= 2) {
      console.log('✅ Query valid, calling searchInventory');
      searchInventory(searchQuery);
    } else {
      console.log('❌ Query too short, clearing results');
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const addFromInventory = (chemical) => {
    const newMaterial = {
      name: chemical.chemical_name,
      alias: chemical.common_name || '',
      cas: chemical.cas_number || '',
      molecular_weight: chemical.molecular_weight || '',
      smiles: chemical.smiles || '',
      barcode: chemical.barcode || ''
    };

    setMaterials(prev => [...prev, newMaterial]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const openAddModal = () => {
    setNewMaterial({
      name: '',
      alias: '',
      cas: '',
      molecular_weight: '',
      smiles: '',
      barcode: ''
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewMaterial({
      name: '',
      alias: '',
      cas: '',
      molecular_weight: '',
      smiles: '',
      barcode: ''
    });
  };

  const handleNewMaterialChange = (field, value) => {
    setNewMaterial(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addNewMaterial = () => {
    if (newMaterial.name.trim()) {
      setMaterials(prev => [...prev, { ...newMaterial }]);
      closeAddModal();
    }
  };

  const updateMaterial = (index, field, value) => {
    setMaterials(prev => prev.map((material, i) => 
      i === index ? { ...material, [field]: value } : material
    ));
  };

  const removeMaterial = (index) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const saveMaterials = async () => {
    try {
      await axios.post('/api/experiment/materials', materials);
      setMessage('Materials saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving materials: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const generateMoleculeImage = async (smiles, name, alias) => {
    if (!smiles || !smiles.trim()) {
      setMessage('No SMILES string provided');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setMoleculeLoading(true);
      setCurrentMolecule({ smiles: smiles.trim(), name, alias });
      
      const response = await axios.post('/api/molecule/image', {
        smiles: smiles.trim(),
        width: 400,
        height: 400
      });
      
      setMoleculeImage(response.data.image);
      setShowMoleculeModal(true);
    } catch (error) {
      console.error('Error generating molecule image:', error);
      setMessage('Error generating molecule image: ' + (error.response?.data?.error || error.message));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setMoleculeLoading(false);
    }
  };

  const closeMoleculeModal = () => {
    setShowMoleculeModal(false);
    setMoleculeImage(null);
    setCurrentMolecule({ smiles: '', name: '' });
  };

  return (
    <div className="card">
      {console.log('🎯 Materials component rendering')}
      <h2>Materials</h2>
      <p>Add chemicals from inventory or manually enter new materials.</p>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div className="search-container">
        <label htmlFor="search">Search Inventory</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              id="search"
              className="form-control"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleSearchKeyPress}
              placeholder="Search by chemical name or common name..."
            />
            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
              Try searching for: "xant", "dppe", "dppm", etc.
            </small>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleSearchClick}
            disabled={searchQuery.length < 2 || searchLoading}
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
          {searchQuery && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleClearSearch}
              style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
            >
              Clear
            </button>
          )}
        </div>
        
        {showSearch && searchResults && Array.isArray(searchResults) && (
          <div className="search-results">
            {console.log('🎨 Rendering search results:', searchResults.length, 'items')}
            {searchResults.length > 0 ? (
              searchResults.map((chemical, index) => (
                <div
                  key={index}
                  className="search-result-item"
                  onClick={() => addFromInventory(chemical)}
                >
                  <strong>{chemical.chemical_name}</strong>
                  {chemical.common_name && ` (${chemical.common_name})`}
                  <br />
                  <small>CAS: {chemical.cas_number || 'N/A'}</small>
                </div>
              ))
            ) : (
              <div className="search-result-item" style={{ color: '#666', fontStyle: 'italic' }}>
                No chemicals found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      <div className="materials-actions-bar">
        <button className="btn btn-secondary" onClick={openAddModal}>
          Add New Material
        </button>
        <button className="btn btn-success" onClick={saveMaterials}>
          Save Materials
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Alias</th>
            <th>CAS</th>
            <th>Molecular Weight</th>
            <th>SMILES</th>
            <th>Barcode</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material, index) => (
            <tr key={index}>
              <td>{material.name}</td>
              <td>{material.alias}</td>
              <td>{material.cas}</td>
              <td>{material.molecular_weight}</td>
              <td>
                {material.smiles && material.smiles.trim() ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => generateMoleculeImage(material.smiles, material.name, material.alias)}
                    disabled={moleculeLoading}
                    style={{ 
                      padding: '5px 10px', 
                      fontSize: '12px',
                      backgroundColor: '#007bff',
                      borderColor: '#007bff',
                      color: 'white'
                    }}
                  >
                    {moleculeLoading && currentMolecule.smiles === material.smiles ? 'Loading...' : 'View Molecule'}
                  </button>
                ) : (
                  <span style={{ color: '#999', fontStyle: 'italic' }}>No SMILES</span>
                )}
              </td>
              <td>{material.barcode}</td>
              <td className="actions-cell">
                <button
                  className="btn btn-secondary"
                  onClick={() => removeMaterial(index)}
                  style={{ padding: '5px 10px', fontSize: '12px' }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {materials.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
          No materials added yet. Search inventory or add new materials to get started.
        </p>
      )}

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Material</h3>
              <button className="modal-close" onClick={closeAddModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  value={newMaterial.name}
                  onChange={(e) => handleNewMaterialChange('name', e.target.value)}
                  placeholder="Chemical name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="alias">Alias</label>
                <input
                  type="text"
                  id="alias"
                  className="form-control"
                  value={newMaterial.alias}
                  onChange={(e) => handleNewMaterialChange('alias', e.target.value)}
                  placeholder="Common name or alias"
                />
              </div>
              <div className="form-group">
                <label htmlFor="cas">CAS #</label>
                <input
                  type="text"
                  id="cas"
                  className="form-control"
                  value={newMaterial.cas}
                  onChange={(e) => handleNewMaterialChange('cas', e.target.value)}
                  placeholder="CAS number"
                />
              </div>
              <div className="form-group">
                <label htmlFor="molecular_weight">Molecular Weight</label>
                <input
                  type="number"
                  id="molecular_weight"
                  step="0.01"
                  className="form-control"
                  value={newMaterial.molecular_weight}
                  onChange={(e) => handleNewMaterialChange('molecular_weight', e.target.value)}
                  placeholder="g/mol"
                />
              </div>
              <div className="form-group">
                <label htmlFor="smiles">SMILES</label>
                <input
                  type="text"
                  id="smiles"
                  className="form-control"
                  value={newMaterial.smiles}
                  onChange={(e) => handleNewMaterialChange('smiles', e.target.value)}
                  placeholder="SMILES notation"
                />
              </div>
              <div className="form-group">
                <label htmlFor="barcode">Bar Code</label>
                <input
                  type="text"
                  id="barcode"
                  className="form-control"
                  value={newMaterial.barcode}
                  onChange={(e) => handleNewMaterialChange('barcode', e.target.value)}
                  placeholder="Barcode"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeAddModal}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={addNewMaterial}
                disabled={!newMaterial.name.trim()}
              >
                Add Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Molecule Modal */}
      {showMoleculeModal && (
        <div className="modal-overlay" onClick={closeMoleculeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3>Molecule Structure: {currentMolecule.name}</h3>
              <button className="modal-close" onClick={closeMoleculeModal}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              {moleculeImage ? (
                <div>
                  <img 
                    src={`data:image/png;base64,${moleculeImage}`} 
                    alt={`Molecule structure of ${currentMolecule.name}`}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  {currentMolecule.alias && (
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#333' }}>
                      <strong>Alias:</strong> {currentMolecule.alias}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  Failed to generate molecule image
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeMoleculeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials; 