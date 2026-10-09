import React from "react";
import { Badge, Tag, TagGroup, TagList } from "@/components/ui";

export const renderTradeTypeBadge = (value) => {
  const isShort = String(value || "").toLowerCase().includes("short");
  const isLong = String(value || "").toLowerCase().includes("long");
  return (
    <Badge
      variant={isLong ? "success" : isShort ? "destructive" : "secondary"}
      className="min-w-[42px] min-h-[21px] px-2 py-0.5 text-[11px] font-bold leading-none tracking-wide uppercase"
    >
      {value || "--"}
    </Badge>
  );
};

export const renderRatingScale = (value) => {
  const rating = Math.max(0, Math.min(5, Math.round(Number(value))));
  if (!Number.isFinite(Number(value))) return "--";
  return (
    <span className="inline-flex items-center gap-0.5 select-none" aria-label={`${rating} out of 5`} title={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <span key={step} className={`text-[17px] leading-none ${step <= rating ? "text-[var(--accent-rating,#f59e0b)]" : "text-[var(--border-medium)]"}`}>
          ★
        </span>
      ))}
    </span>
  );
};

export const renderTags = (value, type = "neutral") => {
  if (value === null || value === undefined || value === "") return "--";
  const tagsList = Array.isArray(value) ? value.map(String).filter(Boolean) : String(value).split(",").map((t) => t.trim()).filter(Boolean);
  if (tagsList.length === 0) return "--";
  const dotColorClass = type === "strategy" ? "text-fg-brand-primary" : type === "mistake" ? "text-fg-error-primary" : "text-fg-tertiary";
  return (
    <TagGroup label="Trade Tags" size="sm">
      <TagList className="flex flex-wrap gap-1">
        {tagsList.map((tag) => (
          <Tag key={tag} id={`tag-${type}-${tag}`} dot dotClassName={dotColorClass}>
            {tag.replaceAll("_", " ")}
          </Tag>
        ))}
      </TagList>
    </TagGroup>
  );
};

export const displayValue = (value) =>
  value === null || value === undefined || value === "" ? "--" : String(value).replaceAll("_", " ");
