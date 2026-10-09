import React from "react";
import MainContentWrapper from "@/components/Layout/MainContentWrapper";
import AIAnalysis from "./AIAnalysis";

function AIAnalysisPage({ trades = [], currencyCode = "USD" }) {
  return (
    <MainContentWrapper className="ai-analysis-page flex flex-col h-screen min-h-screen px-0 overflow-hidden">
      <div className="ai-analysis-content flex-1 p-0 min-h-0 overflow-hidden flex flex-col">
        <AIAnalysis trades={trades} currencyCode={currencyCode} />
      </div>
    </MainContentWrapper>
  );
}

export default AIAnalysisPage;
