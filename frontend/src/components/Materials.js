import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";
import MaterialTable from "./MaterialTable";
import MaterialForm from "./MaterialForm";
import InventorySearch from "./InventorySearch";
import KitPositioning from "./KitPositioning";

const Materials = () => {
  // Core material state
  const [materials, setMaterials] = useState([]);
  const [editMaterialIndex, setEditMaterialIndex] = useState(null);
  const [personalInventoryStatus, setPersonalInventoryStatus] = useState({});
  const [personalInventoryLoading, setPersonalInventoryLoading] = useState(false);
  
  // Ref to track if we've already checked personal inventory for current materials
  const materialsHashRef = useRef('');

  // Modal visibility state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showMoleculeModal, setShowMoleculeModal] = useState(false);

  const [showSolventModal, setShowSolventModal] = useState(false);
  const [showKitPositionModal, setShowKitPositionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Molecule visualization state
  const [currentMolecule, setCurrentMolecule] = useState({ smiles: "", name: "" });
  const [moleculeImage, setMoleculeImage] = useState(null);
  const [moleculeLoading, setMoleculeLoading] = useState(false);

  // Kit upload state
  const [kitData, setKitData] = useState(null);
  const [kitSize, setKitSize] = useState(null);
  const [destinationPlateType, setDestinationPlateType] = useState("96");

  // File upload state - Materials from previous experiment
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadingMaterials, setUploadingMaterials] = useState(false);
  
  // Kit upload state - Kit with materials AND design
  const [showKitUploadModal, setShowKitUploadModal] = useState(false);
  const [selectedKitFile, setSelectedKitFile] = useState(null);
  const [uploadingKit, setUploadingKit] = useState(false);

  // Solvent search state
  const [solventSearchQuery, setSolventSearchQuery] = useState("");
  const [solventSearchResults, setSolventSearchResults] = useState([]);
  const [solventSearchLoading, setSolventSearchLoading] = useState(false);
  const [selectedSolvents, setSelectedSolvents] = useState([]);
  const [selectedSolventClass, setSelectedSolventClass] = useState("");
  const [boilingPointFilter, setBoilingPointFilter] = useState("");
  const [availableSolventClasses, setAvailableSolventClasses] = useState([]);
  const [selectedTier, setSelectedTier] = useState("");
  const [availableTiers, setAvailableTiers] = useState([]);

  const roleOptions = [
    "Reactant",
    "Target product", 
    "Product",
    "Solvent",
    "Reagent",
    "Internal standard",
  ];

  const { showSuccess, showError } = useToast();

  // Helper function to check if a material is a duplicate
  const isMaterialDuplicate = (newMaterial, existingMaterials) => {
    return existingMaterials.some(existingMaterial => {
      // Check if any of the identifying fields match (name, alias, or CAS)
      // Only check if both values exist and are not empty
      const nameMatch = existingMaterial.name && newMaterial.name && 
                       existingMaterial.name.toLowerCase().trim() === newMaterial.name.toLowerCase().trim();
      const aliasMatch = existingMaterial.alias && newMaterial.alias && 
                        existingMaterial.alias.toLowerCase().trim() === newMaterial.alias.toLowerCase().trim();
      const casMatch = existingMaterial.cas && newMaterial.cas && 
                      existingMaterial.cas.toLowerCase().trim() === newMaterial.cas.toLowerCase().trim();
      
      return nameMatch || aliasMatch || casMatch;
    });
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    loadSolventClasses();
  }, []);

  useEffect(() => {
    loadSolventTiers();
  }, []);

  useEffect(() => {
    if (materials.length > 0) {
      // Create a hash of the current materials to check if we need to update
      const materialsHash = materials.map(m => `${m.name}_${m.alias || ''}_${m.cas || ''}`).sort().join('|');
      
      // Only update if the materials have actually changed
      if (materialsHash !== materialsHashRef.current) {
        materialsHashRef.current = materialsHash;
        
        // Add a small delay to prevent excessive updates when switching tabs
        const timeoutId = setTimeout(() => {
          updatePersonalInventoryStatus();
        }, 100);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [materials]);

  useEffect(() => {
    // ESC key support for closing modals
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        if (showMoleculeModal) setShowMoleculeModal(false);
        else if (showSolventModal) setShowSolventModal(false);
        else if (showUploadModal) setShowUploadModal(false);
        else if (showKitUploadModal) setShowKitUploadModal(false);
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showMoleculeModal, showSolventModal, showUploadModal, showKitUploadModal]);

  // Core CRUD operations
  const loadMaterials = async () => {
    try {
      const response = await axios.get("/api/experiment/materials");
      setMaterials(Array.isArray(response.data) ? response.data : []);
      
      setTimeout(() => {
        updatePersonalInventoryStatus();
      }, 100);
    } catch (error) {
      console.error("Error loading materials:", error);
      setMaterials([]);
    }
  };

  const saveMaterials = async (updatedMaterials) => {
    try {
      await axios.post("/api/experiment/materials", updatedMaterials);
      setMaterials(updatedMaterials);
    } catch (error) {
      console.error("Error saving materials:", error);
      showError("Error saving materials: " + error.message);
    }
  };

  const addNewMaterial = async (materialData) => {
    try {
      // Check for duplicates before adding
      if (isMaterialDuplicate(materialData, materials)) {
        showError("This material already exists. Please check the name, alias, or CAS number.");
        return;
      }

      const updatedMaterials = [...materials, materialData];
      await saveMaterials(updatedMaterials);
      setShowAddModal(false);
      showSuccess("Material added successfully!");
    } catch (error) {
      showError("Error adding material: " + error.message);
    }
  };

  const updateMaterial = async (materialData) => {
    try {
      const updatedMaterials = materials.map((material, index) =>
        index === editMaterialIndex ? materialData : material
      );
      await saveMaterials(updatedMaterials);
      setShowAddModal(false);
      setEditMaterialIndex(null);
      showSuccess("Material updated successfully!");
    } catch (error) {
      showError("Error updating material: " + error.message);
    }
  };

  const removeMaterial = async (index) => {
    if (window.confirm("Are you sure you want to remove this material?")) {
      try {
        const updatedMaterials = materials.filter((_, i) => i !== index);
        await saveMaterials(updatedMaterials);
        showSuccess("Material removed successfully!");
      } catch (error) {
        showError("Error removing material: " + error.message);
      }
    }
  };

  const moveMaterialUp = async (index) => {
    if (index === 0) return; // Can't move first item up
    
    try {
      const updatedMaterials = [...materials];
      // Swap with the item above
      [updatedMaterials[index], updatedMaterials[index - 1]] = [updatedMaterials[index - 1], updatedMaterials[index]];
      await saveMaterials(updatedMaterials);
    } catch (error) {
      showError("Error moving material: " + error.message);
    }
  };

  const moveMaterialDown = async (index) => {
    if (index === materials.length - 1) return; // Can't move last item down
    
    try {
      const updatedMaterials = [...materials];
      // Swap with the item below
      [updatedMaterials[index], updatedMaterials[index + 1]] = [updatedMaterials[index + 1], updatedMaterials[index]];
      await saveMaterials(updatedMaterials);
    } catch (error) {
      showError("Error moving material: " + error.message);
    }
  };

  const updateMaterialRole = async (index, role) => {
    try {
      const updatedMaterials = materials.map((material, i) =>
        i === index ? { ...material, role } : material
      );
      await saveMaterials(updatedMaterials);
    } catch (error) {
      showError("Error updating material role: " + error.message);
    }
  };

  // Personal inventory operations
  const updatePersonalInventoryStatus = async () => {
    // Prevent multiple simultaneous updates
    if (personalInventoryLoading) return;
    
    try {
      setPersonalInventoryLoading(true);
      const statusMap = {};
      
      // Filter out materials that don't need checking
      const materialsToCheck = materials.filter(material => {
        // Skip materials that are already known to be in personal inventory
        const key = `${material.name}_${material.alias || ''}_${material.cas || ''}`;
        if (personalInventoryStatus[key] === true) {
          statusMap[key] = true; // Keep existing status
          return false;
        }
        return true;
      });
      
      if (materialsToCheck.length === 0) {
        setPersonalInventoryLoading(false);
        return;
      }
      
      // Process remaining materials in batches
      const batchSize = 5;
      for (let i = 0; i < materialsToCheck.length; i += batchSize) {
        const batch = materialsToCheck.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (material) => {
            const exists = await checkPersonalInventoryStatus(material);
            const key = `${material.name}_${material.alias || ''}_${material.cas || ''}`;
            statusMap[key] = exists;
          })
        );
      }
      
      // Update state once with all results
      setPersonalInventoryStatus(prev => ({
        ...prev,
        ...statusMap
      }));
    } catch (error) {
      console.error("Error updating personal inventory status:", error);
    } finally {
      setPersonalInventoryLoading(false);
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
      await axios.post("/api/inventory/private/add", material);
      showSuccess(`${material.name} added to personal inventory!`);
      
      // Immediately update the status for this specific material
      const key = `${material.name}_${material.alias || ''}_${material.cas || ''}`;
      setPersonalInventoryStatus(prev => ({
        ...prev,
        [key]: true
      }));
    } catch (error) {
      showError("Error adding to personal inventory: " + error.message);
    }
  };

  // Molecule visualization
  const generateMoleculeImage = async (smiles, name, alias, cas) => {
    setMoleculeLoading(true);
    setCurrentMolecule({ smiles, name });
    
    try {
      const response = await axios.post("/api/molecule/image", {
        smiles: smiles,
        width: 400,
        height: 400,
      });
      
      setMoleculeImage(`data:image/png;base64,${response.data.image}`);
      setCurrentMolecule({ smiles, name, alias, cas });
      setShowMoleculeModal(true);
    } catch (error) {
      console.error("Error generating molecule image:", error);
      showError("Error generating molecule image: " + error.message);
    } finally {
      setMoleculeLoading(false);
    }
  };

  // Event handlers
  const handleAddFromInventory = (material) => {
    // Check for duplicates before adding
    if (isMaterialDuplicate(material, materials)) {
      showError(`${material.name} already exists in your materials list.`);
      return;
    }

    const updatedMaterials = [...materials, material];
    saveMaterials(updatedMaterials);
    // Success message will be shown by InventorySearch component
  };

  const handleAddMultipleMaterials = async (materialsToAdd) => {
    try {
      // Filter out duplicates before adding
      const newMaterials = materialsToAdd.filter(materialToAdd => 
        !isMaterialDuplicate(materialToAdd, materials)
      );

      if (newMaterials.length === 0) {
        showError("All selected materials already exist in your list.");
        return;
      }

      if (newMaterials.length < materialsToAdd.length) {
        const skippedCount = materialsToAdd.length - newMaterials.length;
        showSuccess(`${newMaterials.length} material(s) added. ${skippedCount} material(s) were skipped (already exist).`);
      }

      const updatedMaterials = [...materials, ...newMaterials];
      // Save without showing the default success message
      await axios.post("/api/experiment/materials", updatedMaterials);
      setMaterials(updatedMaterials);
      // Success message will be shown by InventorySearch component
    } catch (error) {
      console.error("Error adding materials:", error);
      showError("Error adding materials: " + error.message);
    }
  };

  const handleEditMaterial = (index) => {
    setEditMaterialIndex(index);
    setShowAddModal(true);
  };

  const handleMaterialFormSave = (materialData) => {
    if (editMaterialIndex !== null) {
      updateMaterial(materialData);
    } else {
      addNewMaterial(materialData);
    }
  };

  const handleMaterialFormCancel = () => {
    setShowAddModal(false);
    setEditMaterialIndex(null);
  };

  const handleKitPositionSelect = (positionData) => {
    // Apply kit positioning logic here
    setShowKitPositionModal(false);
    showSuccess("Kit applied successfully!");
  };

  // Solvent search functions
  const loadSolventClasses = async () => {
    try {
      const response = await axios.get('/api/solvent/classes');
      const classes = response.data || [];
      // Sort classes alphabetically
      setAvailableSolventClasses(classes.sort());
    } catch (error) {
      console.error("Error loading solvent classes:", error);
      // If API fails, show empty list instead of incorrect fallback classes
      setAvailableSolventClasses([]);
    }
  };

  const loadSolventTiers = async () => {
    try {
      const response = await axios.get('/api/solvent/tiers');
      setAvailableTiers(response.data || []);
    } catch (error) {
      console.error("Error loading solvent tiers:", error);
      // Fallback to default tiers if API fails
      setAvailableTiers(["1", "2", "3", "4"]);
    }
  };

  const searchSolvents = async () => {
    setSolventSearchLoading(true);
    try {
      const params = new URLSearchParams();
      // Always include the search query, even if empty, to ensure proper filtering
      params.append('q', solventSearchQuery.trim());
      if (selectedSolventClass) params.append('class_filter', selectedSolventClass);
      if (boilingPointFilter) params.append('bp_filter', boilingPointFilter);
      if (selectedTier) params.append('tier_filter', selectedTier);
      
      console.log('Searching solvents with params:', params.toString());
      
      const response = await axios.get(`/api/solvent/search?${params.toString()}`);
      setSolventSearchResults(response.data || []);
    } catch (error) {
      console.error("Error searching solvents:", error);
      showError("Error searching solvents: " + error.message);
      setSolventSearchResults([]);
    } finally {
      setSolventSearchLoading(false);
    }
  };

  // File upload functions - Materials from previous experiment
  const handleUploadMaterials = async () => {
    if (!selectedUploadFile) {
      showError("Please select a file first");
      return;
    }

    setUploadingMaterials(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);

      const response = await axios.post('/api/experiment/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Reload materials to get the updated list
      await loadMaterials();
      
      // Show success message with details
      const { added_materials, skipped_materials, inventory_matches, excel_uploads } = response.data;
      
      let message = `Successfully uploaded ${added_materials} material(s) from Excel file.`;
      if (inventory_matches > 0) {
        message += ` ${inventory_matches} material(s) matched inventory data (using inventory information).`;
      }
      if (excel_uploads > 0) {
        message += ` ${excel_uploads} material(s) used uploaded data.`;
      }
      if (skipped_materials > 0) {
        message += ` ${skipped_materials} material(s) were skipped (already exist in current experiment).`;
      }
      
      showSuccess(message);
      setShowUploadModal(false);
      setSelectedUploadFile(null);
      
      // Clear the file input
      const fileInput = document.getElementById('materials-upload-input');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error("Error uploading materials:", error);
      showError("Error uploading materials: " + (error.response?.data?.error || error.message));
    } finally {
      setUploadingMaterials(false);
    }
  };

  // Kit upload functions - Kit with materials AND design
  const handleKitFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedKitFile(file);
    }
  };

  const handleUploadKit = async () => {
    if (!selectedKitFile) {
      showError("Please select a kit file to upload");
      return;
    }

    setUploadingKit(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedKitFile);
      
      const response = await axios.post("/api/experiment/kit/analyze", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { materials, design, kit_size } = response.data;
      setKitData({ materials, design });
      setKitSize(kit_size);
      
      // Close kit upload modal and show positioning modal
      setShowKitUploadModal(false);
      setShowKitPositionModal(true);
      
    } catch (error) {
      console.error("Error analyzing kit:", error);
      showError("Error analyzing kit: " + (error.response?.data?.error || error.message));
    } finally {
      setUploadingKit(false);
    }
  };

  const closeKitUploadModal = () => {
    setShowKitUploadModal(false);
    setSelectedKitFile(null);
    // Clear the file input
    const fileInput = document.getElementById('kit-upload-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const closeKitPositionModal = () => {
    setShowKitPositionModal(false);
    setKitData(null);
    setKitSize(null);
    setDestinationPlateType("96");
  };

  const handleApplyKit = async () => {
    // Reload materials to get the updated list
    await loadMaterials();
    closeKitPositionModal();
  };

  const handleRemoveAllMaterials = async () => {
    if (window.confirm("Are you sure you want to remove all materials from your list?")) {
      try {
        await saveMaterials([]); // Save an empty array to remove all materials
        showSuccess("All materials removed successfully!");
      } catch (error) {
        showError("Error removing all materials: " + error.message);
      }
    }
  };

  return (
    <div className="card">
      {/* Action buttons */}
      <div className="materials-actions-bar" style={{ 
        marginBottom: "24px",
        padding: "20px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
      }}>
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "flex-start"
        }}>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowAddModal(true)}
            style={{ 
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: "500",
              borderRadius: "6px",
              transition: "all 0.2s ease"
            }}
          >
            ➕ Add New Material
          </button>
          <button 
            className="btn btn-success" 
            onClick={() => setShowInventoryModal(true)}
            style={{ 
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: "500",
              borderRadius: "6px",
              transition: "all 0.2s ease"
            }}
          >
            🔍 Search Inventory
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowSolventModal(true)}
            style={{ 
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: "500",
              borderRadius: "6px",
              transition: "all 0.2s ease"
            }}
          >
            🧪 Add Solvent
          </button>
          <button 
            className="btn btn-success" 
            onClick={() => setShowUploadModal(true)}
            style={{ 
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: "500",
              borderRadius: "6px",
              transition: "all 0.2s ease"
            }}
          >
            📁 Upload Materials
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowKitUploadModal(true)}
            style={{ 
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: "500",
              borderRadius: "6px",
              transition: "all 0.2s ease"
            }}
          >
            📦 Upload Kit
          </button>
          {materials.length > 0 && (
            <button 
              className="btn btn-warning" 
              onClick={handleRemoveAllMaterials}
              style={{ 
                padding: "10px 16px",
                fontSize: "14px",
                fontWeight: "500",
                borderRadius: "6px",
                transition: "all 0.2s ease",
                marginLeft: "auto"
              }}
            >
              🗑️ Clear Table
            </button>
          )}
        </div>
      </div>

      {/* Materials table */}
      <MaterialTable
        materials={materials}
        roleOptions={roleOptions}
        personalInventoryStatus={personalInventoryStatus}
        personalInventoryLoading={personalInventoryLoading}
        onMoleculeView={generateMoleculeImage}
        onRoleUpdate={updateMaterialRole}
        onRemove={removeMaterial}
        onEdit={handleEditMaterial}
        onAddToPersonalInventory={addToPersonalInventory}
        onMoveUp={moveMaterialUp}
        onMoveDown={moveMaterialDown}
        moleculeLoading={moleculeLoading}
        currentMolecule={currentMolecule}
      />

      {/* Material Form Modal */}
      <MaterialForm
        material={editMaterialIndex !== null ? materials[editMaterialIndex] : null}
        isEdit={editMaterialIndex !== null}
        roleOptions={roleOptions}
        onSave={handleMaterialFormSave}
        onCancel={handleMaterialFormCancel}
        visible={showAddModal}
      />

      {/* Inventory Search Modal */}
      <InventorySearch
        onAddMaterial={handleAddFromInventory}
        onAddMultipleMaterials={handleAddMultipleMaterials}
        visible={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        showSuccess={showSuccess}
        showError={showError}
        materials={materials}
      />

      {/* Kit Positioning Modal */}
      <KitPositioning
        kitSize={kitSize}
        destinationPlateType={destinationPlateType}
        onPositionSelect={handleKitPositionSelect}
        onCancel={() => setShowKitPositionModal(false)}
        visible={showKitPositionModal}
      />

      {/* Molecule Modal */}
      {showMoleculeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Molecule Structure</h3>
              <button className="modal-close" onClick={() => setShowMoleculeModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <h4>{currentMolecule.alias || currentMolecule.name}</h4>
              {currentMolecule.cas && <p>CAS: {currentMolecule.cas}</p>}
              {moleculeImage && (
                <img 
                  src={moleculeImage} 
                  alt="Molecule structure" 
                  style={{ maxWidth: "100%", maxHeight: "400px" }}
                />
              )}
            </div>

          </div>
        </div>
      )}


      
      {/* Solvent Search Modal */}
      {showSolventModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "800px" }}>
            <div className="modal-header">
              <h3>Add Solvent</h3>
              <button className="modal-close" onClick={() => setShowSolventModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "15px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Search solvents by name, alias, or CAS..."
                    value={solventSearchQuery}
                    onChange={(e) => setSolventSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        searchSolvents();
                      }
                    }}
                    className="form-control"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={searchSolvents}
                    disabled={solventSearchLoading}
                  >
                    {solventSearchLoading ? "Searching..." : "Search"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  <select
                    className="form-control"
                    value={selectedSolventClass}
                    onChange={(e) => setSelectedSolventClass(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">All Classes</option>
                    {availableSolventClasses.map((className) => (
                      <option key={className} value={className}>
                        {className.charAt(0).toUpperCase() + className.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Boiling point filter (e.g., >100, <200)"
                    value={boilingPointFilter}
                    onChange={(e) => setBoilingPointFilter(e.target.value)}
                    className="form-control"
                    style={{ flex: 1 }}
                  />
                  <select
                    className="form-control"
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">All Tiers</option>
                    {availableTiers.map((tier) => (
                      <option key={tier} value={tier}>
                        Max Tier {tier}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {solventSearchResults.length > 0 && (
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {solventSearchResults.map((solvent, index) => {
                    // Check if this solvent is already in the materials list
                    const isAlreadyAdded = isMaterialDuplicate({
                      name: solvent.name,
                      alias: solvent.alias || "",
                      cas: solvent.cas || ""
                    }, materials);

                    return (
                      <div key={index} style={{ 
                        padding: "10px", 
                        borderBottom: "1px solid var(--color-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div style={{ flex: 1, marginRight: "10px" }}>
                          <div style={{ fontSize: "14px", lineHeight: "1.4" }}>
                            <span style={{ fontWeight: "500" }}>{solvent.name}</span>
                            {solvent.alias && <span style={{ color: "var(--color-text-secondary)" }}> | {solvent.alias}</span>}
                            <span style={{ color: "var(--color-text-secondary)" }}> | CAS: {solvent.cas || "N/A"}</span>
                            <span style={{ color: "var(--color-text-secondary)" }}> | BP: {solvent.boiling_point}°C</span>
                            <span style={{ color: "var(--color-text-secondary)" }}> | {solvent.tier || "N/A"}</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            const material = {
                              name: solvent.name,
                              alias: solvent.alias || "",
                              cas: solvent.cas || "",
                              molecular_weight: solvent.molecular_weight || "",
                              smiles: solvent.smiles || "",
                              barcode: "",
                              role: "Solvent",
                              source: "solvent_database"
                            };
                            handleAddFromInventory(material);
                          }}
                          disabled={isAlreadyAdded}
                          style={{ 
                            fontSize: "12px", 
                            padding: "6px 12px", 
                            flexShrink: 0,
                            opacity: isAlreadyAdded ? 0.5 : 1
                          }}
                        >
                          {isAlreadyAdded ? 'Added' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Upload Materials Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px", width: "95%" }}>
            <div className="modal-header">
              <h3>Upload Materials</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={(e) => setSelectedUploadFile(e.target.files[0])}
                    id="materials-upload-input"
                    style={{ width: "400px" }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleUploadMaterials}
                    disabled={!selectedUploadFile || uploadingMaterials}
                  >
                    {uploadingMaterials ? "Uploading..." : "Upload Materials"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Kit Upload Modal */}
      {showKitUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px", width: "95%" }}>
            <div className="modal-header">
              <h3>Upload Kit</h3>
              <button className="modal-close" onClick={closeKitUploadModal}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={handleKitFileSelect}
                    id="kit-upload-input"
                    style={{ width: "400px" }}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={handleUploadKit}
                    disabled={!selectedKitFile || uploadingKit}
                  >
                    {uploadingKit ? "Analyzing..." : "Upload Kit"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Kit Position Modal */}
      <KitPositioning
        kitData={kitData}
        kitSize={kitSize}
        destinationPlateType={destinationPlateType}
        setDestinationPlateType={setDestinationPlateType}
        onApplyKit={handleApplyKit}
        onCancel={closeKitPositionModal}
        visible={showKitPositionModal}
        showSuccess={showSuccess}
        showError={showError}
      />
    </div>
  );
};

export default Materials;
