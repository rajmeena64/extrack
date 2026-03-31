import React, { useState, useEffect } from "react";
import "./Analytics.css";

import Calendar from "./Calendar";
import Heatmap from "./heatmap";

import { FaCalendarAlt, FaThLarge } from "react-icons/fa";

function Analytics() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [darkMode, setDarkMode] = useState(false);

  // 🔥 FOLLOW GLOBAL DARK MODE (body class)
  useEffect(() => {
    const checkDark = () => {
      setDarkMode(document.body.classList.contains("dark-mode"));
    };

    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`main-content page ${darkMode ? "dark" : ""}`}>
      
      {/* ===== HEADER ===== */}
      <div className="analytics-topbar">
        <div className="analytics-title">Analytics</div>

        <div className="analytics-tabs">
          <button
            className={`analytics-tab ${
              activeTab === "calendar" ? "active" : ""
            }`}
            onClick={() => setActiveTab("calendar")}
          >
            <FaCalendarAlt />
            <span>Calendar</span>
          </button>

          <button
            className={`analytics-tab ${
              activeTab === "heatmap" ? "active" : ""
            }`}
            onClick={() => setActiveTab("heatmap")}
          >
            <FaThLarge />
            <span>Heatmap</span>
          </button>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="analytics-content">
        {activeTab === "calendar" && <Calendar darkMode={darkMode} />}
        {activeTab === "heatmap" && <Heatmap darkMode={darkMode} />}
      </div>

    </div>
  );
}

export default Analytics;