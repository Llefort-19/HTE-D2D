import React, { memo } from "react";

const MaterialTable = memo(({ 
  materials, 
  roleOptions, 
  personalInventoryStatus,
  personalInventoryLoading,
  onMoleculeView,
  onRoleUpdate,
  onRemove,
  onEdit,
  onAddToPersonalInventory,
  onMoveUp,
  onMoveDown,
  moleculeLoading,
  currentMolecule 
}) => {
  
  const renderActionButtons = (material, index) => (
    <div className="actions-cell">
      <button
        className="btn btn-warning"
        onClick={() => onRemove(index)}
        style={{ padding: "5px 10px", fontSize: "12px", marginRight: "6px" }}
      >
        Remove
      </button>
      <button
        className="btn btn-info"
        onClick={() => onEdit(index)}
        style={{ padding: "5px 10px", fontSize: "12px", marginRight: "6px" }}
      >
        Modify
      </button>
             <button
         onClick={() => onMoveUp(index)}
         disabled={index === 0}
         style={{ 
           padding: "5px 10px", 
           fontSize: "12px",
           marginRight: "6px",
           opacity: index === 0 ? 0.5 : 1,
           backgroundColor: "#6c757d",
           border: "1px solid #6c757d",
           color: "white",
           borderRadius: "4px",
           cursor: index === 0 ? "not-allowed" : "pointer",
           transition: "all 0.2s ease"
         }}
         title="Move Up"
       >
         ▲
       </button>
       <button
         onClick={() => onMoveDown(index)}
         disabled={index === materials.length - 1}
         style={{ 
           padding: "5px 10px", 
           fontSize: "12px",
           marginRight: "6px",
           opacity: index === materials.length - 1 ? 0.5 : 1,
           backgroundColor: "#6c757d",
           border: "1px solid #6c757d",
           color: "white",
           borderRadius: "4px",
           cursor: index === materials.length - 1 ? "not-allowed" : "pointer",
           transition: "all 0.2s ease"
         }}
         title="Move Down"
       >
         ▼
       </button>
      {personalInventoryStatus[`${material.name}_${material.alias || ''}_${material.cas || ''}`] === false && 
        material.source !== "inventory" && 
        material.source !== "solvent_database" && 
        material.source !== "excel_upload" && 
        material.source !== "kit_upload" && (
          <button
            className="btn btn-success"
            onClick={() => onAddToPersonalInventory(material)}
            style={{ 
              padding: "5px 10px", 
              fontSize: "12px"
            }}
          >
            To personal inventory
          </button>
        )}
    </div>
  );

  const renderSmilesCell = (material) => {
    if (material.smiles && material.smiles.trim()) {
      return (
        <button
          className="btn btn-success"
          onClick={() => onMoleculeView(material.smiles, material.name, material.alias, material.cas)}
          disabled={moleculeLoading}
          style={{
            padding: "5px 10px",
            fontSize: "12px",
          }}
        >
          {moleculeLoading && currentMolecule.smiles === material.smiles
            ? "Loading..."
            : "View"}
        </button>
      );
    } else {
      return (
        <span style={{ color: "var(--color-text-light)", fontStyle: "italic" }}>
          No SMILES
        </span>
      );
    }
  };

  if (materials.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: "20px" }}>
        No materials added yet. Search inventory or add new materials to get started.
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Name/Alias</th>
            <th>CAS</th>
            <th>SMILES</th>
            <th>Barcode</th>
            <th>Role</th>
            <th style={{ textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material, index) => (
            <tr key={index}>
              <td>{material.alias || material.name}</td>
              <td>{material.cas}</td>
              <td>{renderSmilesCell(material)}</td>
              <td>{material.barcode}</td>
              <td>
                <select
                  className="form-control"
                  value={material.role || ""}
                  onChange={(e) => onRoleUpdate(index, e.target.value)}
                  style={{ fontSize: "12px", padding: "4px 8px" }}
                >
                  <option value="">Select Role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </td>
              <td style={{ textAlign: "center" }}>{renderActionButtons(material, index)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default MaterialTable;
