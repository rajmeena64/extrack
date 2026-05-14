import React, { useState } from "react";
import "./Analytics.css";

import NEWS from "./NEWS";
import Heatmap from "./heatmap";
import AIAnalysis from "./AIAnalysis";

import { Calendar, Ratio, ChartBar } from "../Common/icons";

function Analytics({ trades = [], currencyCode = "USD" }) {
  const [activeTab, setActiveTab] = useState("calendar");
  // const [darkMode, setDarkMode] = useState(false);
  const IconSize= 15;

  // 🔥 FOLLOW GLOBAL DARK MODE (body class)
  // useEffect(() => {
  //   const checkDark = () => {
  //     setDarkMode(document.body.classList.contains("dark-mode"));
  //   };

  //   checkDark();

  //   const observer = new MutationObserver(checkDark);
  //   observer.observe(document.body, {
  //     attributes: true,
  //     attributeFilter: ["class"],
  //   });

  //   return () => observer.disconnect();
  // }, []);

  return (
    <div className= "main-content" >
      
      {/* ===== HEADER ===== */}
      <div className="analytics-topbar app-page-header">
        <div className="app-page-header__left">
          <h1 className="analytics-title app-page-title">Analytics</h1>
        </div>

        <div className="analytics-tabs app-page-header__right">
          <button
            className={`analytics-tab ${
              activeTab === "calendar" ? "active" : ""
            }`}
            onClick={() => setActiveTab("calendar")}
          >
            <Calendar size={IconSize} />
            <span>Calendar</span>
          </button>

          <button
            className={`analytics-tab ${
              activeTab === "heatmap" ? "active" : ""
            }`}
            onClick={() => setActiveTab("heatmap")}
          >
            <Ratio size={IconSize} />
            <span>Heatmap</span>
          </button>

          <button
            className={`analytics-tab ${
              activeTab === "ai" ? "active" : ""
            }`}
            onClick={() => setActiveTab("ai")}
          >
            <ChartBar size={IconSize} />
            <span>AI Analysis</span>
          </button>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="analytics-content">
        {activeTab === "calendar" && <NEWS />}
        {activeTab === "heatmap" && <Heatmap />}
        {activeTab === "ai" && <AIAnalysis trades={trades} currencyCode={currencyCode} />}
      </div>

    </div>
  );
}

export default Analytics;
