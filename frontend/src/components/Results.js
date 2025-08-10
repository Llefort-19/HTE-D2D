import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const Results = () => {
  const [analyticalData, setAnalyticalData] = useState(null);


  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadAnalyticalData();
    

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


    </div>
  );
};

export default Results;
