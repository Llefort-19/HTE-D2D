import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

// Utility function to format numbers with 4 significant digits for numbers ≤9999,
// and preserve all digits for numbers >9999
const formatToSignificantDigits = (value, significantDigits = 4) => {
  if (value === null || value === undefined || value === '' || isNaN(value)) {
    return value;
  }
  
  const num = parseFloat(value);
  if (num === 0) {
    return '0';
  }
  
  // Handle very small numbers
  if (Math.abs(num) < 1e-10) {
    return '0';
  }
  
  const absValue = Math.abs(num);
  
  // For numbers > 9999, preserve all digits (no rounding/truncation)
  if (absValue > 9999) {
    return num.toString();
  }
  
  // For numbers ≤ 9999, use 4 significant digits
  const formatted = num.toPrecision(significantDigits);
  
  // Remove trailing zeros and unnecessary decimal point
  return parseFloat(formatted).toString();
};

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





  return (
    <div className="card">
      {/* Analytical Results Table */}
      <div className="card">
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
                      {analyticalData.columns.map((column, colIndex) => {
                        const value = row[column];
                        // Format Area columns with 4 significant digits
                        const isAreaColumn = column.startsWith('Area_');
                        const displayValue = isAreaColumn ? formatToSignificantDigits(value) : value;
                        
                        return (
                          <td key={colIndex}>{displayValue}</td>
                        );
                      })}
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
