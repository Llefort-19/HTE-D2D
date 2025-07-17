import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [message, setMessage] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoleculeModal, setShowMoleculeModal] = useState(false);
  const [currentMolecule, setCurrentMolecule] = useState({ smiles: '', name: '' });
  const [moleculeImage, setMoleculeImage] = useState(null);
  const [moleculeLoading, setMoleculeLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    alias: '',
    cas: '',
    molecular_weight: '',
    smiles: '',
    barcode: '',
    role: ''
  });

  const roleOptions = [
    'Reactant',
    'Target product', 
    'Product',
    'Solvent',
    'Reagent',
    'Internal standard'
  ];

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only hide search results if clicking on materials table or other areas
      // Don't hide when clicking on search-related elements
      if (showSearch && 
          !event.target.closest('.search-container') && 
          !event.target.closest('.search-results-section') &&
          !event.target.closest('.materials-table-section') &&
          !event.target.closest('.materials-actions-bar')) {
        // Don't automatically hide - let user control when to clear
        // setShowSearch(false);
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
      setSelectedResultIndex(-1);
      return;
    }

    try {
      setSearchLoading(true);
      console.log(`Searching for: "${query}"`);
      
      const url = `http://localhost:5000/api/inventory/search?q=${encodeURIComponent(query)}`;
      console.log(`Making request to: ${url}`);
      
      const response = await axios.get(url);
      console.log('Search response received:', response.data);
      
      // Parse JSON string if response.data is a string
      let parsedData = response.data;
      if (typeof response.data === 'string') {
        try {
          // Replace NaN with null before parsing
          const cleanedData = response.data.replace(/:\s*NaN/g, ': null');
          parsedData = JSON.parse(cleanedData);
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          parsedData = [];
        }
      }
      
      const results = Array.isArray(parsedData) ? parsedData : [];
      console.log(`Found ${results.length} results`);
      
      setSearchResults(results);
      setShowSearch(true); // Always show results container, even if empty
      setSelectedResultIndex(-1); // Reset selection when new search
      
    } catch (error) {
      console.error('Error searching inventory:', error);
      console.error('Error details:', error.response?.data || error.message);
      setSearchResults([]);
      setShowSearch(false);
      setSelectedResultIndex(-1);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear search results when user starts typing a new search
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      setSelectedResultIndex(-1);
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (searchQuery.length >= 2) {
        searchInventory(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearch(false);
      }
    } else if (e.key === 'ArrowDown' && showSearch && searchResults.length > 0) {
      e.preventDefault();
      setSelectedResultIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp' && showSearch && searchResults.length > 0) {
      e.preventDefault();
      setSelectedResultIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedResultIndex >= 0 && searchResults[selectedResultIndex]) {
      e.preventDefault();
      addFromInventory(searchResults[selectedResultIndex]);
      setSelectedResultIndex(-1);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
    setSelectedResultIndex(-1);
  };

  const isMaterialInList = (chemical) => {
    return materials.some(material => 
      material.name === chemical.chemical_name || 
      (material.cas && chemical.cas_number && material.cas === chemical.cas_number)
    );
  };

  const addFromInventory = async (chemical) => {
    const newMaterial = {
      name: chemical.chemical_name,
      alias: chemical.common_name || '',
      cas: chemical.cas_number || '',
      molecular_weight: chemical.molecular_weight || '',
      smiles: chemical.smiles || '',
      barcode: chemical.barcode || '',
      role: ''
    };

    // Check if material already exists in the list
    const isDuplicate = materials.some(material => 
      material.name === newMaterial.name || 
      (material.cas && newMaterial.cas && material.cas === newMaterial.cas)
    );

    if (isDuplicate) {
      setMessage(`${newMaterial.name} is already in the materials list`);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const updatedMaterials = [...materials, newMaterial];
    setMaterials(updatedMaterials);
    
    try {
      await axios.post('/api/experiment/materials', updatedMaterials);
    } catch (error) {
      console.error('Error saving material:', error);
      setMessage('Error saving material: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }
    
    setMessage(`${newMaterial.name} added to materials list`);
    setTimeout(() => setMessage(''), 3000);
  };

  const openAddModal = () => {
    setNewMaterial({
      name: '',
      alias: '',
      cas: '',
      molecular_weight: '',
      smiles: '',
      barcode: '',
      role: ''
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
      barcode: '',
      role: ''
    });
  };

  const handleNewMaterialChange = (field, value) => {
    setNewMaterial(prev => ({ ...prev, [field]: value }));
  };

  const addNewMaterial = async () => {
    if (!newMaterial.name.trim()) {
      setMessage('Name is required');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Check if material already exists
    const isDuplicate = materials.some(material => 
      material.name === newMaterial.name || 
      (material.cas && newMaterial.cas && material.cas === newMaterial.cas)
    );

    if (isDuplicate) {
      setMessage(`${newMaterial.name} is already in the materials list`);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const updatedMaterials = [...materials, newMaterial];
    setMaterials(updatedMaterials);
    
    try {
      await axios.post('/api/experiment/materials', updatedMaterials);
      
      // Also add to private inventory
      await axios.post('/api/inventory/private/add', {
        name: newMaterial.name,
        alias: newMaterial.alias,
        cas: newMaterial.cas,
        molecular_weight: newMaterial.molecular_weight,
        smiles: newMaterial.smiles,
        barcode: newMaterial.barcode,
        notes: ''
      });
      
      setMessage(`${newMaterial.name} added to materials list and private inventory`);
      setTimeout(() => setMessage(''), 3000);
      closeAddModal();
    } catch (error) {
      console.error('Error saving material:', error);
      setMessage('Error saving material: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const removeMaterial = async (index) => {
    const materialToRemove = materials[index];
    const updatedMaterials = materials.filter((_, i) => i !== index);
    setMaterials(updatedMaterials);
    
    try {
      await axios.post('/api/experiment/materials', updatedMaterials);
      setMessage(`${materialToRemove.name} removed from materials list`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error removing material:', error);
      setMessage('Error removing material: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const updateMaterialRole = (index, role) => {
    const updatedMaterials = [...materials];
    updatedMaterials[index] = { ...updatedMaterials[index], role };
    setMaterials(updatedMaterials);
    // Note: Role is not persisted to backend
  };

  const generateMoleculeImage = async (smiles, name, alias) => {
    if (!smiles || !smiles.trim()) {
      setMessage('No SMILES string available');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setMoleculeLoading(true);
    setCurrentMolecule({ smiles, name, alias });
    setShowMoleculeModal(true);

    try {
      const response = await axios.post('/api/molecule/image', {
        smiles: smiles.trim(),
        width: 300,
        height: 300
      });

      if (response.data && response.data.image) {
        setMoleculeImage(response.data.image);
      } else {
        setMoleculeImage(null);
      }
    } catch (error) {
      console.error('Error generating molecule image:', error);
      setMoleculeImage(null);
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
    <div className="materials-container">
      {/* Message Display */}
      {message && (
        <div className="message" style={{ 
          padding: '10px', 
          marginBottom: '10px', 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          border: '1px solid #c3e6cb', 
          borderRadius: '4px' 
        }}>
          {message}
        </div>
      )}

      {/* Top Row: Action Buttons */}
      <div className="materials-actions-bar">
        <div className="action-buttons">
          <button
            className="btn btn-success"
            onClick={openAddModal}
            style={{ marginRight: '10px' }}
          >
            Add New Material
          </button>
          <button
            className="btn btn-info"
            onClick={() => setShowHelpModal(true)}
            style={{ marginRight: '10px' }}
          >
            Help
          </button>
        </div>
      </div>

      {/* Middle Row: Search Input and Results Side by Side */}
      <div className="search-and-results-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        {/* Search Input (Left - 25%) */}
        <div className="search-input-section" style={{ width: '25%' }}>
          <h4>Search Inventory</h4>
          <div className="search-container">
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                id="search"
                className="form-control"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyPress={handleSearchKeyPress}
                placeholder="Search by chemical name or common name... (Press Enter to search)"
              />
            </div>
            {searchQuery && (
              <button
                className="btn btn-outline-secondary"
                onClick={handleClearSearch}
                style={{ width: '100%', padding: '6px 12px', fontSize: '12px' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search Results (Right - 75%) */}
        <div className="search-results-section" style={{ width: '75%' }}>
          <h4>Search Results {showSearch && searchResults && Array.isArray(searchResults) ? `(${searchResults.length})` : ''}</h4>
          <div className="search-results-container" style={{ 
            height: '300px', 
            overflowY: 'auto', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            backgroundColor: '#f8f9fa'
          }}>
            {showSearch && searchResults && Array.isArray(searchResults) ? (
              <div className="search-results-list">
                {searchResults.length > 0 ? (
                  searchResults.map((chemical, index) => {
                    const isExisting = isMaterialInList(chemical);
                    const isSelected = index === selectedResultIndex;
                    return (
                      <div
                        key={index}
                        className={`search-result-item ${isExisting ? 'existing-material' : ''} ${isSelected ? 'selected-result' : ''}`}
                        onClick={isExisting ? undefined : () => addFromInventory(chemical)}
                        onMouseEnter={() => setSelectedResultIndex(index)}
                        style={{
                          cursor: isExisting ? 'not-allowed' : 'pointer',
                          opacity: isExisting ? 0.6 : 1,
                          backgroundColor: isExisting 
                            ? '#f8f9fa' 
                            : isSelected 
                              ? '#e3f2fd' 
                              : undefined,
                          border: isExisting 
                            ? '1px solid #dee2e6' 
                            : isSelected 
                              ? '1px solid #2196f3' 
                              : undefined,
                          borderLeft: isSelected ? '3px solid #2196f3' : undefined,
                          padding: '8px 12px',
                          borderBottom: '1px solid #eee'
                        }}
                      >
                        <strong>{chemical.chemical_name}</strong>
                        {chemical.common_name && ` (${chemical.common_name})`}
                        <br />
                        <small>CAS: {chemical.cas_number || 'N/A'}</small>
                        {isExisting && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#6c757d', 
                            fontStyle: 'italic',
                            marginTop: '2px'
                          }}>
                            ✓ Already in materials list
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="search-result-item" style={{ color: '#666', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                    No chemicals found matching "{searchQuery}"
                  </div>
                )}
              </div>
            ) : (
              <div className="search-results-placeholder" style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#666', fontStyle: 'italic' }}>
                  Search for chemicals to see results here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Materials Table (Full Width) */}
      <div className="materials-table-section">
        <h4>Selected Materials</h4>
        <div className="materials-table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Alias</th>
                <th>CAS</th>
                <th>SMILES</th>
                <th>Barcode</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material, index) => (
                <tr key={index}>
                  <td>{material.alias || material.name}</td>
                  <td>{material.cas}</td>
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
                  <td>
                    <select
                      className="form-control"
                      value={material.role || ''}
                      onChange={(e) => updateMaterialRole(index, e.target.value)}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      <option value="">Select Role</option>
                      {roleOptions.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
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
        </div>

        {materials.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
            No materials added yet. Search inventory or add new materials to get started.
          </p>
        )}
      </div>

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
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  className="form-control"
                  value={newMaterial.role}
                  onChange={(e) => handleNewMaterialChange('role', e.target.value)}
                >
                  <option value="">Select Role</option>
                  {roleOptions.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
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

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Materials Help</h3>
              <button className="modal-close" onClick={() => setShowHelpModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <h4>How to use the Materials tab:</h4>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                <li><strong>Search Inventory:</strong> Type in the search box and press Enter to find chemicals from the main inventory and your private inventory.</li>
                <li><strong>Add from Search:</strong> Click on any search result to add it to your materials list. Chemicals already in your list will be highlighted and non-selectable.</li>
                <li><strong>Add New Material:</strong> Click the "Add New Material" button to manually enter a new chemical. This will also save it to your private inventory.</li>
                <li><strong>Assign Roles:</strong> Use the dropdown in the Role column to assign a role to each material: Reactant, Target product, Product, Solvent, Reagent, or Internal standard. (Roles are not saved permanently)</li>
                <li><strong>View Molecule:</strong> Click "View Molecule" next to any SMILES string to see the 2D molecular structure.</li>
                <li><strong>Remove Materials:</strong> Click "Remove" to delete a material from your list and all wells.</li>
                <li><strong>Keyboard Navigation:</strong> Use arrow keys to navigate search results and press Enter to select.</li>
                <li><strong>Search Tips:</strong> Search works with chemical names, common names, and CAS numbers. Minimum 2 characters required.</li>
              </ul>
              <h4>Features:</h4>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                <li>Automatic duplicate prevention</li>
                <li>Search results persist for continued browsing</li>
                <li>Private inventory for your custom chemicals</li>
                <li>Molecule visualization for SMILES strings</li>
                <li>Temporary role assignment for materials</li>
                <li>Auto-save functionality</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHelpModal(false)}>
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