function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
  }
}

class TradeMarkerPaneRenderer {
  constructor(points, mousePoint, pairs = []) {
    this._points = points;
    this._mousePoint = mousePoint;
    this._pairs = pairs;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const ratio = scope.horizontalPixelRatio;
      const canvasWidth = scope.mediaSize.width * ratio;

      if (this._pairs.length > 0) {
        ctx.save();
        ctx.setLineDash([4 * ratio, 3 * ratio]);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
        ctx.lineWidth = 1.2 * ratio;
        this._pairs.forEach(({ entry, exit }) => {
          if (entry.x != null && entry.y != null && exit.x != null && exit.y != null) {
            ctx.beginPath();
            ctx.moveTo(entry.x * ratio, entry.y * ratio);
            ctx.lineTo(exit.x * ratio, exit.y * ratio);
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      let hoveredPoint = null;

      this._points.forEach((point) => {
        if (point.x === null || point.y === null) return;

        const x = point.x * ratio;
        const y = point.y * ratio;
        const r = point.radius * ratio;

        if (this._mousePoint && this._mousePoint.x != null && this._mousePoint.y != null) {
          const mouseX = this._mousePoint.x * ratio;
          const mouseY = this._mousePoint.y * ratio;
          const dist = Math.hypot(mouseX - x, mouseY - y);
          if (dist <= r + 6 * ratio) {
            hoveredPoint = { ...point, x, y, r };
          }
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = point.color;
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 4 * ratio;
        ctx.shadowOffsetY = 1 * ratio;
        ctx.fill();

        ctx.lineWidth = 1.5 * ratio;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.restore();

        const arrowSize = r * 0.45;
        ctx.beginPath();
        ctx.fillStyle = "#ffffff";

        if (point.direction === "up") {
          ctx.moveTo(x, y - arrowSize);
          ctx.lineTo(x + arrowSize * 0.75, y + arrowSize * 0.55);
          ctx.lineTo(x - arrowSize * 0.75, y + arrowSize * 0.55);
        } else {
          ctx.moveTo(x, y + arrowSize);
          ctx.lineTo(x + arrowSize * 0.75, y - arrowSize * 0.55);
          ctx.lineTo(x - arrowSize * 0.75, y - arrowSize * 0.55);
        }
        ctx.closePath();
        ctx.fill();
      });

      // fallback-allow: marker tooltip label or price check
      if (hoveredPoint && (hoveredPoint.label || hoveredPoint.price != null)) {
        const rawText = String(hoveredPoint.label || `@ ${hoveredPoint.price}`);
        const text = rawText.startsWith("@") ? rawText : `@ ${rawText}`;

        ctx.font = `600 ${11 * ratio}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const textMetrics = ctx.measureText(text);
        const paddingX = 8 * ratio;
        const paddingY = 4 * ratio;
        const boxWidth = textMetrics.width + paddingX * 2;
        const boxHeight = 18 * ratio + paddingY * 2;
        const caretHeight = 5 * ratio;

        let boxY = hoveredPoint.y - hoveredPoint.r - boxHeight - caretHeight - (2 * ratio);
        let caretDirection = "down";
        if (boxY < 5 * ratio) {
          boxY = hoveredPoint.y + hoveredPoint.r + caretHeight + (2 * ratio);
          caretDirection = "up";
        }

        let boxX = hoveredPoint.x - boxWidth / 2;
        if (boxX < 5 * ratio) {
          boxX = 5 * ratio;
        } else if (boxX + boxWidth > canvasWidth - 5 * ratio) {
          boxX = canvasWidth - 5 * ratio - boxWidth;
        }

        const caretX = Math.max(boxX + 6 * ratio, Math.min(boxX + boxWidth - 6 * ratio, hoveredPoint.x));
        const cornerRadius = 4 * ratio;

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 6 * ratio;
        ctx.shadowOffsetY = 2 * ratio;

        ctx.beginPath();
        drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, cornerRadius);
        ctx.fillStyle = "#1e222d";
        ctx.fill();

        ctx.shadowColor = "transparent";

        ctx.lineWidth = 1.5 * ratio;
        ctx.strokeStyle = hoveredPoint.color || "#2962ff";
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = "#1e222d";
        ctx.strokeStyle = hoveredPoint.color || "#2962ff";
        ctx.lineWidth = 1.5 * ratio;

        if (caretDirection === "down") {
          const caretTop = boxY + boxHeight;
          ctx.moveTo(caretX - 4 * ratio, caretTop - 1 * ratio);
          ctx.lineTo(caretX, caretTop + caretHeight);
          ctx.lineTo(caretX + 4 * ratio, caretTop - 1 * ratio);
        } else {
          const caretBottom = boxY;
          ctx.moveTo(caretX - 4 * ratio, caretBottom + 1 * ratio);
          ctx.lineTo(caretX, caretBottom - caretHeight);
          ctx.lineTo(caretX + 4 * ratio, caretBottom + 1 * ratio);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, boxX + boxWidth / 2, boxY + boxHeight / 2);

        ctx.restore();
      }
    });
  }
}

class TradeMarkerPaneView {
  constructor(source) {
    this._source = source;
  }

  update() {}

  renderer() {
    const chart = this._source._chart;
    const series = this._source._series;
    if (!chart || !series) return new TradeMarkerPaneRenderer([], null, []);

    const timeScale = chart.timeScale();

    const points = this._source._markers.map((marker) => {
      const baseX = timeScale.timeToCoordinate(marker.time);
      return {
        x: baseX != null ? baseX + (marker.offsetX || 0) : null,
        y: series.priceToCoordinate(marker.price),
        price: marker.price,
        label: marker.label,
        color: marker.color,
        direction: marker.direction,
        radius: marker.radius != null ? marker.radius : 9,
        tradeId: marker.tradeId,
        isEntry: marker.isEntry,
        isExit: marker.isExit,
      };
    });

    const pairs = [];
    const entries = new Map();
    points.forEach((p) => {
      if (p.tradeId && p.isEntry) entries.set(p.tradeId, p);
    });
    points.forEach((p) => {
      if (p.tradeId && p.isExit && entries.has(p.tradeId)) {
        pairs.push({ entry: entries.get(p.tradeId), exit: p });
      }
    });

    return new TradeMarkerPaneRenderer(points, this._source._mousePoint, pairs);
  }
}

export class TradeMarkerPrimitive {
  constructor() {
    this._markers = [];
    this._chart = null;
    this._series = null;
    this._mousePoint = null;
    this._isHovering = false;
    this._paneViews = [new TradeMarkerPaneView(this)];
    this._onCrosshairMove = this._onCrosshairMove.bind(this);
  }

  _onCrosshairMove(param) {
    if (!param || !param.point) {
      if (this._mousePoint !== null || this._isHovering) {
        this._mousePoint = null;
        if (this._isHovering) {
          this._isHovering = false;
          this._updateCrosshair(false);
        }
        this._updateCursor(false);
        if (this._chart) {
          this._chart.applyOptions({});
        }
      }
      return;
    }
    this._mousePoint = param.point;
    const isHovering = this._checkHover(param.point);

    if (this._isHovering !== isHovering) {
      this._isHovering = isHovering;
      this._updateCrosshair(isHovering);
      this._updateCursor(isHovering);
    }

    if (this._chart) {
      this._chart.applyOptions({});
    }
  }

  _checkHover(point) {
    if (!this._chart || !this._series) return false;
    const timeScale = this._chart.timeScale();
    const series = this._series;
    return this._markers.some((marker) => {
      const baseX = timeScale.timeToCoordinate(marker.time);
      if (baseX == null) return false;
      const mx = baseX + (marker.offsetX || 0);
      const my = series.priceToCoordinate(marker.price);
      if (my == null) return false;
      const radius = marker.radius != null ? marker.radius : 9;
      return Math.hypot(point.x - mx, point.y - my) <= radius + 6;
    });
  }

  _updateCrosshair(isHovering) {
    if (!this._chart) return;
    try {
      if (isHovering) {
        this._chart.applyOptions({
          crosshair: {
            mode: 2, // CrosshairMode.Hidden
            vertLine: { visible: false },
            horzLine: { visible: false },
          },
        });
      } else {
        this._chart.applyOptions({
          crosshair: {
            mode: 0, // CrosshairMode.Normal
            vertLine: { visible: true },
            horzLine: { visible: true },
          },
        });
      }
    } catch (e) {
    }
  }

  _updateCursor(isHovering) {
    if (!this._chart) return;
    try {
      const container = typeof this._chart.chartElement === "function" ? this._chart.chartElement() : null;
      if (container) {
        container.style.cursor = isHovering ? "pointer" : "";
      }
    } catch (e) {
    }
  }

  attached({ chart, series }) {
    this._chart = chart;
    this._series = series;
    if (this._chart) {
      this._chart.subscribeCrosshairMove(this._onCrosshairMove);
    }
  }

  detached() {
    if (this._chart) {
      if (this._isHovering) {
        this._updateCrosshair(false);
      }
      this._chart.unsubscribeCrosshairMove(this._onCrosshairMove);
    }
    this._chart = null;
    this._series = null;
    this._mousePoint = null;
    this._isHovering = false;
  }

  updateAllViews() {
    this._paneViews.forEach((view) => view.update());
  }

  paneViews() {
    return this._paneViews;
  }

  setMarkers(markers) {
    this._markers = markers;
    if (this._chart) {
      this._chart.applyOptions({});
    }
  }
}
