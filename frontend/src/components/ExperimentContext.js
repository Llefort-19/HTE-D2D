import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ExperimentContext = () => {
  const [context, setContext] = useState({
    author: '',
    date: new Date().toISOString().split('T')[0],
    project: '',
    eln: '',
    objective: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    try {
      const response = await axios.get('/api/experiment/context');
      if (response.data && Object.keys(response.data).length > 0) {
        setContext(response.data);
      }
    } catch (error) {
      console.error('Error loading context:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/experiment/context', context);
      setMessage('Experiment context saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving context: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContext(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="card">
      <h2>Experiment Context</h2>
      <p>Define the basic information about your experiment.</p>
      
      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="author">Author *</label>
          <input
            type="text"
            id="author"
            name="author"
            className="form-control"
            value={context.author}
            onChange={handleChange}
            required
            placeholder="First and last name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date *</label>
          <input
            type="date"
            id="date"
            name="date"
            className="form-control"
            value={context.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="project">Project</label>
          <input
            type="text"
            id="project"
            name="project"
            className="form-control"
            value={context.project}
            onChange={handleChange}
            placeholder="Project name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="eln">ELN Number</label>
          <input
            type="text"
            id="eln"
            name="eln"
            className="form-control"
            value={context.eln}
            onChange={handleChange}
            placeholder="8-character initials-book format"
          />
        </div>

        <div className="form-group">
          <label htmlFor="objective">Objective</label>
          <textarea
            id="objective"
            name="objective"
            className="form-control"
            value={context.objective}
            onChange={handleChange}
            placeholder="Short description of experimental objective"
            rows="3"
          />
        </div>

        <button type="submit" className="btn btn-success">
          Save Context
        </button>
      </form>
    </div>
  );
};

export default ExperimentContext; 