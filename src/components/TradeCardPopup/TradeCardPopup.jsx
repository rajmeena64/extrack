// src/components/TradeCardPopup/TradeCardPopup.jsx
import React from "react";

const TradeCardPopup = ({ tradeId, userId, onClose }) => {
  if (!tradeId) return null;

  return (
    <div id="trade-card-popup" className="popup">
      <div style={{ position: "relative" }}>
        <button
          className="popup-close-btn"
          onClick={onClose}
        >
          ✕
        </button>
        <iframe
          src={`js/card.html?tradeId=${tradeId}&userId=${userId}`}
          frameBorder="0"
          style={{ width: "400px", height: "570px", background: "transparent" }}
        ></iframe>
      </div>
    </div>
  );
};

export default TradeCardPopup;
