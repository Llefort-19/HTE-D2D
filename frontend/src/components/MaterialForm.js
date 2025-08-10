import React, { useState, useEffect } from "react";
import axios from "axios";

const MaterialForm = ({ 
  material, 
  isEdit = false, 
  roleOptions, 
  onSave, 
  onCancel, 
  visible 
}) => {
  const [formData, setFormData] = useState({
    name: "",
    alias: "",
    cas: "",
    molecular_weight: "",
    smiles: "",
    barcode: "",
    role: "",
  });

  useEffect(() => {
    if (material) {
      setFormData(material);
    } else {
      // Clear form when adding new material (not editing)
      setFormData({
        name: "",
        alias: "",
        cas: "",
        molecular_weight: "",
        smiles: "",
        barcode: "",
        role: "",
      });
    }
  }, [material, visible]); // Added visible to dependencies to trigger when modal opens

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("Material name is required");
      return;
    }

    onSave(formData);
  };

  // ESC key support for closing modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && visible) {
        onCancel();
      }
    };
    
    if (visible) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [visible, onCancel]);

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{isEdit ? "Edit Material" : "Add New Material"}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Chemical Name *</label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter chemical name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="alias">Alias/Common Name</label>
                <input
                  type="text"
                  id="alias"
                  className="form-control"
                  value={formData.alias}
                  onChange={(e) => handleInputChange("alias", e.target.value)}
                  placeholder="Enter alias or common name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cas">CAS Number</label>
                <input
                  type="text"
                  id="cas"
                  className="form-control"
                  value={formData.cas}
                  onChange={(e) => handleInputChange("cas", e.target.value)}
                  placeholder="Enter CAS number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="molecular_weight">Molecular Weight (g/mol)</label>
                <input
                  type="number"
                  id="molecular_weight"
                  className="form-control"
                  value={formData.molecular_weight}
                  onChange={(e) => handleInputChange("molecular_weight", e.target.value)}
                  placeholder="Enter molecular weight"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="smiles">SMILES</label>
                <input
                  type="text"
                  id="smiles"
                  className="form-control"
                  value={formData.smiles}
                  onChange={(e) => handleInputChange("smiles", e.target.value)}
                  placeholder="Enter SMILES notation"
                />
              </div>

              <div className="form-group">
                <label htmlFor="barcode">Barcode/Lot Number</label>
                <input
                  type="text"
                  id="barcode"
                  className="form-control"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange("barcode", e.target.value)}
                  placeholder="Enter barcode or lot number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  className="form-control"
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                >
                  <option value="">Select role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              {isEdit ? "Save Changes" : "Add Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialForm;
