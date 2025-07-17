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
  const [clickedWell, setClickedWell] = useState(null);
  const [showWellModal, setShowWellModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

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

  // Refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProcedure();
        loadMaterials();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
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

  const handleMaterialClick = (material) => {
    // If clicking the same material, deselect it
    if (selectedMaterial && selectedMaterial.name === material.name) {
      setSelectedMaterial(null);
      setAmount('');
    } else {
      // Otherwise, select the new material
      setSelectedMaterial(material);
      setAmount('');
    }
  };

  const handleWellClick = (wellId, event) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd - toggle selection
      setSelectedWells(prev => 
        prev.includes(wellId) 
          ? prev.filter(w => w !== wellId)  // Remove if already selected
          : [...prev, wellId]  // Add if not selected
      );
    } else {
      // Single select
      setSelectedWells([wellId]);
    }
  };

  const handleWellRightClick = (wellId, event) => {
    event.preventDefault(); // Prevent context menu
    
    // Show well contents on right-click
    const wellData = getWellData(wellId);
    if (wellData.materials.length > 0) {
      setClickedWell(wellData);
      setShowWellModal(true);
    }
  };

  const handleWellMouseDown = (wellId, event) => {
    // Only start dragging if left mouse button is pressed and not Ctrl/Cmd key
    if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
      setIsDragging(true);
      setSelectedWells([wellId]);
    }
  };

  const handleWellMouseEnter = (wellId, event) => {
    if (!isDragging) return;
    
    // Only add wells if left mouse button is still pressed
    if (event.buttons === 1) {
      setSelectedWells(prev => 
        prev.includes(wellId) ? prev : [...prev, wellId]
      );
    }
  };

  const handleRowClick = (rowLetter, event) => {
    const rowWells = columns.map(col => `${rowLetter}${col}`);
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd - toggle selection
      setSelectedWells(prev => {
        const currentRowWells = new Set(prev);
        const allRowWellsSelected = rowWells.every(well => currentRowWells.has(well));
        
        if (allRowWellsSelected) {
          // If all wells in row are selected, remove them
          return prev.filter(well => !rowWells.includes(well));
        } else {
          // If not all wells are selected, add them
          return [...prev, ...rowWells.filter(well => !prev.includes(well))];
        }
      });
    } else {
      // Single select
      setSelectedWells(rowWells);
    }
  };

  const handleColumnClick = (colNumber, event) => {
    const colWells = rows.map(row => `${row}${colNumber}`);
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd - toggle selection
      setSelectedWells(prev => {
        const currentColWells = new Set(prev);
        const allColWellsSelected = colWells.every(well => currentColWells.has(well));
        
        if (allColWellsSelected) {
          // If all wells in column are selected, remove them
          return prev.filter(well => !colWells.includes(well));
        } else {
          // If not all wells are selected, add them
          return [...prev, ...colWells.filter(well => !prev.includes(well))];
        }
      });
    } else {
      // Single select
      setSelectedWells(colWells);
    }
  };

  const addMaterialToWells = async () => {
    if (!selectedMaterial || selectedWells.length === 0 || !amount) return;

    const materialEntry = {
      name: selectedMaterial.name,
      alias: selectedMaterial.alias,
      cas: selectedMaterial.cas,
      molecular_weight: selectedMaterial.molecular_weight,
      barcode: selectedMaterial.barcode,
      amount: parseFloat(amount)
    };

    // Create the updated procedure data directly
    const updatedProcedure = [...procedure];
    
    selectedWells.forEach(wellId => {
      const existingIndex = updatedProcedure.findIndex(p => p.well === wellId);
      const wellData = existingIndex >= 0 ? updatedProcedure[existingIndex] : { well: wellId, materials: [] };
      const updatedMaterials = [...wellData.materials, materialEntry];
      
      if (existingIndex >= 0) {
        updatedProcedure[existingIndex] = { ...wellData, materials: updatedMaterials };
      } else {
        updatedProcedure.push({ well: wellId, materials: updatedMaterials });
      }
    });

    // Update state and save to backend
    setProcedure(updatedProcedure);
    
    try {
      await axios.post('/api/experiment/procedure', updatedProcedure);
    } catch (error) {
      console.error('Error auto-saving procedure:', error);
      setMessage('Error saving changes: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }

    // Clear selection
    setSelectedMaterial(null);
    setSelectedWells([]);
    setAmount('');
  };

  const removeMaterialFromWells = async () => {
    if (!selectedMaterial || selectedWells.length === 0) return;

    // Create the updated procedure data directly
    const updatedProcedure = [...procedure];
    let removedCount = 0;
    
    selectedWells.forEach(wellId => {
      const existingIndex = updatedProcedure.findIndex(p => p.well === wellId);
      if (existingIndex >= 0) {
        const wellData = updatedProcedure[existingIndex];
        const materialExists = wellData.materials.some(m => m.name === selectedMaterial.name);
        if (materialExists) {
          const updatedMaterials = wellData.materials.filter(m => m.name !== selectedMaterial.name);
          updatedProcedure[existingIndex] = { ...wellData, materials: updatedMaterials };
          removedCount++;
        }
      }
    });

    if (removedCount > 0) {
      // Update state and save to backend
      setProcedure(updatedProcedure);
      
      try {
        await axios.post('/api/experiment/procedure', updatedProcedure);
      } catch (error) {
        console.error('Error auto-saving procedure:', error);
        setMessage('Error saving changes: ' + error.message);
        setTimeout(() => setMessage(''), 3000);
      }
    }

    // Clear selection
    setSelectedWells([]);
  };

  const handleSelectAllWells = (event) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd - toggle selection
      setSelectedWells(prev => {
        const allWells = wells;
        const allWellsSelected = allWells.every(well => prev.includes(well));
        
        if (allWellsSelected) {
          // If all wells are selected, remove them
          return prev.filter(well => !allWells.includes(well));
        } else {
          // If not all wells are selected, add them
          return [...prev, ...allWells.filter(well => !prev.includes(well))];
        }
      });
    } else {
      // Single select - select all wells
      setSelectedWells(wells);
    }
  };



  const getWellClass = (wellId) => {
    let className = 'well';
    const wellData = getWellData(wellId);
    
    if (selectedWells.includes(wellId)) {
      className += ' selected';
    } else if (wellData.materials.length > 0) {
      className += ' has-content';
      
      // Highlight wells containing the selected material
      if (selectedMaterial && wellData.materials.some(m => m.name === selectedMaterial.name)) {
        className += ' highlighted-material';
      }
    }
    
    return className;
  };

  const getWellContent = (wellId) => {
    // Only show content if a material is selected
    if (!selectedMaterial) {
      return null;
    }
    
    const wellData = getWellData(wellId);
    const selectedMaterialInWell = wellData.materials.find(m => m.name === selectedMaterial.name);
    
    if (!selectedMaterialInWell) {
      return null;
    }
    
    return (
      <div className="well-content">
        <div className="well-material-amount">
          {selectedMaterialInWell.amount} μmol
        </div>
      </div>
    );
  };

  const calculateMaterialTotals = () => {
    const totals = {};
    
    // Initialize totals for all materials
    materials.forEach(material => {
      totals[material.name] = {
        umol: 0,
        mg: 0,
        hasMolecularWeight: !!material.molecular_weight
      };
    });
    
    // Calculate totals from procedure data
    procedure.forEach(wellData => {
      wellData.materials.forEach(material => {
        if (totals[material.name] !== undefined) {
          totals[material.name].umol += material.amount || 0;
          // Calculate mg: (molecular_weight * amount_umol) / 100
          const mg = ((material.molecular_weight || 0) * (material.amount || 0)) / 100;
          totals[material.name].mg += mg;
          // If any material entry has molecular weight, mark as having it
          if (material.molecular_weight) {
            totals[material.name].hasMolecularWeight = true;
          }
        }
      });
    });
    
    return totals;
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <h2>96-Well Plate Design</h2>
            <p>Select a material from the table, then click or drag on wells to add it with the specified amount. Changes are automatically saved.</p>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowHelpModal(true)}
            style={{ 
              padding: '8px 12px', 
              fontSize: '14px',
              backgroundColor: '#17a2b8',
              borderColor: '#17a2b8',
              color: 'white'
            }}
            title="Help"
          >
            ?
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}



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
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, index) => {
                  const materialTotals = calculateMaterialTotals();
                  const totalData = materialTotals[material.name] || { umol: 0, mg: 0 };
                  return (
                    <tr 
                      key={index} 
                      className={selectedMaterial?.name === material.name ? 'selected-row' : ''}
                      onClick={() => handleMaterialClick(material)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{material.name}</td>
                      <td>{material.alias}</td>
                      <td>{material.cas}</td>
                      <td className="total-amount">
                        {totalData.umol > 0 ? (
                          <div className="amount-display">
                            <div className="amount-umol">{totalData.umol.toFixed(1)} μmol</div>
                            <div className="amount-mg">
                              {totalData.hasMolecularWeight ? 
                                `${totalData.mg.toFixed(1)} mg` : 
                                '--'
                              }
                            </div>
                          </div>
                        ) : (
                          <span className="no-amount">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Amount Input */}
          {selectedMaterial && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
              <h4>Selected: {selectedMaterial.name}</h4>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                <button 
                  className="btn btn-danger"
                  onClick={removeMaterialFromWells}
                  disabled={selectedWells.length === 0}
                  title={`Remove ${selectedMaterial.name} from selected wells`}
                >
                  Remove from {selectedWells.length} well{selectedWells.length !== 1 ? 's' : ''}
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
          <div className="plate-container">
            {/* Column Headers */}
            <div className="column-headers">
              <div 
                className="corner-cell select-all-button"
                onClick={(e) => handleSelectAllWells(e)}
                title="Select all wells (Ctrl+click to toggle)"
              >
                ALL
              </div>
              {columns.map(col => (
                <div 
                  key={col}
                  className="header-cell column-header"
                  onClick={(e) => handleColumnClick(col, e)}
                  title={`Select column ${col}`}
                >
                  {col}
                </div>
              ))}
            </div>
            
            {/* Row Headers and Wells */}
            <div className="plate-grid">
              {rows.map(row => (
                <div key={row} className="plate-row">
                  <div 
                    className="header-cell row-header"
                    onClick={(e) => handleRowClick(row, e)}
                    title={`Select row ${row}`}
                  >
                    {row}
                  </div>
                  {columns.map(col => {
                    const well = `${row}${col}`;
                    return (
                      <div
                        key={`${well}-${selectedMaterial?.name || 'none'}`}
                        className={getWellClass(well)}
                        onClick={(e) => handleWellClick(well, e)}
                        onContextMenu={(e) => handleWellRightClick(well, e)}
                        onMouseDown={(e) => handleWellMouseDown(well, e)}
                        onMouseEnter={(e) => handleWellMouseEnter(well, e)}
                        title={`Well ${well} (Right-click to view contents)`}
                      >
                        {getWellContent(well)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>96-Well Plate Help</h3>
              <button className="modal-close" onClick={() => setShowHelpModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <h4>How to use the 96-Well Plate:</h4>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                <li><strong>Select Material:</strong> Click on a material row in the table to select it for dispensing.</li>
                <li><strong>Select Wells:</strong> Click on individual wells to select them, or use the following methods:</li>
                <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                  <li>Click on row letters (A-H) to select entire rows</li>
                  <li>Click on column numbers (1-12) to select entire columns</li>
                  <li>Hold Ctrl/Cmd and click to select multiple rows/columns</li>
                  <li>Hold Ctrl/Cmd and click to select multiple individual wells</li>
                  <li>Click and drag to select contiguous wells</li>
                  <li>Click "ALL" to select all wells</li>
                </ul>
                <li><strong>Add Material:</strong> Enter the amount in μmol and click "Add to wells" to dispense the selected material.</li>
                <li><strong>Remove Material:</strong> Click "Remove from wells" to remove the selected material from all selected wells.</li>
                <li><strong>View Contents:</strong> Right-click on any well to view its contents in a modal.</li>
                <li><strong>Auto-save:</strong> All changes are automatically saved to the backend.</li>
              </ul>
              <h4>Tips:</h4>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                <li>Selected wells are highlighted in blue</li>
                <li>Wells with content are highlighted in green</li>
                <li>Use Ctrl/Cmd for multi-selection operations</li>
                <li>Drag operations work for contiguous well selection</li>
                <li>Total amounts are calculated and displayed in the materials table</li>
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

      {/* Well Contents Modal */}
      {showWellModal && clickedWell && (
        <div className="modal-overlay" onClick={() => setShowWellModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Well {clickedWell.well} Contents</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowWellModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {clickedWell.materials.length === 0 ? (
                <p>This well is empty.</p>
              ) : (
                <div>
                  <h4>Chemicals ({clickedWell.materials.length}):</h4>
                  <div className="well-materials-list">
                    {clickedWell.materials.map((material, index) => (
                      <div key={index} className="well-material-item">
                        <div className="material-name">{material.name}</div>
                        <div className="material-details">
                          <span className="material-alias">Alias: {material.alias}</span>
                          <span className="material-cas">CAS: {material.cas}</span>
                          <span className="material-amount">Amount: {material.amount} μmol</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Procedure; 