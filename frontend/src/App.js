import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import ExperimentContext from './components/ExperimentContext';
import Materials from './components/Materials';
import Procedure from './components/Procedure';
import AnalyticalData from './components/AnalyticalData';
import Results from './components/Results';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('context');

  const tabs = [
    { id: 'context', label: 'Experiment Context', component: ExperimentContext },
    { id: 'materials', label: 'Materials', component: Materials },
    { id: 'procedure', label: '96-Well Plate', component: Procedure },
    { id: 'analytical', label: 'Analytical Data', component: AnalyticalData },
    { id: 'results', label: 'Results', component: Results }
  ];

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>HTE App - High Throughput Experiment Design</h1>
          <p>Design, record, and analyze high throughput chemical experiments</p>
        </header>

        <div className="container">
          <nav className="nav-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="tab-content">
            {activeTab === 'context' && <ExperimentContext />}
            {activeTab === 'materials' && <Materials />}
            {activeTab === 'procedure' && <Procedure />}
            {activeTab === 'analytical' && <AnalyticalData />}
            {activeTab === 'results' && <Results />}
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App; 