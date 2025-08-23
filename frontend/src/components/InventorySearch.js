import React, { useState, useEffect } from "react";
import axios from "axios";

const InventorySearch = ({ 
  onAddMaterial, 
  onAddMultipleMaterials,
  visible, 
  onClose,
  showSuccess,
  showError,
  materials = [] // Pass existing materials to check for duplicates
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState([]);
  const [showSelectedInventory, setShowSelectedInventory] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // ESC key support for closing modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };
    
    if (visible) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [visible, onClose]);

  // Reset search state when materials list changes or modal is opened
  useEffect(() => {
    if (visible) {
      // Clear selected items when modal opens to ensure fresh state
      setSelectedInventoryItems([]);
      setShowSelectedInventory(false);
      // Also clear search results and query to start fresh
      setSearchResults([]);
      setSearchQuery("");
      setShowSearch(false);
    }
  }, [materials, visible]);

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

      const url = `/api/inventory/search?q=${encodeURIComponent(query)}`;
      console.log(`Making request to: ${url}`);

      const response = await axios.get(url);
      console.log("Search response received:", response.data);

      // Parse JSON string if response.data is a string
      let parsedData = response.data;
      if (typeof response.data === "string") {
        try {
          // Replace NaN with null before parsing
          const cleanedData = response.data.replace(/:\s*NaN/g, ': null');
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
      if (showError) {
        showError("Error searching inventory: " + error.message);
      }
      setSearchResults([]);
      setShowSearch(false);
      setSelectedResultIndex(-1);
    } finally {
      setSearchLoading(false);
    }
  };

  // Helper function to check if material already exists in the list
  const isMaterialInList = (chemical) => {
    return materials.some(existingMaterial => {
      // Check if any of the identifying fields match (name, alias, or CAS)
      // Only check if both values exist and are not empty
      const chemicalName = chemical.chemical_name || chemical.name;
      const chemicalCas = chemical.cas_number || chemical.cas;
      
      const nameMatch = existingMaterial.name && chemicalName && 
                       existingMaterial.name.toLowerCase().trim() === chemicalName.toLowerCase().trim();
      const aliasMatch = existingMaterial.alias && chemicalName && 
                        existingMaterial.alias.toLowerCase().trim() === chemicalName.toLowerCase().trim();
      const casMatch = existingMaterial.cas && chemicalCas && 
                      existingMaterial.cas.toLowerCase().trim() === chemicalCas.toLowerCase().trim();
      
      return nameMatch || aliasMatch || casMatch;
    });
  };

  // Toggle selection function like the original
  const toggleInventorySelection = (chemical) => {
    setSelectedInventoryItems(prev => {
      const isSelected = prev.some(c => 
        (c.chemical_name || c.name) === (chemical.chemical_name || chemical.name) && 
        (c.cas_number || c.cas) === (chemical.cas_number || chemical.cas)
      );
      if (isSelected) {
        return prev.filter(c => 
          !((c.chemical_name || c.name) === (chemical.chemical_name || chemical.name) && 
            (c.cas_number || c.cas) === (chemical.cas_number || chemical.cas))
        );
      } else {
        return [...prev, chemical];
      }
    });
  };

  // Handle search input change
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

  // Handle key press events
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

  const addFromInventory = async (chemical) => {
    console.log("Adding individual material from inventory:", chemical);
    
    const material = {
      name: chemical.chemical_name || chemical.name,
      alias: chemical.alias || "",
      cas: chemical.cas_number || chemical.cas || "",
      molecular_weight: chemical.molecular_weight || "",
      smiles: chemical.smiles || "",
      barcode: chemical.barcode || "",
      role: "",
      source: chemical.source || "inventory",
    };

    try {
      // Clear any selected items to prevent accidental batch additions
      setSelectedInventoryItems([]);
      setShowSelectedInventory(false);
      
      onAddMaterial(material);
      if (showSuccess) {
        showSuccess(`${material.name} added from inventory!`);
      }
    } catch (error) {
      console.error("Error adding material:", error);
      if (showError) {
        showError("Error adding material: " + error.message);
      }
    }
  };

  const addSelectedInventoryItemsToMaterials = async () => {
    // Safety check - only proceed if there are actually selected items
    if (selectedInventoryItems.length === 0) {
      if (showError) {
        showError("No materials selected for batch addition");
      }
      return;
    }

    try {
      console.log(`Adding ${selectedInventoryItems.length} selected materials:`, selectedInventoryItems);
      
      // Convert all selected items to material format
      const materialsToAdd = selectedInventoryItems.map(item => ({
        name: item.chemical_name || item.name,
        alias: item.alias || "",
        cas: item.cas_number || item.cas || "",
        molecular_weight: item.molecular_weight || "",
        smiles: item.smiles || "",
        barcode: item.barcode || "",
        role: "",
        source: item.source || "inventory",
      }));
      
      // Add all materials in a single batch operation
      if (onAddMultipleMaterials) {
        onAddMultipleMaterials(materialsToAdd);
      } else {
        // Fallback to individual adds if batch function not available
        for (const material of materialsToAdd) {
          onAddMaterial(material);
        }
      }
      
      // Show single success message for batch add
      if (showSuccess) {
        showSuccess(`${selectedInventoryItems.length} materials added from inventory!`);
      }
      
      // Clear selections
      setSelectedInventoryItems([]);
      setShowSelectedInventory(false);
      setSearchQuery("");
      setSearchResults([]);
      
      onClose();
    } catch (error) {
      console.error("Error adding selected inventory items:", error);
      if (showError) {
        showError("Error adding selected inventory items: " + error.message);
      }
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "900px", width: "95%" }}>
        <div className="modal-header">
          <h3>Search from Inventory</h3>
          <button className="modal-close" onClick={onClose}>×</button>
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
                                {chemical.alias || chemical.chemical_name || chemical.name}
                              </span>
                              <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                CAS: {chemical.cas_number || chemical.cas || "N/A"}
                              </span>
                              {isExisting && (
                                <span style={{ 
                                  color: "var(--color-text-secondary)", 
                                  fontStyle: "italic",
                                  marginLeft: "12px"
                                }}>
                                  ✓ Already added
                                </span>
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
                        (c.chemical_name || c.name) === (chemical.chemical_name || chemical.name) && 
                        (c.cas_number || c.cas) === (chemical.cas_number || chemical.cas)
                      );
                      
                      return (
                        <div
                          key={index}
                          style={{
                            padding: "12px",
                            borderBottom: index < searchResults.length - 1 ? "1px solid var(--color-border-light)" : "none",
                            backgroundColor: "transparent",
                            borderLeft: isSelected ? "4px solid var(--color-info)" : "4px solid transparent",
                            opacity: isExisting ? 0.6 : 1
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div 
                              style={{ flex: "1", fontSize: "13px", cursor: isExisting ? "not-allowed" : "pointer" }}
                              onClick={isExisting ? undefined : () => toggleInventorySelection(chemical)}
                            >
                              <span style={{ fontWeight: "bold", color: "var(--color-heading)" }}>
                                {chemical.alias || chemical.chemical_name || chemical.name}
                              </span>
                              <span style={{ color: "var(--color-text-light)", marginLeft: "12px" }}>
                                CAS: {chemical.cas_number || chemical.cas || "N/A"}
                              </span>
                              {isExisting && (
                                <span style={{ 
                                  color: "var(--color-text-secondary)", 
                                  fontStyle: "italic",
                                  marginLeft: "12px"
                                }}>
                                  ✓ Already added
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: "8px", marginLeft: "12px" }}>
                              <button
                                className="btn btn-primary"
                                onClick={() => addFromInventory(chemical)}
                                disabled={isExisting}
                                style={{ 
                                  fontSize: "11px", 
                                  padding: "4px 8px",
                                  opacity: isExisting ? 0.5 : 1
                                }}
                              >
                                Add
                              </button>
                              <button
                                className={`btn ${isSelected ? "btn-info" : "btn-outline-secondary"}`}
                                onClick={() => toggleInventorySelection(chemical)}
                                disabled={isExisting}
                                style={{ 
                                  fontSize: "11px", 
                                  padding: "4px 8px",
                                  opacity: isExisting ? 0.5 : 1
                                }}
                              >
                                {isSelected ? "✓" : "Select"}
                              </button>
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
              ) : (
                <div style={{ 
                  padding: "20px", 
                  textAlign: "center", 
                  color: "var(--color-text-muted)",
                  fontStyle: "italic"
                }}>
                  {searchLoading ? "Searching inventory..." : "Enter a search term and click Search"}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {selectedInventoryItems.length > 0 && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                {selectedInventoryItems.length} chemical{selectedInventoryItems.length !== 1 ? 's' : ''} selected
              </span>
              <button
                className="btn btn-success"
                onClick={addSelectedInventoryItemsToMaterials}
              >
                Add All Selected to Experiment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventorySearch;
