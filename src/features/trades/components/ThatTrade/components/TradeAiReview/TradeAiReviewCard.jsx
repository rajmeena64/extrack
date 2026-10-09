import React, { useState, useEffect, useRef } from "react";
import { ChartLine, Maximize2, Minimize2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import api from "@/utils/common/serve";
import { useAuth } from "@/context/AuthContext";
import { useAppDialog } from "@/context/AppDialogContext";
import { useQueryClient } from "@tanstack/react-query";

export default function TradeAiReviewCard({ trade, pnlCurrency = "USD", onSaveDraft }) {
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();

  const [aiAnalysis, setAiAnalysis] = useState(trade?.review_summary || "");
  const [aiDraft, setAiDraft] = useState(trade?.review_summary || "");
  const [aiError, setAiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const s = trade?.review_summary || "";
    setAiAnalysis(s);
    setAiDraft(s);
  }, [trade?.review_summary]);

  const generateReview = async () => {
    if (!trade) return;
    setAiError("");
    setLoading(true);
    try {
      const { data } = await api.post("/ai-trade-analysis", {
        date: trade?.isoDate,
        selectedUniqueId: trade.unique_id,
        currencyCode: pnlCurrency,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        analysisMode: "single-trade",
      });
      if (!data?.success) throw new Error(data?.error || "AI trade analysis failed.");
      const res = data.analysis || "";
      setAiAnalysis(res);
      setAiDraft(res);
      if (user?.ID) queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
      notify("AI review generated successfully.", "success");
    } catch (err) {
      setAiError(err?.response?.data?.error || err?.message || "AI trade analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const saveReview = async () => {
    const trimmed = aiDraft.trim();
    setSaving(true);
    try {
      setAiAnalysis(trimmed);
      setEditing(false);
      if (onSaveDraft) onSaveDraft({ review_summary: trimmed });
      notify("Review summary updated.", "success");
    } finally {
      setSaving(false);
    }
  };

  const toggleFs = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await cardRef.current?.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {}
  };

  const btnCls = "bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <Card variant="default" padding="sm" className="min-w-0 flex flex-col min-h-0 flex-1 [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:p-6 [&:fullscreen]:rounded-none [&:fullscreen]:border-0" ref={cardRef}>
      <CardHeader className="pb-2.5 mb-2 max-sm:flex-col max-sm:items-start max-sm:gap-2">
        <div>
          <CardDescription className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">AI post-trade analysis</CardDescription>
          <CardTitle className="text-sm font-semibold text-[var(--text-primary)] m-0 mt-0.5 flex items-center gap-2"><ChartLine className="w-4 h-4" /> AI Trade Review</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button className={btnCls} type="button" onClick={() => { setAiDraft(aiAnalysis); setEditing(false); }} disabled={saving}>Cancel</button>
              <button className={btnCls} type="button" onClick={saveReview} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </>
          ) : (
            <>
              <button className={btnCls} type="button" onClick={generateReview} disabled={loading}>{loading ? "Generating..." : "Generate AI review"}</button>
              {aiAnalysis && <button className={btnCls} type="button" onClick={() => setEditing(true)}>Edit</button>}
            </>
          )}
          <button className="inline-flex w-7.5 h-7.5 items-center justify-center p-0 border border-[var(--border-light)] rounded-lg text-[var(--text-secondary)] bg-transparent hover:text-[var(--accent-ink)] hover:bg-[var(--bg-hover)] cursor-pointer" type="button" onClick={toggleFs} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>
      {aiError && <div className="text-xs text-[var(--accent-danger)] mb-2">{aiError}</div>}
      <div className={`min-h-[96px] max-h-[360px] overflow-y-auto p-3 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1 ${!aiAnalysis ? "text-[var(--text-secondary)]" : ""} ${editing ? "p-0" : ""}`}>
        {editing ? (
          <textarea className="w-full h-full min-h-[150px] p-3 resize-none border-0 outline-none text-[var(--text-primary)] bg-transparent text-xs leading-relaxed" value={aiDraft} onChange={(e) => setAiDraft(e.target.value)} maxLength={20000} aria-label="Edit review summary" />
        ) : aiAnalysis ? (
          <pre className="whitespace-pre-wrap font-sans m-0">{aiAnalysis}</pre>
        ) : (
          "Add an attachment for chart reading, or generate an AI review from the available trade data."
        )}
      </div>
    </Card>
  );
}
