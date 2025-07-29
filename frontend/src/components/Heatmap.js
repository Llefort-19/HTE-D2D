import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const Heatmap = () => {
  const [analyticalData, setAnalyticalData] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [formula, setFormula] = useState("");
  const [heatmapData, setHeatmapData] = useState(null);
  const [areaColumns, setAreaColumns] = useState([]);
  const [formulaBuilder, setFormulaBuilder] = useState({
    numerator: [],
    denominator: [],
    asPercentage: false
  });

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
      
      if (data.data && data.formula && data.min !== undefined && data.max !== undefined) {
        setHeatmapData(data);
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
      const dataToSave = {
        ...heatmapDataToSave,
        formulaBuilder: formulaBuilder,
        timestamp: new Date().toISOString()
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

  const getHeatmapColor = (value, min, max) => {
    if (value === 0 || min === max) return '#f8f9fa';
    
    const normalized = (value - min) / (max - min);
    const intensity = Math.floor(normalized * 255);
    return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
  };

  const getCellStyle = (value, min, max) => {
    return {
      backgroundColor: getHeatmapColor(value, min, max),
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

  return (
    <div className="card">
      <h2>Heatmap Visualization</h2>

      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <h4>Formula Builder</h4>
            
                         {!analyticalData ? (
               <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
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
                         border: '1px solid #ddd', 
                         padding: '10px', 
                         backgroundColor: '#f8f9fa',
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
                         border: '1px solid #ddd', 
                         padding: '10px', 
                         backgroundColor: '#f8f9fa',
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
                         border: '1px solid #ddd', 
                         padding: '15px', 
                         backgroundColor: '#f8f9fa',
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
                                  <hr style={{ margin: '5px 0', border: '1px solid #666' }} />
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
                                 border: '1px solid #007bff',
                                 borderRadius: '4px',
                                 backgroundColor: '#e7f3ff'
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
                           <div style={{ color: '#666', fontStyle: 'italic' }}>
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

                 <div className="mt-3">
                   <h5>Available Area Columns:</h5>
                   <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', backgroundColor: '#f8f9fa' }}>
                     {areaColumns.length > 0 ? (
                       areaColumns.map((col, index) => (
                         <span key={index} className="badge badge-info mr-1 mb-1" title={col}>
                           {getCompoundName(col)}
                         </span>
                       ))
                     ) : (
                       <p style={{ margin: 0, color: '#666' }}>No area columns found</p>
                     )}
                   </div>
                 </div>
               </>
             )}
          </div>
        </div>

        <div className="col-md-12">
          <div className="card">
            <h4>96-Well Plate Heatmap</h4>
                         {heatmapData ? (
               <div>
                 <div className="mb-2">
                   <strong>Formula:</strong> {heatmapData.formula}
                 </div>
                 <div className="mb-2">
                   <strong>Range:</strong> {heatmapData.min.toFixed(3)} - {heatmapData.max.toFixed(3)}
                 </div>
                 <div className="mb-2">
                   <strong>Debug:</strong> Rows: {rows.length}, Cols: {cols.length}, Data: {heatmapData.data.length}x{heatmapData.data[0]?.length}
                 </div>
                
                                 <div style={{ overflowX: 'auto' }}>
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
                            border: '1px solid #dee2e6'
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
                            border: '1px solid #dee2e6'
                          }}>{row}</td>
                          {cols.map((col, colIndex) => (
                            <td key={col} style={{
                              ...getCellStyle(heatmapData.data[rowIndex][colIndex], heatmapData.min, heatmapData.max),
                              border: '1px solid #dee2e6',
                              width: '40px',
                              height: '40px'
                            }}>
                              {heatmapData.data[rowIndex][colIndex] > 0 ? heatmapData.data[rowIndex][colIndex].toFixed(2) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>No heatmap generated yet.</p>
                <p>Use the formula builder to create a calculation and generate the heatmap.</p>
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
                   <strong>8x12 Grid:</strong> Visualize data in the same format as your 96-well plate
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
                <li><strong>Light Red:</strong> Low values</li>
                <li><strong>Dark Red:</strong> High values</li>
                <li><strong>Numbers:</strong> Actual calculated values displayed in each cell</li>
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