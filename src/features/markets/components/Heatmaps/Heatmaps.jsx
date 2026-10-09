import React from "react";
import { useNavigate } from "react-router-dom";
import Heatmap from "./Heatmap";
import MainContentWrapper from "@/components/Layout/MainContentWrapper";
import PageHeader from "@/components/Layout/PageHeader";

function Heatmaps() {
  const navigate = useNavigate();

  return (
    <MainContentWrapper className="heatmaps-page flex flex-col h-screen min-h-screen !px-0 overflow-hidden [&_.app-page-header]:!mx-0">
      <PageHeader
        title="Heatmaps"
        onBack={() => navigate(-1)}
      />

      <div className="heatmaps-content flex-1 p-0 min-h-0 overflow-hidden flex flex-col">
        <Heatmap />
      </div>
    </MainContentWrapper>
  );
}

export default Heatmaps;
