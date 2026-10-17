UPDATE trading_catalog.platforms
SET normalization_config = '{
  "version": 1,
  "defaults": { "platform": "ctrader", "quantity_unit": "lot" },
  "derivePnl": true,
  "fieldMapping": {
    "unique_id": "dealId",
    "symbol": "symbolName",
    "trade_type": "tradeSide",
    "quantity": "closePositionDetail.closedVolume",
    "price": "closePositionDetail.entryPrice",
    "exit_price": "executionPrice",
    "gross_pnl": "closePositionDetail.grossProfit",
    "commission": "closePositionDetail.commission",
    "swap": "closePositionDetail.swap",
    "pnl_conversion_fee": "closePositionDetail.pnlConversionFee",
    "exit_time": "executionTimestamp",
    "account_environment": "accountEnvironment"
  },
  "transforms": {
    "unique_id": { "type": "template", "template": "ctrader:{accountId}:{value}" },
    "symbol": "symbol",
    "trade_type": "inverse_side",
    "quantity": { "type": "ratio", "divisorField": "lotSize" },
    "price": "number",
    "exit_price": "number",
    "gross_pnl": { "type": "scaled_number", "digitsField": "moneyDigits" },
    "commission": { "type": "scaled_number", "digitsField": "moneyDigits" },
    "swap": { "type": "scaled_number", "digitsField": "moneyDigits" },
    "pnl_conversion_fee": { "type": "scaled_number", "digitsField": "moneyDigits", "negate": true },
    "exit_time": "integer"
  },
  "chargeFields": {
    "commission": "commission",
    "swap": "swap",
    "pnl_conversion_fee": "pnlConversionFee"
  },
  "requiredFields": ["unique_id", "symbol", "trade_type", "quantity", "price", "exit_price", "exit_time"]
}'::jsonb,
updated_at = NOW()
WHERE slug = 'ctrader';
