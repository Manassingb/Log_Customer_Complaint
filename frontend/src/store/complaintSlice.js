import { createSlice } from "@reduxjs/toolkit";

const initialFields = {
  complaint_source: "",
  customer_name: "",
  product_name: "",
  product_strength: "",
  batch_lot_number: "",
  manufacturing_date: "",
  expiry_date: "",
  quantity_affected: "",
  complaint_type: "",
  complaint_date: "",
  detailed_description: "",
  initial_severity: "",
  priority: "",
};

const initialState = {
  fields: initialFields,
  aiSummary: null,
  aiRiskClassification: null,
  aiRiskRationale: null,
  completenessScore: null,
  missingFields: [],
  isPossibleDuplicate: false,
  extractionStatus: "idle", // idle | loading | done | error
  extractionProgress: 0,
  chatMessages: [
    {
      role: "assistant",
      text: "Upload a complaint document or paste text above. I will automatically extract the details and populate the form for you.",
    },
  ],
};

const complaintSlice = createSlice({
  name: "complaint",
  initialState,
  reducers: {
    setField(state, action) {
      const { name, value } = action.payload;
      state.fields[name] = value;
    },
    resetForm(state) {
      state.fields = initialFields;
      state.aiSummary = null;
      state.aiRiskClassification = null;
      state.aiRiskRationale = null;
      state.completenessScore = null;
      state.missingFields = [];
      state.isPossibleDuplicate = false;
      state.extractionStatus = "idle";
      state.extractionProgress = 0;
    },
    startExtraction(state) {
      state.extractionStatus = "loading";
      state.extractionProgress = 10;
    },
    setExtractionProgress(state, action) {
      state.extractionProgress = action.payload;
    },
    applyExtractionResult(state, action) {
      const r = action.payload;
      Object.keys(state.fields).forEach((key) => {
        if (r.extracted_fields && r.extracted_fields[key] !== undefined && r.extracted_fields[key] !== null) {
          state.fields[key] = r.extracted_fields[key];
        }
      });
      state.aiSummary = r.summary;
      state.aiRiskClassification = r.risk_classification;
      state.aiRiskRationale = r.risk_rationale;
      state.completenessScore = r.completeness_score;
      state.missingFields = r.missing_fields || [];
      state.isPossibleDuplicate = r.is_possible_duplicate;
      state.extractionStatus = "done";
      state.extractionProgress = 100;

      if (r.risk_classification) {
        state.fields.initial_severity = r.risk_classification;
      }
    },
    extractionFailed(state) {
      state.extractionStatus = "error";
      state.extractionProgress = 0;
    },
    addChatMessage(state, action) {
      state.chatMessages.push(action.payload);
    },
  },
});

export const {
  setField,
  resetForm,
  startExtraction,
  setExtractionProgress,
  applyExtractionResult,
  extractionFailed,
  addChatMessage,
} = complaintSlice.actions;

export default complaintSlice.reducer;
