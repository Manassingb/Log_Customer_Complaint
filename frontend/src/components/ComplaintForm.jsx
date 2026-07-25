import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setField, resetForm } from "../store/complaintSlice";
import { saveComplaint } from "../api";
import { handleCommentShortcut } from "../utils/commentShortcut";

const Field = ({ label, name, type = "text", suffix }) => {
  const dispatch = useDispatch();
  const value = useSelector((s) => s.complaint.fields[name]);
  const isAwaiting = useSelector((s) => s.complaint.extractionStatus === "loading" && !value);
  const isEditable = useSelector((s) => s.complaint.extractionStatus === "done");

  return (
    <div className="field">
      <label>{label}</label>
      <div className="field-input-wrap">
        <input
          type={type}
          value={value || ""}
          placeholder={isAwaiting ? "Awaiting AI extraction..." : ""}
          disabled={!isEditable}
          onChange={(e) => dispatch(setField({ name, value: e.target.value }))}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
    </div>
  );
};

export default function ComplaintForm() {
  const dispatch = useDispatch();
  const fields = useSelector((s) => s.complaint.fields);
  const status = useSelector((s) => s.complaint.extractionStatus);
  const isEditable = status === "done";
  const detailedDescription = fields.detailed_description || "";

  const updateDetailedDescription = (value) => {
    dispatch(setField({ name: "detailed_description", value }));
  };

  const handleSave = async () => {
    try {
      await saveComplaint(fields);
      alert("Complaint saved successfully.");
    } catch (e) {
      alert("Failed to save complaint. Check backend connection.");
    }
  };

  return (
    <div className="panel form-panel">
      <div className="panel-header">
        <div>
          <h2>Log Customer Complaint</h2>
          <p className="subtitle">API &amp; FDF Quality Assurance Module</p>
        </div>
        <span className={`badge ${status === "done" ? "badge-green" : "badge-orange"}`}>
          {status === "done" ? "Extracted" : "Pending Triage"}
        </span>
      </div>

      <section>
        <h4>1. Origin &amp; Customer Details</h4>
        <div className="row">
          <Field label="Complaint Source" name="complaint_source" />
          <Field label="Customer Name" name="customer_name" />
        </div>
      </section>

      <section>
        <h4>2. Product &amp; Batch Identification</h4>
        <div className="row">
          <Field label="Product Name" name="product_name" />
          <Field label="Product Strength/Grade" name="product_strength" />
        </div>
        <div className="row">
          <Field label="Batch/Lot Number" name="batch_lot_number" />
          <Field label="Manufacturing Date" name="manufacturing_date" type="date" />
        </div>
        <div className="row">
          <Field label="Expiry Date" name="expiry_date" type="date" />
          <Field label="Quantity Affected" name="quantity_affected" suffix="kg" />
        </div>
      </section>

      <section>
        <h4>3. Complaint Details</h4>
        <div className="row">
          <Field label="Complaint Type" name="complaint_type" />
          <Field label="Complaint Date" name="complaint_date" type="date" />
        </div>
        <div className="field">
          <label>Detailed Complaint Description</label>
          <textarea
            rows={4}
            value={detailedDescription}
            placeholder={status === "loading" ? "Awaiting AI extraction..." : ""}
            disabled={!isEditable}
            onChange={(e) => updateDetailedDescription(e.target.value)}
            onKeyDown={(e) => handleCommentShortcut(e, updateDetailedDescription)}
          />
        </div>
      </section>

      <section>
        <h4>4. Initial Assessment &amp; Priority</h4>
        <div className="row">
          <div className="field">
            <label>Initial Severity</label>
            <select
              value={fields.initial_severity || ""}
              disabled={!isEditable}
              onChange={(e) => dispatch(setField({ name: "initial_severity", value: e.target.value }))}
            >
              <option value="">Awaiting AI extraction...</option>
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select
              value={fields.priority || ""}
              disabled={!isEditable}
              onChange={(e) => dispatch(setField({ name: "priority", value: e.target.value }))}
            >
              <option value="">Awaiting AI extraction...</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </section>

      <div className="actions">
        <button className="btn-secondary" onClick={() => dispatch(resetForm())}>Reset Form</button>
        <button className="btn-primary" disabled={!isEditable} onClick={handleSave}>Save Complaint</button>
      </div>
    </div>
  );
}
