import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import axios from "axios";
import Header from "./components/Header";
import ExperimentContext from "./components/ExperimentContext";
import Materials from "./components/Materials";
import Procedure from "./components/Procedure";
import ProcedureSettings from "./components/ProcedureSettings";
import AnalyticalData from "./components/AnalyticalData";
import Results from "./components/Results";
import Heatmap from "./components/Heatmap";
import Help from "./components/Help";
import { ToastProvider } from "./components/ToastContext";
import ToastContainer from "./components/Toast";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("context");
  const [showHelp, setShowHelp] = useState(false);
  const [helpTabId, setHelpTabId] = useState(null);

  const tabs = [
    {
      id: "context",
      label: "Experiment Context",
      component: ExperimentContext,
    },
    { id: "materials", label: "Materials", component: Materials },
    { id: "procedure", label: "Design", component: Procedure },
    { id: "procedure-settings", label: "Procedure", component: ProcedureSettings },
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
    setHelpTabId(tabId);
    setShowHelp(true);
  };

  const handleCloseHelp = () => {
    setShowHelp(false);
    setHelpTabId(null);
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
              {activeTab === "procedure-settings" && <ProcedureSettings />}
              {activeTab === "analytical" && <AnalyticalData />}
              {activeTab === "results" && <Results />}
              {activeTab === "heatmap" && <Heatmap />}
            </div>
          </div>
          
          <Help 
            tabId={helpTabId} 
            visible={showHelp} 
            onClose={handleCloseHelp} 
          />
          
          <ToastContainer />
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
