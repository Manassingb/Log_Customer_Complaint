import React from "react";
import ComplaintForm from "./components/ComplaintForm";
import AIAssistant from "./components/AIAssistant";
import "./styles.css";

export default function App() {
  return (
    <div className="app-shell">
      <ComplaintForm />
      <AIAssistant />
    </div>
  );
}
