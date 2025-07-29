import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const AnalyticalData = () => {
  const [materials, setMaterials] = useState([]);
  const [context, setContext] = useState({});
  const [selectedCompounds, setSelectedCompounds] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState(['Reactant', 'Target product', 'Product', 'Solvent', 'Reagent', 'Internal standard']);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadMaterials();
    loadContext();
    loadSelectedCompounds();
    
    // Listen for help events from header
    const handleHelpEvent = (event) => {
      if (event.detail.tabId === 'analytical') {
        setShowHelpModal(true);
      }
    };
    
    window.addEventListener('showHelp', handleHelpEvent);
    
    return () => {
      window.removeEventListener('showHelp', handleHelpEvent);
    };
  }, []);

  const loadMaterials = async () => {
    try {
      const response = await axios.get("/api/experiment/materials");
      setMaterials(response.data || []);
    } catch (error) {
      console.error("Error loading materials:", error);
    }
  };

  const loadContext = async () => {
    try {
      const response = await axios.get("/api/experiment/context");
      setContext(response.data || {});
    } catch (error) {
      console.error("Error loading context:", error);
    }
  };

  const loadSelectedCompounds = async () => {
    try {
      const response = await axios.get("/api/experiment/analytical");
      const analyticalData = response.data || {};
      setSelectedCompounds(analyticalData.selectedCompounds || []);
    } catch (error) {
      console.error("Error loading selected compounds:", error);
    }
  };

  const saveSelectedCompounds = async (compounds) => {
    try {
      await axios.post("/api/experiment/analytical", {
        selectedCompounds: compounds
      });
    } catch (error) {
      console.error("Error saving selected compounds:", error);
    }
  };

  const addCompoundFromMaterials = (material) => {
    const compoundName = material.alias || material.name;
    if (!selectedCompounds.includes(compoundName)) {
      const newSelectedCompounds = [...selectedCompounds, compoundName];
      setSelectedCompounds(newSelectedCompounds);
      saveSelectedCompounds(newSelectedCompounds);
    }
  };

  const removeCompound = (index) => {
    const newSelectedCompounds = selectedCompounds.filter((_, i) => i !== index);
    setSelectedCompounds(newSelectedCompounds);
    saveSelectedCompounds(newSelectedCompounds);
  };

  const moveCompoundUp = (index) => {
    if (index > 0) {
      const newArray = [...selectedCompounds];
      [newArray[index], newArray[index - 1]] = [newArray[index - 1], newArray[index]];
      setSelectedCompounds(newArray);
      saveSelectedCompounds(newArray);
    }
  };

  const moveCompoundDown = (index) => {
    if (index < selectedCompounds.length - 1) {
      const newArray = [...selectedCompounds];
      [newArray[index], newArray[index + 1]] = [newArray[index + 1], newArray[index]];
      setSelectedCompounds(newArray);
      saveSelectedCompounds(newArray);
    }
  };

  const toggleRole = (role) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const filteredMaterials = materials.filter(material => {
    const materialRole = material.role || 'Other';
    return selectedRoles.includes(materialRole);
  });

  const exportTemplate = async () => {
    if (selectedCompounds.length === 0) {
      showError("Please add at least one compound to the template");
      return;
    }

    try {
      const response = await axios.post("/api/experiment/analytical/template", {
        compounds: selectedCompounds
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Analytical_Template_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSuccess("Analytical template exported successfully!");
    } catch (error) {
      showError("Error exporting template: " + error.message);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      showError("Please select a file to upload");
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await axios.post("/api/experiment/analytical/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Add to upload history
      const newUpload = {
        id: Date.now(),
        filename: selectedFile.name,
        uploadDate: new Date().toISOString(),
        status: 'success',
        message: response.data.message || 'File uploaded successfully'
      };
      
      setUploadHistory(prev => [newUpload, ...prev]);
      setSelectedFile(null);
      
      // Clear the file input
      const fileInput = document.getElementById('analytical-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
      
      showSuccess("File uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      
      // Add failed upload to history
      const failedUpload = {
        id: Date.now(),
        filename: selectedFile.name,
        uploadDate: new Date().toISOString(),
        status: 'error',
        message: error.response?.data?.message || 'Upload failed'
      };
      
      setUploadHistory(prev => [failedUpload, ...prev]);
      showError("Error uploading file: " + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      {/* Generate Template Section */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3>Generate Analytical Data Template</h3>
        
        {/* Two-Column Layout */}
        <div className="procedure-grid">
          {/* Materials Table */}
          <div className="materials-section">
            <h4>Materials</h4>
            <div className="scrollable-table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Alias</th>
                    <th>CAS</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((material, index) => {
                    const compoundName = material.alias || material.name;
                    const isSelected = selectedCompounds.includes(compoundName);
                    return (
                      <tr
                        key={index}
                        className={isSelected ? "selected-row" : ""}
                        onClick={() => {
                          if (isSelected) {
                            const newSelectedCompounds = selectedCompounds.filter(comp => comp !== compoundName);
                            setSelectedCompounds(newSelectedCompounds);
                            saveSelectedCompounds(newSelectedCompounds);
                          } else {
                            addCompoundFromMaterials(material);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{material.alias || material.name}</td>
                        <td>{material.cas || "-"}</td>
                        <td>{material.role || "-"}</td>
                        <td>
                          {isSelected ? (
                            <span style={{ color: "#28a745", fontWeight: "bold" }}>✓ Selected</span>
                          ) : (
                            <span style={{ color: "#6c757d" }}>Click to select</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Role Filter Buttons */}
            <div style={{ marginTop: "15px" }}>
              <h5 style={{ marginBottom: "10px", fontSize: "14px", color: "#495057" }}>Filter by Role:</h5>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {['Reactant', 'Target product', 'Product', 'Solvent', 'Reagent', 'Internal standard'].map((role) => {
                  const isSelected = selectedRoles.includes(role);
                  const count = filteredMaterials.filter(m => m.role === role).length;
                  return (
                    <button
                      key={role}
                      className={`btn btn-sm ${isSelected ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => toggleRole(role)}
                      style={{ 
                        fontSize: "12px", 
                        padding: "6px 12px",
                        position: "relative",
                        width: "140px", // Fixed width to prevent size changes
                        height: "32px", // Fixed height for consistency
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        border: isSelected ? "2px solid #28a745" : "1px solid #6c757d",
                        borderRadius: "6px",
                        fontWeight: isSelected ? "600" : "400",
                        boxShadow: isSelected ? "0 2px 4px rgba(40, 167, 69, 0.3)" : "none",
                        transition: "all 0.2s ease",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {isSelected && (
                        <span style={{ 
                          fontSize: "14px", 
                          color: "#fff",
                          marginRight: "2px",
                          flexShrink: 0
                        }}>
                          ✓
                        </span>
                      )}
                      <span style={{ 
                        flex: "1", 
                        textAlign: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {role}
                      </span>
                      <span style={{ 
                        fontSize: "10px", 
                        color: isSelected ? "#fff" : "#6c757d",
                        marginLeft: "2px",
                        opacity: isSelected ? "0.8" : "0.7",
                        flexShrink: 0
                      }}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ 
                marginTop: "8px", 
                fontSize: "11px", 
                color: "#6c757d",
                fontStyle: "italic"
              }}>
                Showing {filteredMaterials.length} of {materials.length} materials
              </div>
            </div>
          </div>

          {/* Compound Selection Controls */}
          <div className="plate-section">
            <h4>Compound Selection</h4>
            
            <div className="scrollable-table-container" style={{ maxHeight: "400px" }}>
              <div style={{ padding: "16px" }}>
                {selectedCompounds.length === 0 ? (
                  <p style={{ color: "#6c757d", fontStyle: "italic" }}>
                    No compounds selected. Click on materials in the table to add them.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedCompounds.map((compound, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px",
                          border: "1px solid #e0e0e0",
                          borderRadius: "4px",
                          backgroundColor: "#f8f9fa"
                        }}
                      >
                        <span style={{ fontWeight: "bold", color: "#495057" }}>
                          {index + 1}.
                        </span>
                        <span style={{ flex: 1 }}>{compound}</span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => moveCompoundUp(index)}
                            disabled={index === 0}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => moveCompoundDown(index)}
                            disabled={index === selectedCompounds.length - 1}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeCompound(index)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Export Button - Centered below compound selection */}
            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              marginTop: "20px",
              padding: "20px 0"
            }}>
              <button
                className="btn btn-success btn-lg"
                onClick={exportTemplate}
                disabled={selectedCompounds.length === 0}
                style={{ minWidth: "200px" }}
              >
                Export Analytical Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Results Section */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3>Upload Analytical Data Results</h3>
        
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="file"
              className="form-control"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              id="analytical-file-input"
              style={{ width: "400px" }}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "10px" }}>
            Supported formats: Excel (.xlsx, .xls) and CSV files
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4>Upload History</h4>
          {uploadHistory.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>
              No files uploaded yet. Upload your analytical data results to see them here.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {uploadHistory.map((upload) => (
                <div
                  key={upload.id}
                  style={{
                    padding: "10px",
                    borderRadius: "5px",
                    backgroundColor: upload.status === 'success' ? '#e8f5e9' : '#ffebee',
                    color: upload.status === 'success' ? '#2e7d32' : '#c62828',
                    fontSize: "13px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    border: `1px solid ${upload.status === 'success' ? '#a5d6a7' : '#ef9a9a'}`
                  }}
                >
                  <span>{upload.filename}</span>
                  <span>{upload.uploadDate.slice(0, 10)}</span>
                  <span>{upload.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-header">
              <h3>Analytical Data Help</h3>
              <button
                className="modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "left" }}>
              <h4>Analytical Data Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>
                  <strong>Generate Template:</strong> Create Excel templates with selected compounds for data collection.
                </li>
                <li>
                  <strong>Upload Results:</strong> Upload completed analytical data files for processing and analysis.
                </li>
                <li>
                  <strong>Compound Selection:</strong> Choose compounds from Materials or add custom compounds manually.
                </li>
                <li>
                  <strong>96-Well Format:</strong> Templates include all wells from A1 to H12 with automatic numbering.
                </li>
                <li>
                  <strong>Sample IDs:</strong> Automatically generated using ELN number from Context tab.
                </li>
              </ul>
              
              <h4>Instructions:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li><strong>Generate Template:</strong> Select compounds and export Excel templates for data collection</li>
                <li><strong>Upload Results:</strong> Upload completed analytical data files for processing</li>
                <li>Ensure ELN number is set in Context tab before generating templates</li>
                <li>Use consistent compound names across all experiment sections</li>
              </ul>
              
              <h4>Workflow:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>1. Generate template with selected compounds</li>
                <li>2. Fill in chromatogram areas in the exported file</li>
                <li>3. Upload completed results for processing</li>
                <li>4. Review analysis and proceed to Results tab</li>
              </ul>
              
              <h4>Best Practices:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Use consistent compound names across all experiment sections</li>
                <li>Ensure ELN number is set in Context tab before generating templates</li>
                <li>Document chromatographic conditions and parameters</li>
                <li>Use appropriate units for area values (e.g., mAU·s)</li>
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

export default AnalyticalData;
