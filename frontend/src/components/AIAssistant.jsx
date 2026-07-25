import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  startExtraction,
  setExtractionProgress,
  applyExtractionResult,
  extractionFailed,
  addChatMessage,
} from "../store/complaintSlice";
import { extractFromFile, extractFromText, chatWithAssistant } from "../api";
import { handleCommentShortcut } from "../utils/commentShortcut";

export default function AIAssistant() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [pastedText, setPastedText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  const status = useSelector((s) => s.complaint.extractionStatus);
  const progress = useSelector((s) => s.complaint.extractionProgress);
  const messages = useSelector((s) => s.complaint.chatMessages);
  const summary = useSelector((s) => s.complaint.aiSummary);
  const risk = useSelector((s) => s.complaint.aiRiskClassification);
  const riskRationale = useSelector((s) => s.complaint.aiRiskRationale);
  const completeness = useSelector((s) => s.complaint.completenessScore);
  const missingFields = useSelector((s) => s.complaint.missingFields);
  const isDuplicate = useSelector((s) => s.complaint.isPossibleDuplicate);
  const fields = useSelector((s) => s.complaint.fields);

  const runProgressAnimation = () => {
    let pct = 10;
    const interval = setInterval(() => {
      pct = Math.min(pct + 15, 90);
      dispatch(setExtractionProgress(pct));
      if (pct >= 90) clearInterval(interval);
    }, 400);
    return () => clearInterval(interval);
  };

  const getApiErrorMessage = (err) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg || item.message).join(", ");
    return "Please check the backend logs and try again.";
  };

  const handleExtractResult = (data) => {
    dispatch(applyExtractionResult(data));
    dispatch(addChatMessage({
      role: "assistant",
      text: `Extraction complete (${data.completeness_score}% complete). Risk classified as ${data.risk_classification}. ${data.is_possible_duplicate ? "This may be a duplicate of an existing complaint." : ""}`,
    }));
  };

  const extractFile = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Max file size is 10MB.");
      return;
    }

    const allowedExtensions = [".pdf", ".docx", ".txt", ".eml"];
    const fileName = file.name.toLowerCase();
    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      alert("Supported formats are PDF, DOCX, TXT, and EML.");
      return;
    }

    dispatch(startExtraction());
    const stop = runProgressAnimation();
    try {
      const res = await extractFromFile(file);
      stop();
      handleExtractResult(res.data);
    } catch (err) {
      stop();
      dispatch(extractionFailed());
      dispatch(addChatMessage({ role: "assistant", text: `Sorry, extraction failed. ${getApiErrorMessage(err)}` }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    await extractFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    await extractFile(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragActive(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    dispatch(startExtraction());
    const stop = runProgressAnimation();
    try {
      const res = await extractFromText(pastedText);
      stop();
      handleExtractResult(res.data);
      setShowPaste(false);
      setPastedText("");
    } catch (err) {
      stop();
      dispatch(extractionFailed());
      dispatch(addChatMessage({ role: "assistant", text: `Sorry, extraction failed. ${getApiErrorMessage(err)}` }));
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    dispatch(addChatMessage({ role: "user", text: userMsg }));
    setChatInput("");
    try {
      const res = await chatWithAssistant(userMsg, fields);
      dispatch(addChatMessage({ role: "assistant", text: res.data.reply }));
    } catch (err) {
      dispatch(addChatMessage({ role: "assistant", text: "Sorry, I couldn't process that right now." }));
    }
  };

  return (
    <div className="panel ai-panel">
      <div className="panel-header">
        <h3>✨ AI Complaint Intake Assistant</h3>
        <span className="badge badge-blue">BETA</span>
      </div>

      {!showPaste ? (
        <div
          className={`dropzone ${isDragActive ? "drag-active" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p>⬆️ Drag &amp; drop complaint document here</p>
          <p className="link">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,.docx,.txt,.eml"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="paste-box">
          <textarea
            rows={5}
            placeholder="Paste complaint email or text here..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            onKeyDown={(e) => handleCommentShortcut(e, setPastedText)}
          />
          <button className="btn-primary" onClick={handlePasteSubmit}>Extract</button>
        </div>
      )}

      <div className="or-divider">OR</div>
      <button className="btn-outline full" onClick={() => setShowPaste((v) => !v)}>
        📄 Paste Complaint Text / Email
      </button>

      <p className="hint">Supported formats: PDF, DOCX, TXT, EML · Max file size: 10MB</p>

      {status === "loading" && (
        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
          <p className="hint">Analyzing document content and extracting key details... Please wait.</p>
        </div>
      )}

      {status === "done" && (
        <div className="ai-results">
          <div className="result-row"><strong>Completeness:</strong> {completeness}%</div>
          {missingFields?.length > 0 && (
            <div className="result-row"><strong>Missing:</strong> {missingFields.join(", ")}</div>
          )}
          <div className="result-row"><strong>Risk:</strong> <span className={`risk-tag risk-${(risk || "").toLowerCase()}`}>{risk}</span></div>
          {riskRationale && <div className="result-row hint">{riskRationale}</div>}
          {isDuplicate && <div className="result-row warn">⚠ Possible duplicate of an existing complaint</div>}
          {summary && <div className="result-row"><strong>Summary:</strong> {summary}</div>}
        </div>
      )}

      <div className="chat-section">
        <h4>AI Assistant</h4>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            placeholder="Ask me anything about this complaint..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
          />
          <button onClick={handleChatSend}>➤</button>
        </div>
        <p className="hint">AI responses may contain errors. Please verify information.</p>
      </div>
    </div>
  );
}
