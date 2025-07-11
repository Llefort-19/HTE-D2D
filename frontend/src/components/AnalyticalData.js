import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AnalyticalData = () => {
  const [analyticalData, setAnalyticalData] = useState([]);
  const [procedure, setProcedure] = useState([]);
  const [message, setMessage] = useState('');

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
    loadAnalyticalData();
    loadProcedure();
  }, []);

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

  const getAnalyticalData = (wellId) => {
    return analyticalData.find(a => a.well === wellId) || {
      well: wellId,
      id: '',
      compound_1_name: '', compound_1_area: '',
      compound_2_name: '', compound_2_area: '',
      compound_3_name: '', compound_3_area: '',
      compound_4_name: '', compound_4_area: '',
      compound_5_name: '', compound_5_area: '',
      compound_6_name: '', compound_6_area: '',
      compound_7_name: '', compound_7_area: '',
      compound_8_name: '', compound_8_area: '',
      compound_9_name: '', compound_9_area: '',
      compound_10_name: '', compound_10_area: '',
      compound_11_name: '', compound_11_area: '',
      compound_12_name: '', compound_12_area: '',
      compound_13_name: '', compound_13_area: '',
      compound_14_name: '', compound_14_area: '',
      compound_15_name: '', compound_15_area: ''
    };
  };

  const updateAnalyticalData = (wellId, field, value) => {
    const existingIndex = analyticalData.findIndex(a => a.well === wellId);
    const data = getAnalyticalData(wellId);
    const updatedData = { ...data, [field]: value };

    if (existingIndex >= 0) {
      setAnalyticalData(prev => prev.map((a, i) => i === existingIndex ? updatedData : a));
    } else {
      setAnalyticalData(prev => [...prev, updatedData]);
    }
  };

  const saveAnalyticalData = async () => {
    try {
      await axios.post('/api/experiment/analytical', analyticalData);
      setMessage('Analytical data saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving analytical data: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const getWellData = (wellId) => {
    return procedure.find(p => p.well === wellId) || {};
  };

  const hasAnalyticalData = (wellId) => {
    const data = getAnalyticalData(wellId);
    return Object.values(data).some(value => value && value !== '' && value !== wellId);
  };

  const getWellClass = (wellId) => {
    let className = 'well';
    if (hasAnalyticalData(wellId)) {
      className += ' has-content';
    }
    return className;
  };

  const copyFromProcedure = (wellId) => {
    const wellData = getWellData(wellId);
    const analyticalData = getAnalyticalData(wellId);
    
    // Copy compound names from procedure to analytical data
    const updatedData = { ...analyticalData };
    for (let i = 1; i <= 15; i++) {
      const compoundName = wellData[`compound_${i}_name`];
      if (compoundName) {
        updatedData[`compound_${i}_name`] = compoundName;
      }
    }
    
    updateAnalyticalData(wellId, 'well', wellId);
    Object.keys(updatedData).forEach(key => {
      if (key !== 'well') {
        updateAnalyticalData(wellId, key, updatedData[key]);
      }
    });
  };

  return (
    <div className="card">
      <h2>Analytical Data</h2>
      <p>Record chromatogram areas for compounds in each well.</p>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-success" onClick={saveAnalyticalData}>
          Save Analytical Data
        </button>
      </div>

      {/* 96-Well Plate Grid */}
      <div className="well-grid">
        {wells.map(well => (
          <div
            key={well}
            className={getWellClass(well)}
            onClick={() => copyFromProcedure(well)}
            title={`Well ${well} - Click to copy compounds from procedure`}
          >
            {well}
          </div>
        ))}
      </div>

      {/* Analytical Data Table */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Analytical Data Table</h3>
        <p>Enter chromatogram areas for each compound. Leave blank if compound is not quantified.</p>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Well</th>
                <th>ID</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(i => (
                  <th key={i} colSpan="2">
                    Compound {i}
                  </th>
                ))}
              </tr>
              <tr>
                <th></th>
                <th></th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(i => (
                  <React.Fragment key={i}>
                    <th>Name</th>
                    <th>Area</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {wells.map(well => {
                const data = getAnalyticalData(well);
                return (
                  <tr key={well}>
                    <td>
                      <strong>{well}</strong>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        value={data.id || ''}
                        onChange={(e) => updateAnalyticalData(well, 'id', e.target.value)}
                        style={{ width: '80px' }}
                      />
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(i => (
                      <React.Fragment key={i}>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            value={data[`compound_${i}_name`] || ''}
                            onChange={(e) => updateAnalyticalData(well, `compound_${i}_name`, e.target.value)}
                            placeholder="Name"
                            style={{ width: '100px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            className="form-control"
                            value={data[`compound_${i}_area`] || ''}
                            onChange={(e) => updateAnalyticalData(well, `compound_${i}_area`, e.target.value)}
                            placeholder="Area"
                            style={{ width: '80px' }}
                          />
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <p><strong>Instructions:</strong></p>
        <ul>
          <li>Click on wells in the grid above to automatically copy compound names from the procedure</li>
          <li>Enter chromatogram areas in the table below</li>
          <li>Leave area fields blank if the compound is not quantified</li>
          <li>Use the same compound names as defined in the Materials section</li>
        </ul>
      </div>
    </div>
  );
};

export default AnalyticalData; 