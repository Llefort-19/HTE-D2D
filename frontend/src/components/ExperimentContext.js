import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const ExperimentContext = () => {
  const [context, setContext] = useState({
    author: "",
    date: new Date().toISOString().split("T")[0],
    project: "",
    eln: "",
    objective: "",
  });
  const [sdfData, setSdfData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { showSuccess, showError } = useToast();

  // Role options for chemicals
  const roleOptions = [
    "Reactant",
    "Target product",
    "Product",
    "Solvent",
    "Reagent",
    "Internal standard",
  ];

  const handleRoleChange = (moleculeIndex, newRole) => {
    if (sdfData && sdfData.molecules) {
      const updatedMolecules = [...sdfData.molecules];
      updatedMolecules[moleculeIndex].role = newRole;
      setSdfData({
        ...sdfData,
        molecules: updatedMolecules
      });
      saveSdfData({
        ...sdfData,
        molecules: updatedMolecules
      });
    }
  };

  useEffect(() => {
    loadContext();
    loadSdfData();
    
    // Listen for help events from header
    const handleHelpEvent = (event) => {
      if (event.detail.tabId === 'context') {
        setShowHelpModal(true);
      }
    };
    
    window.addEventListener('showHelp', handleHelpEvent);
    
    return () => {
      window.removeEventListener('showHelp', handleHelpEvent);
    };
  }, []);

  const loadSdfData = () => {
    try {
      const savedSdfData = localStorage.getItem('experimentSdfData');
      if (savedSdfData) {
        setSdfData(JSON.parse(savedSdfData));
      }
    } catch (error) {
      console.error("Error loading SDF data:", error);
    }
  };

  const saveSdfData = (data) => {
    try {
      localStorage.setItem('experimentSdfData', JSON.stringify(data));
    } catch (error) {
      console.error("Error saving SDF data:", error);
    }
  };

  const clearSdfData = () => {
    setSdfData(null);
    localStorage.removeItem('experimentSdfData');
  };

  const handleUploadClick = () => {
    // If there's existing data, clear it first
    if (sdfData) {
      clearSdfData();
    }
    // Trigger file input directly
    document.getElementById('hiddenFileInput').click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.sdf')) {
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    console.log('Uploading SDF file:', file.name);
    console.log('File size:', file.size);

    try {
      const response = await axios.post('/api/upload/sdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload successful:', response.data);
      setSdfData(response.data);
      saveSdfData(response.data);
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response);
    } finally {
      setUploading(false);
      // Clear the file input for next use
      e.target.value = '';
    }
  };

  const loadContext = async () => {
    try {
      const response = await axios.get("/api/experiment/context");
      if (response.data && Object.keys(response.data).length > 0) {
        setContext(response.data);
      }
    } catch (error) {
      console.error("Error loading context:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedContext = {
      ...context,
      [name]: value,
    };
    setContext(updatedContext);
    
    // Auto-save to backend
    saveContextToBackend(updatedContext);
  };

  const saveContextToBackend = async (contextData) => {
    try {
      await axios.post("/api/experiment/context", contextData);
    } catch (error) {
      console.error("Error auto-saving context:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/experiment/context", context);
      showSuccess("Experiment context saved successfully!");
    } catch (error) {
      showError("Error saving context: " + error.message);
    }
  };

  const addChemicalToMaterials = async (chemical) => {
    try {
      // Get current materials to check for duplicates
      const materialsResponse = await axios.get('/api/experiment/materials');
      const currentMaterials = materialsResponse.data || [];
      
      // Check for duplicates by name, alias, CAS, or SMILES
      const isDuplicate = currentMaterials.some(
        (material) =>
          material.name === chemical.name ||
          (material.alias && chemical.name && material.alias === chemical.name) ||
          (material.cas && chemical.cas && material.cas === chemical.cas) ||
          (material.smiles && chemical.smiles && material.smiles === chemical.smiles)
      );
      
      if (isDuplicate) {
        showError(`${chemical.name} is already in the materials list`);
        return;
      }
      
      // Add to experiment materials only (not to personal inventory)
      const newMaterial = {
        name: chemical.name,
        alias: chemical.name,
        cas: '',
        smiles: chemical.smiles,
        barcode: '',
        role: chemical.role || '',
        quantification_level: '',
        analytical_wavelength: '',
        rrf_to_is: ''
      };

      const updatedMaterials = [...currentMaterials, newMaterial];
      await axios.post('/api/experiment/materials', updatedMaterials);
      
      showSuccess(`${chemical.name} added to materials list`);
    } catch (error) {
      showError("Error adding chemical to materials: " + error.message);
    }
  };



  return (
    <div className="container">
      <div className="card experiment-context-card">
        <div className="card-header">
        </div>

        <form onSubmit={handleSubmit} className="experiment-context-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="author" className="form-label">
                Author *
              </label>
              <input
                type="text"
                id="author"
                name="author"
                className="form-control"
                value={context.author}
                onChange={handleChange}
                required
                placeholder="First and last name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="date" className="form-label">
                Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                className="form-control"
                value={context.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="project" className="form-label">
                Project
              </label>
              <input
                type="text"
                id="project"
                name="project"
                className="form-control"
                value={context.project}
                onChange={handleChange}
                placeholder="Project name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="eln" className="form-label">
                ELN Number
              </label>
              <input
                type="text"
                id="eln"
                name="eln"
                className="form-control"
                value={context.eln}
                onChange={handleChange}
                placeholder="8-character initials-book format"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="objective" className="form-label">
              Objective
            </label>
            <textarea
              id="objective"
              name="objective"
              className="form-control"
              value={context.objective}
              onChange={handleChange}
              placeholder="Short description of experimental objective"
              rows="3"
            />
          </div>

          {/* SDF File Upload Section */}
          <div className="form-group">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontWeight: '500', color: 'var(--color-heading)', minWidth: 'fit-content' }}>
                Upload Reaction (SDF File)
              </span>
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={handleUploadClick}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Select File'}
              </button>
              {sdfData && (
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={clearSdfData}
                >
                  Clear Reaction
                </button>
              )}
            </div>
            {/* Hidden file input */}
            <input
              type="file"
              id="hiddenFileInput"
              accept=".sdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Reaction Display */}
          {sdfData && (
            <div className="card materials-table-section">
              <h4>Reaction Analysis</h4>
              <div className="scrollable-table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>SMILES</th>
                      <th>Structure</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sdfData.molecules && sdfData.molecules.map((mol, index) => (
                      <tr key={`molecule-${index}`}>
                        <td>{mol.name}</td>
                        <td>
                          <select
                            className="form-control"
                            value={mol.role || ""}
                            onChange={(e) => handleRoleChange(index, e.target.value)}
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                          >
                            <option value="">Select Role</option>
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{mol.smiles}</td>
                        <td>
                          {mol.image && (
                            <img 
                              src={`data:image/png;base64,${mol.image}`} 
                              alt={mol.name}
                              style={{ maxWidth: '150px', height: 'auto' }}
                            />
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => addChemicalToMaterials(mol)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Add to Materials
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1000px", width: "95%" }}>
            <div className="modal-header">
              <h3>Experiment Context Help</h3>
              <button
                className="modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "left" }}>
              <h4>Experiment Context Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>
                  <strong>Basic Information:</strong> Enter author, date, project, ELN reference, and objective for your experiment.
                </li>
                <li>
                  <strong>Reaction Upload:</strong> Upload SDF files containing reaction structures. Click "Select File" to choose your SDF file.
                </li>
                <li>
                  <strong>Reaction Analysis:</strong> View parsed molecules with ID-based names (ID-01, ID-02, etc.), SMILES, and 2D structures.
                </li>
                <li>
                  <strong>Role Assignment:</strong> Use the dropdown menu to assign roles to each chemical (Reactant, Target product, Product, Solvent, Reagent, Internal standard).
                </li>
                <li>
                  <strong>Add to Materials:</strong> Click "Add to Materials" to add chemicals from the reaction to your materials list with their assigned roles.
                </li>
                <li>
                  <strong>Clear Reaction:</strong> Use "Clear Reaction" to remove uploaded reaction data and start over.
                </li>
                <li>
                  <strong>Data Persistence:</strong> Reaction data and role assignments persist when switching tabs until manually cleared.
                </li>
              </ul>
              
              <h4>File Requirements:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Only SDF format files are accepted</li>
                <li>Molecules are automatically assigned ID-based names (ID-01, ID-02, etc.)</li>
                <li>Users manually assign roles to each chemical using dropdown menus</li>
                <li>Available roles: Reactant, Target product, Product, Solvent, Reagent, Internal standard</li>
                <li>Role assignments are saved and persist across tab switches</li>
              </ul>
              
              <h4>User Experience:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Automatic duplicate checking when adding to materials</li>
                <li>Toast notifications for all actions</li>
                <li>Consistent molecular structure rendering</li>
                <li>Streamlined file upload process</li>
              </ul>
            </div>
            <div className="modal-footer">
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperimentContext;
