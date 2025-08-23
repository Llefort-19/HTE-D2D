import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const Heatmap = () => {
  const [analyticalData, setAnalyticalData] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [formula, setFormula] = useState("");
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmaps, setHeatmaps] = useState([]);
  const [areaColumns, setAreaColumns] = useState([]);
  const [formulaBuilder, setFormulaBuilder] = useState({
    numerator: [],
    denominator: [],
    asPercentage: false
  });
  const [colorScheme, setColorScheme] = useState("blue"); // blue, blue-yellow-red, green-blue, purple-green-yellow
  const [heatmapColorSchemes, setHeatmapColorSchemes] = useState({});
  const [valueFilter, setValueFilter] = useState("all"); // all, best5, worst5
  const [heatmapValueFilters, setHeatmapValueFilters] = useState({});

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadAnalyticalData();
    loadHeatmapData();
    
    // Listen for help events from header
    const handleHelpEvent = (event) => {
      if (event.detail.tabId === 'heatmap') {
        setShowHelpModal(true);
      }
    };
    
    window.addEventListener('showHelp', handleHelpEvent);
    
    return () => {
      window.removeEventListener('showHelp', handleHelpEvent);
    };
  }, []);

  useEffect(() => {
    if (analyticalData && analyticalData.area_columns) {
      setAreaColumns(analyticalData.area_columns);
    }
  }, [analyticalData]);

  const loadAnalyticalData = async () => {
    try {
      const response = await axios.get("/api/experiment/analytical");
      const data = response.data || {};
      
      // Get the most recent uploaded file data
      if (data.uploadedFiles && data.uploadedFiles.length > 0) {
        // Get the most recent upload (last in the array)
        const mostRecentUpload = data.uploadedFiles[data.uploadedFiles.length - 1];
        setAnalyticalData(mostRecentUpload);
      } else if (data.currentUpload) {
        // Fallback for old format
        setAnalyticalData(data.currentUpload);
      }
    } catch (error) {
      console.error("Error loading analytical data:", error);
    }
  };

  const loadHeatmapData = async () => {
    try {
      const response = await axios.get("/api/experiment/heatmap");
      const data = response.data || {};
      
      if (data.heatmaps && Array.isArray(data.heatmaps)) {
        setHeatmaps(data.heatmaps);
        if (data.heatmaps.length > 0) {
          setHeatmapData(data.heatmaps[data.heatmaps.length - 1]); // Set current to last one
        }
        // Load color schemes and value filters if available
        if (data.heatmapColorSchemes) {
          setHeatmapColorSchemes(data.heatmapColorSchemes);
        }
        if (data.heatmapValueFilters) {
          setHeatmapValueFilters(data.heatmapValueFilters);
        }
      } else if (data.data && data.formula && data.min !== undefined && data.max !== undefined) {
        // Legacy single heatmap format
        const legacyHeatmap = data;
        setHeatmapData(legacyHeatmap);
        setHeatmaps([legacyHeatmap]);
        setFormula(data.formula);
        
        // Also restore the formula builder state if available
        if (data.formulaBuilder) {
          setFormulaBuilder(data.formulaBuilder);
        }
      }
    } catch (error) {
      console.error("Error loading heatmap data:", error);
    }
  };

  const saveHeatmapData = async (heatmapDataToSave) => {
    try {
      const newHeatmap = {
        ...heatmapDataToSave,
        formulaBuilder: formulaBuilder,
        timestamp: new Date().toISOString(),
        id: Date.now() // Unique identifier for each heatmap
      };
      
      const updatedHeatmaps = [...heatmaps, newHeatmap];
      setHeatmaps(updatedHeatmaps);
      
      const dataToSave = {
        heatmaps: updatedHeatmaps,
        heatmapColorSchemes: heatmapColorSchemes,
        heatmapValueFilters: heatmapValueFilters
      };
      
      await axios.post("/api/experiment/heatmap", dataToSave);
    } catch (error) {
      console.error("Error saving heatmap data:", error);
    }
  };

  const clearHeatmapData = async () => {
    try {
      await axios.post("/api/experiment/heatmap", {});
      setHeatmapData(null);
      setHeatmaps([]);
      setFormula("");
      setFormulaBuilder({
        numerator: [],
        denominator: [],
        asPercentage: false
      });
    } catch (error) {
      console.error("Error clearing heatmap data:", error);
    }
  };

  const removeHeatmap = async (heatmapId) => {
    try {
      const updatedHeatmaps = heatmaps.filter(heatmap => heatmap.id !== heatmapId);
      setHeatmaps(updatedHeatmaps);
      
      if (updatedHeatmaps.length > 0) {
        setHeatmapData(updatedHeatmaps[updatedHeatmaps.length - 1]); // Set current to last one
      } else {
        setHeatmapData(null);
      }
      
      const dataToSave = {
        heatmaps: updatedHeatmaps,
        heatmapColorSchemes: heatmapColorSchemes,
        heatmapValueFilters: heatmapValueFilters
      };
      
      await axios.post("/api/experiment/heatmap", dataToSave);
      showSuccess("Heatmap removed successfully!");
    } catch (error) {
      console.error("Error removing heatmap:", error);
      showError("Error removing heatmap");
    }
  };

  const updateHeatmapTitle = async (heatmapIndex, newTitle) => {
    try {
      const updatedHeatmaps = heatmaps.map((heatmap, index) => 
        index === heatmapIndex ? { ...heatmap, title: newTitle } : heatmap
      );
      setHeatmaps(updatedHeatmaps);
      
      const dataToSave = {
        heatmaps: updatedHeatmaps,
        heatmapColorSchemes: heatmapColorSchemes,
        heatmapValueFilters: heatmapValueFilters
      };
      
      await axios.post("/api/experiment/heatmap", dataToSave);
    } catch (error) {
      console.error("Error updating heatmap title:", error);
      showError("Error updating heatmap title");
    }
  };

  const updateHeatmapColorScheme = async (heatmapId, newColorScheme) => {
    const updatedColorSchemes = {
      ...heatmapColorSchemes,
      [heatmapId]: newColorScheme
    };
    setHeatmapColorSchemes(updatedColorSchemes);
    
    // Save to backend
    try {
      const dataToSave = {
        heatmaps: heatmaps,
        heatmapColorSchemes: updatedColorSchemes,
        heatmapValueFilters: heatmapValueFilters
      };
      await axios.post("/api/experiment/heatmap", dataToSave);
    } catch (error) {
      console.error("Error saving color scheme:", error);
    }
  };

  const updateHeatmapValueFilter = async (heatmapId, newValueFilter) => {
    const updatedValueFilters = {
      ...heatmapValueFilters,
      [heatmapId]: newValueFilter
    };
    setHeatmapValueFilters(updatedValueFilters);
    
    // Save to backend
    try {
      const dataToSave = {
        heatmaps: heatmaps,
        heatmapColorSchemes: heatmapColorSchemes,
        heatmapValueFilters: updatedValueFilters
      };
      await axios.post("/api/experiment/heatmap", dataToSave);
    } catch (error) {
      console.error("Error saving value filter:", error);
    }
  };

  const evaluateFormula = (formula, rowData) => {
    try {
      // Create a safe evaluation context with the row data
      const context = { ...rowData };
      
      // Replace common mathematical functions
      let safeFormula = formula
        .replace(/\bMath\./g, '')
        .replace(/\bparseFloat\b/g, 'Number')
        .replace(/\bparseInt\b/g, 'Number');
      
      // Create a function that evaluates the formula safely using a single parameter
      // This avoids issues with invalid JavaScript identifiers in column names
      const evalFunction = new Function('data', `return ${safeFormula}`);
      
      const result = evalFunction(context);
      return isNaN(result) || !isFinite(result) ? 0 : result;
    } catch (error) {
      console.error("Formula evaluation error:", error);
      return 0;
    }
  };

  const buildFormula = () => {
    const { numerator, denominator, asPercentage } = formulaBuilder;
    
    if (!numerator || !Array.isArray(numerator) || numerator.length === 0) {
      showError("Please select at least one numerator column");
      return;
    }

    // Build numerator expression (sum of selected columns)
    const numeratorExpr = numerator.length === 1 
      ? `data['${numerator[0]}']` 
      : `(${numerator.map(col => `data['${col}']`).join(' + ')})`;
    
    let finalFormula;
    
    if (!denominator || !Array.isArray(denominator) || denominator.length === 0) {
      // Simple value (no denominator)
      finalFormula = numeratorExpr;
    } else {
      // Ratio calculation (numerator / denominator)
      const denominatorExpr = denominator.length === 1 
        ? `data['${denominator[0]}']` 
        : `(${denominator.map(col => `data['${col}']`).join(' + ')})`;
      
      finalFormula = `${numeratorExpr} / ${denominatorExpr}`;
    }
    
    // Apply percentage if requested
    if (asPercentage) {
      finalFormula = `(${finalFormula}) * 100`;
    }
    
    setFormula(finalFormula);
    return finalFormula;
  };

  const generateHeatmap = () => {
    if (!analyticalData) {
      showError("Please upload analytical data first");
      return;
    }

    const finalFormula = buildFormula();
    if (!finalFormula) return;

    try {
      const heatmap = Array(8).fill().map(() => Array(12).fill(0));
      const values = [];

      // Check if there's a well identifier column
      const wellColumn = analyticalData.columns.find(col => 
        col.toLowerCase().includes('well') || 
        col.toLowerCase().includes('position') || 
        col.toLowerCase().includes('location')
      );

      // Calculate values for each well
      analyticalData.data.forEach((row, index) => {
        const value = evaluateFormula(finalFormula, row);
        values.push(value);
        
        let rowIndex, colIndex;
        
        if (wellColumn && row[wellColumn]) {
          const wellValue = row[wellColumn].toString().trim();
          
          // Parse well identifier (e.g., "A1", "B12", etc.)
          const wellMatch = wellValue.match(/^([A-H])(\d{1,2})$/);
          if (wellMatch) {
            const rowLetter = wellMatch[1];
            const colNumber = parseInt(wellMatch[2]);
            rowIndex = 'ABCDEFGH'.indexOf(rowLetter);
            colIndex = colNumber - 1; // Convert to 0-based index
          } else {
            // Try alternative formats
            const altMatch = wellValue.match(/^([A-H])\s*(\d{1,2})$/);
            if (altMatch) {
              const rowLetter = altMatch[1];
              const colNumber = parseInt(altMatch[2]);
              rowIndex = 'ABCDEFGH'.indexOf(rowLetter);
              colIndex = colNumber - 1;
            } else {
              // Fallback to sequential mapping
              rowIndex = Math.floor(index / 12);
              colIndex = index % 12;
            }
          }
        } else {
          // No well column found, use sequential mapping
          rowIndex = Math.floor(index / 12);
          colIndex = index % 12;
        }
        
        if (rowIndex >= 0 && rowIndex < 8 && colIndex >= 0 && colIndex < 12) {
          heatmap[rowIndex][colIndex] = value;
        }
      });

      // Find min and max for normalization
      const nonZeroValues = values.filter(v => v !== 0);
      if (nonZeroValues.length === 0) {
        showError("No valid values found. Check your formula and data.");
        return;
      }
      
      const min = Math.min(...nonZeroValues);
      const max = Math.max(...nonZeroValues);
      
      console.log("Final heatmap data structure:", heatmap);
      console.log("Heatmap dimensions:", heatmap.length, "rows x", heatmap[0]?.length, "columns");
      
      const newHeatmapData = {
        data: heatmap,
        min,
        max,
        formula: finalFormula
      };
      
      setHeatmapData(newHeatmapData);
      saveHeatmapData(newHeatmapData);

      showSuccess("Heatmap generated successfully!");
    } catch (error) {
      showError("Error generating heatmap: " + error.message);
    }
  };

  const getHeatmapColor = (value, min, max, colorSchemeToUse = colorScheme) => {
    if (value === 0 || min === max) return 'var(--color-well-empty)';
    
    const normalized = (value - min) / (max - min);
    const intensity = Math.floor(normalized * 255);
    
    switch (colorSchemeToUse) {
             case 'blue-yellow-red':
         // #2c7bb6 → #abd9e9 → #ffffbf → #fdae61 → #d7191c
         if (normalized <= 0.25) {
           // #2c7bb6 to #abd9e9 (0-25%)
           const t = normalized / 0.25;
           return `rgb(${Math.round(44 + (171 - 44) * t)}, ${Math.round(123 + (217 - 123) * t)}, ${Math.round(182 + (233 - 182) * t)})`;
         } else if (normalized <= 0.5) {
           // #abd9e9 to #ffffbf (25-50%)
           const t = (normalized - 0.25) / 0.25;
           return `rgb(${Math.round(171 + (255 - 171) * t)}, ${Math.round(217 + (255 - 217) * t)}, ${Math.round(233 + (191 - 233) * t)})`;
         } else if (normalized <= 0.75) {
           // #ffffbf to #fdae61 (50-75%)
           const t = (normalized - 0.5) / 0.25;
           return `rgb(${Math.round(255 + (253 - 255) * t)}, ${Math.round(255 + (174 - 255) * t)}, ${Math.round(191 + (97 - 191) * t)})`;
         } else {
           // #fdae61 to #d7191c (75-100%)
           const t = (normalized - 0.75) / 0.25;
           return `rgb(${Math.round(253 + (215 - 253) * t)}, ${Math.round(174 + (25 - 174) * t)}, ${Math.round(97 + (28 - 97) * t)})`;
         }
             case 'green-blue':
         // #ffffd9 → #edf8b1 → #c7e9b4 → #7fcdbb → #41b6c4
         if (normalized <= 0.25) {
           // #ffffd9 to #edf8b1 (0-25%)
           const t = normalized / 0.25;
           return `rgb(${Math.round(255 + (237 - 255) * t)}, ${Math.round(255 + (248 - 255) * t)}, ${Math.round(217 + (177 - 217) * t)})`;
         } else if (normalized <= 0.5) {
           // #edf8b1 to #c7e9b4 (25-50%)
           const t = (normalized - 0.25) / 0.25;
           return `rgb(${Math.round(237 + (199 - 237) * t)}, ${Math.round(248 + (233 - 248) * t)}, ${Math.round(177 + (180 - 177) * t)})`;
         } else if (normalized <= 0.75) {
           // #c7e9b4 to #7fcdbb (50-75%)
           const t = (normalized - 0.5) / 0.25;
           return `rgb(${Math.round(199 + (127 - 199) * t)}, ${Math.round(233 + (205 - 233) * t)}, ${Math.round(180 + (187 - 180) * t)})`;
         } else {
           // #7fcdbb to #41b6c4 (75-100%)
           const t = (normalized - 0.75) / 0.25;
           return `rgb(${Math.round(127 + (65 - 127) * t)}, ${Math.round(205 + (182 - 205) * t)}, ${Math.round(187 + (196 - 187) * t)})`;
         }
             case 'purple-green-yellow':
         // #440154 → #3b528b → #21918c → #5ec962 → #fde725
         if (normalized <= 0.25) {
           // #440154 to #3b528b (0-25%)
           const t = normalized / 0.25;
           return `rgb(${Math.round(68 + (59 - 68) * t)}, ${Math.round(1 + (82 - 1) * t)}, ${Math.round(84 + (139 - 84) * t)})`;
         } else if (normalized <= 0.5) {
           // #3b528b to #21918c (25-50%)
           const t = (normalized - 0.25) / 0.25;
           return `rgb(${Math.round(59 + (33 - 59) * t)}, ${Math.round(82 + (145 - 82) * t)}, ${Math.round(139 + (140 - 139) * t)})`;
         } else if (normalized <= 0.75) {
           // #21918c to #5ec962 (50-75%)
           const t = (normalized - 0.5) / 0.25;
           return `rgb(${Math.round(33 + (94 - 33) * t)}, ${Math.round(145 + (201 - 145) * t)}, ${Math.round(140 + (98 - 140) * t)})`;
         } else {
           // #5ec962 to #fde725 (75-100%)
           const t = (normalized - 0.75) / 0.25;
           return `rgb(${Math.round(94 + (253 - 94) * t)}, ${Math.round(201 + (231 - 201) * t)}, ${Math.round(98 + (37 - 98) * t)})`;
         }
      case 'blue':
      default:
        return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
    }
  };

  const getCellStyle = (value, min, max, colorSchemeToUse = colorScheme) => {
    const backgroundColor = getHeatmapColor(value, min, max, colorSchemeToUse);
    
    // Determine text color based on background brightness
    let textColor = 'var(--color-text-primary)'; // Default black
    if (backgroundColor !== 'var(--color-well-empty)') { // Not white/empty cell
      // Extract RGB values and calculate brightness
      const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        
        // Use a more robust brightness calculation
        const brightness = Math.round((r * 299 + g * 587 + b * 114) / 1000);
        
        // Use white text for darker backgrounds (brightness < 120) - balanced contrast
        if (brightness < 120) {
          textColor = 'var(--color-surface)';
        }
      }
    }
    
    return {
      backgroundColor: backgroundColor,
      color: textColor,
      border: '1px solid #dee2e6',
      padding: '8px',
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: value > 0 ? 'bold' : 'normal',
      minWidth: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  };

  const handleFormulaBuilderChange = (field, value) => {
    setFormulaBuilder(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getCompoundName = (areaColumn) => {
    if (!analyticalData || !analyticalData.columns) return areaColumn;
    
    // Extract the compound number from the area column (e.g., "Area_1" -> "1")
    const match = areaColumn.match(/Area_(\d+)/);
    if (!match) {
      return areaColumn;
    }
    
    const compoundNumber = match[1];
    const nameColumn = `Name_${compoundNumber}`;
    
    // Find the compound name from the first row of data
    if (analyticalData.data && analyticalData.data.length > 0) {
      const firstRow = analyticalData.data[0];
      return firstRow[nameColumn] || areaColumn;
    }
    
    return areaColumn;
  };

  const handleColumnSelection = (field, column, checked) => {
    setFormulaBuilder(prev => {
      const currentArray = prev[field] || [];
      let newArray;
      
      if (checked) {
        // Add column if not already present
        newArray = currentArray.includes(column) ? currentArray : [...currentArray, column];
      } else {
        // Remove column
        newArray = currentArray.filter(col => col !== column);
      }
      
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const cols = Array.from({length: 12}, (_, i) => i + 1);

  // Get filtered values for highlighting
  const getFilteredValues = (heatmapData, valueFilterToUse = valueFilter) => {
    if (!heatmapData || valueFilterToUse === 'all') return new Set();
    
    const allValues = [];
    heatmapData.data.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (value > 0) {
          allValues.push({ value, rowIndex, colIndex });
        }
      });
    });
    
    if (valueFilterToUse === 'best5') {
      return new Set(
        allValues
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
          .map(item => `${item.rowIndex}-${item.colIndex}`)
      );
    } else if (valueFilterToUse === 'worst5') {
      return new Set(
        allValues
          .sort((a, b) => a.value - b.value)
          .slice(0, 5)
          .map(item => `${item.rowIndex}-${item.colIndex}`)
      );
    }
    
    return new Set();
  };

  return (
    <div className="card">
      <h2>Heatmap Visualization</h2>

      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <h4>Formula Builder</h4>
            
                         {!analyticalData ? (
               <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
                 <p>No analytical data available.</p>
                 <p>Upload a file in the Analytical Data tab first.</p>
               </div>
             ) : (
               <>
                 <div className="row" style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -15px' }}>
                   <div className="col-lg-4 col-md-6" style={{ padding: '0 15px', flex: '0 0 33.333%', maxWidth: '33.333%' }}>
                     <div className="form-group">
                       <label>Numerator Columns:</label>
                       <div style={{ 
                         maxHeight: '150px', 
                         overflowY: 'auto', 
                         border: '1px solid var(--color-border)', 
                         padding: '10px', 
                         backgroundColor: 'var(--color-well-empty)',
                         borderRadius: '4px'
                       }}>
                                                   {areaColumns.length > 0 ? (
                            areaColumns.map((col, index) => (
                              <div key={index} className="form-check" style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id={`numerator-${index}`}
                                  checked={Array.isArray(formulaBuilder.numerator) && formulaBuilder.numerator.includes(col)}
                                  onChange={(e) => handleColumnSelection('numerator', col, e.target.checked)}
                                  style={{ marginRight: '8px', marginTop: '0' }}
                                />
                                <label className="form-check-label" htmlFor={`numerator-${index}`} title={col} style={{ marginBottom: '0', cursor: 'pointer' }}>
                                  {getCompoundName(col)}
                                </label>
                              </div>
                            ))
                          ) : (
                            <p style={{ margin: 0, color: '#666' }}>No area columns found</p>
                          )}
                       </div>
                     </div>
                   </div>

                   <div className="col-lg-4 col-md-6" style={{ padding: '0 15px', flex: '0 0 33.333%', maxWidth: '33.333%' }}>
                     <div className="form-group">
                       <label>Denominator Columns (optional):</label>
                       <div style={{ 
                         maxHeight: '150px', 
                         overflowY: 'auto', 
                         border: '1px solid var(--color-border)', 
                         padding: '10px', 
                         backgroundColor: 'var(--color-well-empty)',
                         borderRadius: '4px'
                       }}>
                                                   {areaColumns.length > 0 ? (
                            areaColumns.map((col, index) => (
                              <div key={index} className="form-check" style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id={`denominator-${index}`}
                                  checked={Array.isArray(formulaBuilder.denominator) && formulaBuilder.denominator.includes(col)}
                                  onChange={(e) => handleColumnSelection('denominator', col, e.target.checked)}
                                  style={{ marginRight: '8px', marginTop: '0' }}
                                />
                                <label className="form-check-label" htmlFor={`denominator-${index}`} title={col} style={{ marginBottom: '0', cursor: 'pointer' }}>
                                  {getCompoundName(col)}
                                </label>
                              </div>
                            ))
                          ) : (
                            <p style={{ margin: 0, color: '#666' }}>No area columns found</p>
                          )}
                       </div>
                     </div>
                   </div>

                   <div className="col-lg-4 col-md-12" style={{ padding: '0 15px', flex: '0 0 33.333%', maxWidth: '33.333%' }}>
                     <div className="form-group">
                       <label>Generated Formula:</label>
                       <div style={{ 
                         border: '1px solid var(--color-border)', 
                         padding: '15px', 
                         backgroundColor: 'var(--color-well-empty)',
                         borderRadius: '4px',
                         minHeight: '150px',
                         display: 'flex',
                         flexDirection: 'column',
                         justifyContent: 'center',
                         alignItems: 'center'
                       }}>
                                                   {formulaBuilder.numerator && Array.isArray(formulaBuilder.numerator) && formulaBuilder.numerator.length > 0 ? (
                            <div style={{ textAlign: 'center' }}>
                              {formulaBuilder.denominator && Array.isArray(formulaBuilder.denominator) && formulaBuilder.denominator.length > 0 ? (
                                // Fraction display
                                <div>
                                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                                    {formulaBuilder.numerator.length === 1 
                                      ? getCompoundName(formulaBuilder.numerator[0]) 
                                      : `(${formulaBuilder.numerator.map(col => getCompoundName(col)).join(' + ')})`}
                                  </div>
                                  <hr style={{ margin: '5px 0', border: '1px solid var(--color-text-muted)' }} />
                                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                                    {formulaBuilder.denominator.length === 1 
                                      ? getCompoundName(formulaBuilder.denominator[0]) 
                                      : `(${formulaBuilder.denominator.map(col => getCompoundName(col)).join(' + ')})`}
                                  </div>
                                </div>
                              ) : (
                                // Simple value display
                                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                                  {formulaBuilder.numerator.length === 1 
                                    ? getCompoundName(formulaBuilder.numerator[0]) 
                                    : `(${formulaBuilder.numerator.map(col => getCompoundName(col)).join(' + ')})`}
                                </div>
                              )}
                             
                             {formulaBuilder.asPercentage && (
                               <div style={{ 
                                 display: 'flex', 
                                 alignItems: 'center', 
                                 justifyContent: 'center',
                                 marginTop: '10px',
                                 padding: '5px 10px',
                                 border: '1px solid var(--color-info)',
                                 borderRadius: '4px',
                                 backgroundColor: 'var(--color-info-light)'
                               }}>
                                 <span style={{ marginRight: '5px' }}>×</span>
                                 <span style={{ 
                                   border: '1px solid #007bff', 
                                   padding: '2px 6px', 
                                   borderRadius: '3px',
                                   backgroundColor: 'white',
                                   fontWeight: 'bold'
                                 }}>100</span>
                               </div>
                             )}
                           </div>
                         ) : (
                           <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                             Select numerator columns to see formula
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>

                 <div className="row mt-3">
                   <div className="col-md-8">
                     <div className="form-group">
                                               <div className="form-check" style={{ display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="asPercentage"
                            checked={formulaBuilder.asPercentage}
                            onChange={(e) => handleFormulaBuilderChange('asPercentage', e.target.checked)}
                            style={{ marginRight: '8px', marginTop: '0' }}
                          />
                          <label className="form-check-label" htmlFor="asPercentage" style={{ marginBottom: '0', cursor: 'pointer' }}>
                            Express result as percentage (multiply by 100)
                          </label>
                        </div>
                     </div>
                   </div>
                   
                   <div className="col-md-4">
                     <div className="d-flex gap-2">
                       <button 
                         className="btn btn-primary" 
                         onClick={generateHeatmap}
                         disabled={!formulaBuilder.numerator || !Array.isArray(formulaBuilder.numerator) || formulaBuilder.numerator.length === 0}
                         style={{ backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
                       >
                         Generate Heatmap
                       </button>
                       {heatmapData && (
                         <button 
                           className="btn btn-outline-secondary" 
                           onClick={clearHeatmapData}
                         >
                           Clear Heatmap
                         </button>
                       )}
                     </div>
                   </div>
                 </div>

                 
               </>
             )}
          </div>
        </div>

                                   <div className="col-md-12">
            <div className="card">

              {heatmaps.length > 0 ? (
                <div>
                  {heatmaps.map((heatmap, index) => (
                    <div key={heatmap.id || index} style={{ marginBottom: '30px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'baseline', 
                        marginBottom: '15px', 
                        gap: '15px', 
                        paddingLeft: '0',
                        justifyContent: 'flex-start',
                        width: 'fit-content',
                        marginLeft: '0',
                        paddingLeft: '40px'
                      }}>
                        <h4 style={{ 
                          margin: 0, 
                          color: 'var(--color-heading)', 
                          fontSize: '20px', 
                          fontWeight: 'bold', 
                          paddingLeft: '0',
                          marginLeft: '0',
                          lineHeight: '1'
                        }}>
                          Heatmap #{index + 1}
                        </h4>
                        <div style={{ width: '300px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter heatmap title..."
                            value={heatmap.title || ''}
                            onChange={(e) => updateHeatmapTitle(index, e.target.value)}
                            style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold',
                              border: 'none',
                              borderBottom: '2px solid var(--color-primary)',
                              borderRadius: '0',
                              padding: '5px 0',
                              backgroundColor: 'transparent',
                              lineHeight: '1'
                            }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ flex: 1, overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                          <table className="heatmap-table" style={{ 
                            borderCollapse: 'collapse', 
                            margin: '0 auto',
                            tableLayout: 'fixed',
                            width: 'auto',
                            minWidth: '600px'
                          }}>
                            <thead>
                              <tr>
                                <th style={{ padding: '8px', fontSize: '12px', width: '30px' }}></th>
                                {cols.map(col => (
                                  <th key={col} style={{ 
                                    padding: '8px', 
                                    fontSize: '12px', 
                                    textAlign: 'center',
                                    width: '40px',
                                    border: '1px solid var(--color-border-dark)'
                                  }}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, rowIndex) => (
                                <tr key={row}>
                                  <td style={{ 
                                    padding: '8px', 
                                    fontSize: '12px', 
                                    fontWeight: 'bold',
                                    border: '1px solid var(--color-border-dark)'
                                  }}>{row}</td>
                                                                     {cols.map((col, colIndex) => {
                                     const value = heatmap.data[rowIndex][colIndex];
                                     const currentValueFilter = heatmapValueFilters[heatmap.id || index] || "all";
                                     const filteredValues = getFilteredValues(heatmap, currentValueFilter);
                                     const isHighlighted = filteredValues.has(`${rowIndex}-${colIndex}`);
                                     
                                     let displayValue = '';
                                     if (value > 0) {
                                       if (heatmap.formulaBuilder?.asPercentage) {
                                         displayValue = `${Math.round(value * 100)}%`;
                                       } else {
                                         // Format with 4 significant digits
                                         const num = parseFloat(value);
                                         if (num === 0) {
                                           displayValue = '0';
                                         } else if (Math.abs(num) < 1e-10) {
                                           displayValue = '0';
                                         } else {
                                           const formatted = num.toPrecision(4);
                                           displayValue = parseFloat(formatted).toString();
                                         }
                                       }
                                     }
                                     
                                     // Only show value if it's highlighted or if showing all values
                                     const shouldShowValue = currentValueFilter === 'all' || isHighlighted;
                                    
                                                                         return (
                                       <td key={col} style={{
                                         ...getCellStyle(value, heatmap.min, heatmap.max, heatmapColorSchemes[heatmap.id || index] || "blue"),
                                         border: '1px solid var(--color-border-dark)',
                                         width: '40px',
                                         height: '40px',
                                         position: 'relative'
                                       }}>
                                        {shouldShowValue ? displayValue : ''}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '10px', 
                          minWidth: '200px',
                          justifyContent: 'center',
                          height: '400px',
                          alignSelf: 'center'
                        }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label><strong>Formula:</strong></label>
                            <div style={{ 
                              padding: '12px', 
                              backgroundColor: 'var(--color-well-empty)', 
                              border: '1px solid var(--color-border-dark)',
                              borderRadius: '4px',
                              fontSize: '14px',
                              minHeight: '60px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center'
                            }}>
                              {heatmap.formulaBuilder?.numerator?.length > 0 ? (
                                <div style={{ textAlign: 'center' }}>
                                  {heatmap.formulaBuilder.numerator.map(col => getCompoundName(col)).join(' + ')}
                                  {heatmap.formulaBuilder.denominator?.length > 0 && (
                                    <>
                                      <br />
                                      <hr style={{ margin: '6px 0', border: '1px solid var(--color-border-dark)' }} />
                                      {heatmap.formulaBuilder.denominator.map(col => getCompoundName(col)).join(' + ')}
                                    </>
                                  )}
                                  {heatmap.formulaBuilder?.asPercentage && (
                                    <>
                                      <br />
                                      <span style={{ color: 'var(--color-info)', fontWeight: 'bold' }}>× 100%</span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>No formula</span>
                              )}
                            </div>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label><strong>Color Scheme:</strong></label>
                            <select 
                              className="form-control" 
                              value={heatmapColorSchemes[heatmap.id || index] || "blue"} 
                              onChange={(e) => updateHeatmapColorScheme(heatmap.id || index, e.target.value)}
                              style={{ width: '100%' }}
                            >
                              <option value="blue">Blue</option>
                              <option value="blue-yellow-red">Blue-Yellow-Red</option>
                              <option value="green-blue">Green-Blue</option>
                              <option value="purple-green-yellow">Purple-Green-Yellow</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label><strong>Value Filter:</strong></label>
                            <select 
                              className="form-control" 
                              value={heatmapValueFilters[heatmap.id || index] || "all"} 
                              onChange={(e) => updateHeatmapValueFilter(heatmap.id || index, e.target.value)}
                              style={{ width: '100%' }}
                            >
                              <option value="all">Show All Values</option>
                              <option value="best5">Show Top 5 Values</option>
                              <option value="worst5">Show Bottom 5 Values</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <button 
                              className="btn btn-outline-danger btn-sm" 
                              onClick={() => removeHeatmap(heatmap.id || index)}
                              style={{ width: '100%' }}
                            >
                              Remove Heatmap #{index + 1}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                  <p>No heatmaps generated yet.</p>
                  <p>Use the formula builder to create a calculation and generate heatmaps.</p>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px", width: "95%" }}>
            <div className="modal-header">
              <h3>Heatmap Help</h3>
              <button
                className="modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "left" }}>
              <h4>Heatmap Overview:</h4>
              <p>Visualize analytical results as 8x12 heatmaps with intuitive formula building.</p>
              
                             <h4>Features:</h4>
               <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                 <li>
                   <strong>Area Columns Only:</strong> Only numerical columns with "_area" in their names are available
                 </li>
                 <li>
                   <strong>Compound Names:</strong> Column names are automatically replaced with compound names from the data
                 </li>
                 <li>
                   <strong>Multi-Column Selection:</strong> Use checkboxes to select multiple columns for numerator and denominator
                 </li>
                 <li>
                   <strong>Percentage Option:</strong> Express results as percentages (multiply by 100)
                 </li>
                 <li>
                   <strong>Dynamic Grid:</strong> Visualize data in the same format as your well plate (8x12 for 96-well, 4x6 for 24-well)
                 </li>
                 <li>
                   <strong>Color Coding:</strong> Values are color-coded from light to dark based on magnitude
                 </li>
               </ul>
              
                             <h4>Formula Types:</h4>
               <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                 <li><strong>Simple Value:</strong> Select only numerator columns for direct values</li>
                 <li><strong>Ratio:</strong> Select both numerator and denominator columns for A / B calculations</li>
               </ul>
              
                             <h4>Workflow:</h4>
               <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                 <li>1. Upload analytical data in the Analytical Data tab</li>
                 <li>2. Navigate to this Heatmap tab</li>
                 <li>3. Use checkboxes to select numerator columns (required)</li>
                 <li>4. Optionally select denominator columns for ratio calculations</li>
                 <li>5. Optionally check "Express result as percentage"</li>
                 <li>6. Click "Generate Heatmap" to visualize results</li>
               </ul>
              
              <h4>Data Validation:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Only columns with "_area" in their names are available for calculations</li>
                <li>Area columns are validated during upload to ensure they contain only numerical data</li>
                <li>Invalid data will prevent file upload with clear error messages</li>
              </ul>
              
              <h4>Color Interpretation:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li><strong>White:</strong> Zero or no data</li>
                <li><strong>Light Colors:</strong> Low values</li>
                <li><strong>Dark Colors:</strong> High values</li>
                                 <li><strong>Color Schemes:</strong> Choose from Blue, Blue-Yellow-Red, Green-Blue, or Purple-Green-Yellow</li>
                <li><strong>Value Display:</strong> Percentages show as whole numbers (e.g., "85%"), other values show 2 decimal places</li>
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

export default Heatmap; 