import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, Tag, TagGroup, TagList, Slider } from "@/components/ui";
import { REVIEW_TAG_OPTIONS } from "../../constants/tradeConstants";

import { formatCurrency } from "@/utils/user/Currency";

function RatingRow({ label, score, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2 mt-2.5 text-xs font-semibold text-[var(--text-primary)]">
      <span>{label}</span>
      <div className="flex gap-0.5" aria-label={`${score} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star} type="button"
            className={`p-0 border-0 bg-transparent text-[var(--border-medium)] text-lg leading-none cursor-pointer hover:text-[var(--accent-rating)] transition-colors ${star <= score ? "text-[var(--accent-rating)]" : ""}`}
            onClick={() => onChange(star)} aria-label={`${label}: ${star} out of 5`}
          >★</button>
        ))}
      </div>
    </div>
  );
}

function ExecutionScaleControl({ score, onSave }) {
  const [localScore, setLocalScore] = useState(score);
  useEffect(() => { setLocalScore(score); }, [score]);
  const label = localScore >= 75 ? "Great" : localScore >= 45 ? "Average" : "Needs work";
  const color = localScore >= 75 ? "var(--accent-success-strong)" : localScore >= 45 ? "var(--accent-rating)" : "var(--accent-danger)";

  return (
    <div className="mt-3.5 pt-3 border-t border-[var(--border-light)]">
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
        <span>Execution Scale</span>
        <strong className="text-xs font-semibold" style={{ color }}>{label} · {localScore}</strong>
      </div>
      <div className="py-2">
        <Slider
          aria-label="Execution Scale" minValue={0} maxValue={100} step={1} value={localScore} showFillTrack={false}
          trackStyle={{ background: "linear-gradient(to right, var(--accent-danger), var(--accent-rating) 50%, var(--accent-success-strong))" }}
          onChange={(val) => setLocalScore(Array.isArray(val) ? val[0] : val)}
          onChangeEnd={(val) => onSave(Array.isArray(val) ? val[0] : val)}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-medium mt-1">
        <span className="text-[var(--accent-danger)]">Poor</span>
        <span className="text-[var(--accent-rating)]">Average</span>
        <span className="text-[var(--accent-success-strong)]">Great</span>
      </div>
    </div>
  );
}

function TagField({ label, value, tone, options = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const fieldRef = useRef(null);
  const tags = String(value || "").split(",").map((t) => t.trim()).filter(Boolean);
  const update = (next) => onChange(next.join(", "));
  const add = (t) => {
    const clean = t.trim().slice(0, 40);
    if (!clean || tags.some((i) => i.toLowerCase() === clean.toLowerCase())) return;
    update([...tags, clean]);
    setCustomTag("");
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!fieldRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const dotCls = tone === "mistake" ? "text-fg-error-primary" : "text-fg-tertiary";

  return (
    <div ref={fieldRef} className="mt-2.5">
      <span className="block mb-1 text-[var(--text-primary)] text-xs font-semibold">{label}</span>
      <div className="relative min-h-[38px] p-1.5 border border-[var(--border-light)] rounded-md bg-[var(--bg-secondary)]">
        {tags.length > 0 && (
          <TagGroup label={label} size="sm">
            <TagList className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Tag key={tag} id={tag} dot dotClassName={dotCls} onClose={() => update(tags.filter((item) => item !== tag))}>
                  {tag.replaceAll("_", " ")}
                </Tag>
              ))}
            </TagList>
          </TagGroup>
        )}
        <button
          className="flex w-full items-center justify-between mt-1 p-1 border-0 outline-none bg-transparent text-[var(--text-secondary)] text-xs cursor-pointer hover:text-[var(--text-primary)] transition-colors"
          type="button" onClick={() => setOpen((c) => !c)} aria-expanded={open}
        >
          <span>{tags.length ? `Add ${label}` : `Select ${label}`}</span>
          <span aria-hidden="true">⌄</span>
        </button>
        {open && (
          <div className="absolute z-20 top-[calc(100%+4px)] inset-x-0 p-2 border border-[var(--border-medium)] rounded-lg bg-[var(--surface-elevated)] shadow-lg">
            <div className="flex gap-1.5 mb-2">
              <input
                className="min-w-0 flex-1 px-2 py-1.5 border border-[var(--border-light)] rounded-md outline-none bg-[var(--surface-subtle)] text-[var(--text-primary)] text-xs focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)]"
                value={customTag} maxLength={40} placeholder={`Create ${label}`} onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(customTag); }}
              />
              <button
                className="px-2.5 py-1.5 border border-[color-mix(in_srgb,var(--accent-success-strong)_34%,var(--button-bg)_66%)] rounded-md bg-gradient-to-br from-[var(--button-bg)] to-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] text-[var(--button-text)] text-xs font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                type="button" onClick={() => add(customTag)} disabled={!customTag.trim()}
              >
                Add
              </button>
            </div>
            <div className="flex max-h-[120px] flex-wrap gap-1.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TagGroup label={`Select ${label}`} size="sm">
                <TagList className="flex flex-wrap gap-1">
                  {options.filter((o) => !tags.includes(o)).map((opt) => (
                    <Tag key={opt} id={opt} dot dotClassName={dotCls} className="cursor-pointer hover:opacity-80 transition-opacity" onAction={() => add(opt)} onClick={() => add(opt)}>
                      {opt}
                    </Tag>
                  ))}
                </TagList>
              </TagGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TradeReviewPanel({ trade, runningStats, onSaveDraft }) {
  const getValues = (t) => ({
    stop_loss: t?.stop_loss ?? "", take_profit: t?.take_profit ?? "", mistakes: t?.mistakes ?? "",
    custom_tags: t?.custom_tags ?? "", trade_quality: t?.trade_quality ?? "", trade_rating: t?.trade_rating ?? "", execution_score: t?.execution_score ?? "",
  });

  const [reviewValues, setReviewValues] = useState(() => getValues(trade));
  useEffect(() => { if (trade) setReviewValues(getValues(trade)); }, [trade]);

  const handleChange = (field, value) => {
    setReviewValues((prev) => ({ ...prev, [field]: value }));
    if (onSaveDraft) onSaveDraft({ [field]: value });
  };

  const currentQuality = Number(reviewValues.trade_quality) || 0;
  const currentRating = Number(reviewValues.trade_rating) || 0;
  const currentExec = Number(reviewValues.execution_score) || (runningStats?.capture ? Math.round(runningStats.capture) : 0);

  const roi = trade?.priceMovePercent ?? null;
  const gross = trade?.grossPnl != null ? Number(trade.grossPnl) : null;
  const target = trade?.takeProfit;
  const stop = trade?.stopLoss;

  const reviewMetrics = [
    { label: "Commissions & Fees", value: trade?.totalCharges != null ? formatCurrency(trade.totalCharges, trade?.pnlCurrency) : "Not recorded" },
    { label: "Price ROI", value: roi == null ? "Not recorded" : `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`, tone: roi >= 0 ? "profit" : "loss" },
    { label: "Gross P&L", value: gross != null ? formatCurrency(gross, trade?.pnlCurrency) : "Not recorded", tone: gross != null && gross >= 0 ? "profit" : "loss" },
    { label: "Position Value", value: trade?.positionValue != null ? formatCurrency(trade.positionValue, trade?.pnlCurrency) : "Not recorded" },
    { label: "Profit Target", value: target != null && target !== "" ? target : "Not recorded", tone: "profit" },
    { label: "Stop Loss", value: stop != null && stop !== "" ? stop : "Not recorded", tone: "loss" },
    { label: "Initial Target", value: trade?.initialTarget != null ? formatCurrency(trade.initialTarget, trade?.pnlCurrency) : "Not recorded", tone: "profit" },
    { label: "Trade Risk", value: trade?.tradeRisk != null ? formatCurrency(trade.tradeRisk, trade?.pnlCurrency) : "Not recorded", tone: "loss" },
    { label: "Planned R-Multiple", value: trade?.plannedRMultiple != null ? `${Number(trade.plannedRMultiple).toFixed(2)}R` : "Not recorded" },
    { label: "Realized R-Multiple", value: trade?.realizedRMultiple != null ? `${Number(trade.realizedRMultiple).toFixed(2)}R` : "Not recorded" },
    ...(runningStats ? [{ label: "MAE / MFE", value: `${formatCurrency(runningStats.adverse, trade?.pnlCurrency)} / ${formatCurrency(runningStats.favorable, trade?.pnlCurrency)}` }] : []),
  ];

  return (
    <aside className="flex min-w-0 h-full flex-col gap-2.5 overflow-hidden max-lg:h-auto max-lg:overflow-visible">
      <Card variant="default" padding="sm" className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-lg:overflow-visible">
        <CardHeader className="pb-2.5 mb-2.5"><CardTitle>Review &amp; Performance</CardTitle></CardHeader>
        <div className="grid grid-cols-1 gap-3.5 min-h-0 flex-none">
          <div className="flex flex-col">
            {reviewMetrics.map((m) => (
              <div key={m.label} className="flex min-w-0 items-center justify-between gap-1.5 py-1.5 border-b border-[var(--border-light)] last:border-b-0">
                <span className="text-xs text-[var(--text-secondary)] font-normal">{m.label}</span>
                <strong className={`text-xs font-semibold whitespace-nowrap ${m.tone === "profit" ? "text-[var(--profit-color)]" : m.tone === "loss" ? "text-[var(--loss-color)]" : "text-[var(--text-primary)]"}`}>
                  {m.value}
                </strong>
              </div>
            ))}
          </div>
          <div className="min-w-0 flex flex-col gap-1">
            {[["Mistakes", "mistakes", "mistake"], ["Custom Tags", "custom_tags", "tag"]].map(([lbl, fld, tone]) => (
              <TagField key={fld} label={lbl} value={reviewValues[fld]} tone={tone} options={REVIEW_TAG_OPTIONS[fld]} onChange={(v) => handleChange(fld, v)} />
            ))}
            <RatingRow label="Trade Quality" score={currentQuality} onChange={(s) => handleChange("trade_quality", s)} />
            <RatingRow label="Trade Rating" score={currentRating} onChange={(s) => handleChange("trade_rating", s)} />
          </div>
        </div>
        <ExecutionScaleControl score={currentExec} onSave={(s) => handleChange("execution_score", s)} />
      </Card>
    </aside>
  );
}
