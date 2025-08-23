import React, { useState } from "react";
import { useToast } from "./ToastContext";
import axios from 'axios';

const Header = ({ activeTab, onTabChange, onReset, onShowHelp }) => {
  const { showSuccess, showError } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  const tabs = [
    { id: "context", label: "Experiment Context" },
    { id: "materials", label: "Materials" },
    { id: "procedure", label: "Design" },
    { id: "procedure-settings", label: "Procedure" },
    { id: "analytical", label: "Analytical Data" },
    { id: "results", label: "Results" },
    { id: "heatmap", label: "Heatmap" },
  ];

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset all experiment data? This action cannot be undone.")) {
      try {
        await onReset();
        showSuccess("Experiment data has been reset successfully!");
      } catch (error) {
        showError("Error resetting experiment data: " + error.message);
      }
    }
  };

  const handleHelp = () => {
    onShowHelp(activeTab);
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Import XLSX only when needed
      const XLSX = await import('xlsx');
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Export Experiment Context
      await exportExperimentContext(wb, XLSX);

      // Export Materials
      await exportMaterials(wb, XLSX);

      // Export Procedure (96-Well Plate)
      await exportProcedure(wb, XLSX);

      // Export Procedure Settings
      await exportProcedureSettings(wb, XLSX);

      // Export Analytical Data
      await exportAnalyticalData(wb, XLSX);

      // Export Heatmap Data
      await exportHeatmapData(wb, XLSX);

      // Add Summary Sheet
      await exportSummarySheet(wb, XLSX);

      // Generate filename based on ELN number or timestamp
      let filename;
      try {
        // Try to get ELN number from context
        const contextResponse = await axios.get('/api/experiment/context');
        const context = contextResponse.data;
        const elnNumber = context.eln;
        
        if (elnNumber && elnNumber.trim() !== '') {
          // Use ELN number + date (YYYY-MM-DD format)
          const dateOnly = new Date().toISOString().split('T')[0]; // Gets YYYY-MM-DD
          filename = `${elnNumber.trim()}_${dateOnly}.xlsx`;
        } else {
          // Fallback to original timestamp format
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          filename = `HTE_Experiment_${timestamp}.xlsx`;
        }
      } catch (error) {
        console.warn('Could not fetch ELN number, using timestamp:', error);
        // Fallback to original timestamp format
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        filename = `HTE_Experiment_${timestamp}.xlsx`;
      }

      // Save the workbook
      XLSX.writeFile(wb, filename);

      showSuccess('Excel file exported successfully! Check your downloads folder.');
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export Excel file: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportExperimentContext = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/context');
      const context = response.data;

      const data = [
        ['Experiment Context'],
        [''],
        ['Author', context.author || ''],
        ['Date', context.date || ''],
        ['Project', context.project || ''],
        ['ELN Number', context.eln || ''],
        ['Objective', context.objective || ''],
        [''],
        ['SDF Reaction Data'],
        ['Name', 'Role', 'SMILES']
      ];

      // Add SDF data if available
      const sdfData = localStorage.getItem('experimentSdfData');
      if (sdfData) {
        const parsedSdfData = JSON.parse(sdfData);
        if (parsedSdfData.molecules) {
          parsedSdfData.molecules.forEach((mol, index) => {
            data.push([
              mol.name || `ID-${String(index + 1).padStart(2, '0')}`,
              mol.role || '',
              mol.smiles || ''
            ]);
          });
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Experiment Context');
    } catch (error) {
      console.error('Error exporting context:', error);
    }
  };

  const exportMaterials = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/materials');
      const materials = response.data;

      if (materials && materials.length > 0) {
        const headers = [
          'Nr',
          'chemical_name',
          'alias',
          'cas_number',
          'molecular_weight',
          'smiles',
          'barcode',
          'role',
          'source',
          'supplier'
        ];

        const data = [headers];
        materials.forEach((material, index) => {
          data.push([
            index + 1,
            material.name || '',
            material.alias || '',
            material.cas || '',
            material.molecular_weight || '',
            material.smiles || '',
            material.barcode || '',
            material.role || '',
            material.source || '',
            material.supplier || ''
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Materials');
      } else {
        // Create empty sheet with headers
        const headers = [
          'Nr',
          'chemical_name',
          'alias',
          'cas_number',
          'molecular_weight',
          'smiles',
          'barcode',
          'role',
          'source',
          'supplier'
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        XLSX.utils.book_append_sheet(wb, ws, 'Materials');
      }
    } catch (error) {
      console.error('Error exporting materials:', error);
    }
  };

  // Helper function to create a unique identifier for materials (same as in Procedure.js)
  const getMaterialId = (material) => {
    return `${material.name || ''}_${material.alias || ''}_${material.cas || ''}`;
  };

  const exportProcedure = async (wb, XLSX) => {
    try {
      const [procedureRes, contextRes] = await Promise.all([
        axios.get('/api/experiment/procedure'),
        axios.get('/api/experiment/context')
      ]);
      
      const procedure = procedureRes.data;
      const context = contextRes.data;

      // Determine plate type based on existing wells
      let plateType = "96"; // default
      let rows, columns;
      
      if (procedure && procedure.length > 0) {
        // Check if we have wells beyond 24-well plate
        const maxRow = Math.max(...procedure.map(p => p.well.charAt(0).charCodeAt(0)));
        const maxCol = Math.max(...procedure.map(p => parseInt(p.well.slice(1))));
        
        if (maxRow <= 'D'.charCodeAt(0) && maxCol <= 6) {
          plateType = "24";
          rows = ['A', 'B', 'C', 'D'];
          columns = ['1', '2', '3', '4', '5', '6'];
        } else if (maxRow <= 'F'.charCodeAt(0) && maxCol <= 8) {
          plateType = "48";
          rows = ['A', 'B', 'C', 'D', 'E', 'F'];
          columns = ['1', '2', '3', '4', '5', '6', '7', '8'];
        } else {
          plateType = "96";
          rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
        }
      } else {
        // No procedure data, use 96-well as default
        rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      }

      // Generate all wells for the determined plate type
      const wells = [];
      for (let row of rows) {
        for (let col of columns) {
          wells.push(`${row}${col}`);
        }
      }

      // Collect all unique materials across all wells using unique identifiers
      const allMaterials = new Map(); // Use Map to store both ID and material data
      if (procedure && procedure.length > 0) {
        procedure.forEach(wellData => {
          if (wellData.materials) {
            wellData.materials.forEach(material => {
              const materialId = getMaterialId(material);
              if (materialId && !allMaterials.has(materialId)) {
                allMaterials.set(materialId, material);
              }
            });
          }
        });
      }

      // Convert to array and sort for consistent ordering (sort by alias or name for display)
      const sortedMaterials = Array.from(allMaterials.entries())
        .sort(([idA, materialA], [idB, materialB]) => {
          const nameA = materialA.alias || materialA.name || '';
          const nameB = materialB.alias || materialB.name || '';
          return nameA.localeCompare(nameB);
        });
      
      const materialToCompoundMap = {};
      sortedMaterials.forEach(([materialId, material], index) => {
        materialToCompoundMap[materialId] = index + 1;
      });

      // Create headers for Design sheet
      const headers = ['Well', 'ID'];
      for (let i = 1; i <= sortedMaterials.length; i++) {
        headers.push(`Compound ${i} name`, `Compound ${i} amount`);
      }

      const data = [headers];

      // Process each well in order for the determined plate type
      wells.forEach(wellId => {
        const wellData = procedure.find(p => p.well === wellId);
        const elnNumber = context.eln || '';
        const wellIdWithEln = elnNumber ? `${elnNumber}_${wellId}` : wellId;
        
        const row = [wellId, wellIdWithEln];
        
        // Initialize all compound columns with empty values
        for (let i = 0; i < sortedMaterials.length; i++) {
          row.push('', '');
        }
        
        if (wellData && wellData.materials && wellData.materials.length > 0) {
          // Fill in compound names and amounts based on the consistent mapping
          wellData.materials.forEach(material => {
            const materialId = getMaterialId(material);
            const compoundNumber = materialToCompoundMap[materialId];
            if (compoundNumber) {
              const compoundIndex = (compoundNumber - 1) * 2 + 2; // +2 for Well and ID columns
              row[compoundIndex] = material.alias || material.name || '';
              row[compoundIndex + 1] = material.amount || '';
            }
          });
        }
        
        data.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Design');
    } catch (error) {
      console.error('Error exporting procedure:', error);
    }
  };

  const exportProcedureSettings = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/procedure-settings');
      const procedureSettings = response.data;

      const data = [
        ['Procedure Settings'],
        [''],
        ['Reaction Conditions'],
        ['Parameter', 'Value', 'Unit'],
        ['Temperature', procedureSettings.reactionConditions?.temperature || '', 'degC'],
        ['Time', procedureSettings.reactionConditions?.time || '', 'h'],
        ['Pressure', procedureSettings.reactionConditions?.pressure || '', 'bar'],
        ['Wavelength', procedureSettings.reactionConditions?.wavelength || '', 'nm'],
        [''],
        ['Remarks'],
        [procedureSettings.reactionConditions?.remarks || ''],
        [''],
        ['Analytical Details'],
        ['Parameter', 'Value', 'Unit'],
        ['UPLC #', procedureSettings.analyticalDetails?.uplcNumber || '', ''],
        ['Method', procedureSettings.analyticalDetails?.method || '', ''],
        ['Duration', procedureSettings.analyticalDetails?.duration || '', 'min'],
        ['Wavelength', procedureSettings.analyticalDetails?.wavelength || '', 'nm'],
        [''],
        ['Remarks'],
        [procedureSettings.analyticalDetails?.remarks || '']
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Procedure');
    } catch (error) {
      console.error('Error exporting procedure settings:', error);
    }
  };

  const exportAnalyticalData = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/analytical');
      const analyticalData = response.data;

      // Check if there are uploaded files
      if (analyticalData && analyticalData.uploadedFiles && analyticalData.uploadedFiles.length > 0) {
        // Get the most recent uploaded file data
        const mostRecentUpload = analyticalData.uploadedFiles[analyticalData.uploadedFiles.length - 1];
        
        if (mostRecentUpload && mostRecentUpload.data && mostRecentUpload.data.length > 0) {
          // Create the correct column order: Nr, Well, ID, Name_1, Area_1, Name_2, Area_2, etc.
          const orderedColumns = ['Nr', 'Well', 'ID'];
          
          // Find all Name_X and Area_X columns and sort them by number
          const nameColumns = [];
          const areaColumns = [];
          
          Object.keys(mostRecentUpload.data[0]).forEach(key => {
            if (key.startsWith('Name_')) {
              nameColumns.push(key);
            } else if (key.startsWith('Area_')) {
              areaColumns.push(key);
            }
          });
          
          // Sort by the number after the underscore
          nameColumns.sort((a, b) => {
            const numA = parseInt(a.split('_')[1]);
            const numB = parseInt(b.split('_')[1]);
            return numA - numB;
          });
          
          areaColumns.sort((a, b) => {
            const numA = parseInt(a.split('_')[1]);
            const numB = parseInt(b.split('_')[1]);
            return numA - numB;
          });
          
          // Add Name_X and Area_X columns in alternating order
          const maxCompounds = Math.max(nameColumns.length, areaColumns.length);
          for (let i = 0; i < maxCompounds; i++) {
            if (nameColumns[i]) orderedColumns.push(nameColumns[i]);
            if (areaColumns[i]) orderedColumns.push(areaColumns[i]);
          }
          
          // Add any remaining columns that don't follow the Name_X/Area_X pattern
          Object.keys(mostRecentUpload.data[0]).forEach(key => {
            if (!orderedColumns.includes(key)) {
              orderedColumns.push(key);
            }
          });
          
          // Create headers with correct order
          const headers = orderedColumns;
          const data = [headers];

          // Add data rows with correct column order
          mostRecentUpload.data.forEach((row, index) => {
            const rowData = [];
            orderedColumns.forEach(column => {
              rowData.push(row[column] || '');
            });
            data.push(rowData);
          });

          const ws = XLSX.utils.aoa_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Analytical Data');
        } else {
          // Create empty sheet if no data in the upload
          const ws = XLSX.utils.aoa_to_sheet([['No analytical data available']]);
          XLSX.utils.book_append_sheet(wb, ws, 'Analytical Data');
        }
      } else {
        // Create empty sheet if no uploaded files
        const ws = XLSX.utils.aoa_to_sheet([['No analytical data available']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Analytical Data');
      }
    } catch (error) {
      console.error('Error exporting analytical data:', error);
    }
  };

  const exportHeatmapData = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/heatmap');
      const heatmapData = response.data;

      // Check if heatmapData is an object with heatmaps array or empty object
      if (heatmapData && heatmapData.heatmaps && heatmapData.heatmaps.length > 0) {
        for (let index = 0; index < heatmapData.heatmaps.length; index++) {
          const heatmap = heatmapData.heatmaps[index];
          const sheetName = `Heatmap_${index + 1}`;
          
          // Create heatmap data
          const data = [
            [`Heatmap ${index + 1}: ${heatmap.title || 'Untitled'}`],
            [''],
            ['Formula:', heatmap.formula || 'No formula'],
            ['Color Scheme:', heatmap.colorScheme || 'blue'],
            ['Min Value:', heatmap.min || 0],
            ['Max Value:', heatmap.max || 0],
            ['']
          ];

          // Add column headers
          const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
          const rows = ['1', '2', '3', '4', '5', '6', '7', '8'];
          
          const headerRow = ['', ...cols];
          data.push(headerRow);

          // Add data rows
          if (heatmap.data) {
            heatmap.data.forEach((row, rowIndex) => {
              const dataRow = [rows[rowIndex]];
              row.forEach((cell, colIndex) => {
                dataRow.push(cell || '');
              });
              data.push(dataRow);
            });
          }

          const ws = XLSX.utils.aoa_to_sheet(data);
          
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      } else {
        // Create empty heatmap sheet
        const data = [
          ['Heatmap Data'],
          [''],
          ['No heatmaps generated yet.']
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Heatmap Data');
      }
    } catch (error) {
      console.error('Error exporting heatmap data:', error);
    }
  };

  const exportSummarySheet = async (wb, XLSX) => {
    try {
      // Get all data for summary
      const [contextRes, materialsRes, procedureRes, analyticalRes, heatmapRes] = await Promise.all([
        axios.get('/api/experiment/context'),
        axios.get('/api/experiment/materials'),
        axios.get('/api/experiment/procedure'),
        axios.get('/api/experiment/analytical'),
        axios.get('/api/experiment/heatmap')
      ]);

      const context = contextRes.data;
      const materials = materialsRes.data;
      const procedure = procedureRes.data;
      const analytical = analyticalRes.data;
      const heatmapData = heatmapRes.data;

      const data = [
        ['HTE Experiment Summary'],
        [''],
        ['Experiment Information'],
        ['Author:', context.author || 'Not specified'],
        ['Date:', context.date || 'Not specified'],
        ['Project:', context.project || 'Not specified'],
        ['ELN Number:', context.eln || 'Not specified'],
        ['Objective:', context.objective || 'Not specified'],
        [''],
        ['Data Summary'],
        ['Materials Count:', materials ? materials.length : 0],
        ['Wells with Data:', procedure ? procedure.filter(w => w.well).length : 0],
        ['Analytical Data Rows:', analytical ? analytical.length : 0],
        ['Heatmaps Generated:', heatmapData && heatmapData.heatmaps ? heatmapData.heatmaps.length : 0],
        [''],
        ['Sheet Contents'],
        ['1. Experiment Context - Basic experiment information and SDF reaction data'],
        ['2. Materials - All chemical materials with properties and roles'],
        ['3. Design - Complete 96-well plate design with materials and amounts for all wells (A1-H12)'],
        ['4. Analytical Data - Exact copy of uploaded analytical results table'],
        ['5. Heatmap Data - All generated heatmaps with formulas and color schemes'],
        ['6. Summary - This overview sheet'],
        [''],
        ['Export Information'],
        ['Export Date:', new Date().toLocaleString()],
        ['Export Version:', '1.0'],
        ['File Format:', 'Excel (.xlsx)']
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    } catch (error) {
      console.error('Error exporting summary:', error);
    }
  };

      return (
      <header className="clean-header">
        <div className="header-flex-container">
          {/* Brand Section - Left */}
          <div className="header-brand">
            <img 
              src="/logo-hte-d2d.png" 
              alt="HTE D2D" 
              className="brand-logo"
            />
          </div>

          {/* Navigation Section - Center */}
          <nav className="header-navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-pill ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Action Buttons - Right */}
          <div className="header-actions">
            <button 
              className="action-btn action-export"
              onClick={exportToExcel}
              disabled={isExporting}
              title="Export all experiment data to Excel"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
            <button 
              className="action-btn action-help"
              onClick={handleHelp}
              title={`Help for ${activeTab} tab`}
            >
              Help
            </button>
            <button 
              className="action-btn action-reset"
              onClick={handleReset}
              title="Reset all experiment data"
            >
              Reset
            </button>
          </div>
        </div>
      </header>
  );
};

export default Header;
