import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import axios from "axios";
import Header from "./components/Header";
import ExperimentContext from "./components/ExperimentContext";
import Materials from "./components/Materials";
import Procedure from "./components/Procedure";
import AnalyticalData from "./components/AnalyticalData";
import Results from "./components/Results";
import Heatmap from "./components/Heatmap";
import { ToastProvider } from "./components/ToastContext";
import ToastContainer from "./components/Toast";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("context");

  const tabs = [
    {
      id: "context",
      label: "Experiment Context",
      component: ExperimentContext,
    },
    { id: "materials", label: "Materials", component: Materials },
    { id: "procedure", label: "Well Plate", component: Procedure },
    { id: "analytical", label: "Analytical Data", component: AnalyticalData },
    { id: "results", label: "Results", component: Results },
    { id: "heatmap", label: "Heatmap", component: Heatmap },
  ];

  const handleReset = async () => {
    try {
      // Call backend reset endpoint
      await axios.post("/api/experiment/reset");
      
      // Clear localStorage for SDF data
      localStorage.removeItem("experimentSdfData");
      
      // Force page reload to reset all component states
      window.location.reload();
    } catch (error) {
      throw new Error("Failed to reset experiment data");
    }
  };

  const handleShowHelp = (tabId) => {
    // Trigger help modal for the specific tab
    // This will be handled by each component's internal help system
    const helpEvent = new CustomEvent('showHelp', { detail: { tabId } });
    window.dispatchEvent(helpEvent);
  };

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Header 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            onReset={handleReset} 
            onShowHelp={handleShowHelp}
          />

          <div className="container">
            <div className="tab-content">
              {activeTab === "context" && <ExperimentContext />}
              {activeTab === "materials" && <Materials />}
              {activeTab === "procedure" && <Procedure />}
              {activeTab === "analytical" && <AnalyticalData />}
              {activeTab === "results" && <Results />}
              {activeTab === "heatmap" && <Heatmap />}
            </div>
          </div>
          
          <ToastContainer />
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
