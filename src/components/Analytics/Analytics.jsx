import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Analytics.css";

import Heatmap from "./heatmap";
import AIAnalysis from "./AIAnalysis";

import { Ratio, ChartBar } from "../Common/icons";
import MainContentWrapper from "../Layout/MainContentWrapper";
import PageHeader from "../Layout/PageHeader";

function Analytics({ trades = [], currencyCode = "USD" }) {
  const [activeTab, setActiveTab] = useState("heatmap");
  const navigate = useNavigate();
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
    <MainContentWrapper className="analytics-page">
        <PageHeader
          title="Analytics"
          onBack={() => navigate(-1)}
          actions={(
            <div className="analytics-tabs">
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
          )}
        />

        {/* ===== CONTENT ===== */}
        <div className="analytics-content">
          {activeTab === "heatmap" && <Heatmap />}
          {activeTab === "ai" && <AIAnalysis trades={trades} currencyCode={currencyCode} />}
        </div>
    </MainContentWrapper>
  );
}

export default Analytics;
