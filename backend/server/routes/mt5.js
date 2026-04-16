const express = require("express");
const router = express.Router();

// ----------------------------
// MT5 Trades Receive Endpoint
// ----------------------------
router.post("/mt5/receive-trades", (req, res) => {
    const expectedSecret = process.env.MT5_INGEST_SECRET;
    const providedSecret = req.headers['x-ingest-secret'];

    if (expectedSecret && providedSecret !== expectedSecret) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized ingest request"
        });
    }

    const trades = req.body;

    console.log("📥 MT5 Trades Received:", trades);

    // Agar database me save karna ho to yaha kar sakte ho
    // Example: saveBulkTrades(trades)

    res.json({
        success: true,
        message: "MT5 trades received successfully",
        count: Array.isArray(trades) ? trades.length : 0
    });
});

module.exports = router;
