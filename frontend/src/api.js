import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export const api = axios.create({ baseURL: API_BASE });

export const extractFromFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/api/ai/extract/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const extractFromText = (text) => api.post("/api/ai/extract/text", { text });

export const chatWithAssistant = (message, complaint_context) =>
  api.post("/api/ai/chat", { message, complaint_context });

export const saveComplaint = (payload) => api.post("/api/complaints/", payload);
