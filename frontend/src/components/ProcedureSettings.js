import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const ProcedureSettings = () => {
  const [reactionConditions, setReactionConditions] = useState({
    temperature: "",
    time: "",
    pressure: "",
    wavelength: "",
    remarks: ""
  });
  const [analyticalDetails, setAnalyticalDetails] = useState({
    uplcNumber: "",
    method: "",
    duration: "",
    wavelength: "",
    remarks: ""
  });
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { showError } = useToast();

  useEffect(() => {
    loadProcedureSettings();
    
    // Listen for help events from header
    const handleHelpEvent = (event) => {
      if (event.detail.tabId === 'procedure-settings') {
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
        loadProcedureSettings();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const loadProcedureSettings = async () => {
    try {
      const response = await axios.get("/api/experiment/procedure-settings");
      const data = response.data || {};
      
      // Ensure all values are strings to avoid controlled/uncontrolled input issues
      const defaultReactionConditions = {
        temperature: "",
        time: "",
        pressure: "",
        wavelength: "",
        remarks: ""
      };
      
      const defaultAnalyticalDetails = {
        uplcNumber: "",
        method: "",
        duration: "",
        wavelength: "",
        remarks: ""
      };
      
      // Merge with imported data, ensuring all values are strings
      const reactionData = data.reactionConditions || {};
      setReactionConditions({
        temperature: String(reactionData.temperature || ""),
        time: String(reactionData.time || ""),
        pressure: String(reactionData.pressure || ""),
        wavelength: String(reactionData.wavelength || ""),
        remarks: String(reactionData.remarks || "")
      });
      
      const analyticalData = data.analyticalDetails || {};
      setAnalyticalDetails({
        uplcNumber: String(analyticalData.uplcNumber || ""),
        method: String(analyticalData.method || ""),
        duration: String(analyticalData.duration || ""),
        wavelength: String(analyticalData.wavelength || ""),
        remarks: String(analyticalData.remarks || "")
      });
    } catch (error) {
      console.error("Error loading procedure settings:", error);
    }
  };

  const saveProcedureSettings = async () => {
    try {
      await axios.post("/api/experiment/procedure-settings", {
        reactionConditions,
        analyticalDetails
      });
    } catch (error) {
      console.error("Error saving procedure settings:", error);
      showError("Error saving procedure settings: " + error.message);
    }
  };

  return (
    <div className="card">
      {/* Procedure Section */}
      <div className="procedure-section">
        <h3>Procedure Settings</h3>
        <div className="procedure-subsections">
          {/* Reaction Conditions */}
          <div className="reaction-conditions">
            <h4>Reaction Conditions</h4>
            <table className="table">
              <tbody>
                <tr>
                  <td>Temperature</td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      value={reactionConditions.temperature}
                      onChange={(e) => {
                        setReactionConditions(prev => ({
                          ...prev,
                          temperature: e.target.value
                        }));
                        saveProcedureSettings();
                      }}
                      placeholder="Enter temperature"
                    />
                  </td>
                  <td>degC</td>
                </tr>
                <tr>
                  <td>Time</td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      value={reactionConditions.time}
                      onChange={(e) => {
                        setReactionConditions(prev => ({
                          ...prev,
                          time: e.target.value
                        }));
                        saveProcedureSettings();
                      }}
                      placeholder="Enter time"
                    />
                  </td>
                  <td>h</td>
                </tr>
                <tr>
                  <td>Pressure</td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      value={reactionConditions.pressure}
                      onChange={(e) => {
                        setReactionConditions(prev => ({
                          ...prev,
                          pressure: e.target.value
                        }));
                        saveProcedureSettings();
                      }}
                      placeholder="Enter pressure"
                    />
                  </td>
                  <td>bar</td>
                </tr>
                <tr>
                  <td>Wavelength</td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      value={reactionConditions.wavelength}
                      onChange={(e) => {
                        setReactionConditions(prev => ({
                          ...prev,
                          wavelength: e.target.value
                        }));
                        saveProcedureSettings();
                      }}
                      placeholder="Enter wavelength"
                    />
                  </td>
                  <td>nm</td>
                </tr>
              </tbody>
            </table>
            <div className="remarks-section">
              <label>Remarks:</label>
              <textarea
                className="form-control"
                value={reactionConditions.remarks}
                onChange={(e) => {
                  setReactionConditions(prev => ({
                    ...prev,
                    remarks: e.target.value
                  }));
                  saveProcedureSettings();
                }}
                placeholder="Enter remarks for reaction conditions"
                rows="3"
              />
            </div>
          </div>

          {/* Analytical Details */}
          <div className="analytical-details">
            <h4>Analytical Details</h4>
            <table className="table">
              <tbody>
                <tr>
                  <td>UPLC #</td>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      value={analyticalDetails.uplcNumber}
                      onChange={(e) => {
                        setAnalyticalDetails(prev => ({
                          ...prev,
                          uplcNumber: e.target.value
                        }));
                        saveProcedureSettings();
                      }}
                      placeholder="Enter UPLC number"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Method</td>
                  <td>
                    <select
                      className="form-control"
                      value={analyticalDetails.method}
                      onChange={(e) => {
                        setAnalyticalDetails(prev => ({
                          ...prev,
                          method: e.target.value
                        }));
                        saveProcedureSettings();
                      }}
                    >
                      <option value="">Select method</option>
                      <option value="CH3CN, pH7">CH3CN, pH7</option>
                      <option value="CH3CN, pH 2.5">CH3CN, pH 2.5</option>
                      <option value="MeOH, pH7">MeOH, pH7</option>
                      <option value="MeOH, pH 2.5">MeOH, pH 2.5</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>Duration</td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      value={analyticalDetails.duration}
                      onChange={(e) => {
                        setAnalyticalDetails(prev => ({
                          ...prev,
                          duration: e.target.value
                        }));
                        saveProcedureSettings();
                      }}
                      placeholder="Enter duration"
                    />
                  </td>
                  <td>min</td>
                </tr>
                <tr>
                  <td>Wavelength</td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      value={analyticalDetails.wavelength}
                      onChange={(e) => {
                        setAnalyticalDetails(prev => ({
                          ...prev,
                          wavelength: e.target.value
                        }));
                        saveProcedureSettings();
                      }}
                      placeholder="Enter wavelength"
                    />
                  </td>
                  <td>nm</td>
                </tr>
              </tbody>
            </table>
            <div className="remarks-section">
              <label>Remarks:</label>
              <textarea
                className="form-control"
                value={analyticalDetails.remarks}
                onChange={(e) => {
                  setAnalyticalDetails(prev => ({
                    ...prev,
                    remarks: e.target.value
                  }));
                  saveProcedureSettings();
                }}
                placeholder="Enter remarks for analytical details"
                rows="3"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-header">
              <h3>Procedure Settings Help</h3>
              <button
                className="modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "left" }}>
              <h4>How to use the Procedure Settings:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>
                  <strong>Reaction Conditions:</strong> Specify the experimental parameters for your reaction.
                </li>
                <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
                  <li><strong>Temperature:</strong> Enter the reaction temperature in degrees Celsius</li>
                  <li><strong>Time:</strong> Enter the reaction time in hours</li>
                  <li><strong>Pressure:</strong> Enter the reaction pressure in bar</li>
                  <li><strong>Wavelength:</strong> Enter the analytical wavelength in nanometers</li>
                  <li><strong>Remarks:</strong> Add any additional notes about reaction conditions</li>
                </ul>
                <li>
                  <strong>Analytical Details:</strong> Specify the analytical method parameters.
                </li>
                <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
                  <li><strong>UPLC #:</strong> Enter the UPLC instrument number</li>
                  <li><strong>Method:</strong> Select the analytical method from the dropdown</li>
                  <li><strong>Duration:</strong> Enter the method duration in minutes</li>
                  <li><strong>Wavelength:</strong> Enter the analytical wavelength in nanometers</li>
                  <li><strong>Remarks:</strong> Add any additional notes about analytical details</li>
                </ul>
                <li>
                  <strong>Auto-save:</strong> All changes are automatically saved to the backend.
                </li>
                <li>
                  <strong>Export:</strong> This information will be included in the Excel export as a "Procedure" sheet.
                </li>
              </ul>
              <h4>Tips:</h4>
              <ul style={{ paddingLeft: "20px", lineHeight: "1.6", textAlign: "left" }}>
                <li>All fields are optional - fill in only the parameters relevant to your experiment</li>
                <li>Use the remarks sections to add important experimental details</li>
                <li>The procedure settings are saved automatically as you type</li>
                <li>This information will be exported with your experiment data</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcedureSettings; 