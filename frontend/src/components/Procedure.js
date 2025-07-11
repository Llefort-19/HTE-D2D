import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Procedure = () => {
  const [procedure, setProcedure] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedWells, setSelectedWells] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  // Generate 96 wells (8 rows x 12 columns)
  const wells = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  
  for (let row of rows) {
    for (let col of columns) {
      wells.push(`${row}${col}`);
    }
  }

  useEffect(() => {
    loadProcedure();
    loadMaterials();
  }, []);

  const loadProcedure = async () => {
    try {
      const response = await axios.get('/api/experiment/procedure');
      setProcedure(response.data || []);
    } catch (error) {
      console.error('Error loading procedure:', error);
    }
  };

  const loadMaterials = async () => {
    try {
      const response = await axios.get('/api/experiment/materials');
      setMaterials(response.data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const getWellData = (wellId) => {
    return procedure.find(p => p.well === wellId) || {
      well: wellId,
      materials: []
    };
  };

  const updateWellData = (wellId, materials) => {
    const existingIndex = procedure.findIndex(p => p.well === wellId);
    const updatedData = { well: wellId, materials };

    if (existingIndex >= 0) {
      setProcedure(prev => prev.map((p, i) => i === existingIndex ? updatedData : p));
    } else {
      setProcedure(prev => [...prev, updatedData]);
    }
  };

  const saveProcedure = async () => {
    try {
      await axios.post('/api/experiment/procedure', procedure);
      setMessage('Procedure saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving procedure: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleMaterialClick = (material) => {
    setSelectedMaterial(material);
    setSelectedWells([]);
    setAmount('');
  };

  const handleWellClick = (wellId, event) => {
    if (!selectedMaterial) return;

    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      setSelectedWells(prev => 
        prev.includes(wellId) 
          ? prev.filter(w => w !== wellId)
          : [...prev, wellId]
      );
    } else {
      // Single select
      setSelectedWells([wellId]);
    }
  };

  const handleWellMouseDown = (wellId, event) => {
    if (!selectedMaterial) return;
    
    setIsDragging(true);
    setSelectedWells([wellId]);
  };

  const handleWellMouseEnter = (wellId) => {
    if (!isDragging || !selectedMaterial) return;
    
    setSelectedWells(prev => 
      prev.includes(wellId) ? prev : [...prev, wellId]
    );
  };

  const handleWellMouseUp = () => {
    setIsDragging(false);
  };

  const addMaterialToWells = () => {
    if (!selectedMaterial || selectedWells.length === 0 || !amount) return;

    const materialEntry = {
      name: selectedMaterial.name,
      alias: selectedMaterial.alias,
      cas: selectedMaterial.cas,
      molecular_weight: selectedMaterial.molecular_weight,
      barcode: selectedMaterial.barcode,
      amount: parseFloat(amount)
    };

    selectedWells.forEach(wellId => {
      const wellData = getWellData(wellId);
      const updatedMaterials = [...wellData.materials, materialEntry];
      updateWellData(wellId, updatedMaterials);
    });

    // Clear selection
    setSelectedMaterial(null);
    setSelectedWells([]);
    setAmount('');
  };

  const removeMaterialFromWell = (wellId, materialIndex) => {
    const wellData = getWellData(wellId);
    const updatedMaterials = wellData.materials.filter((_, index) => index !== materialIndex);
    updateWellData(wellId, updatedMaterials);
  };

  const getWellClass = (wellId) => {
    let className = 'well';
    const wellData = getWellData(wellId);
    
    if (selectedWells.includes(wellId)) {
      className += ' selected';
    } else if (wellData.materials.length > 0) {
      className += ' has-content';
    }
    
    return className;
  };

  const getWellContent = (wellId) => {
    const wellData = getWellData(wellId);
    if (wellData.materials.length === 0) return wellId;
    
    return (
      <div className="well-content">
        <div className="well-id">{wellId}</div>
        <div className="well-materials">
          {wellData.materials.map((material, index) => (
            <div key={index} className="well-material">
              {material.name} ({material.amount} μmol)
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <h2>96-Well Plate Design</h2>
      <p>Select a material from the table, then click or drag on wells to add it with the specified amount.</p>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-success" onClick={saveProcedure}>
          Save Procedure
        </button>
      </div>

      {/* Split Screen Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '600px' }}>
        
        {/* Materials Table */}
        <div className="materials-section">
          <h3>Materials</h3>
          <div className="materials-table-container" style={{ height: '500px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Alias</th>
                  <th>CAS</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, index) => (
                  <tr 
                    key={index} 
                    className={selectedMaterial?.name === material.name ? 'selected-row' : ''}
                    onClick={() => handleMaterialClick(material)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{material.name}</td>
                    <td>{material.alias}</td>
                    <td>{material.cas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount Input */}
          {selectedMaterial && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
              <h4>Selected: {selectedMaterial.name}</h4>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.001"
                  className="form-control"
                  placeholder="Amount (μmol)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: '150px' }}
                />
                <button 
                  className="btn btn-primary"
                  onClick={addMaterialToWells}
                  disabled={!amount || selectedWells.length === 0}
                >
                  Add to {selectedWells.length} well{selectedWells.length !== 1 ? 's' : ''}
                </button>
              </div>
              {selectedWells.length > 0 && (
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Selected wells: {selectedWells.join(', ')}
                </small>
              )}
            </div>
          )}
        </div>

        {/* 96-Well Plate */}
        <div className="plate-section">
          <h3>96-Well Plate</h3>
          <div 
            className="well-grid"
            onMouseUp={handleWellMouseUp}
            onMouseLeave={handleWellMouseUp}
          >
            {wells.map(well => (
              <div
                key={well}
                className={getWellClass(well)}
                onClick={(e) => handleWellClick(well, e)}
                onMouseDown={(e) => handleWellMouseDown(well, e)}
                onMouseEnter={() => handleWellMouseEnter(well)}
                title={`Well ${well}`}
              >
                {getWellContent(well)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
        <h4>Instructions:</h4>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>Click on a material row to select it</li>
          <li>Click on wells to select them individually</li>
          <li>Hold Ctrl/Cmd and click to select multiple wells</li>
          <li>Click and drag to select contiguous wells</li>
          <li>Enter the amount in μmol and click "Add to wells"</li>
        </ul>
      </div>
    </div>
  );
};

export default Procedure; 