import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Results = () => {
  const [results, setResults] = useState([]);
  const [analyticalData, setAnalyticalData] = useState([]);
  const [procedure, setProcedure] = useState([]);
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  // Generate 96 wells (8 rows x 12 columns)
  const wells = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  
  for (let row of rows) {
    for (let col of columns) {
      wells.push(`${row}${col}`);
    }
  }

  useEffect(() => {
    loadResults();
    loadAnalyticalData();
    loadProcedure();
  }, []);

  const loadResults = async () => {
    try {
      const response = await axios.get('/api/experiment/results');
      setResults(response.data || []);
    } catch (error) {
      console.error('Error loading results:', error);
    }
  };

  const loadAnalyticalData = async () => {
    try {
      const response = await axios.get('/api/experiment/analytical');
      setAnalyticalData(response.data || []);
    } catch (error) {
      console.error('Error loading analytical data:', error);
    }
  };

  const loadProcedure = async () => {
    try {
      const response = await axios.get('/api/experiment/procedure');
      setProcedure(response.data || []);
    } catch (error) {
      console.error('Error loading procedure:', error);
    }
  };

  const getResultData = (wellId) => {
    return results.find(r => r.well === wellId) || {
      well: wellId,
      id: '',
      conversion_percent: '',
      yield_percent: '',
      selectivity_percent: ''
    };
  };

  const updateResultData = (wellId, field, value) => {
    const existingIndex = results.findIndex(r => r.well === wellId);
    const data = getResultData(wellId);
    const updatedData = { ...data, [field]: value };

    if (existingIndex >= 0) {
      setResults(prev => prev.map((r, i) => i === existingIndex ? updatedData : r));
    } else {
      setResults(prev => [...prev, updatedData]);
    }
  };

  const saveResults = async () => {
    try {
      await axios.post('/api/experiment/results', results);
      setMessage('Results saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving results: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const exportExperiment = async () => {
    try {
      setExporting(true);
      const response = await axios.post('/api/experiment/export', {}, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HTE_experiment_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setMessage('Experiment exported successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error exporting experiment: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setExporting(false);
    }
  };

  const resetExperiment = async () => {
    if (window.confirm('Are you sure you want to reset the entire experiment? This will clear all data.')) {
      try {
        await axios.post('/api/experiment/reset');
        setResults([]);
        setMessage('Experiment reset successfully!');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage('Error resetting experiment: ' + error.message);
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  const hasResults = (wellId) => {
    const data = getResultData(wellId);
    return Object.values(data).some(value => value && value !== '' && value !== wellId);
  };

  const getWellClass = (wellId) => {
    let className = 'well';
    if (hasResults(wellId)) {
      className += ' has-content';
    }
    return className;
  };

  const getWellData = (wellId) => {
    return procedure.find(p => p.well === wellId) || {};
  };

  const getAnalyticalData = (wellId) => {
    return analyticalData.find(a => a.well === wellId) || {};
  };

  return (
    <div className="card">
      <h2>Results</h2>
      <p>Calculate and record experiment results. Export data for ML model training.</p>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-success" onClick={saveResults}>
          Save Results
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={exportExperiment}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </button>
        <button className="btn btn-secondary" onClick={resetExperiment}>
          Reset Experiment
        </button>
      </div>

      {/* 96-Well Plate Grid */}
      <div className="well-grid">
        {wells.map(well => (
          <div
            key={well}
            className={getWellClass(well)}
            title={`Well ${well}`}
          >
            {well}
          </div>
        ))}
      </div>

      {/* Results Table */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Results Table</h3>
        <p>Enter calculated results for each well. Use analytical data to calculate conversion, yield, and selectivity.</p>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Well</th>
                <th>ID</th>
                <th>Conversion (%)</th>
                <th>Yield (%)</th>
                <th>Selectivity (%)</th>
                <th>Procedure Data</th>
                <th>Analytical Data</th>
              </tr>
            </thead>
            <tbody>
              {wells.map(well => {
                const resultData = getResultData(well);
                const procedureData = getWellData(well);
                const analyticalData = getAnalyticalData(well);
                
                return (
                  <tr key={well}>
                    <td>
                      <strong>{well}</strong>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        value={resultData.id || ''}
                        onChange={(e) => updateResultData(well, 'id', e.target.value)}
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={resultData.conversion_percent || ''}
                        onChange={(e) => updateResultData(well, 'conversion_percent', e.target.value)}
                        placeholder="%"
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={resultData.yield_percent || ''}
                        onChange={(e) => updateResultData(well, 'yield_percent', e.target.value)}
                        placeholder="%"
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={resultData.selectivity_percent || ''}
                        onChange={(e) => updateResultData(well, 'selectivity_percent', e.target.value)}
                        placeholder="%"
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', maxWidth: '200px' }}>
                        {Object.keys(procedureData).filter(key => 
                          key.includes('compound') && procedureData[key]
                        ).map(key => (
                          <div key={key}>
                            {key.replace('_name', '')}: {procedureData[key]}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', maxWidth: '200px' }}>
                        {Object.keys(analyticalData).filter(key => 
                          key.includes('area') && analyticalData[key]
                        ).map(key => (
                          <div key={key}>
                            {key.replace('_area', '')}: {analyticalData[key]}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Export Information</h3>
        <p>The exported Excel file will contain the following sheets:</p>
        <ul>
          <li><strong>Context:</strong> Experiment metadata (author, date, project, etc.)</li>
          <li><strong>Materials:</strong> All chemicals used with their properties</li>
          <li><strong>Procedure:</strong> 96-well plate layout with compound quantities</li>
          <li><strong>Analytical data (1):</strong> Chromatogram areas for each compound</li>
          <li><strong>Results (1):</strong> Calculated conversion, yield, and selectivity</li>
        </ul>
        
        <p><strong>Note:</strong> This data format is compatible with the provided template and suitable for ML model training.</p>
      </div>
    </div>
  );
};

export default Results; 