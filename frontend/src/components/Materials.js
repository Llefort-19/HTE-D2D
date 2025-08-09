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
  const [showSolventModal, setShowSolventModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState([]);
  const [showSelectedInventory, setShowSelectedInventory] = useState(false);
  const [solventSearchQuery, setSolventSearchQuery] = useState("");
  const [solventSearchResults, setSolventSearchResults] = useState([]);
  const [solventSearchLoading, setSolventSearchLoading] = useState(false);
  const [selectedSolvents, setSelectedSolvents] = useState([]);
  const [showSelectedSolvents, setShowSelectedSolvents] = useState(false);
  const [selectedSolventClass, setSelectedSolventClass] = useState("");
  const [boilingPointFilter, setBoilingPointFilter] = useState("");
  const [showSolventHelp, setShowSolventHelp] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUploadHelp, setShowUploadHelp] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadingMaterials, setUploadingMaterials] = useState(false);
  const [showKitUploadModal, setShowKitUploadModal] = useState(false);
  const [selectedKitFile, setSelectedKitFile] = useState(null);
  const [uploadingKit, setUploadingKit] = useState(false);
  const [showKitPositionModal, setShowKitPositionModal] = useState(false);
  const [kitData, setKitData] = useState(null);
  const [kitSize, setKitSize] = useState(null);

  const [destinationPlateType, setDestinationPlateType] = useState("96");
  const [selectedVisualPositions, setSelectedVisualPositions] = useState([]);
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

  // Auto-select A1 for exact matches and default A1 placements
  useEffect(() => {
    if (showKitPositionModal && kitSize && destinationPlateType) {
      const { rows: kitRows, columns: kitCols } = kitSize;
      const placementStrategy = getPlacementStrategy(kitRows, kitCols, destinationPlateType);
      
      if ((placementStrategy.strategy === 'exact_match' || placementStrategy.strategy === 'default_a1') 
          && selectedVisualPositions.length === 0) {
        setSelectedVisualPositions(['A1']);
      }
    }
  }, [showKitPositionModal, kitSize, destinationPlateType, selectedVisualPositions.length]);

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
      setShowSelectedInventory(false); // Auto-hide selected view when new search starts
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

  const openSolventModal = () => {
    setShowSolventModal(true);
    setSolventSearchQuery("");
    setSolventSearchResults([]);
    setSelectedSolvents([]);
    setSelectedSolventClass("");
    setBoilingPointFilter("");
    setShowSolventHelp(false);
    setShowSelectedSolvents(false);
  };

  const closeSolventModal = () => {
    setShowSolventModal(false);
    setSolventSearchQuery("");
    setSolventSearchResults([]);
    setSelectedSolvents([]);
    setSelectedSolventClass("");
    setBoilingPointFilter("");
    setShowSolventHelp(false);
    setShowSelectedSolvents(false);
  };

  const openInventoryModal = () => {
    setShowInventoryModal(true);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
    setSelectedResultIndex(-1);
    setSelectedInventoryItems([]);
    setShowSelectedInventory(false);
  };

  const closeInventoryModal = () => {
    setShowInventoryModal(false);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
    setSelectedResultIndex(-1);
    setSelectedInventoryItems([]);
    setShowSelectedInventory(false);
  };



  const toggleInventorySelection = (chemical) => {
    setSelectedInventoryItems(prev => {
      const isSelected = prev.some(c => c.chemical_name === chemical.chemical_name && c.cas_number === chemical.cas_number);
      if (isSelected) {
        return prev.filter(c => !(c.chemical_name === chemical.chemical_name && c.cas_number === chemical.cas_number));
      } else {
        return [...prev, chemical];
      }
    });
  };

  const addSelectedInventoryItemsToMaterials = async () => {
    if (selectedInventoryItems.length === 0) {
      showError("Please select at least one chemical");
      return;
    }

    const newMaterials = selectedInventoryItems.map(chemical => ({
      name: chemical.chemical_name,
      alias: chemical.common_name,
      cas: chemical.cas_number,
      molecular_weight: chemical.molecular_weight,
      smiles: chemical.smiles,
      barcode: chemical.barcode || "",
      role: "Reactant",
      source: "inventory"
    }));

    // Check for duplicates
    const duplicates = newMaterials.filter(newMat => 
      materials.some(existingMat => 
        existingMat.name === newMat.name ||
        (existingMat.cas && newMat.cas && existingMat.cas === newMat.cas)
      )
    );

    if (duplicates.length > 0) {
      const duplicateNames = duplicates.map(d => d.alias || d.name).join(", ");
      showError(`Some chemicals are already in the materials list: ${duplicateNames}`);
      return;
    }

    const updatedMaterials = [...materials, ...newMaterials];
    setMaterials(updatedMaterials);

    try {
      await axios.post("/api/experiment/materials", updatedMaterials);
      showSuccess(`${selectedInventoryItems.length} chemical(s) added to materials list`);
      closeInventoryModal();
      
      // Update personal inventory status
      setTimeout(() => {
        updatePersonalInventoryStatus();
      }, 100);
    } catch (error) {
      console.error("Error adding chemicals:", error);
      showError("Error adding chemicals: " + error.message);
    }
  };

  const searchSolvents = async () => {
    if (solventSearchQuery.length < 2 && !selectedSolventClass && !boilingPointFilter) {
      setSolventSearchResults([]);
      return;
    }

    try {
      setSolventSearchLoading(true);
      setShowSelectedSolvents(false); // Auto-hide selected view when new search starts
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add search query if provided
      if (solventSearchQuery.length >= 2) {
        params.append('q', solventSearchQuery);
        params.append('type', 'all'); // Search in name, alias, CAS by default
      }
      
      // Add solvent class filter if selected
      if (selectedSolventClass) {
        params.append('class_filter', selectedSolventClass);
      }
      
      // Add boiling point filter if provided
      if (boilingPointFilter) {
        params.append('bp_filter', boilingPointFilter);
      }
      
      const response = await axios.get(`/api/solvent/search?${params.toString()}`);
      setSolventSearchResults(response.data);
    } catch (error) {
      console.error("Error searching solvents:", error);
      showError("Error searching solvents: " + error.message);
      setSolventSearchResults([]);
    } finally {
      setSolventSearchLoading(false);
    }
  };

  const handleSolventSearchChange = (e) => {
    const query = e.target.value;
    setSolventSearchQuery(query);
    
    if (query.length < 2) {
      setSolventSearchResults([]);
    }
  };

  const handleSolventSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      searchSolvents();
    }
  };

  const toggleSolventSelection = (solvent) => {
    setSelectedSolvents(prev => {
      const isSelected = prev.some(s => s.name === solvent.name && s.cas === solvent.cas);
      if (isSelected) {
        return prev.filter(s => !(s.name === solvent.name && s.cas === solvent.cas));
      } else {
        return [...prev, solvent];
      }
    });
  };

  const addSelectedSolventsToMaterials = async () => {
    if (selectedSolvents.length === 0) {
      showError("Please select at least one solvent");
      return;
    }

    const newMaterials = selectedSolvents.map(solvent => ({
      name: solvent.name,
      alias: solvent.alias,
      cas: solvent.cas,
      molecular_weight: solvent.molecular_weight,
      smiles: solvent.smiles,
      barcode: "",
      role: "Solvent",
      source: "solvent_database"
    }));

    // Check for duplicates
    const duplicates = newMaterials.filter(newMat => 
      materials.some(existingMat => 
        existingMat.name === newMat.name ||
        (existingMat.cas && newMat.cas && existingMat.cas === newMat.cas)
      )
    );

    if (duplicates.length > 0) {
      const duplicateNames = duplicates.map(d => d.alias || d.name).join(", ");
      showError(`Some solvents are already in the materials list: ${duplicateNames}`);
      return;
    }

    const updatedMaterials = [...materials, ...newMaterials];
    setMaterials(updatedMaterials);

    try {
      await axios.post("/api/experiment/materials", updatedMaterials);
      showSuccess(`${selectedSolvents.length} solvent(s) added to materials list`);
      closeSolventModal();
      
      // Update personal inventory status
      setTimeout(() => {
        updatePersonalInventoryStatus();
      }, 100);
    } catch (error) {
      console.error("Error adding solvents:", error);
      showError("Error adding solvents: " + error.message);
    }
  };

  const openUploadModal = () => {
    setShowUploadModal(true);
    setSelectedUploadFile(null);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedUploadFile(null);
    // Clear the file input
    const fileInput = document.getElementById('materials-upload-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUploadFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedUploadFile(file);
    }
  };

  const handleUploadMaterials = async () => {
    if (!selectedUploadFile) {
      showError("Please select a file to upload");
      return;
    }

    setUploadingMaterials(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      
      const response = await axios.post("/api/experiment/materials/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Reload materials to get the updated list
      await loadMaterials();
      
      // Show success message with details
      const { added_materials, skipped_materials } = response.data;
      
      let message = `Successfully uploaded ${added_materials} material(s) from Excel file.`;
      if (skipped_materials > 0) {
        message += ` ${skipped_materials} material(s) were skipped (already exist).`;
      }
      
      showSuccess(message);
      closeUploadModal();
      
    } catch (error) {
      console.error("Error uploading materials:", error);
      showError("Error uploading materials: " + (error.response?.data?.error || error.message));
    } finally {
      setUploadingMaterials(false);
    }
  };

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

  const updateProcedurePlateType = async (plateType) => {
    try {
      // First get current procedure data
      const procedureResponse = await axios.get("/api/experiment/procedure");
      const currentProcedure = procedureResponse.data || [];
      
      // Send update to backend with the new plate type
      await axios.post("/api/experiment/procedure/update-plate-type", {
        plate_type: plateType,
        current_procedure: currentProcedure
      });
      
      console.log(`Updated procedure plate type to ${plateType}`);
    } catch (error) {
      console.error("Error updating procedure plate type:", error);
      // Don't show error to user as this is a background operation
    }
  };

  const closeKitPositionModal = () => {
    setShowKitPositionModal(false);
    setKitData(null);
    setKitSize(null);
    setDestinationPlateType("96");
    setSelectedVisualPositions([]);
  };

  const applyKitToExperiment = async () => {
    if (!kitData) {
      showError("No kit data available");
      return;
    }
    
    // Convert visual positions to backend format
    const backendPosition = convertVisualPositionsToBackendFormat();
    if (!backendPosition) {
      showError("Please select a position for your kit");
      return;
    }

    try {
      const response = await axios.post("/api/experiment/kit/apply", {
        materials: kitData.materials,
        design: kitData.design,
        position: backendPosition,
        kit_size: kitSize,
        destination_plate: destinationPlateType
      });

      // Update the procedure plate type to match the destination plate
      await updateProcedurePlateType(destinationPlateType);

      // Reload materials to get the updated list
      await loadMaterials();
      
      showSuccess("Kit successfully applied to experiment!");
      closeKitPositionModal();
      
    } catch (error) {
      console.error("Error applying kit:", error);
      showError("Error applying kit: " + (error.response?.data?.error || error.message));
    }
  };

  const getPlateConfig = (plateType) => {
    const configs = {
      "24": { rows: 4, cols: 6, name: "24-Well Plate" },
      "48": { rows: 6, cols: 8, name: "48-Well Plate" },
      "96": { rows: 8, cols: 12, name: "96-Well Plate" }
    };
    return configs[plateType];
  };

  const canKitFitOnPlate = (kitRows, kitCols, plateType) => {
    const plate = getPlateConfig(plateType);
    return kitRows <= plate.rows && kitCols <= plate.cols;
  };

  const getPlacementStrategy = (kitRows, kitCols, plateType) => {
    const plate = getPlateConfig(plateType);
    
    // If kit matches plate dimensions exactly, only one placement (A1)
    if (kitRows === plate.rows && kitCols === plate.cols) {
      return { strategy: 'exact_match', blocks: [{ id: 'A1', label: 'Full Plate' }] };
    }
    
    // If kit matches plate width but not height (e.g., 1x12 kit on 96-well)
    if (kitCols === plate.cols && kitRows < plate.rows) {
      const blocks = [];
      const maxBlocks = Math.floor(plate.rows / kitRows); // Number of kit-sized blocks that fit
      for (let i = 0; i < maxBlocks; i++) {
        const rowStartIndex = i * kitRows; // Start at multiple of kit size
        const rowStart = String.fromCharCode(65 + rowStartIndex); // A, C, E, G for 2-row kit
        const rowEnd = String.fromCharCode(65 + rowStartIndex + kitRows - 1); // B, D, F, H for 2-row kit
        const label = kitRows === 1 ? `Row ${rowStart}` : `Rows ${rowStart}-${rowEnd}`;
        blocks.push({ id: `row-${rowStart}`, label, startRow: rowStart });
      }
      return { strategy: 'row_blocks', blocks };
    }
    
    // If kit matches plate height but not width (e.g., 8x1 kit on 96-well)
    if (kitRows === plate.rows && kitCols < plate.cols) {
      const blocks = [];
      const maxBlocks = Math.floor(plate.cols / kitCols); // Number of kit-sized blocks that fit
      for (let i = 0; i < maxBlocks; i++) {
        const colStartIndex = i * kitCols + 1; // Start at multiple of kit size (1-based)
        const colEnd = colStartIndex + kitCols - 1;
        const label = kitCols === 1 ? `Column ${colStartIndex}` : `Columns ${colStartIndex}-${colEnd}`;
        blocks.push({ id: `col-${colStartIndex}`, label, startCol: colStartIndex });
      }
      return { strategy: 'col_blocks', blocks };
    }
    
    // If kit is smaller than plate in both dimensions (e.g., 4x6 kit on 96-well or 2x4 kit)
    if (kitRows < plate.rows && kitCols < plate.cols) {
      // Calculate how many kit instances can fit
      const rowBlocks = Math.floor(plate.rows / kitRows);
      const colBlocks = Math.floor(plate.cols / kitCols);
      const totalBlocks = rowBlocks * colBlocks;
      
      // If more than one kit instance can fit, show block placement
      if (totalBlocks > 1) {
        const blocks = [];
        for (let r = 0; r < rowBlocks; r++) {
          for (let c = 0; c < colBlocks; c++) {
            const startRow = String.fromCharCode(65 + r * kitRows);
            const startCol = c * kitCols + 1;
            
            blocks.push({ 
              id: `block-${startRow}${startCol}`, 
              startRow, 
              startCol: startCol,
              quadrant: { row: r, col: c }
            });
          }
        }
        return { strategy: 'block_placement', blocks };
      } else {
        // Only one kit instance fits, default to A1 placement
        return { strategy: 'default_a1', blocks: [{ id: 'A1', label: 'Position A1' }] };
      }
    }
    
    // Default fallback
    return { strategy: 'default_a1', blocks: [{ id: 'A1', label: 'Position A1' }] };
  };

  const renderDestinationPlateSelector = () => {
    if (!kitSize) return null;
    
    const { rows: kitRows, columns: kitCols } = kitSize;
    
    return (
      <div style={{ marginBottom: "25px" }}>
        <h4>Select Destination Plate:</h4>
        <div style={{ display: "flex", gap: "15px", marginTop: "10px", justifyContent: "center" }}>
          {["24", "48", "96"].map(plateType => {
            const canFit = canKitFitOnPlate(kitRows, kitCols, plateType);
            const plateConfig = getPlateConfig(plateType);
            
            return (
              <button
                key={plateType}
                className={`btn ${destinationPlateType === plateType ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => {
                  if (canFit) {
                    setDestinationPlateType(plateType);
                    setSelectedVisualPositions([]);
                  }
                }}
                disabled={!canFit}
                style={{ 
                  fontSize: "14px", 
                  padding: "10px 15px",
                  opacity: canFit ? 1 : 0.5,
                  cursor: canFit ? "pointer" : "not-allowed"
                }}
                title={canFit ? 
                  `${plateConfig.name} (${plateConfig.rows}×${plateConfig.cols})` : 
                  `Kit too large for ${plateConfig.name}`
                }
              >
                {plateConfig.name}
                <br />
                <small>({plateConfig.rows}×{plateConfig.cols})</small>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderVisualPlateGrid = () => {
    if (!kitSize || !destinationPlateType) return null;
    
    const { rows: kitRows, columns: kitCols } = kitSize;
    const plateConfig = getPlateConfig(destinationPlateType);
    
    // For 4x6 kit on 96-well plate - show quadrant selection
    if (kitRows === 4 && kitCols === 6 && destinationPlateType === "96") {
      return renderQuadrantSelection();
    }
    
    // For 1x12 kit on 96-well plate - show row selection
    if (kitRows === 1 && kitCols === 12 && destinationPlateType === "96") {
      return renderRowSelection();
    }
    
    // For 8x1 kit on 96-well plate - show column selection
    if (kitRows === 8 && kitCols === 1 && destinationPlateType === "96") {
      return renderColumnSelection();
    }
    
    // For other combinations - show general grid positioning
    return renderGeneralGridPositioning();
  };

  const renderQuadrantSelection = () => {
    const quadrants = [
      { id: "top-left", name: "Top-Left", description: "A1-D6", position: { top: 0, left: 0 } },
      { id: "top-right", name: "Top-Right", description: "A7-D12", position: { top: 0, left: 1 } },
      { id: "bottom-left", name: "Bottom-Left", description: "E1-H6", position: { top: 1, left: 0 } },
      { id: "bottom-right", name: "Bottom-Right", description: "E7-H12", position: { top: 1, left: 1 } }
    ];
    
    return (
      <div>
        <h4>Select Quadrants for Kit Placement:</h4>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "15px" }}>
          Click on one or more quadrants to place your 4×6 kit. Multiple selections will create copies of the kit.
        </p>
        
        {/* Visual 96-well plate representation */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
          gridTemplateRows: "1fr 1fr",
          gap: "8px", 
          maxWidth: "400px", 
          margin: "0 auto 20px",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "var(--color-surface)"
        }}>
          {quadrants.map(quadrant => {
            const isSelected = selectedVisualPositions.includes(quadrant.id);
            
            return (
              <div
                key={quadrant.id}
                style={{
                  border: isSelected ? "3px solid var(--color-primary)" : "2px solid var(--color-border)",
                  borderRadius: "8px",
                  padding: "20px",
                  backgroundColor: isSelected ? "var(--color-primary-light)" : "var(--color-background)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                  position: "relative"
                }}
                onClick={() => toggleVisualPosition(quadrant.id)}
              >
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>{quadrant.name}</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "5px" }}>
                  {quadrant.description}
                </div>
                {isSelected && (
                  <div style={{
                    position: "absolute",
                    top: "5px",
                    right: "5px",
                    width: "20px",
                    height: "20px",
                    backgroundColor: "var(--color-primary)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div style={{ textAlign: "center", fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Selected: {selectedVisualPositions.length} quadrant{selectedVisualPositions.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  };

  const renderRowSelection = () => {
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
    
    return (
      <div>
        <h4>Select Row for Kit Placement:</h4>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "15px" }}>
          Click on a row to place your 1×12 kit across columns 1-12.
        </p>
        
        {/* Visual 96-well plate representation */}
        <div style={{ 
          maxWidth: "500px", 
          margin: "0 auto 20px",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "var(--color-surface)"
        }}>
          {rows.map(row => {
            const isSelected = selectedVisualPositions.includes(`row-${row}`);
            
            return (
              <div
                key={row}
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: isSelected ? "3px solid var(--color-primary)" : "2px solid var(--color-border)",
                  borderRadius: "6px",
                  padding: "12px",
                  marginBottom: "8px",
                  backgroundColor: isSelected ? "var(--color-primary-light)" : "var(--color-background)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onClick={() => setSelectedVisualPositions([`row-${row}`])}
              >
                <div style={{ 
                  fontWeight: "bold", 
                  fontSize: "16px", 
                  marginRight: "15px",
                  minWidth: "30px"
                }}>
                  {row}
                </div>
                
                {/* Visual representation of 12 wells */}
                <div style={{ display: "flex", gap: "4px", flex: 1 }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(col => (
                    <div
                      key={col}
                      style={{
                        width: "20px",
                        height: "20px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "3px",
                        backgroundColor: isSelected ? "var(--color-primary)" : "var(--color-background)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        color: isSelected ? "white" : "var(--color-text-secondary)"
                      }}
                    >
                      {col}
                    </div>
                  ))}
                </div>
                
                {isSelected && (
                  <div style={{
                    marginLeft: "15px",
                    color: "var(--color-primary)",
                    fontSize: "18px",
                    fontWeight: "bold"
                  }}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderColumnSelection = () => {
    const columns = [1,2,3,4,5,6,7,8,9,10,11,12];
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
    
    return (
      <div>
        <h4>Select Column for Kit Placement:</h4>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "15px" }}>
          Click on a column to place your 8×1 kit down rows A-H.
        </p>
        
        {/* Visual 96-well plate representation */}
        <div style={{ 
          maxWidth: "600px", 
          margin: "0 auto 20px",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "var(--color-surface)"
        }}>
          {/* Column headers */}
          <div style={{ display: "flex", marginBottom: "10px", paddingLeft: "40px" }}>
            {columns.map(col => {
              const isSelected = selectedVisualPositions.includes(`col-${col}`);
              return (
                <div
                  key={col}
                  style={{
                    width: "30px",
                    height: "25px",
                    margin: "0 2px",
                    border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                    borderRadius: "4px",
                    backgroundColor: isSelected ? "var(--color-primary)" : "var(--color-background)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: isSelected ? "white" : "var(--color-text)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => setSelectedVisualPositions([`col-${col}`])}
                >
                  {col}
                </div>
              );
            })}
          </div>
          
          {/* Grid representation */}
          {rows.map(row => (
            <div key={row} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
              <div style={{ 
                fontWeight: "bold", 
                fontSize: "14px", 
                minWidth: "30px",
                marginRight: "10px"
              }}>
                {row}
              </div>
              
              {columns.map(col => {
                const isSelected = selectedVisualPositions.includes(`col-${col}`);
                return (
                  <div
                    key={col}
                    style={{
                      width: "30px",
                      height: "25px",
                      margin: "0 2px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "3px",
                      backgroundColor: isSelected ? "var(--color-primary)" : "var(--color-background)",
                      opacity: isSelected ? 1 : 0.3
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGeneralGridPositioning = () => {
    const { rows: kitRows, columns: kitCols } = kitSize;
    const plateConfig = getPlateConfig(destinationPlateType);
    
    return (
      <div>
        <h4>Position Your Kit on the Plate:</h4>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "15px" }}>
          Your {kitRows}×{kitCols} kit will be positioned on the {plateConfig.name}. 
          Click on the starting position for your kit.
        </p>
        
        <div style={{ 
          maxWidth: "600px", 
          margin: "0 auto",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "var(--color-surface)"
        }}>
          <div style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
            General positioning interface for {kitRows}×{kitCols} kit on {plateConfig.name}
          </div>
        </div>
      </div>
    );
  };

  const toggleVisualPosition = (position) => {
    setSelectedVisualPositions(prev => {
      if (prev.includes(position)) {
        return prev.filter(p => p !== position);
      } else {
        return [...prev, position];
      }
    });
  };

  const convertVisualPositionsToBackendFormat = () => {
    if (selectedVisualPositions.length === 0) return null;
    if (!kitSize || !destinationPlateType) return null;

    const { rows: kitRows, columns: kitCols } = kitSize;
    const placementStrategy = getPlacementStrategy(kitRows, kitCols, destinationPlateType);
    
    // Handle different strategies
    switch (placementStrategy.strategy) {
      case 'exact_match':
      case 'default_a1':
        return { strategy: 'exact_placement', position: 'A1', destination_plate: destinationPlateType };
        
      case 'row_blocks':
        return { 
          strategy: 'row_placement', 
          positions: selectedVisualPositions,
          destination_plate: destinationPlateType,
          kit_size: { rows: kitRows, cols: kitCols }
        };
        
      case 'col_blocks':
        return { 
          strategy: 'col_placement', 
          positions: selectedVisualPositions,
          destination_plate: destinationPlateType,
          kit_size: { rows: kitRows, cols: kitCols }
        };
        
      case 'block_placement':
        return { 
          strategy: 'block_placement', 
          positions: selectedVisualPositions,
          destination_plate: destinationPlateType,
          kit_size: { rows: kitRows, cols: kitCols },
          blocks: placementStrategy.blocks.filter(b => selectedVisualPositions.includes(b.id))
        };
        
      default:
        // Fallback to old format for compatibility
        return selectedVisualPositions.length === 1 ? selectedVisualPositions[0] : selectedVisualPositions.join(',');
    }
  };

  const handleVisualPositionToggle = (positionId) => {
    setSelectedVisualPositions(prev => {
      if (prev.includes(positionId)) {
        return prev.filter(id => id !== positionId);
      } else {
        return [...prev, positionId];
      }
    });
  };

  const renderSchematicPlate = (placementStrategy) => {
    const { blocks, strategy } = placementStrategy;
    const plateConfig = getPlateConfig(destinationPlateType);
    
    // For row/column blocks, show as schematic plate
    if (strategy === 'row_blocks') {
      return renderSchematicRowPlate(blocks, plateConfig);
    }
    
    if (strategy === 'col_blocks') {
      return renderSchematicColumnPlate(blocks, plateConfig);
    }
    
    // For block placement, show as schematic plate
    if (strategy === 'block_placement') {
      return renderSchematicBlockPlate(blocks, plateConfig);
    }
    
    return null;
  };

  const renderSchematicRowPlate = (blocks, plateConfig) => {
    const { rows: plateRows, cols: plateCols } = plateConfig;
    const { rows: kitRows } = kitSize;
    
    // Define colors for different row blocks (cycling through quadrant colors)
    const rowBlockColors = [
      'var(--color-quadrant-1)', // Light cyan
      'var(--color-quadrant-2)', // Light green
      'var(--color-quadrant-3)', // Light mint green
      'var(--color-quadrant-4)'  // Light teal cyan
    ];
    
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: `25px repeat(${plateCols}, 1fr)`,
          gap: "2px",
          maxWidth: "600px",
          backgroundColor: "var(--color-surface)",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px"
        }}>
          {/* Header row with column numbers */}
          <div></div>
          {Array.from({length: plateCols}, (_, i) => (
            <div key={`col-${i+1}`} style={{ 
              textAlign: "center", 
              fontSize: "12px", 
              fontWeight: "bold",
              color: "var(--color-text-secondary)",
              padding: "5px"
            }}>
              {i+1}
            </div>
          ))}
          
          {/* Plate grid with selectable row blocks */}
          {Array.from({length: plateRows}, (_, rowIndex) => {
            const rowLetter = String.fromCharCode(65 + rowIndex);
            
            return [
              // Row letter
              <div key={`row-${rowLetter}`} style={{ 
                textAlign: "center", 
                fontSize: "12px", 
                fontWeight: "bold",
                color: "var(--color-text-secondary)",
                padding: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {rowLetter}
              </div>,
              // Row cells
              ...Array.from({length: plateCols}, (_, colIndex) => {
                const wellId = `${rowLetter}${colIndex + 1}`;
                const blockForThisRow = blocks.find(block => {
                  const blockStartRow = block.startRow;
                  const blockRowIndex = rowIndex - (blockStartRow.charCodeAt(0) - 65);
                  return blockRowIndex >= 0 && blockRowIndex < kitRows;
                });
                
                const isSelected = blockForThisRow && selectedVisualPositions.includes(blockForThisRow.id);
                const isSelectable = !!blockForThisRow;
                
                // Get block color based on block index
                const blockIndex = blockForThisRow ? blocks.findIndex(b => b.id === blockForThisRow.id) : -1;
                const blockBgColor = blockForThisRow ? rowBlockColors[blockIndex % rowBlockColors.length] : null;
                
                return (
                  <div
                    key={wellId}
                    style={{
                      width: "25px",
                      height: "25px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "4px",
                      backgroundColor: isSelected ? "var(--color-primary)" : 
                                     blockBgColor ? blockBgColor :
                                     isSelectable ? "var(--color-primary-light)" : "white",
                      cursor: isSelectable ? "pointer" : "default",
                      opacity: isSelectable ? 1 : 0.3,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    onClick={() => isSelectable && handleVisualPositionToggle(blockForThisRow.id)}
                    onMouseEnter={(e) => {
                      if (isSelectable && !isSelected) {
                        e.target.style.transform = "scale(1.1)";
                        e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isSelectable && !isSelected) {
                        e.target.style.backgroundColor = blockBgColor || "var(--color-primary-light)";
                        e.target.style.transform = "scale(1)";
                        e.target.style.boxShadow = "none";
                      }
                    }}
                  >
                    {isSelected && <span style={{ color: "white", fontSize: "10px" }}>✓</span>}
                  </div>
                );
              })
            ];
          }).flat()}
        </div>
        

      </div>
    );
  };

  const renderSchematicColumnPlate = (blocks, plateConfig) => {
    const { rows: plateRows, cols: plateCols } = plateConfig;
    const { columns: kitCols } = kitSize;
    
    // Define colors for different column blocks (cycling through quadrant colors)
    const colBlockColors = [
      'var(--color-quadrant-1)', // Light cyan
      'var(--color-quadrant-2)', // Light green
      'var(--color-quadrant-3)', // Light mint green
      'var(--color-quadrant-4)'  // Light teal cyan
    ];
    
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: `25px repeat(${plateCols}, 1fr)`,
          gap: "2px",
          maxWidth: "600px",
          backgroundColor: "var(--color-surface)",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px"
        }}>
          {/* Header row with column numbers */}
          <div></div>
          {Array.from({length: plateCols}, (_, colIndex) => {
            const blockForThisCol = blocks.find(block => {
              const blockStartCol = block.startCol;
              const blockColIndex = colIndex + 1 - blockStartCol;
              return blockColIndex >= 0 && blockColIndex < kitCols;
            });
            
            return (
              <div key={`col-${colIndex+1}`} style={{ 
                textAlign: "center", 
                fontSize: "12px", 
                fontWeight: "bold",
                color: blockForThisCol ? "var(--color-primary)" : "var(--color-text-secondary)",
                padding: "5px",
                backgroundColor: blockForThisCol && selectedVisualPositions.includes(blockForThisCol.id) ? "var(--color-primary-light)" : "transparent",
                borderRadius: "3px",
                cursor: blockForThisCol ? "pointer" : "default"
              }}
              onClick={() => blockForThisCol && handleVisualPositionToggle(blockForThisCol.id)}
            >
              {colIndex+1}
            </div>
            );
          })}
          
          {/* Plate grid with selectable column blocks */}
          {Array.from({length: plateRows}, (_, rowIndex) => {
            const rowLetter = String.fromCharCode(65 + rowIndex);
            
            return [
              // Row letter
              <div key={`row-${rowLetter}`} style={{ 
                textAlign: "center", 
                fontSize: "12px", 
                fontWeight: "bold",
                color: "var(--color-text-secondary)",
                padding: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {rowLetter}
              </div>,
              // Row cells
              ...Array.from({length: plateCols}, (_, colIndex) => {
                const wellId = `${rowLetter}${colIndex + 1}`;
                const blockForThisCol = blocks.find(block => {
                  const blockStartCol = block.startCol;
                  const blockColIndex = colIndex + 1 - blockStartCol;
                  return blockColIndex >= 0 && blockColIndex < kitCols;
                });
                
                const isSelected = blockForThisCol && selectedVisualPositions.includes(blockForThisCol.id);
                const isSelectable = !!blockForThisCol;
                
                // Get block color based on block index
                const blockIndex = blockForThisCol ? blocks.findIndex(b => b.id === blockForThisCol.id) : -1;
                const blockBgColor = blockForThisCol ? colBlockColors[blockIndex % colBlockColors.length] : null;
                
                return (
                  <div
                    key={wellId}
                    style={{
                      width: "25px",
                      height: "25px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "4px",
                      backgroundColor: isSelected ? "var(--color-primary)" : 
                                     blockBgColor ? blockBgColor :
                                     isSelectable ? "var(--color-primary-light)" : "white",
                      cursor: isSelectable ? "pointer" : "default",
                      opacity: isSelectable ? 1 : 0.3,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    onClick={() => isSelectable && handleVisualPositionToggle(blockForThisCol.id)}
                    onMouseEnter={(e) => {
                      if (isSelectable && !isSelected) {
                        e.target.style.transform = "scale(1.1)";
                        e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isSelectable && !isSelected) {
                        e.target.style.backgroundColor = blockBgColor || "var(--color-primary-light)";
                        e.target.style.transform = "scale(1)";
                        e.target.style.boxShadow = "none";
                      }
                    }}
                  >
                    {isSelected && <span style={{ color: "white", fontSize: "10px" }}>✓</span>}
                  </div>
                );
              })
            ];
          }).flat()}
        </div>
        

      </div>
    );
  };

  const renderSchematicBlockPlate = (blocks, plateConfig) => {
    const { rows: plateRows, cols: plateCols } = plateConfig;
    const { rows: kitRows, columns: kitCols } = kitSize;
    
    // Define colors for different blocks (cycling through quadrant colors)
    const blockColors = [
      'var(--color-quadrant-1)', // Light cyan
      'var(--color-quadrant-2)', // Light green
      'var(--color-quadrant-3)', // Light mint green
      'var(--color-quadrant-4)'  // Light teal cyan
    ];
    
    // Create a mapping of block IDs to colors
    const blockColorMap = {};
    blocks.forEach((block, index) => {
      blockColorMap[block.id] = blockColors[index % blockColors.length];
    });
    
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: `25px repeat(${plateCols}, 1fr)`,
          gap: "2px",
          maxWidth: "600px",
          backgroundColor: "var(--color-surface)",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px",
          position: "relative"
        }}>
          {/* Header row with column numbers */}
          <div></div>
          {Array.from({length: plateCols}, (_, i) => (
            <div key={`col-${i+1}`} style={{ 
              textAlign: "center", 
              fontSize: "12px", 
              fontWeight: "bold",
              color: "var(--color-text-secondary)",
              padding: "5px"
            }}>
              {i+1}
            </div>
          ))}
          
          {/* Plate grid with selectable blocks */}
          {Array.from({length: plateRows}, (_, rowIndex) => {
            const rowLetter = String.fromCharCode(65 + rowIndex);
            
            return [
              // Row letter
              <div key={`row-${rowLetter}`} style={{ 
                textAlign: "center", 
                fontSize: "12px", 
                fontWeight: "bold",
                color: "var(--color-text-secondary)",
                padding: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {rowLetter}
              </div>,
              // Row cells
              ...Array.from({length: plateCols}, (_, colIndex) => {
                const wellId = `${rowLetter}${colIndex + 1}`;
                
                // Find which block this well belongs to
                const blockForThisWell = blocks.find(block => {
                  const blockStartRow = block.startRow;
                  const blockStartCol = block.startCol;
                  const blockRowStart = blockStartRow.charCodeAt(0) - 65;
                  const blockColStart = blockStartCol - 1;
                  
                  return rowIndex >= blockRowStart && 
                         rowIndex < blockRowStart + kitRows &&
                         colIndex >= blockColStart && 
                         colIndex < blockColStart + kitCols;
                });
                
                const isSelected = blockForThisWell && selectedVisualPositions.includes(blockForThisWell.id);
                const isSelectable = !!blockForThisWell;
                
                // Get block background color
                const blockBgColor = blockForThisWell ? blockColorMap[blockForThisWell.id] : null;
                
                return (
                  <div
                    key={wellId}
                    style={{
                      width: "25px",
                      height: "25px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "4px",
                      backgroundColor: isSelected ? "var(--color-primary)" : 
                                     blockBgColor ? blockBgColor :
                                     isSelectable ? "var(--color-primary-light)" : "white",
                      cursor: isSelectable ? "pointer" : "default",
                      opacity: isSelectable ? 1 : 0.3,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isSelected ? "0 2px 4px rgba(0,0,0,0.2)" : "none"
                    }}
                    onClick={() => isSelectable && handleVisualPositionToggle(blockForThisWell.id)}
                    onMouseEnter={(e) => {
                      if (isSelectable && !isSelected) {
                        e.target.style.transform = "scale(1.05)";
                        e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.15)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isSelectable && !isSelected) {
                        e.target.style.backgroundColor = blockBgColor || "var(--color-primary-light)";
                        e.target.style.transform = "scale(1)";
                        e.target.style.boxShadow = "none";
                      }
                    }}
                  >
                    {isSelected && <span style={{ color: "white", fontSize: "10px" }}>✓</span>}
                  </div>
                );
              })
            ];
          }).flat()}
        </div>

        

      </div>
    );
  };

  const renderSimplePlateSchematic = (isExactMatch) => {
    const plateConfig = getPlateConfig(destinationPlateType);
    const { rows: plateRows, cols: plateCols } = plateConfig;
    const { rows: kitRows, columns: kitCols } = kitSize;
    
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: `25px repeat(${plateCols}, 1fr)`,
          gap: "2px",
          maxWidth: "600px",
          backgroundColor: "var(--color-surface)",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px"
        }}>
          {/* Header row with column numbers */}
          <div></div>
          {Array.from({length: plateCols}, (_, i) => (
            <div key={`col-${i+1}`} style={{ 
              textAlign: "center", 
              fontSize: "12px", 
              fontWeight: "bold",
              color: "var(--color-text-secondary)",
              padding: "5px"
            }}>
              {i+1}
            </div>
          ))}
          
          {/* Plate grid */}
          {Array.from({length: plateRows}, (_, rowIndex) => {
            const rowLetter = String.fromCharCode(65 + rowIndex);
            
            return [
              // Row letter
              <div key={`row-${rowLetter}`} style={{ 
                textAlign: "center", 
                fontSize: "12px", 
                fontWeight: "bold",
                color: "var(--color-text-secondary)",
                padding: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {rowLetter}
              </div>,
              // Row cells
              ...Array.from({length: plateCols}, (_, colIndex) => {
                const wellId = `${rowLetter}${colIndex + 1}`;
                
                // For exact match, all wells are kit wells
                // For default A1, only the kit area is highlighted
                const isKitWell = isExactMatch || 
                  (rowIndex < kitRows && colIndex < kitCols);
                
                return (
                  <div
                    key={wellId}
                    style={{
                      width: "25px",
                      height: "25px",
                      border: isKitWell ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      borderRadius: "4px",
                      backgroundColor: isKitWell ? "var(--color-primary)" : "white",
                      opacity: isKitWell ? 1 : 0.3,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isKitWell ? "pointer" : "default"
                    }}
                    onClick={() => isKitWell && handleVisualPositionToggle('A1')}
                  >
                    {isKitWell && selectedVisualPositions.includes('A1') && (
                      <span style={{ color: "white", fontSize: "10px" }}>✓</span>
                    )}
                  </div>
                );
              })
            ];
          }).flat()}
        </div>
        


      </div>
    );
  };

  const renderVisualPlacement = () => {
    if (!kitSize || !destinationPlateType) return null;

    const { rows: kitRows, columns: kitCols } = kitSize;
    const plateConfig = getPlateConfig(destinationPlateType);
    const placementStrategy = getPlacementStrategy(kitRows, kitCols, destinationPlateType);

    return (
      <div>
        <h4>Select Position(s) on {plateConfig.name}:</h4>
        
        {placementStrategy.strategy === 'exact_match' ? (
          <div style={{ textAlign: "center" }}>
            {renderSimplePlateSchematic(true)}
          </div>
        ) : placementStrategy.strategy === 'default_a1' ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: "15px" }}>Your kit will be placed starting at position A1.</p>
            {renderSimplePlateSchematic(false)}
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: "15px" }}>
              {placementStrategy.strategy === 'block_placement' ? 
                "Click on the blocks where you want to place your kit:" :
                placementStrategy.strategy === 'row_blocks' ?
                "Click on the rows where you want to place your kit:" :
                "Click on the columns where you want to place your kit:"
              }
            </p>
            {renderSchematicPlate(placementStrategy)}
          </div>
        )}
      </div>
    );
  };

  const renderKitPositionOptions = () => {
    if (!kitSize) return null;

    return (
      <div>
        {renderDestinationPlateSelector()}
        {renderVisualPlacement()}
      </div>
    );
  };

  return (
    <div className="materials-container">
      {/* Top Row: Action Buttons */}
      <div className="materials-actions-bar">
        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={openInventoryModal}
            style={{ marginRight: "10px" }}
          >
            Add from Inventory
          </button>
          <button
            className="btn btn-success"
            onClick={openAddModal}
            style={{ marginRight: "10px" }}
          >
            Add New Material
          </button>
          <button
            className="btn btn-primary"
            onClick={openSolventModal}
            style={{ marginRight: "10px" }}
          >
            Add Solvent
          </button>
          <button
            className="btn btn-success"
            onClick={openUploadModal}
            style={{ marginRight: "10px" }}
          >
            Upload Materials
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowKitUploadModal(true)}
            style={{ marginRight: "10px" }}
          >
            Upload Kit
          </button>
        </div>
      </div>



      {/* Materials Table */}
      <div className="card materials-table-section">
        <h4 style={{ fontSize: "24px", fontWeight: "bold" }}>Materials</h4>
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
                          : "View"}
                      </button>
                    ) : (
                                              <span style={{ color: "var(--color-text-light)", fontStyle: "italic" }}>
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
                    {!personalInventoryStatus[material.name] && material.source !== "inventory" && material.source !== "solvent_database" && material.source !== "excel_upload" && material.source !== "kit_upload" && (
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
          <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: "20px" }}>
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
        <div className="modal-overlay" onClick={closeMoleculeModal} style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: "400px", 
              maxHeight: "500px",
              width: "auto",
              minWidth: "350px",
              zIndex: 10000
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
                  color: "var(--color-heading)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(0, 0, 0, 0.2)";
                  e.target.style.color = "var(--color-text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(0, 0, 0, 0.1)";
                  e.target.style.color = "var(--color-heading)";
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
                      border: "1px solid var(--color-border)",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
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
                <li>
                  <strong>Solvent Search:</strong> Use "Add Solvent" to search the solvent database by name, alias, CAS, boiling point, or chemical class.
                </li>
                <li>
                  <strong>Kit Upload:</strong> Upload Excel files containing both materials and design (well positions with amounts) from previous experiments. Kits can be positioned on different plate layouts.
                </li>
              </ul>
              
              <h4>Search Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Search by chemical name, common name, CAS number, or SMILES</li>
                <li>Minimum 2 characters required</li>
                <li>Arrow keys to navigate results, Enter to select</li>
                <li>Results show both main and private inventory</li>
                <li>Inventory-sourced materials don't show "To personal inventory" button</li>
                <li><strong>Solvent Database:</strong> Search by name/alias/CAS, filter by chemical class dropdown, or use boiling point filters (e.g., &quot;&gt;50&quot;, &quot;&lt;100&quot;)</li>
              </ul>
              
              <h4>Kit Upload Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Upload Excel files with Materials and Design sheets from previous experiments</li>
                <li>Intelligent kit positioning for 4×6 kits (quadrant distribution on 96-well plates)</li>
                <li>Full row (1×12) and full column (8×1) kit positioning options</li>
                <li>Multi-quadrant distribution (place kit in 2 or 4 quadrants simultaneously)</li>
                <li>Automatic duplicate material detection and merging</li>
                <li>Kit materials are integrated directly into the procedure/design tab</li>
                <li>Kit-sourced materials don't show "To personal inventory" button</li>
              </ul>

              <h4>User Experience:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Toast notifications for all actions</li>
                <li>Auto-save functionality</li>
                <li>Modal doesn't close when clicking outside</li>
                <li>User-friendly success messages using aliases when available</li>
                <li>Visual kit positioning interface with schematic selection</li>
              </ul>
            </div>
            <div className="modal-footer">
            </div>
          </div>
        </div>
      )}

      {/* Inventory Search Modal */}
      {showInventoryModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "900px", width: "95%" }}>
            <div className="modal-header">
              <h3>Search from Inventory</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="modal-close" onClick={closeInventoryModal}>
                  ×
                </button>
              </div>
            </div>
            <div className="modal-body">
              {/* Search Controls */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                  <div style={{ flex: "1" }}>
                    <input
                      type="text"
                      className="form-control"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyPress={handleSearchKeyPress}
                      placeholder="Search by chemical name, common name, CAS, or SMILES..."
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => searchInventory(searchQuery)}
                    disabled={searchLoading || searchQuery.length < 2}
                  >
                    {searchLoading ? "Searching..." : "Search"}
                  </button>
                  <button
                    className="btn btn-outline-info"
                    onClick={() => setShowSelectedInventory(!showSelectedInventory)}
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                    disabled={selectedInventoryItems.length === 0}
                  >
                    Show Selected ({selectedInventoryItems.length})
                  </button>
                </div>
              </div>

              {/* Search Results */}
              <div>
                <h5>
                  {showSelectedInventory 
                    ? `Selected Chemicals (${selectedInventoryItems.length})` 
                    : `Search Results (${searchResults.length})`
                  }
                </h5>
                <div style={{ 
                  maxHeight: "400px", 
                  overflowY: "auto",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px"
                }}>
                  {showSelectedInventory ? (
                    // Show selected items
                    <div>
                      {selectedInventoryItems.length > 0 ? (
                        selectedInventoryItems.map((chemical, index) => {
                          const isExisting = isMaterialInList(chemical);
                          
                          return (
                            <div
                              key={`selected-${index}`}
                                                          style={{
                              padding: "12px",
                              borderBottom: index < selectedInventoryItems.length - 1 ? "1px solid var(--color-border-light)" : "none",
                              backgroundColor: "transparent",
                              borderLeft: "4px solid var(--color-info)",
                              cursor: "pointer",
                              opacity: isExisting ? 0.6 : 1
                            }}
                              onClick={() => toggleInventorySelection(chemical)}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ flex: "1", fontSize: "13px" }}>
                                  <span style={{ fontWeight: "bold", color: "var(--color-heading)" }}>
                                    {chemical.common_name || chemical.chemical_name}
                                  </span>
                                  <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                    CAS: {chemical.cas_number || "N/A"}
                                  </span>
                                  {isExisting && (
                                    <span style={{ 
                                      color: "#d63384", 
                                      fontStyle: "italic",
                                      marginLeft: "12px"
                                    }}>
                                      ✓ Already added
                                    </span>
                                  )}
                                </div>
                                <div style={{ marginLeft: "10px", display: "flex", gap: "5px" }}>
                                  {chemical.smiles && (
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        generateMoleculeImage(chemical.smiles, chemical.chemical_name, chemical.common_name, chemical.cas_number || "");
                                      }}
                                      style={{ padding: "4px 8px", fontSize: "11px" }}
                                      title="View molecular structure"
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ 
                          padding: "20px", 
                          textAlign: "center", 
                          color: "var(--color-text-muted)",
                          fontStyle: "italic"
                        }}>
                          No selected chemicals
                        </div>
                      )}
                    </div>
                  ) : showSearch && searchResults && Array.isArray(searchResults) ? (
                    <div>
                      {searchResults.length > 0 ? (
                        searchResults.map((chemical, index) => {
                          const isExisting = isMaterialInList(chemical);
                          const isSelected = selectedInventoryItems.some(c => 
                            c.chemical_name === chemical.chemical_name && c.cas_number === chemical.cas_number
                          );
                          
                          return (
                            <div
                              key={index}
                                                          style={{
                              padding: "12px",
                              borderBottom: index < searchResults.length - 1 ? "1px solid var(--color-border-light)" : "none",
                              backgroundColor: "transparent",
                              borderLeft: isSelected ? "4px solid var(--color-info)" : "4px solid transparent",
                              cursor: isExisting ? "not-allowed" : "pointer",
                              opacity: isExisting ? 0.6 : 1
                            }}
                              onClick={isExisting ? undefined : () => toggleInventorySelection(chemical)}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ flex: "1", fontSize: "13px" }}>
                                  <span style={{ fontWeight: "bold", color: "var(--color-heading)" }}>
                                    {chemical.common_name || chemical.chemical_name}
                                  </span>
                                  <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                    CAS: {chemical.cas_number || "N/A"}
                                  </span>
                                  {isExisting && (
                                    <span style={{ 
                                      color: "#d63384", 
                                      fontStyle: "italic",
                                      marginLeft: "12px"
                                    }}>
                                      ✓ Already added
                                    </span>
                                  )}
                                </div>
                                <div style={{ marginLeft: "10px", display: "flex", gap: "5px" }}>
                                  {chemical.smiles && (
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        generateMoleculeImage(chemical.smiles, chemical.chemical_name, chemical.common_name, chemical.cas_number || "");
                                      }}
                                      style={{ padding: "4px 8px", fontSize: "11px" }}
                                      title="View molecular structure"
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ 
                          padding: "20px", 
                          textAlign: "center", 
                          color: "var(--color-text-muted)",
                          fontStyle: "italic"
                        }}>
                          No chemicals found matching "{searchQuery}"
                        </div>
                      )}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div style={{ 
                      padding: "20px", 
                      textAlign: "center", 
                      color: "var(--color-text-muted)",
                      fontStyle: "italic"
                    }}>
                      No chemicals found matching "{searchQuery}"
                    </div>
                  ) : (
                    <div style={{ 
                      padding: "20px", 
                      textAlign: "center", 
                      color: "var(--color-text-muted)",
                      fontStyle: "italic"
                    }}>
                      Enter a search term to find chemicals
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeInventoryModal}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={addSelectedInventoryItemsToMaterials}
                disabled={selectedInventoryItems.length === 0}
              >
                Add {selectedInventoryItems.length} Chemical{selectedInventoryItems.length !== 1 ? 's' : ''} to Materials List
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Solvent Search Modal */}
      {showSolventModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "900px", width: "95%" }}>
            <div className="modal-header">
              <h3>Search Solvents</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn btn-outline-info"
                  onClick={() => setShowSolventHelp(true)}
                  style={{ padding: "4px 8px", fontSize: "12px" }}
                >
                  ?
                </button>
                <button className="modal-close" onClick={closeSolventModal}>
                  ×
                </button>
              </div>
            </div>
            <div className="modal-body">
              {/* Search Controls */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                  <div style={{ flex: "1" }}>
                    <input
                      type="text"
                      className="form-control"
                      value={solventSearchQuery}
                      onChange={handleSolventSearchChange}
                      onKeyPress={handleSolventSearchKeyPress}
                      placeholder="Search solvents by name, alias, or CAS number..."
                    />
                  </div>
                  <select
                    className="form-control"
                    value={selectedSolventClass}
                    onChange={(e) => setSelectedSolventClass(e.target.value)}
                    style={{ width: "180px" }}
                  >
                    <option value="">All Classes</option>
                    <option value="alcohol">Alcohol</option>
                    <option value="ether">Ether</option>
                    <option value="ketone">Ketone</option>
                    <option value="ester">Ester</option>
                    <option value="nitrile">Nitrile</option>
                    <option value="carboxylic acid">Carboxylic acid</option>
                    <option value="amine">Amine</option>
                    <option value="aliphatic">Aliphatic</option>
                    <option value="aromatic">Aromatic</option>
                    <option value="halogenated">Halogenated</option>
                    <option value="water">Water</option>
                    <option value="carbonate">Carbonate</option>
                    <option value="perfluorinated hydrocarbon">Perfluorinated hydrocarbon</option>
                  </select>
                  <input
                    type="text"
                    className="form-control"
                    value={boilingPointFilter}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow if it starts with > or < or is empty
                      if (value === "" || value.startsWith(">") || value.startsWith("<")) {
                        setBoilingPointFilter(value);
                      }
                    }}
                    placeholder="BP filter (&gt;50 or &lt;100)"
                    style={{ width: "150px" }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={searchSolvents}
                    disabled={solventSearchLoading || (solventSearchQuery.length < 2 && !selectedSolventClass && !boilingPointFilter)}
                  >
                    {solventSearchLoading ? "Searching..." : "Search"}
                  </button>
                  <button
                    className="btn btn-outline-info"
                    onClick={() => setShowSelectedSolvents(!showSelectedSolvents)}
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                    disabled={selectedSolvents.length === 0}
                  >
                    Show Selected ({selectedSolvents.length})
                  </button>
                </div>
              </div>



              {/* Search Results */}
              <div>
                <h5>
                  {showSelectedSolvents 
                    ? `Selected Solvents (${selectedSolvents.length})` 
                    : `Search Results (${solventSearchResults.length})`
                  }
                </h5>
                <div style={{ 
                  maxHeight: "300px", 
                  overflowY: "auto",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px"
                }}>
                  {showSelectedSolvents ? (
                    // Show selected solvents
                    <div>
                      {selectedSolvents.length > 0 ? (
                        selectedSolvents.map((solvent, index) => {
                          const isExisting = materials.some(m => 
                            m.name === solvent.name || 
                            (m.cas && solvent.cas && m.cas === solvent.cas)
                          );
                          
                          return (
                            <div
                              key={`selected-solvent-${index}`}
                                                          style={{
                              padding: "12px",
                              borderBottom: index < selectedSolvents.length - 1 ? "1px solid var(--color-border-light)" : "none",
                              backgroundColor: "transparent",
                              borderLeft: "4px solid var(--color-info)",
                              cursor: "pointer",
                              opacity: isExisting ? 0.6 : 1
                            }}
                              onClick={() => toggleSolventSelection(solvent)}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ flex: "1", fontSize: "13px" }}>
                                  <span style={{ fontWeight: "bold", color: "var(--color-heading)" }}>
                                    {solvent.alias || solvent.name}
                                  </span>
                                  {solvent.name !== solvent.alias && (
                                    <span style={{ color: "var(--color-text-light)", marginLeft: "8px" }}>
                                      ({solvent.name})
                                    </span>
                                  )}
                                  <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                    CAS: {solvent.cas || "N/A"}
                                  </span>
                                  <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                    MW: {solvent.molecular_weight || "N/A"} g/mol
                                  </span>
                                  <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                    BP: {solvent.boiling_point || "N/A"}°C
                                  </span>
                                  <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                    Class: {solvent.chemical_class || "N/A"}
                                  </span>
                                  {solvent.density && (
                                    <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                      Density: {solvent.density} g/mL
                                    </span>
                                  )}
                                  {isExisting && (
                                    <span style={{ 
                                      color: "#d63384", 
                                      fontStyle: "italic",
                                      marginLeft: "12px"
                                    }}>
                                      ✓ Already added
                                    </span>
                                  )}
                                </div>
                                <div style={{ marginLeft: "10px" }}>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ 
                          padding: "20px", 
                          textAlign: "center", 
                          color: "var(--color-text-muted)",
                          fontStyle: "italic"
                        }}>
                          No selected solvents
                        </div>
                      )}
                    </div>
                  ) : solventSearchResults.length > 0 ? (
                    <div>
                      {solventSearchResults.map((solvent, index) => {
                        const isSelected = selectedSolvents.some(s => s.name === solvent.name && s.cas === solvent.cas);
                        const isExisting = materials.some(m => 
                          m.name === solvent.name || 
                          (m.cas && solvent.cas && m.cas === solvent.cas)
                        );
                        
                        return (
                          <div
                            key={index}
                            style={{
                              padding: "12px",
                              borderBottom: index < solventSearchResults.length - 1 ? "1px solid var(--color-border-light)" : "none",
                              backgroundColor: "transparent",
                              borderLeft: isSelected ? "4px solid var(--color-info)" : "4px solid transparent",
                              cursor: isExisting ? "not-allowed" : "pointer",
                              opacity: isExisting ? 0.6 : 1
                            }}
                            onClick={isExisting ? undefined : () => toggleSolventSelection(solvent)}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ flex: "1", fontSize: "13px" }}>
                                <span style={{ fontWeight: "bold", color: "var(--color-heading)" }}>
                                  {solvent.alias || solvent.name}
                                </span>
                                {solvent.name !== solvent.alias && (
                                  <span style={{ color: "var(--color-text-light)", marginLeft: "8px" }}>
                                    ({solvent.name})
                                  </span>
                                )}
                                <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                  CAS: {solvent.cas || "N/A"}
                                </span>
                                <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                  MW: {solvent.molecular_weight || "N/A"} g/mol
                                </span>
                                <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                  BP: {solvent.boiling_point || "N/A"}°C
                                </span>
                                <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                  Class: {solvent.chemical_class || "N/A"}
                                </span>
                                {solvent.density && (
                                  <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                    Density: {solvent.density} g/mL
                                  </span>
                                )}
                                {isExisting && (
                                  <span style={{ 
                                    color: "#d63384", 
                                    fontStyle: "italic",
                                    marginLeft: "12px"
                                  }}>
                                    ✓ Already added
                                  </span>
                                )}
                              </div>
                              <div style={{ marginLeft: "10px" }}>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : solventSearchQuery.length >= 2 ? (
                    <div style={{ 
                      padding: "20px", 
                      textAlign: "center", 
                      color: "var(--color-text-muted)",
                      fontStyle: "italic"
                    }}>
                      No solvents found matching "{solventSearchQuery}"
                    </div>
                  ) : (
                    <div style={{ 
                      padding: "20px", 
                      textAlign: "center", 
                      color: "var(--color-text-muted)",
                      fontStyle: "italic"
                    }}>
                      Enter a search term to find solvents
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeSolventModal}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={addSelectedSolventsToMaterials}
                disabled={selectedSolvents.length === 0}
              >
                Add {selectedSolvents.length} Solvent{selectedSolvents.length !== 1 ? 's' : ''} to Materials List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solvent Help Modal */}
      {showSolventHelp && (
        <div className="modal-overlay" onClick={() => setShowSolventHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1000px", width: "95%" }}>
            <div className="modal-header">
              <h3>Solvent Search Help</h3>
              <button className="modal-close" onClick={() => setShowSolventHelp(false)}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "left" }}>
              <h4>Search Options:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Text Search:</strong> Enter solvent name, alias, or CAS number (minimum 2 characters)</li>
                <li><strong>Chemical Class Filter:</strong> Select from dropdown to filter by solvent type (alcohol, ether, ketone, etc.)</li>
                <li><strong>Boiling Point Filter:</strong> Use &quot;&gt;50&quot; for solvents with BP &gt; 50°C or &quot;&lt;100&quot; for solvents with BP &lt; 100°C</li>
              </ul>
              
              <h4>Combined Filtering:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>Use any combination of text search, class filter, and boiling point filter</li>
                <li>All filters work together to narrow down results</li>
                <li>At least one filter must be active to perform a search</li>
              </ul>
              
              <h4>Selection:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>Click on any solvent result to select/deselect it</li>
                <li>Selected solvents are highlighted with a background color</li>
                <li>Solvents already in your materials list are disabled and marked</li>
                <li>Use the &quot;Add X Solvent(s) to Materials List&quot; button to add selected solvents</li>
              </ul>
              
              <h4>Examples:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>Search &quot;acetone&quot; → Find acetone by name</li>
                <li>Select &quot;Alcohol&quot; class → Show all alcohols</li>
                <li>Enter &quot;&gt;50&quot; → Show solvents with BP &gt; 50°C</li>
                <li>Combine: &quot;ethanol&quot; + &quot;Alcohol&quot; class + &quot;&gt;70&quot; → Find ethanol with BP &gt; 70°C</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSolventHelp(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Materials Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px", width: "95%" }}>
            <div className="modal-header">
              <h3>Add materials from a previous experiment</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn btn-outline-info"
                  onClick={() => setShowUploadHelp(true)}
                  style={{ padding: "4px 8px", fontSize: "12px" }}
                >
                  ?
                </button>
                <button className="modal-close" onClick={closeUploadModal}>
                  ×
                </button>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={handleUploadFileSelect}
                    id="materials-upload-input"
                    style={{ width: "400px" }}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={handleUploadMaterials}
                    disabled={!selectedUploadFile || uploadingMaterials}
                  >
                    {uploadingMaterials ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Help Modal */}
      {showUploadHelp && (
        <div className="modal-overlay" onClick={() => setShowUploadHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-header">
              <h3>Upload Materials Help</h3>
              <button className="modal-close" onClick={() => setShowUploadHelp(false)}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "left" }}>
              <h4>Upload Process:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>Select an Excel file from a previous experiment</li>
                <li>The file must contain a "Materials" sheet with the required columns</li>
                <li>All materials from the Materials sheet will be added to the current experiment</li>
                <li>Duplicate materials (by name, CAS, or SMILES) will be automatically skipped</li>
                <li>Uploaded materials are marked with "excel_upload" source and won't show "To personal inventory" button</li>
              </ul>
              
              <h4>Required Excel Structure:</h4>
              <p>The Excel file must contain a "Materials" sheet with the following columns:</p>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Name:</strong> Chemical name (required)</li>
                <li><strong>Alias:</strong> Common name or alias</li>
                <li><strong>CAS:</strong> CAS number</li>
                <li><strong>SMILES:</strong> SMILES notation</li>
                <li><strong>Molecular Weight:</strong> Molecular weight in g/mol</li>
                <li><strong>Lot number:</strong> Lot number or barcode</li>
                <li><strong>Role:</strong> Material role (Reactant, Solvent, etc.)</li>
              </ul>
              
              <h4>Supported Formats:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>Excel files (.xlsx, .xls) with a "Materials" sheet</li>
                <li>The file should be from a previous experiment exported from this application</li>
              </ul>
              
              <h4>Best Practices:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>Use files exported from this application to ensure proper format</li>
                <li>Ensure the Materials sheet contains all required columns</li>
                <li>Check that material names are consistent across experiments</li>
                <li>Review uploaded materials and adjust roles as needed</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUploadHelp(false)}>
                Close
              </button>
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
              <button className="modal-close" onClick={closeKitUploadModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "20px", color: "var(--color-text-secondary)" }}>
                Upload an Excel file containing both materials and design (well positions with amounts) for a kit.
                The kit can be positioned on your current plate layout.
              </p>
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
                <p style={{ fontSize: "14px", color: "#666", marginTop: "10px" }}>
                  Supported formats: Excel files (.xlsx, .xls) with Materials and Design sheets
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeKitUploadModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kit Position Modal */}
      {showKitPositionModal && kitData && kitSize && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "900px", width: "90%", minHeight: "600px" }}>
            <div className="modal-header">
              <h3>Position Kit on Plate</h3>
              <button className="modal-close" onClick={closeKitPositionModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "20px" }}>
                <h4>Kit Details:</h4>
                <p><strong>Kit Size:</strong> {kitSize.rows} rows × {kitSize.columns} columns ({kitSize.total_wells} wells)</p>
              </div>
              
              {/* Kit positioning options based on kit size */}
              <div style={{ marginBottom: "20px" }}>
                {renderKitPositionOptions()}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeKitPositionModal}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={applyKitToExperiment}
                disabled={selectedVisualPositions.length === 0}
              >
                Apply Kit to Experiment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
