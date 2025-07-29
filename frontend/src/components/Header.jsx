import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useToast } from "./ToastContext";

const Header = ({ activeTab, onTabChange, onReset, onShowHelp }) => {
  const { showSuccess, showError } = useToast();
  
  const tabs = [
    { id: "context", label: "Experiment Context" },
    { id: "materials", label: "Materials" },
    { id: "procedure", label: "96-Well Plate" },
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

  return (
    <header className="top-app-bar">
      <div className="app-bar-content">
        <div className="app-bar-left">
          <span className="text-logo">
            <span className="logo-text">CPRD HTE App</span>
          </span>
        </div>
        <nav className="app-bar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-link ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="app-bar-right">
          <button 
            className="btn btn-info help-btn"
            onClick={handleHelp}
            title={`Help for ${activeTab} tab`}
            style={{ marginRight: "10px" }}
          >
            Help
          </button>
          <button 
            className="btn btn-warning reset-btn"
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
