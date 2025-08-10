import React, { useState, useEffect } from "react";
import axios from "axios";

const KitPositioning = ({ 
  kitData,
  kitSize, 
  destinationPlateType,
  setDestinationPlateType,
  onApplyKit,
  onCancel,
  visible,
  showSuccess,
  showError
}) => {
  const [selectedVisualPositions, setSelectedVisualPositions] = useState([]);
  const [applying, setApplying] = useState(false);

  // Reset selections when modal opens or destination plate changes
  useEffect(() => {
    if (visible) {
      setSelectedVisualPositions([]);
    }
  }, [visible, destinationPlateType]);

  const getPlateConfig = (plateType) => {
    const configs = {
      "24": { rows: 4, cols: 6, name: "24-Well Plate" },
      "48": { rows: 6, cols: 8, name: "48-Well Plate" },
      "96": { rows: 8, cols: 12, name: "96-Well Plate" }
    };
    return configs[plateType];
  };

  const getKitType = (kitRows, kitCols) => {
    const totalWells = kitRows * kitCols;
    
    if (totalWells === 24 && kitRows === 4 && kitCols === 6) {
      return "4x6_24well";
    } else if (totalWells === 24 && kitRows === 2 && kitCols === 12) {
      return "2x12_24well";
    } else if (totalWells === 48 && kitRows === 6 && kitCols === 8) {
      return "6x8_48well";
    } else if (totalWells === 48 && kitRows === 4 && kitCols === 12) {
      return "4x12_48well";
    } else if (totalWells === 96 && kitRows === 8 && kitCols === 12) {
      return "8x12_96well";
    }
    
    return "unknown";
  };

  const getValidPlatesForKit = (kitType) => {
    switch (kitType) {
      case "4x6_24well":
        return ["24", "48", "96"]; // Can be positioned on all plates
      case "2x12_24well":
        return ["96"]; // Only on 96-well plates
      case "6x8_48well":
        return ["48"]; // Only on 48-well plates
      case "4x12_48well":
        return ["96"]; // Only on 96-well plates
      case "8x12_96well":
        return ["96"]; // Only on 96-well plates
      default:
        return [];
    }
  };

  const getPositionOptions = (kitType, plateType) => {
    switch (kitType) {
      case "4x6_24well":
        if (plateType === "24") {
          return { strategy: 'exact_match', options: [] };
        } else if (plateType === "48") {
          return { strategy: 'exact_match', options: [] };
          // Note: 4x6 kit exactly fits in 48-well plate (6x8) at A1-D6, no positioning choice needed
        } else if (plateType === "96") {
          return { 
            strategy: 'quadrant_selection', 
            options: [
              { id: "top-left", name: "Top-Left", description: "A1-D6" },
              { id: "top-right", name: "Top-Right", description: "A7-D12" },
              { id: "bottom-left", name: "Bottom-Left", description: "E1-H6" },
              { id: "bottom-right", name: "Bottom-Right", description: "E7-H12" }
            ]
          };
        }
        break;
        
      case "2x12_24well":
        return { 
          strategy: 'row_pair_selection', 
          options: [
            { id: "AB", name: "Rows A-B", description: "A1-B12" },
            { id: "CD", name: "Rows C-D", description: "C1-D12" },
            { id: "EF", name: "Rows E-F", description: "E1-F12" },
            { id: "GH", name: "Rows G-H", description: "G1-H12" }
          ]
        };
        
      case "6x8_48well":
        return { strategy: 'exact_match', options: [] };
        
      case "4x12_48well":
        return { 
          strategy: 'half_selection', 
          options: [
            { id: "upper", name: "Upper Half", description: "A1-D12" },
            { id: "lower", name: "Lower Half", description: "E1-H12" }
          ]
        };
        
      case "8x12_96well":
        return { strategy: 'exact_match', options: [] };
        
      default:
        return { strategy: 'unsupported', options: [] };
    }
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
    if (!kitSize || !destinationPlateType) return null;

    const { rows: kitRows, columns: kitCols } = kitSize;
    const kitType = getKitType(kitRows, kitCols);
    const positionInfo = getPositionOptions(kitType, destinationPlateType);

    if (positionInfo.strategy === 'exact_match') {
      return { 
        strategy: 'exact_placement', 
        position: 'A1', 
        destination_plate: destinationPlateType 
      };
    }

    if (selectedVisualPositions.length === 0) return null;

    switch (positionInfo.strategy) {
      case 'quadrant_selection':
        return {
          strategy: 'quadrant_placement',
          positions: selectedVisualPositions,
          destination_plate: destinationPlateType,
          kit_size: { rows: kitRows, cols: kitCols }
        };
        
      case 'row_pair_selection':
        return {
          strategy: 'row_pair_placement',
          positions: selectedVisualPositions,
          destination_plate: destinationPlateType,
          kit_size: { rows: kitRows, cols: kitCols }
        };
        
      case 'half_selection':
        return {
          strategy: 'half_placement',
          positions: selectedVisualPositions,
          destination_plate: destinationPlateType,
          kit_size: { rows: kitRows, cols: kitCols }
        };
        
      default:
        return null;
    }
  };

  const updateProcedurePlateType = async (plateType) => {
    try {
      const procedureResponse = await axios.get("/api/experiment/procedure");
      const currentProcedure = procedureResponse.data || [];
      
      await axios.post("/api/experiment/procedure/update-plate-type", {
        plate_type: plateType,
        current_procedure: currentProcedure
      });
    } catch (error) {
      console.error("Error updating procedure plate type:", error);
    }
  };

  const applyKitToExperiment = async () => {
    if (!kitData) {
      showError("No kit data available");
      return;
    }
    
    const backendPosition = convertVisualPositionsToBackendFormat();
    if (!backendPosition) {
      showError("Please select a position for your kit");
      return;
    }

    setApplying(true);
    try {
      await axios.post("/api/experiment/kit/apply", {
        materials: kitData.materials,
        design: kitData.design,
        position: backendPosition,
        kit_size: kitSize,
        destination_plate: destinationPlateType
      });

      await updateProcedurePlateType(destinationPlateType);
      showSuccess("Kit successfully applied to experiment!");
      onApplyKit();
      
    } catch (error) {
      console.error("Error applying kit:", error);
      showError("Error applying kit: " + (error.response?.data?.error || error.message));
    } finally {
      setApplying(false);
    }
  };

  const renderDestinationPlateSelector = () => {
    if (!kitSize) return null;
    
    const { rows: kitRows, columns: kitCols } = kitSize;
    const kitType = getKitType(kitRows, kitCols);
    const validPlates = getValidPlatesForKit(kitType);
    
    return (
      <div style={{ marginBottom: "25px" }}>
        <h4>Select Destination Plate:</h4>
        <div style={{ display: "flex", gap: "15px", marginTop: "10px", justifyContent: "center" }}>
          {["24", "48", "96"].map(plateType => {
            const isValid = validPlates.includes(plateType);
            const plateConfig = getPlateConfig(plateType);
            
            return (
              <button
                key={plateType}
                className={`btn ${destinationPlateType === plateType ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => {
                  if (isValid) {
                    setDestinationPlateType(plateType);
                    setSelectedVisualPositions([]);
                  }
                }}
                disabled={!isValid}
                style={{ 
                  fontSize: "14px", 
                  padding: "10px 15px",
                  opacity: isValid ? 1 : 0.5,
                  cursor: isValid ? "pointer" : "not-allowed"
                }}
                title={isValid ? 
                  `${plateConfig.name} (${plateConfig.rows}×${plateConfig.cols})` : 
                  `Kit not compatible with ${plateConfig.name}`
                }
              >
                {plateConfig.name}
                <br />
                <small style={{ fontSize: "10px" }}>
                  {plateConfig.rows}×{plateConfig.cols}
                </small>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQuadrantSelection = (options) => {
    return (
      <div>
        <h4>Select Position(s) for Your Kit:</h4>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "15px" }}>
          Click on one or more positions to place your 4×6 kit. Multiple selections allowed.
        </p>
        
        <div style={{ 
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "15px",
          maxWidth: "500px",
          margin: "0 auto 20px",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "var(--color-surface)"
        }}>
          {options.map(option => {
            const isSelected = selectedVisualPositions.includes(option.id);
            
            return (
              <div
                key={option.id}
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
                onClick={() => toggleVisualPosition(option.id)}
              >
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>{option.name}</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "5px" }}>
                  {option.description}
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
          Selected: {selectedVisualPositions.length} position{selectedVisualPositions.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  };

  const renderRowPairSelection = (options) => {
    return (
      <div>
        <h4>Select Row Pair(s) for Your Kit:</h4>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "15px" }}>
          Click on one or more row pairs to place your 2×12 kit. Multiple selections allowed.
        </p>
        
        <div style={{ 
          maxWidth: "500px", 
          margin: "0 auto 20px",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "var(--color-surface)"
        }}>
          {options.map(option => {
            const isSelected = selectedVisualPositions.includes(option.id);
            
            return (
              <div
                key={option.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: isSelected ? "3px solid var(--color-primary)" : "2px solid var(--color-border)",
                  borderRadius: "6px",
                  padding: "15px",
                  marginBottom: "10px",
                  backgroundColor: isSelected ? "var(--color-primary-light)" : "var(--color-background)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onClick={() => toggleVisualPosition(option.id)}
              >
                <div>
                  <div style={{ 
                    fontWeight: "bold", 
                    fontSize: "16px",
                    color: isSelected ? "var(--color-primary)" : "var(--color-text)"
                  }}>
                    {option.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                    {option.description}
                  </div>
                </div>
                
                {/* Visual representation of 2 rows × 12 columns */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginRight: "15px" }}>
                  {[0, 1].map(row => (
                    <div key={row} style={{ display: "flex", gap: "2px" }}>
                      {Array.from({length: 12}, (_, col) => (
                        <div
                          key={col}
                          style={{
                            width: "15px",
                            height: "12px",
                            border: "1px solid var(--color-border)",
                            borderRadius: "2px",
                            backgroundColor: isSelected ? "var(--color-primary)" : "var(--color-background)",
                            opacity: isSelected ? 1 : 0.4
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                
                {isSelected && (
                  <div style={{
                    color: "var(--color-primary)",
                    fontWeight: "bold",
                    fontSize: "18px"
                  }}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div style={{ textAlign: "center", fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Selected: {selectedVisualPositions.length} row pair{selectedVisualPositions.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  };

  const renderHalfSelection = (options) => {
    return (
      <div>
        <h4>Select Half for Your Kit:</h4>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "15px" }}>
          Select upper or lower half of the 96-well plate for your 4×12 kit.
        </p>
        
        <div style={{ 
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          maxWidth: "500px",
          margin: "0 auto 20px",
          border: "2px solid var(--color-border)",
          borderRadius: "8px",
          padding: "15px",
          backgroundColor: "var(--color-surface)"
        }}>
          {options.map(option => {
            const isSelected = selectedVisualPositions.includes(option.id);
            
            return (
              <div
                key={option.id}
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
                onClick={() => setSelectedVisualPositions([option.id])}
              >
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>{option.name}</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "5px" }}>
                  {option.description}
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
      </div>
    );
  };

  const renderPositionSelection = () => {
    if (!kitSize || !destinationPlateType) return null;

    const { rows: kitRows, columns: kitCols } = kitSize;
    const kitType = getKitType(kitRows, kitCols);
    const positionInfo = getPositionOptions(kitType, destinationPlateType);

    if (positionInfo.strategy === 'exact_match') {
      return (
        <div style={{ textAlign: "center" }}>
          <h4>Kit Placement:</h4>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
            Kit fills entire plate - no position selection needed.
          </p>
        </div>
      );
    }

    if (positionInfo.strategy === 'unsupported') {
      return (
        <div style={{ textAlign: "center" }}>
          <h4>Kit Not Supported:</h4>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
            This kit type ({kitRows}×{kitCols}) is not supported.
          </p>
        </div>
      );
    }

    switch (positionInfo.strategy) {
      case 'quadrant_selection':
        return renderQuadrantSelection(positionInfo.options);
      case 'row_pair_selection':
        return renderRowPairSelection(positionInfo.options);
      case 'half_selection':
        return renderHalfSelection(positionInfo.options);
      default:
        return null;
    }
  };

  // ESC key support for closing modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && visible) {
        onCancel();
      }
    };
    
    if (visible) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [visible, onCancel]);

  if (!visible || !kitSize || !kitData) return null;

  const { rows: kitRows, columns: kitCols } = kitSize;
  const kitType = getKitType(kitRows, kitCols);
  const positionInfo = getPositionOptions(kitType, destinationPlateType);
  const needsSelection = positionInfo.strategy !== 'exact_match' && positionInfo.strategy !== 'unsupported';

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "900px", width: "90%", minHeight: "600px" }}>
        <div className="modal-header">
          <h3>Position Kit on Plate</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: "20px" }}>
            <h4>Kit Details:</h4>
            <p><strong>Kit Size:</strong> {kitRows} rows × {kitCols} columns ({kitSize.total_wells} wells)</p>
            <p><strong>Kit Type:</strong> {kitType.replace('_', ' ').replace('well', '-well')}</p>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            {renderDestinationPlateSelector()}
            {renderPositionSelection()}
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-success"
            onClick={applyKitToExperiment}
            disabled={applying || (needsSelection && selectedVisualPositions.length === 0)}
          >
            {applying ? "Applying..." : "Apply Kit to Experiment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KitPositioning;