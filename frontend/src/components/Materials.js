import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoleculeModal, setShowMoleculeModal] = useState(false);
  const [currentMolecule, setCurrentMolecule] = useState({
    smiles: "",
    name: "",
  });
  const [moleculeImage, setMoleculeImage] = useState(null);
  const [moleculeLoading, setMoleculeLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    alias: "",
    cas: "",
    molecular_weight: "",
    smiles: "",
    barcode: "",
    role: "",
  });
  const [editMaterialIndex, setEditMaterialIndex] = useState(null);
  const [personalInventoryStatus, setPersonalInventoryStatus] = useState({});

  const roleOptions = [
    "Reactant",
    "Target product",
    "Product",
    "Solvent",
    "Reagent",
    "Internal standard",
  ];

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadMaterials();
    updatePersonalInventoryStatus();
    
    // Listen for help events from header
    const handleHelpEvent = (event) => {
      if (event.detail.tabId === 'materials') {
        setShowHelpModal(true);
      }
    };
    
    window.addEventListener('showHelp', handleHelpEvent);
    
    return () => {
      window.removeEventListener('showHelp', handleHelpEvent);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only hide search results if clicking on materials table or other areas
      // Don't hide when clicking on search-related elements
      if (
        showSearch &&
        !event.target.closest(".search-container") &&
        !event.target.closest(".search-results-section") &&
        !event.target.closest(".materials-table-section") &&
        !event.target.closest(".materials-actions-bar")
      ) {
        // Don't automatically hide - let user control when to clear
        // setShowSearch(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showSearch]);

  const loadMaterials = async () => {
    try {
      const response = await axios.get("/api/experiment/materials");
      setMaterials(Array.isArray(response.data) ? response.data : []);
      
      // Check personal inventory status for all materials
      setTimeout(() => {
        updatePersonalInventoryStatus();
      }, 100);
    } catch (error) {
      console.error("Error loading materials:", error);
      setMaterials([]);
    }
  };

  const checkPersonalInventoryStatus = async (material) => {
    try {
      const response = await axios.post("/api/inventory/private/check", {
        name: material.name,
        alias: material.alias,
        cas: material.cas,
        smiles: material.smiles
      });
      return response.data.exists;
    } catch (error) {
      console.error("Error checking personal inventory:", error);
      return false;
    }
  };

  const addToPersonalInventory = async (material) => {
    try {
      await axios.post("/api/inventory/private/add", {
        name: material.name,
        alias: material.alias,
        cas: material.cas,
        molecular_weight: material.molecular_weight,
        smiles: material.smiles,
        barcode: material.barcode,
        notes: "",
      });
      
      // Update the status for this material
      setPersonalInventoryStatus(prev => ({
        ...prev,
        [material.name]: true
      }));
      
      showSuccess(`${material.name} added to personal inventory`);
    } catch (error) {
      console.error("Error adding to personal inventory:", error);
      showError("Error adding to personal inventory: " + error.message);
    }
  };

  const updatePersonalInventoryStatus = async () => {
    const status = {};
    for (const material of materials) {
      status[material.name] = await checkPersonalInventoryStatus(material);
    }
    setPersonalInventoryStatus(status);
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
      console.log("Search response received:", response.data);

      // Parse JSON string if response.data is a string
      let parsedData = response.data;
      if (typeof response.data === "string") {
        try {
          // Replace NaN with null before parsing
          const cleanedData = response.data.replace(/:\s*NaN/g, ": null");
          parsedData = JSON.parse(cleanedData);
        } catch (parseError) {
          console.error("Error parsing JSON:", parseError);
          parsedData = [];
        }
      }

      const results = Array.isArray(parsedData) ? parsedData : [];
      console.log(`Found ${results.length} results`);

      setSearchResults(results);
      setShowSearch(true); // Always show results container, even if empty
      setSelectedResultIndex(-1); // Reset selection when new search
    } catch (error) {
      console.error("Error searching inventory:", error);
      console.error("Error details:", error.response?.data || error.message);
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
    if (e.key === "Enter") {
      if (searchQuery.length >= 2) {
        searchInventory(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearch(false);
      }
    } else if (
      e.key === "ArrowDown" &&
      showSearch &&
      searchResults.length > 0
    ) {
      e.preventDefault();
      setSelectedResultIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp" && showSearch && searchResults.length > 0) {
      e.preventDefault();
      setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (
      e.key === "Enter" &&
      selectedResultIndex >= 0 &&
      searchResults[selectedResultIndex]
    ) {
      e.preventDefault();
      addFromInventory(searchResults[selectedResultIndex]);
      setSelectedResultIndex(-1);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
    setSelectedResultIndex(-1);
  };

  const isMaterialInList = (chemical) => {
    return materials.some(
      (material) =>
        material.name === chemical.chemical_name ||
        (material.cas &&
          chemical.cas_number &&
          material.cas === chemical.cas_number),
    );
  };

  const addFromInventory = async (chemical) => {
    const newMaterial = {
      name: chemical.chemical_name,
      alias: chemical.common_name || "",
      cas: chemical.cas_number || "",
      molecular_weight: chemical.molecular_weight || "",
      smiles: chemical.smiles || "",
      barcode: chemical.barcode || "",
      role: "",
      source: "inventory", // Flag to indicate this material came from inventory
    };

    // Check if material already exists in the list
    const isDuplicate = materials.some(
      (material) =>
        material.name === newMaterial.name ||
        (material.cas && newMaterial.cas && material.cas === newMaterial.cas) ||
        (material.smiles && newMaterial.smiles && material.smiles === newMaterial.smiles),
    );

    if (isDuplicate) {
      showError(`${newMaterial.name} is already in the materials list`);
      return;
    }

    const updatedMaterials = [...materials, newMaterial];
    setMaterials(updatedMaterials);

    try {
      await axios.post("/api/experiment/materials", updatedMaterials);
    } catch (error) {
      console.error("Error saving material:", error);
      showError("Error saving material: " + error.message);
    }

    // Check personal inventory status for the new material
    setTimeout(() => {
      updatePersonalInventoryStatus();
    }, 100);

    showSuccess(`${newMaterial.alias || newMaterial.name} added to materials list`);
  };

  const openAddModal = () => {
    setNewMaterial({
      name: "",
      alias: "",
      cas: "",
      molecular_weight: "",
      smiles: "",
      barcode: "",
      role: "",
    });
    setShowAddModal(true);
  };

  const openEditModal = (index) => {
    setNewMaterial({ ...materials[index] });
    setEditMaterialIndex(index);
    setShowAddModal(true);
  };

  const saveEditedMaterial = async () => {
    if (!newMaterial.name.trim()) {
      showError("Name is required");
      return;
    }
    // Prevent duplicate CAS or name (except for the one being edited)
    const isDuplicate = materials.some((material, idx) =>
      idx !== editMaterialIndex &&
      (material.name === newMaterial.name ||
        (material.cas && newMaterial.cas && material.cas === newMaterial.cas) ||
        (material.smiles && newMaterial.smiles && material.smiles === newMaterial.smiles))
    );
    if (isDuplicate) {
      showError(`${newMaterial.name} is already in the materials list`);
      return;
    }
    const updatedMaterials = materials.map((mat, idx) =>
      idx === editMaterialIndex ? { ...newMaterial } : mat
    );
    setMaterials(updatedMaterials);
    try {
      await axios.post("/api/experiment/materials", updatedMaterials);
      showSuccess(`${newMaterial.name} updated successfully`);
      closeAddModal();
    } catch (error) {
      console.error("Error updating material:", error);
      showError("Error updating material: " + error.message);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewMaterial({
      name: "",
      alias: "",
      cas: "",
      molecular_weight: "",
      smiles: "",
      barcode: "",
      role: "",
    });
    setEditMaterialIndex(null);
  };

  const handleNewMaterialChange = (field, value) => {
    setNewMaterial((prev) => ({ ...prev, [field]: value }));
  };

  const addNewMaterial = async () => {
    if (!newMaterial.name.trim()) {
      showError("Name is required");
      return;
    }

    // Check if material already exists
    const isDuplicate = materials.some(
      (material) =>
        material.name === newMaterial.name ||
        (material.cas && newMaterial.cas && material.cas === newMaterial.cas) ||
        (material.smiles && newMaterial.smiles && material.smiles === newMaterial.smiles),
    );

    if (isDuplicate) {
      showError(`${newMaterial.name} is already in the materials list`);
      return;
    }

    const updatedMaterials = [...materials, newMaterial];
    setMaterials(updatedMaterials);

    try {
      await axios.post("/api/experiment/materials", updatedMaterials);

      // Check personal inventory status for the new material
      setTimeout(() => {
        updatePersonalInventoryStatus();
      }, 100);

      showSuccess(`${newMaterial.name} added to materials list`);
      closeAddModal();
    } catch (error) {
      console.error("Error saving material:", error);
      showError("Error saving material: " + error.message);
    }
  };

  const removeMaterial = async (index) => {
    const materialToRemove = materials[index];
    const updatedMaterials = materials.filter((_, i) => i !== index);
    setMaterials(updatedMaterials);

    try {
      await axios.post("/api/experiment/materials", updatedMaterials);
      showSuccess(`${materialToRemove.alias || materialToRemove.name} removed from materials list`);
    } catch (error) {
      console.error("Error removing material:", error);
      showError("Error removing material: " + error.message);
    }
  };

  const updateMaterialRole = async (index, role) => {
    const updatedMaterials = [...materials];
    updatedMaterials[index] = { ...updatedMaterials[index], role };
    setMaterials(updatedMaterials);
    
    try {
      await axios.post("/api/experiment/materials", updatedMaterials);
    } catch (error) {
      console.error("Error updating material role:", error);
      showError("Error updating material role: " + error.message);
    }
  };

  const generateMoleculeImage = async (smiles, name, alias, cas) => {
    if (!smiles || !smiles.trim()) {
      showError("No SMILES string available");
      return;
    }

    setMoleculeLoading(true);
    setCurrentMolecule({ smiles, name, alias, cas });
    setShowMoleculeModal(true);

    try {
      const response = await axios.post("/api/molecule/image", {
        smiles: smiles.trim(),
        width: 300,
        height: 300,
      });

      if (response.data && response.data.image) {
        setMoleculeImage(response.data.image);
      } else {
        setMoleculeImage(null);
      }
    } catch (error) {
      console.error("Error generating molecule image:", error);
      setMoleculeImage(null);
    } finally {
      setMoleculeLoading(false);
    }
  };

  const closeMoleculeModal = () => {
    setShowMoleculeModal(false);
    setMoleculeImage(null);
    setCurrentMolecule({ smiles: "", name: "" });
  };

  return (
    <div className="materials-container">
      {/* Top Row: Action Buttons */}
      <div className="materials-actions-bar">
        <div className="action-buttons">
          <button
            className="btn btn-success"
            onClick={openAddModal}
            style={{ marginRight: "10px" }}
          >
            Add New Material
          </button>
        </div>
      </div>

      {/* Search and Results Grid */}
      <div className="grid-cols-responsive">
        {/* Search Input */}
        <div className="search-input-section">
          <h4>Search Inventory</h4>
          <div className="search-container">
            <div style={{ marginBottom: "8px" }}>
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
                style={{ width: "100%", padding: "6px 12px", fontSize: "12px" }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="search-results-section">
          <h4>
            Search Results{" "}
            {showSearch && searchResults && Array.isArray(searchResults)
              ? `(${searchResults.length})`
              : ""}
          </h4>
          <div className="search-results-container">
            {showSearch && searchResults && Array.isArray(searchResults) ? (
              <div className="search-results-list">
                {searchResults.length > 0 ? (
                  searchResults.map((chemical, index) => {
                    const isExisting = isMaterialInList(chemical);
                    const isSelected = index === selectedResultIndex;
                    return (
                      <div
                        key={index}
                        className={`search-result-item ${isExisting ? "existing-material" : ""} ${isSelected ? "selected-result" : ""}`}
                        onClick={
                          isExisting
                            ? undefined
                            : () => addFromInventory(chemical)
                        }
                        onMouseEnter={() => setSelectedResultIndex(index)}
                        style={{
                          cursor: isExisting ? "not-allowed" : "pointer",
                          opacity: isExisting ? 0.6 : 1,
                          backgroundColor: isExisting
                            ? "#f8f9fa"
                            : isSelected
                              ? "#e3f2fd"
                              : undefined,
                          borderTop: isExisting
                            ? "1px solid #dee2e6"
                            : isSelected
                              ? "1px solid #2196f3"
                              : "1px solid #eee",
                          borderRight: isExisting
                            ? "1px solid #dee2e6"
                            : isSelected
                              ? "1px solid #2196f3"
                              : "1px solid #eee",
                          borderBottom: "1px solid #eee",
                          borderLeft: isSelected
                            ? "3px solid #2196f3"
                            : isExisting
                              ? "1px solid #dee2e6"
                              : "1px solid #eee",
                          padding: "8px 12px",
                        }}
                      >
                        <strong>{chemical.chemical_name}</strong>
                        {chemical.common_name && ` (${chemical.common_name})`}
                        <br />
                        <small>CAS: {chemical.cas_number || "N/A"}</small>
                        {isExisting && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#6c757d",
                              fontStyle: "italic",
                              marginTop: "2px",
                            }}
                          >
                            ✓ Already in materials list
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="search-result-item"
                    style={{
                      color: "#666",
                      fontStyle: "italic",
                      padding: "20px",
                      textAlign: "center",
                    }}
                  >
                    No chemicals found matching "{searchQuery}"
                  </div>
                )}
              </div>
            ) : (
              <div
                className="search-results-placeholder"
                style={{ padding: "20px", textAlign: "center" }}
              >
                <p style={{ color: "#666", fontStyle: "italic" }}>
                  Search for chemicals to see results here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Materials Table */}
      <div className="card materials-table-section">
        <h4>Selected Materials</h4>
        <div className="scrollable-table-container">
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
                        className="btn btn-success"
                        onClick={() =>
                          generateMoleculeImage(
                            material.smiles,
                            material.name,
                            material.alias,
                            material.cas,
                          )
                        }
                        disabled={moleculeLoading}
                        style={{
                          padding: "5px 10px",
                          fontSize: "12px",
                        }}
                      >
                        {moleculeLoading &&
                        currentMolecule.smiles === material.smiles
                          ? "Loading..."
                          : "View Molecule"}
                      </button>
                    ) : (
                      <span style={{ color: "#999", fontStyle: "italic" }}>
                        No SMILES
                      </span>
                    )}
                  </td>
                  <td>{material.barcode}</td>
                  <td>
                    <select
                      className="form-control"
                      value={material.role || ""}
                      onChange={(e) =>
                        updateMaterialRole(index, e.target.value)
                      }
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
                  <td className="actions-cell">
                    <button
                      className="btn btn-warning"
                      onClick={() => removeMaterial(index)}
                      style={{ padding: "5px 10px", fontSize: "12px", marginRight: "6px" }}
                    >
                      Remove
                    </button>
                    <button
                      className="btn btn-info"
                      onClick={() => openEditModal(index)}
                      style={{ padding: "5px 10px", fontSize: "12px", marginRight: "6px" }}
                    >
                      Modify
                    </button>
                    {!personalInventoryStatus[material.name] && material.source !== "inventory" && (
                      <button
                        className="btn btn-success"
                        onClick={() => addToPersonalInventory(material)}
                        style={{ padding: "5px 10px", fontSize: "12px" }}
                      >
                        To personal inventory
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {materials.length === 0 && (
          <p style={{ textAlign: "center", color: "#666", marginTop: "20px" }}>
            No materials added yet. Search inventory or add new materials to get
            started.
          </p>
        )}
      </div>

      {/* Add/Edit Material Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMaterialIndex !== null ? "Modify Material" : "Add New Material"}</h3>
              <button className="modal-close" onClick={closeAddModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  value={newMaterial.name}
                  onChange={(e) =>
                    handleNewMaterialChange("name", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleNewMaterialChange("alias", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleNewMaterialChange("cas", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleNewMaterialChange("molecular_weight", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleNewMaterialChange("smiles", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleNewMaterialChange("barcode", e.target.value)
                  }
                  placeholder="Barcode"
                />
              </div>
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  className="form-control"
                  value={newMaterial.role}
                  onChange={(e) =>
                    handleNewMaterialChange("role", e.target.value)
                  }
                >
                  <option value="">Select Role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeAddModal}>
                Cancel
              </button>
              {editMaterialIndex !== null ? (
                <button
                  className="btn btn-success"
                  onClick={saveEditedMaterial}
                  disabled={!newMaterial.name.trim()}
                >
                  Save Changes
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={addNewMaterial}
                  disabled={!newMaterial.name.trim()}
                >
                  Add Material
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Molecule Modal */}
      {showMoleculeModal && (
        <div className="modal-overlay" onClick={closeMoleculeModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: "400px", 
              maxHeight: "500px",
              width: "auto",
              minWidth: "350px"
            }}
          >
            <div className="modal-header" style={{ position: "relative", textAlign: "center", paddingRight: "50px" }}>
              <h3 style={{ margin: "0", textAlign: "center", padding: "0 10px" }}>
                {currentMolecule.alias && currentMolecule.cas && (
                  `${currentMolecule.alias} - CAS: ${currentMolecule.cas}`
                )}
                {currentMolecule.alias && !currentMolecule.cas && (
                  currentMolecule.alias
                )}
                {!currentMolecule.alias && currentMolecule.cas && (
                  `CAS: ${currentMolecule.cas}`
                )}
                {!currentMolecule.alias && !currentMolecule.cas && (
                  "Molecule Structure"
                )}
              </h3>
              <button 
                className="modal-close" 
                onClick={closeMoleculeModal}
                style={{
                  position: "absolute",
                  right: "15px",
                  top: "15px",
                  background: "rgba(0, 0, 0, 0.1)",
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  borderRadius: "4px",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#333",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(0, 0, 0, 0.2)";
                  e.target.style.color = "#000";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(0, 0, 0, 0.1)";
                  e.target.style.color = "#333";
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              {moleculeImage ? (
                <div>
                  <img
                    src={`data:image/png;base64,${moleculeImage}`}
                    alt={`Molecule structure of ${currentMolecule.name}`}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "350px",
                      width: "auto",
                      height: "auto",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              ) : (
                <div style={{ color: "#666", fontStyle: "italic" }}>
                  Failed to generate molecule image
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1000px", width: "95%" }}>
            <div className="modal-header">
              <h3>Materials Help</h3>
              <button
                className="modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "left" }}>
              <h4>Materials Management Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>
                  <strong>Search & Add:</strong> Search main and private inventory by name, alias, CAS, or SMILES. Click results to add to materials list.
                </li>
                <li>
                  <strong>Manual Addition:</strong> Use "Add New Material" to manually enter chemicals not in inventory.
                </li>
                <li>
                  <strong>Modify Materials:</strong> Click "Modify" to edit existing materials in a pre-populated modal.
                </li>
                <li>
                  <strong>Personal Inventory:</strong> "To personal inventory" button appears for materials not already in your private inventory.
                </li>
                <li>
                  <strong>Duplicate Prevention:</strong> Automatic checks prevent adding the same chemical by name, CAS, or SMILES.
                </li>
                <li>
                  <strong>Molecule Visualization:</strong> Click "View Molecule" to see 2D molecular structures with consistent bond lengths.
                </li>
                <li>
                  <strong>Role Assignment:</strong> Use dropdown to assign roles (Reactant, Product, Solvent, etc.) - not permanently saved.
                </li>
                <li>
                  <strong>Remove Materials:</strong> Click "Remove" to delete materials from the list.
                </li>
              </ul>
              
              <h4>Search Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Search by chemical name, common name, CAS number, or SMILES</li>
                <li>Minimum 2 characters required</li>
                <li>Arrow keys to navigate results, Enter to select</li>
                <li>Results show both main and private inventory</li>
                <li>Inventory-sourced materials don't show "To personal inventory" button</li>
              </ul>
              
              <h4>User Experience:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Toast notifications for all actions</li>
                <li>Auto-save functionality</li>
                <li>Modal doesn't close when clicking outside</li>
                <li>User-friendly success messages using aliases when available</li>
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

export default Materials;
