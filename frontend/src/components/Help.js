import React, { useState, useEffect, useRef } from 'react';

const Help = ({ tabId, visible, onClose }) => {
  const [helpContent, setHelpContent] = useState(null);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (visible && tabId) {
      setHelpContent(getHelpContent(tabId));
    }
  }, [visible, tabId]);

  const getHelpContent = (tabId) => {
    switch (tabId) {
             case 'materials':
         return {
           title: 'Materials Help',
           content: (
             <div>
               <h4>Managing Materials:</h4>
               <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                 <li><strong>Add New Material:</strong> Manually enter material details</li>
                 <li><strong>Search Inventory:</strong> Find chemicals from the main database</li>
                 <li><strong>Search Solvents:</strong> Access the solvent database with filtering options</li>
                 <li><strong>View Molecules:</strong> Click "View" in SMILES column to see structure</li>
                 <li><strong>Edit Materials:</strong> Use "Modify" button to update material details</li>
                 <li><strong>Personal Inventory:</strong> Add materials to your personal collection</li>
               </ul>
               
                               <h4>Upload Methods:</h4>
                <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                  <li><strong>Upload Materials:</strong> Import materials list from previous experiment Excel files</li>
                  <li><strong>Upload Kit:</strong> Import materials AND design (plate positions) from kit Excel files</li>
                </ul>
                
                <h4>Upload Materials Details:</h4>
                <p>Upload an Excel file containing materials from a previous experiment to quickly populate your materials list.</p>
                <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                  <li><strong>Supported Formats:</strong> Excel files (.xlsx, .xls) with Materials sheet</li>
                  <li><strong>Required Columns:</strong> Name, Alias, CAS, SMILES, Molecular Weight, Lot number, Role</li>
                  <li><strong>File Structure:</strong> Must contain a "Materials" sheet with the specified column headers</li>
                  <li><strong>Data Import:</strong> All materials are imported with their properties and roles</li>
                  <li><strong>Duplicate Handling:</strong> System automatically checks for existing materials</li>
                </ul>
               
               <h4>Upload Kit Details:</h4>
               <p>Upload an Excel file containing both materials and design (well positions with amounts) for a kit. The kit can be positioned on your current plate layout.</p>
               <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                 <li><strong>Supported Formats:</strong> Excel files (.xlsx, .xls) with Materials and Design sheets</li>
                 <li><strong>Kit Positioning:</strong> After upload, choose where to position the kit on your plate</li>
                 <li><strong>Supported Kit Types:</strong> 24-well (4×6, 2×12), 48-well (6×8, 4×12), 96-well (8×12)</li>
                 <li><strong>Positioning Strategies:</strong> Exact match, quadrant selection, row pair selection, half selection</li>
               </ul>
               
               <h4>Kit Positioning Options:</h4>
               <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                 <li><strong>24-well (4×6):</strong> Exact match on 24/48-well plates, quadrant selection on 96-well plates</li>
                 <li><strong>24-well (2×12):</strong> Row pair selection on 96-well plates only</li>
                 <li><strong>48-well (6×8):</strong> Exact match on 48-well plates only</li>
                 <li><strong>48-well (4×12):</strong> Upper/lower half selection on 96-well plates only</li>
                 <li><strong>96-well (8×12):</strong> Exact match on 96-well plates only</li>
               </ul>
             </div>
           )
         };
      case 'context':
        return {
          title: 'Experiment Context Help',
          content: (
            <div>
              <h4>Experiment Context Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Basic Information:</strong> Enter author, date, project, ELN reference, and objective for your experiment.</li>
                <li><strong>Reaction Upload:</strong> Upload SDF files containing reaction structures. Click "Select File" to choose your SDF file.</li>
                <li><strong>Reaction Analysis:</strong> View parsed molecules with ID-based names (ID-01, ID-02, etc.), SMILES, and 2D structures.</li>
                <li><strong>Role Assignment:</strong> Use the dropdown menu to assign roles to each chemical (Reactant, Target product, Product, Solvent, Reagent, Internal standard).</li>
                <li><strong>Add to Materials:</strong> Click "Add to Materials" to add chemicals from the reaction to your materials list with their assigned roles.</li>
                <li><strong>Clear Reaction:</strong> Use "Clear Reaction" to remove uploaded reaction data and start over.</li>
                <li><strong>Data Persistence:</strong> Reaction data and role assignments persist when switching tabs until manually cleared.</li>
              </ul>
              
              <h4>File Requirements:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>Only SDF format files are accepted</li>
                <li>Molecules are automatically assigned ID-based names (ID-01, ID-02, etc.)</li>
                <li>Users manually assign roles to each chemical using dropdown menus</li>
                <li>Available roles: Reactant, Target product, Product, Solvent, Reagent, Internal standard</li>
                <li>Role assignments are saved and persist across tab switches</li>
              </ul>
              

            </div>
          )
        };
      case 'procedure':
        return {
          title: 'Design Help',
          content: (
            <div>
              <h4>Designing Your Experiment:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Plate Layout:</strong> Design your 96-well plate experiment layout</li>
                <li><strong>Material Assignment:</strong> Assign materials to specific wells</li>
                <li><strong>Amount Setup:</strong> Set amounts for each material</li>
                <li><strong>Well Management:</strong> Add, remove, or modify wells as needed</li>
                <li><strong>Visual Design:</strong> See your plate layout in a visual format</li>
              </ul>
            </div>
          )
        };
      case 'procedure-settings':
        return {
          title: 'Procedure Settings Help',
          content: (
            <div>
              <h4>Reaction Conditions:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Temperature:</strong> Enter reaction temperature</li>
                <li><strong>Time:</strong> Enter reaction time</li>
                <li><strong>Pressure:</strong> For reaction under pressure</li>
                <li><strong>Wavelength:</strong> For photochemical reactions</li>
              </ul>
              <h4>Analytical Details:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>UPLC:</strong> Enter UPLC number</li>
                <li><strong>Method:</strong> Select method from dropdown menu</li>
                <li><strong>Duration:</strong> Enter duration of the analysis</li>
                <li><strong>Wavelength:</strong> Enter wavelength of the analysis</li>
              </ul>
            </div>
          )
        };
      case 'analytical':
        return {
          title: 'Analytical Data Help',
          content: (
            <div>
              <h4>Analytical Data Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Generate Template:</strong> Create Excel templates with selected compounds for data collection.</li>
                <li><strong>Upload Results:</strong> Upload completed analytical data files for processing and analysis.</li>
                <li><strong>Compound Selection:</strong> Choose compounds from Materials or add custom compounds manually.</li>
                <li><strong>Well Plate Format:</strong> Templates include all wells with automatic numbering (A1-H12 for 96-well, A1-D6 for 24-well).</li>
                <li><strong>Sample IDs:</strong> Automatically generated using ELN number from Context tab.</li>
              </ul>
              
              <h4>Instructions:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Generate Template:</strong> Select compounds and export Excel templates for data collection</li>
                <li><strong>Upload Results:</strong> Upload completed analytical data files for processing</li>
                <li>Ensure ELN number is set in Context tab before generating templates</li>
                <li>Use consistent compound names across all experiment sections</li>
              </ul>
              
              <h4>Workflow:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>1. Generate template with selected compounds</li>
                <li>2. Fill in chromatogram areas in the exported file</li>
                <li>3. Upload completed results for processing</li>
                <li>4. Review analysis and proceed to Results tab</li>
              </ul>
            </div>
          )
        };
      case 'results':
        return {
          title: 'Results Help',
          content: (
            <div>
              <h4>Results Overview:</h4>
              <p>View analytical results from uploaded UPLC data and export the complete experiment.</p>
              
              <h4>Results Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Analytical Data Display:</strong> View uploaded UPLC results in a table format.</li>
                <li><strong>File Information:</strong> See filename, upload date, and data dimensions.</li>
                <li><strong>Data Table:</strong> Browse through all uploaded analytical data.</li>
                <li><strong>Export Functionality:</strong> Generate comprehensive Excel reports.</li>
              </ul>
              
              <h4>Data Structure:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>Well: Well plate position (A1-H12 for 96-well, A1-D6 for 24-well)</li>
                <li>Sample ID: Unique identifier for each sample</li>
                <li>Compound Areas: Chromatogram peak areas for each compound</li>
                <li>Data is organized according to the analytical template format</li>
              </ul>
              
              <h4>Export Information:</h4>
              <p>The exported Excel file will contain the following sheets:</p>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Context:</strong> Experiment metadata (author, date, project, etc.)</li>
                <li><strong>Materials:</strong> All chemicals used with their properties</li>
                <li><strong>Procedure:</strong> Well plate layout with compound quantities</li>
                <li><strong>Analytical Data:</strong> UPLC results from uploaded file</li>
                <li><strong>Results:</strong> Calculated conversion, yield, and selectivity</li>
              </ul>

              <p><strong>Note:</strong> This data format is compatible with the provided template and suitable for ML model training.</p>
              
              <h4>Workflow:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li>1. Upload analytical data in the Analytical Data tab</li>
                <li>2. View results in this tab</li>
                <li>3. Export complete experiment to Excel</li>
                <li>4. Use exported data for analysis and ML training</li>
              </ul>
            </div>
          )
        };
      case 'heatmap':
        return {
          title: 'Heatmap Help',
          content: (
            <div>
              <h4>Creating Heatmaps:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Data Selection:</strong> Choose which data to visualize</li>
                <li><strong>Color Schemes:</strong> Select appropriate color scales for your data</li>
                <li><strong>Plate Layout:</strong> Visualize data in plate format</li>
                <li><strong>Customization:</strong> Adjust scale, labels, and appearance</li>
                <li><strong>Export Options:</strong> Save heatmaps as images or data</li>
              </ul>
            </div>
          )
        };
      default:
        return {
          title: 'Help',
          content: (
            <div>
              <p>Select a tab to view specific help information.</p>
            </div>
          )
        };
    }
  };

  // Focus management and accessibility
  useEffect(() => {
    if (visible) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus the close button when modal opens
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 100);
    } else if (previousActiveElement.current) {
      // Restore focus when modal closes
      previousActiveElement.current.focus();
    }
  }, [visible]);

  // ESC key support and focus trap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!visible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap - keep focus within modal
      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: moving backward
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: moving forward
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [visible, onClose]);

  if (!visible || !helpContent) {
    return null;
  }

  return (
    <div 
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={(e) => {
        // Close modal if clicking outside of modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className="modal-content" 
        style={{ maxWidth: "800px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="help-modal-title">{helpContent.title}</h3>
          <button 
            ref={closeButtonRef}
            className="modal-close" 
            onClick={onClose}
            aria-label={`Close ${helpContent.title} dialog`}
          >
            ×
          </button>
        </div>
        <div className="modal-body" style={{ textAlign: "left" }}>
          {helpContent.content}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Help;
