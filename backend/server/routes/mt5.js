const express = require("express");
const router = express.Router();
const { requireIngestSecret } = require('../utils/security');

// ----------------------------
// MT5 Trades Receive Endpoint
// ----------------------------
router.post("/mt5/receive-trades", requireIngestSecret, (req, res) => {
    const trades = req.body;

    // Agar database me save karna ho to yaha kar sakte ho
    // Example: saveBulkTrades(trades)

    res.json({
        success: true,
        message: "MT5 trades received successfully",
        count: Array.isArray(trades) ? trades.length : 0
    });
});

module.exports = router;

