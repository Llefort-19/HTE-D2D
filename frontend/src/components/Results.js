import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const Results = () => {
  const [analyticalData, setAnalyticalData] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadAnalyticalData();
    
    // Listen for help events from header
    const handleHelpEvent = (event) => {
      if (event.detail.tabId === 'results') {
        setShowHelpModal(true);
      }
    };
    
    window.addEventListener('showHelp', handleHelpEvent);
    
    return () => {
      window.removeEventListener('showHelp', handleHelpEvent);
    };
  }, []);

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

  const exportExperiment = async () => {
    try {
      const response = await axios.post(
        "/api/experiment/export",
        {},
        {
          responseType: "blob",
        },
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `HTE_experiment_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSuccess("Experiment exported successfully!");
    } catch (error) {
      showError("Error exporting experiment: " + error.message);
    }
  };

  const resetExperiment = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset the entire experiment? This will clear all data.",
      )
    ) {
      try {
        await axios.post("/api/experiment/reset");
        setAnalyticalData(null);
        showSuccess("Experiment reset successfully!");
      } catch (error) {
        showError("Error resetting experiment: " + error.message);
      }
    }
  };

  return (
    <div className="card">
      <h2>Results</h2>

      <div style={{ marginBottom: "20px" }}>
        <button
          className="btn btn-success"
          onClick={exportExperiment}
        >
          Export to Excel
        </button>
        <button className="btn btn-secondary" onClick={resetExperiment}>
          Reset Experiment
        </button>
      </div>

      {/* Analytical Results Table */}
      <div className="card" style={{ marginTop: "20px" }}>
        <h3>Analytical Results</h3>
        
        {analyticalData ? (
          <div>
            <div style={{ marginBottom: "15px" }}>
              <strong>File:</strong> {analyticalData.filename} | 
              <strong>Uploaded:</strong> {new Date(analyticalData.upload_date).toLocaleString()} | 
              <strong>Shape:</strong> {analyticalData.shape[0]} rows × {analyticalData.shape[1]} columns
            </div>
            
            <div className="scrollable-table-container">
              <table className="table table-striped">
                <thead>
                  <tr>
                    {analyticalData.columns.map((column, index) => (
                      <th key={index}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analyticalData.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {analyticalData.columns.map((column, colIndex) => (
                        <td key={colIndex}>{row[column]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
            <p>No analytical data uploaded yet.</p>
            <p>Upload a file in the Analytical Data tab to view results here.</p>
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-header">
              <h3>Results Help</h3>
              <button
                className="modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "left" }}>
              <h4>Results Overview:</h4>
              <p>View analytical results from uploaded UPLC data and export the complete experiment.</p>
              
              <h4>Results Features:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>
                  <strong>Analytical Data Display:</strong> View uploaded UPLC results in a table format.
                </li>
                <li>
                  <strong>File Information:</strong> See filename, upload date, and data dimensions.
                </li>
                <li>
                  <strong>Data Table:</strong> Browse through all uploaded analytical data.
                </li>
                <li>
                  <strong>Export Functionality:</strong> Generate comprehensive Excel reports.
                </li>
              </ul>
              
              <h4>Data Structure:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>Well: Well plate position (A1-H12 for 96-well, A1-D6 for 24-well)</li>
                <li>Sample ID: Unique identifier for each sample</li>
                <li>Compound Areas: Chromatogram peak areas for each compound</li>
                <li>Data is organized according to the analytical template format</li>
              </ul>
              
              <h4>Export Information:</h4>
              <p>The exported Excel file will contain the following sheets:</p>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>
                  <strong>Context:</strong> Experiment metadata (author, date, project, etc.)
                </li>
                <li>
                  <strong>Materials:</strong> All chemicals used with their properties
                </li>
                <li>
                  <strong>Procedure:</strong> Well plate layout with compound quantities
                </li>
                <li>
                  <strong>Analytical Data:</strong> UPLC results from uploaded file
                </li>
                <li>
                  <strong>Results:</strong> Calculated conversion, yield, and selectivity
                </li>
              </ul>

              <p>
                <strong>Note:</strong> This data format is compatible with the provided template and suitable for ML model training.
              </p>
              
              <h4>Workflow:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>1. Upload analytical data in the Analytical Data tab</li>
                <li>2. View results in this tab</li>
                <li>3. Export complete experiment to Excel</li>
                <li>4. Use exported data for analysis and ML training</li>
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

export default Results;
