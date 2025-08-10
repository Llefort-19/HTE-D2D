import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const Procedure = () => {
  const [procedure, setProcedure] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedWells, setSelectedWells] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("μmol");
  const [clickedWell, setClickedWell] = useState(null);
  const [showWellModal, setShowWellModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [plateType, setPlateType] = useState("96"); // "96", "48", or "24"
  const [showPlateSwitchWarning, setShowPlateSwitchWarning] = useState(false);
  const [pendingPlateType, setPendingPlateType] = useState(null);



  const { showError } = useToast();

  // Generate wells based on plate type
  const getPlateConfig = (type) => {
    if (type === "24") {
      return {
        rows: ["A", "B", "C", "D"],
        columns: ["1", "2", "3", "4", "5", "6"],
        wells: []
      };
    } else if (type === "48") {
      return {
        rows: ["A", "B", "C", "D", "E", "F"],
        columns: ["1", "2", "3", "4", "5", "6", "7", "8"],
        wells: []
      };
    } else {
      return {
        rows: ["A", "B", "C", "D", "E", "F", "G", "H"],
        columns: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        wells: []
      };
    }
  };

  const plateConfig = getPlateConfig(plateType);
  const { rows, columns } = plateConfig;
  
  // Generate wells array
  const wells = [];
  for (let row of rows) {
    for (let col of columns) {
      wells.push(`${row}${col}`);
    }
  }

  // Handle plate type switching with warning
  const handlePlateTypeSwitch = (newPlateType) => {
    if (newPlateType === plateType) return;
    
    // Check if there are any dispensed materials
    const hasDispensedMaterials = procedure.some(wellData => wellData.materials.length > 0);
    
    if (hasDispensedMaterials) {
      // Show warning modal
      setPendingPlateType(newPlateType);
      setShowPlateSwitchWarning(true);
    } else {
      // No materials dispensed, switch directly
      switchPlateType(newPlateType);
    }
  };

  const switchPlateType = (newPlateType) => {
    setPlateType(newPlateType);
    setSelectedWells([]);
    setSelectedMaterial(null);
    setAmount("");
    // Clear all procedure data
    setProcedure([]);
  };

  const confirmPlateSwitch = async () => {
    try {
      // Clear procedure data from backend
      await axios.post("/api/experiment/procedure", []);
      switchPlateType(pendingPlateType);
      setShowPlateSwitchWarning(false);
      setPendingPlateType(null);
    } catch (error) {
      console.error("Error clearing procedure:", error);
      showError("Error clearing procedure data: " + error.message);
    }
  };

  const cancelPlateSwitch = () => {
    setShowPlateSwitchWarning(false);
    setPendingPlateType(null);
  };



  useEffect(() => {
    loadProcedure();
    loadMaterials();
    
    // Listen for help events from header
    const handleHelpEvent = (event) => {
      if (event.detail.tabId === 'procedure') {
        setShowHelpModal(true);
      }
    };
    
    window.addEventListener('showHelp', handleHelpEvent);
    
    return () => {
      window.removeEventListener('showHelp', handleHelpEvent);
    };
  }, []);

  // Refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProcedure();
        loadMaterials();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  const loadProcedure = async () => {
    try {
      const [procedureResponse, contextResponse] = await Promise.all([
        axios.get("/api/experiment/procedure"),
        axios.get("/api/experiment/context")
      ]);
      
      setProcedure(procedureResponse.data || []);
      
      // Check if there's a plate type set in the context from kit upload
      const context = contextResponse.data || {};
      if (context.plate_type && context.plate_type !== plateType) {
        console.log(`Setting plate type from context: ${context.plate_type}`);
        setPlateType(context.plate_type);
      }
    } catch (error) {
      console.error("Error loading procedure:", error);
    }
  };



  const loadMaterials = async () => {
    try {
      const response = await axios.get("/api/experiment/materials");
      setMaterials(response.data || []);
    } catch (error) {
      console.error("Error loading materials:", error);
    }
  };

  const getWellData = (wellId) => {
    return (
      procedure.find((p) => p.well === wellId) || {
        well: wellId,
        materials: [],
      }
    );
  };

  const consolidateMaterials = (materials) => {
    const consolidated = {};
    
    materials.forEach((material) => {
      const key = material.name;
      if (consolidated[key]) {
        // Sum up amounts for the same material
        consolidated[key].amount += material.amount;
      } else {
        // First occurrence of this material
        consolidated[key] = { ...material };
      }
    });
    
    return Object.values(consolidated);
  };

  const updateWellData = (wellId, materials) => {
    const existingIndex = procedure.findIndex((p) => p.well === wellId);
    const updatedData = { well: wellId, materials };

    if (existingIndex >= 0) {
      setProcedure((prev) =>
        prev.map((p, i) => (i === existingIndex ? updatedData : p)),
      );
    } else {
      setProcedure((prev) => [...prev, updatedData]);
    }
  };

  const handleMaterialClick = (material) => {
    // If clicking the same material, deselect it
    if (selectedMaterial && selectedMaterial.name === material.name) {
      setSelectedMaterial(null);
      setAmount("");
    } else {
      // Otherwise, select the new material
      setSelectedMaterial(material);
      setAmount("");
      
      // Set unit based on material role
      if (material.role === "Solvent") {
        setUnit("μL");
      } else {
        setUnit("μmol");
      }
    }
  };

  const handleWellClick = (wellId, event) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd - toggle selection
      setSelectedWells(
        (prev) =>
          prev.includes(wellId)
            ? prev.filter((w) => w !== wellId) // Remove if already selected
            : [...prev, wellId], // Add if not selected
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
      setSelectedWells((prev) =>
        prev.includes(wellId) ? prev : [...prev, wellId],
      );
    }
  };

  const handleRowClick = (rowLetter, event) => {
    const rowWells = columns.map((col) => `${rowLetter}${col}`);

    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd - toggle selection
      setSelectedWells((prev) => {
        const currentRowWells = new Set(prev);
        const allRowWellsSelected = rowWells.every((well) =>
          currentRowWells.has(well),
        );

        if (allRowWellsSelected) {
          // If all wells in row are selected, remove them
          return prev.filter((well) => !rowWells.includes(well));
        } else {
          // If not all wells are selected, add them
          return [...prev, ...rowWells.filter((well) => !prev.includes(well))];
        }
      });
    } else {
      // Single select
      setSelectedWells(rowWells);
    }
  };

  const handleColumnClick = (colNumber, event) => {
    const colWells = rows.map((row) => `${row}${colNumber}`);

    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd - toggle selection
      setSelectedWells((prev) => {
        const currentColWells = new Set(prev);
        const allColWellsSelected = colWells.every((well) =>
          currentColWells.has(well),
        );

        if (allColWellsSelected) {
          // If all wells in column are selected, remove them
          return prev.filter((well) => !colWells.includes(well));
        } else {
          // If not all wells are selected, add them
          return [...prev, ...colWells.filter((well) => !prev.includes(well))];
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
      amount: parseFloat(amount),
      unit: unit,
    };

    // Create the updated procedure data directly
    const updatedProcedure = [...procedure];

    selectedWells.forEach((wellId) => {
      const existingIndex = updatedProcedure.findIndex(
        (p) => p.well === wellId,
      );
      const wellData =
        existingIndex >= 0
          ? updatedProcedure[existingIndex]
          : { well: wellId, materials: [] };
      
      // Add the new material entry and consolidate
      const updatedMaterials = consolidateMaterials([...wellData.materials, materialEntry]);

      if (existingIndex >= 0) {
        updatedProcedure[existingIndex] = {
          ...wellData,
          materials: updatedMaterials,
        };
      } else {
        updatedProcedure.push({ well: wellId, materials: updatedMaterials });
      }
    });

    // Update state and save to backend
    setProcedure(updatedProcedure);

    try {
      await axios.post("/api/experiment/procedure", updatedProcedure);
    } catch (error) {
      console.error("Error auto-saving procedure:", error);
      showError("Error saving changes: " + error.message);
    }

    // Keep the selected material active, but clear wells and amount for next dispense
    setSelectedWells([]);
    setAmount("");
  };

  const isSelectedMaterialInSelectedWells = () => {
    if (!selectedMaterial || selectedWells.length === 0) return false;
    
    return selectedWells.some((wellId) => {
      const wellData = getWellData(wellId);
      return wellData.materials.some((m) => m.name === selectedMaterial.name);
    });
  };

  const removeMaterialFromWells = async () => {
    if (!selectedMaterial || selectedWells.length === 0) return;

    // Create the updated procedure data directly
    const updatedProcedure = [...procedure];
    let removedCount = 0;

    selectedWells.forEach((wellId) => {
      const existingIndex = updatedProcedure.findIndex(
        (p) => p.well === wellId,
      );
      if (existingIndex >= 0) {
        const wellData = updatedProcedure[existingIndex];
        const materialExists = wellData.materials.some(
          (m) => m.name === selectedMaterial.name,
        );
        if (materialExists) {
          const updatedMaterials = wellData.materials.filter(
            (m) => m.name !== selectedMaterial.name,
          );
          updatedProcedure[existingIndex] = {
            ...wellData,
            materials: updatedMaterials,
          };
          removedCount++;
        }
      }
    });

    if (removedCount > 0) {
      // Update state and save to backend
      setProcedure(updatedProcedure);

      try {
        await axios.post("/api/experiment/procedure", updatedProcedure);
      } catch (error) {
        console.error("Error auto-saving procedure:", error);
        showError("Error saving changes: " + error.message);
      }
    }

    // Clear selection
    setSelectedWells([]);
  };

  const handleSelectAllWells = (event) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd - toggle selection
      setSelectedWells((prev) => {
        const allWells = wells;
        const allWellsSelected = allWells.every((well) => prev.includes(well));

        if (allWellsSelected) {
          // If all wells are selected, remove them
          return prev.filter((well) => !allWells.includes(well));
        } else {
          // If not all wells are selected, add them
          return [...prev, ...allWells.filter((well) => !prev.includes(well))];
        }
      });
    } else {
      // Single select - select all wells
      setSelectedWells(wells);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'low': return 'var(--color-well-low)';      // Green - low amounts
      case 'medium': return 'var(--color-well-medium)';   // Orange - medium amounts  
      case 'high': return 'var(--color-well-high)';     // Red - high amounts
      case 'very-high': return 'var(--color-well-very-high)'; // Purple - very high amounts
      default: return 'var(--color-well-default)';         // Blue - default
    }
  };

  const getWellColorCategory = (wellId) => {
    if (!selectedMaterial) return null;
    
    const wellData = getWellData(wellId);
    const selectedMaterialInWell = wellData.materials.find(
      (m) => m.name === selectedMaterial.name,
    );

    if (!selectedMaterialInWell) return null;

    // Get all amounts for this material across all wells
    const allAmounts = procedure
      .flatMap(wellData => wellData.materials)
      .filter(m => m.name === selectedMaterial.name)
      .map(m => m.amount);

    if (allAmounts.length === 0) return null;

    // Sort amounts to find percentiles
    const sortedAmounts = [...allAmounts].sort((a, b) => a - b);
    const currentAmount = selectedMaterialInWell.amount;
    
    // Find the percentile of the current amount
    const percentile = sortedAmounts.findIndex(amount => amount >= currentAmount) / sortedAmounts.length;
    
    // Create discrete categories based on percentiles
    if (percentile <= 0.25) return 'low';      // Bottom 25%
    if (percentile <= 0.5) return 'medium';   // 25-50%
    if (percentile <= 0.75) return 'high';    // 50-75%
    return 'very-high';                        // Top 25%
  };

  const getWellClass = (wellId) => {
    let className = "well";
    const wellData = getWellData(wellId);
    const isSelected = selectedWells.includes(wellId);
    const hasContent = wellData.materials.length > 0;
    const containsSelectedMaterial = selectedMaterial && 
      wellData.materials.some((m) => m.name === selectedMaterial.name);

    if (isSelected && containsSelectedMaterial) {
      // Well is both selected and contains the highlighted material
      className += " selected highlighted-material";
    } else if (isSelected) {
      // Well is selected but doesn't contain the highlighted material
      className += " selected";
    } else if (hasContent) {
      className += " has-content";
      
      // Highlight wells containing the selected material (but not selected)
      if (containsSelectedMaterial) {
        className += " highlighted-material";
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
    const selectedMaterialInWell = wellData.materials.find(
      (m) => m.name === selectedMaterial.name,
    );

    if (!selectedMaterialInWell) {
      return null;
    }

    return (
      <div className="well-content">
        <div className="well-material-amount" style={{ fontSize: "10px", fontWeight: "bold" }}>
          {selectedMaterialInWell.amount}
        </div>
      </div>
    );
  };

  const calculateMaterialTotals = () => {
    const totals = {};

    // Initialize totals for all materials
    materials.forEach((material) => {
      totals[material.name] = {
        umol: 0,
        μL: 0,
        mg: 0,
        hasMolecularWeight: !!material.molecular_weight,
        unit: "μmol", // default unit
      };
    });

    // Calculate totals from procedure data
    procedure.forEach((wellData) => {
      wellData.materials.forEach((material) => {
        if (totals[material.name] !== undefined) {
          const unit = material.unit || "μmol";
          if (unit === "μL") {
            totals[material.name].μL += material.amount || 0;
            totals[material.name].unit = "μL";
          } else {
            totals[material.name].umol += material.amount || 0;
            totals[material.name].unit = "μmol";
          }
        }
      });
    });

    // Calculate mg amounts using current molecular weights from materials list
    materials.forEach((material) => {
      if (totals[material.name]) {
        // Calculate mg: (molecular_weight * amount_umol) / 100
        const mg = ((material.molecular_weight || 0) * totals[material.name].umol) / 100;
        totals[material.name].mg = mg;
        totals[material.name].hasMolecularWeight = !!material.molecular_weight;
      }
    });

    return totals;
  };

  return (
    <div className="card">
      {/* Two-Column Grid Layout */}
      <div className="procedure-grid">
        {/* Materials Table */}
        <div className="materials-section">
          <h3>Materials</h3>
          <div className="scrollable-table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>CAS</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, index) => {
                  const materialTotals = calculateMaterialTotals();
                  const totalData = materialTotals[material.name] || {
                    umol: 0,
                    mg: 0,
                  };
                  return (
                    <tr
                      key={index}
                      className={
                        selectedMaterial?.name === material.name
                          ? "selected-row"
                          : ""
                      }
                      onClick={() => handleMaterialClick(material)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{material.alias}</td>
                      <td>{material.cas}</td>
                      <td className="total-amount">
                        {(totalData.umol > 0 || totalData.μL > 0) ? (
                          <div className="amount-display">
                            <div className="amount-umol">
                              {totalData.unit === "μL" 
                                ? `${totalData.μL.toFixed(1)} μL`
                                : `${totalData.umol.toFixed(1)} μmol`
                              }
                            </div>
                            <div className="amount-mg">
                              {totalData.hasMolecularWeight && totalData.unit === "μmol"
                                ? `${totalData.mg.toFixed(1)} mg`
                                : "--"}
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
            <div className="amount-input-section">
              <h4>Selected: {selectedMaterial.alias || selectedMaterial.name}</h4>
              <div className="amount-controls">
                <input
                  type="number"
                  step="0.001"
                  className="form-control"
                  placeholder={`Amount (${unit})`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  className="btn btn-success"
                  onClick={addMaterialToWells}
                  disabled={!amount || selectedWells.length === 0}
                >
                  Add to {selectedWells.length} well
                  {selectedWells.length !== 1 ? "s" : ""}
                </button>
                <button
                  className="btn btn-warning"
                  onClick={removeMaterialFromWells}
                  disabled={!isSelectedMaterialInSelectedWells()}
                  title={`Remove ${selectedMaterial.alias || selectedMaterial.name} from selected wells`}
                >
                  Remove from {selectedWells.length} well
                  {selectedWells.length !== 1 ? "s" : ""}
                </button>
              </div>
              {selectedWells.length > 0 && (
                <small className="selected-wells-info">
                  Selected wells: {selectedWells.join(", ")}
                </small>
              )}
            </div>
          )}
        </div>

        {/* Well Plate */}
        <div className="plate-section">
          <div className="plate-header">
            <h3>{plateType}-Well Plate</h3>
            <div className="plate-type-selector">
              <div className="plate-type-toggle">
                <button
                  className={`plate-type-btn ${plateType === "96" ? "active" : ""}`}
                  onClick={() => handlePlateTypeSwitch("96")}
                  title="96-Well Plate (8×12)"
                >
                  <span className="plate-label">96-Well</span>
                </button>
                <button
                  className={`plate-type-btn ${plateType === "48" ? "active" : ""}`}
                  onClick={() => handlePlateTypeSwitch("48")}
                  title="48-Well Plate (6×8)"
                >
                  <span className="plate-label">48-Well</span>
                </button>
                <button
                  className={`plate-type-btn ${plateType === "24" ? "active" : ""}`}
                  onClick={() => handlePlateTypeSwitch("24")}
                  title="24-Well Plate (4×6)"
                >
                  <span className="plate-label">24-Well</span>
                </button>
              </div>
            </div>
          </div>
          <div className="plate-container">
            {/* Column Headers */}
            <div className={`column-headers plate-${plateType}`}>
              <div
                className="corner-cell select-all-button"
                onClick={(e) => handleSelectAllWells(e)}
                title="Select all wells (Ctrl+click to toggle)"
              >
                ALL
              </div>
              {columns.map((col) => (
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
            <div className={`plate-grid plate-${plateType}`}>
              {rows.map((row) => (
                <div key={row} className="plate-row">
                  <div
                    className="header-cell row-header"
                    onClick={(e) => handleRowClick(row, e)}
                    title={`Select row ${row}`}
                  >
                    {row}
                  </div>
                  {columns.map((col) => {
                    const well = `${row}${col}`;
                    const colorCategory = getWellColorCategory(well);
                    const isSelected = selectedWells.includes(well);
                    
                    // Create color style only for non-selected wells that contain the material
                    const colorStyle = (colorCategory && !isSelected) ? {
                      backgroundColor: getCategoryColor(colorCategory),
                      color: 'white',
                      border: `2px solid ${getCategoryColor(colorCategory)}`
                    } : {};
                    
                    return (
                      <div
                        key={`${well}-${selectedMaterial?.name || "none"}`}
                        className={`well ${getWellClass(well)}`}
                        style={colorStyle}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1000px", width: "95%" }}>
            <div className="modal-header">
              <h3>{plateType}-Well Plate Help</h3>
              <button
                className="modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "left" }}>
              <h4>How to use the {plateType}-Well Plate:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>
                  <strong>Select Material:</strong> Click on a material row in
                  the table to select it for dispensing.
                </li>
                <li>
                  <strong>Select Wells:</strong> Click on individual wells to
                  select them, or use the following methods:
                </li>
                <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
                  <li>Click on row letters ({plateType === "96" ? "A-H" : plateType === "48" ? "A-F" : "A-D"}) to select entire rows</li>
                  <li>
                    Click on column numbers ({plateType === "96" ? "1-12" : plateType === "48" ? "1-8" : "1-6"}) to select entire columns
                  </li>
                  <li>
                    Hold Ctrl/Cmd and click to select multiple rows/columns
                  </li>
                  <li>
                    Hold Ctrl/Cmd and click to select multiple individual wells
                  </li>
                  <li>Click and drag to select contiguous wells</li>
                  <li>Click "ALL" to select all wells</li>
                </ul>
                <li>
                  <strong>Add Material:</strong> Enter the amount in the appropriate unit (μmol for materials, μL for solvents) and
                  click "Add to wells" to dispense the selected material. Multiple additions of the same chemical are automatically summed.
                </li>
                <li>
                  <strong>Remove Material:</strong> Click "Remove from wells" to
                  remove the selected material from all selected wells.
                </li>
                <li>
                  <strong>View Contents:</strong> Right-click on any well to
                  view its contents in a modal.
                </li>
                <li>
                  <strong>Auto-save:</strong> All changes are automatically
                  saved to the backend.
                </li>
              </ul>
              <h4>Tips:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Selected wells are highlighted in blue</li>
                <li>Wells with content are highlighted with green borders</li>
                <li>When a material is selected, wells containing it show color-coded amounts (Green=Low, Orange=Medium, Red=High, Purple=Very High)</li>
                <li>Use Ctrl/Cmd for multi-selection operations</li>
                <li>Drag operations work for contiguous well selection</li>
                <li>
                  Total amounts are calculated and displayed in the materials
                  table
                </li>
                <li>Multiple additions of the same chemical are automatically summed</li>
              </ul>
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
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
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
                        <div className="material-details">
                          <span className="material-alias">
                            {material.alias || material.name}
                          </span>
                          <span className="material-cas">
                            CAS: {material.cas}
                          </span>
                          <span className="material-amount">
                            Amount: {material.amount} {material.unit || "μmol"}
                          </span>
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

      {/* Plate Switch Warning Modal */}
      {showPlateSwitchWarning && (
        <div className="modal-overlay" onClick={cancelPlateSwitch}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <p>
                Switching to {pendingPlateType}-well plate will clear all dispensed materials.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={cancelPlateSwitch}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmPlateSwitch}
              >
                Switch to {pendingPlateType}-Well Plate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Procedure;
