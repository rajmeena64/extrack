const Decimal = require('decimal.js');
const { normalizeStoredSymbol } = require('../../shared/utils/symbols');

const TRADE_STATUSES = new Set(['unknown', 'open', 'partially_closed', 'closed', 'expired', 'exercised', 'assigned', 'liquidated', 'cancelled']);
const CLOSE_REASONS = new Set(['manual_close', 'stop_loss', 'take_profit', 'liquidation', 'expired_worthless', 'exercised', 'assigned', 'cash_settled', 'physically_settled', 'broker_adjustment', 'unknown']);
const SUPPORTED_PRODUCT_TYPES = new Set(['stock_etf', 'crypto', 'forex_cfd', 'option', 'future', 'bond', 'equity', 'forex', 'spot', 'perpetual', 'cfd']);

const firstValue = (object, ...keys) => keys.map((key) => object?.[key]).find((value) => value !== undefined && value !== null && value !== '');
const hasValue = (value) => value !== undefined && value !== null && value !== '';
const readField = (value, path) => String(path).split('.').reduce((current, key) => current?.[key], value);

function normalizeProductType(value, transforms = null) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const str = String(value).trim().toLowerCase();
  if (transforms && typeof transforms === 'object') {
    for (const [canonical, aliases] of Object.entries(transforms)) {
      const list = Array.isArray(aliases) ? aliases : [aliases];
      if (list.map((a) => String(a).toLowerCase().trim()).includes(str)) return canonical;
    }
  }
  if (['crypto_spot', 'perpetual', 'crypto', 'coin', 'token'].includes(str)) return 'crypto';
  if (['forex', 'cfd', 'forex_cfd', 'fx', 'metal', 'metals', 'commodity'].includes(str)) return 'forex_cfd';
  if (['equity', 'stock', 'stock_etf', 'etf', 'stocks', 'share'].includes(str)) return 'stock_etf';
  if (['future', 'futures', 'fno'].includes(str)) return 'future';
  if (['option', 'options', 'opt'].includes(str)) return 'option';
  if (['bond', 'bonds'].includes(str)) return 'bond';
  return str;
}

function normalizeTradeSide(value, transforms = null) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const str = String(value).trim().toLowerCase();
  if (transforms && typeof transforms === 'object') {
    for (const [canonical, aliases] of Object.entries(transforms)) {
      const list = Array.isArray(aliases) ? aliases : [aliases];
      if (list.map((a) => String(a).toLowerCase().trim()).includes(str)) return canonical;
    }
  }
  if (['buy', 'b', 'long', '1'].includes(str)) return 'long';
  if (['sell', 's', 'short', '2'].includes(str)) return 'short';
  return str;
}

function normalizePositionDirection(value, side, productType) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'long' || normalized === 'short') return normalized;
  return normalizeTradeSide(side) || 'long';
}

function normalizeTradeStatus(value, { exitAt, expirationOutcome } = {}) {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (TRADE_STATUSES.has(normalized)) return normalized;
  const outcome = String(expirationOutcome || '').trim().toLowerCase();
  if (outcome === 'expired_worthless') return 'expired';
  if (['exercised', 'assigned'].includes(outcome)) return outcome;
  if (['cash_settled', 'physically_settled'].includes(outcome)) return 'closed';
  return exitAt ? 'closed' : 'open';
}

function normalizeCloseReason(value, status, expirationOutcome) {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (CLOSE_REASONS.has(normalized)) return normalized;
  const outcome = String(expirationOutcome || '').trim().toLowerCase();
  if (CLOSE_REASONS.has(outcome)) return outcome;
  if (status === 'liquidated') return 'liquidation';
  if (['expired', 'exercised', 'assigned'].includes(status)) return status === 'expired' ? 'unknown' : status;
  return null;
}

function positiveDecimal(value, name, { optional = false, defaultValue = null } = {}) {
  if ((value === undefined || value === null || value === '') && optional) return defaultValue;
  let decimal;
  try { decimal = new Decimal(value); } catch { throw new Error(`${name} must be a valid number`); }
  if (!decimal.isFinite() || !decimal.isPositive()) throw new Error(`${name} must be greater than zero`);
  return decimal.toNumber();
}

function normalizeExpiryDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Expiry date must use YYYY-MM-DD');
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== text) throw new Error('Expiry date is invalid');
  return text;
}

function validateTradeTimestamps({ entryAt, exitAt = null, expiryDate = null }) {
  const entry = new Date(entryAt);
  const exit = exitAt ? new Date(exitAt) : null;
  if (Number.isNaN(entry.valueOf()) || (exit && Number.isNaN(exit.valueOf()))) throw new Error('Trade timestamps are invalid');
  if (exit && exit < entry) throw new Error('Exit time cannot be before entry time');
  if (expiryDate && entry.toISOString().slice(0, 10) > normalizeExpiryDate(expiryDate)) throw new Error('Entry time cannot be after option expiry');
  return { entryAt: entry.toISOString(), exitAt: exit?.toISOString() || null };
}

function normalizeOptionDetails(details = {}) {
  const optionTypeValue = String(firstValue(details, 'optionType', 'option_type') || '').trim().toLowerCase();
  const optionType = optionTypeValue === 'ce' ? 'call' : optionTypeValue === 'pe' ? 'put' : optionTypeValue;
  if (!['call', 'put'].includes(optionType)) throw new Error('Option type must be call or put');
  const underlyingSymbol = String(firstValue(details, 'underlyingSymbol', 'underlying_symbol') || '').trim().toUpperCase();
  if (!underlyingSymbol || underlyingSymbol.length > 64) throw new Error('Underlying symbol is required');
  const expiryAt = firstValue(details, 'expiryAt', 'expiry_at') || null;
  const expiryTimeSource = String(firstValue(details, 'expiryTimeSource', 'expiry_time_source') || (expiryAt ? 'exact' : 'date_only')).trim().toLowerCase();
  if (!['exact', 'inferred', 'date_only'].includes(expiryTimeSource)) throw new Error('Invalid expiry time source');
  if (expiryAt && Number.isNaN(new Date(expiryAt).valueOf())) throw new Error('Expiry time is invalid');
  const settlementAtValue = firstValue(details, 'settlementAt', 'settlement_at') || null;
  if (settlementAtValue && Number.isNaN(new Date(settlementAtValue).valueOf())) throw new Error('Settlement time is invalid');
  const settlementPriceValue = firstValue(details, 'settlementPrice', 'settlement_price');
  const settlementPrice = settlementPriceValue === undefined || settlementPriceValue === null || settlementPriceValue === '' ? null : Number(settlementPriceValue);
  if (settlementPrice !== null && (!Number.isFinite(settlementPrice) || settlementPrice < 0)) throw new Error('Settlement price is invalid');
  const expirationOutcome = String(firstValue(details, 'expirationOutcome', 'expiration_outcome') || '').trim().toLowerCase() || null;
  if (expirationOutcome && !['expired_worthless', 'exercised', 'assigned', 'cash_settled', 'physically_settled'].includes(expirationOutcome)) throw new Error('Expiration outcome is invalid');
  return {
    underlyingInstrumentId: firstValue(details, 'underlyingInstrumentId', 'underlying_instrument_id') || null,
    underlyingSymbol,
    optionType,
    strikePrice: positiveDecimal(firstValue(details, 'strikePrice', 'strike_price'), 'Strike price'),
    expiryDate: normalizeExpiryDate(firstValue(details, 'expiryDate', 'expiry_date')),
    expiryAt: expiryAt ? new Date(expiryAt).toISOString() : null,
    expiryTimezone: firstValue(details, 'expiryTimezone', 'expiry_timezone') || null,
    expiryTimeSource,
    contractMultiplier: positiveDecimal(firstValue(details, 'contractMultiplier', 'contract_multiplier'), 'Contract multiplier', { optional: true, defaultValue: 1 }),
    lotSize: positiveDecimal(firstValue(details, 'lotSize', 'lot_size'), 'Lot size', { optional: true }),
    exerciseStyle: firstValue(details, 'exerciseStyle', 'exercise_style') || null,
    settlementType: firstValue(details, 'settlementType', 'settlement_type') || null,
    settlementAt: settlementAtValue ? new Date(settlementAtValue).toISOString() : null,
    settlementPrice,
    expirationOutcome,
  };
}

function calculateTradeSummaryFromExecutions(executions, { positionDirection, brokerGrossPnl, brokerNetPnl } = {}) {
  if (!Array.isArray(executions) || executions.length === 0) throw new Error('At least one execution is required');
  let openQuantity = new Decimal(0);
  let closeQuantity = new Decimal(0);
  let openNotional = new Decimal(0);
  let closeNotional = new Decimal(0);
  let totalCharges = new Decimal(0);
  let entryAt = null;
  let exitAt = null;
  for (const execution of executions) {
    const action = normalizeTradeSide(execution.action);
    const effect = String(firstValue(execution, 'positionEffect', 'position_effect') || '').toLowerCase();
    if (!action || !['open', 'close', 'unknown'].includes(effect)) throw new Error('Invalid execution action or position effect');
    const quantity = new Decimal(positiveDecimal(execution.quantity, 'Execution quantity'));
    const price = new Decimal(positiveDecimal(execution.price, 'Execution price'));
    const executedAt = new Date(firstValue(execution, 'executedAt', 'executed_at'));
    if (Number.isNaN(executedAt.valueOf())) throw new Error('Execution time is invalid');
    totalCharges = totalCharges.plus(new Decimal(execution.fees || 0).abs());
    if (effect === 'open') {
      openQuantity = openQuantity.plus(quantity);
      openNotional = openNotional.plus(price.times(quantity));
      if (!entryAt || executedAt < entryAt) entryAt = executedAt;
    } else if (effect === 'close') {
      closeQuantity = closeQuantity.plus(quantity);
      closeNotional = closeNotional.plus(price.times(quantity));
      if (!exitAt || executedAt > exitAt) exitAt = executedAt;
    }
  }
  if (openQuantity.isZero()) throw new Error('Executions do not contain an opening fill');
  const entryPrice = openNotional.div(openQuantity);
  const exitPrice = closeQuantity.isZero() ? null : closeNotional.div(closeQuantity);
  const closedQuantity = Decimal.min(openQuantity, closeQuantity);
  const direction = positionDirection === 'short' ? -1 : 1;
  const calculatedGross = exitPrice === null ? null : exitPrice.minus(entryPrice).times(closedQuantity).times(direction);
  const grossPnl = brokerGrossPnl == null ? calculatedGross : new Decimal(brokerGrossPnl);
  const netPnl = brokerNetPnl == null ? (grossPnl == null ? null : grossPnl.minus(totalCharges)) : new Decimal(brokerNetPnl);
  const remaining = Decimal.max(openQuantity.minus(closeQuantity), 0);
  if (exitAt && entryAt && exitAt < entryAt) throw new Error('Closing execution cannot be before the opening execution');
  return {
    quantity: openQuantity.toNumber(),
    entryPrice: entryPrice.toNumber(),
    exitPrice: exitPrice?.toNumber() ?? null,
    entryAt: entryAt.toISOString(),
    exitAt: closeQuantity.isZero() ? null : exitAt?.toISOString() || null,
    grossPnl: grossPnl?.toNumber() ?? null,
    netPnl: netPnl?.toNumber() ?? null,
    totalCharges: totalCharges.toNumber(),
    status: closeQuantity.isZero() ? 'open' : remaining.isZero() ? 'closed' : 'partially_closed',
  };
}

function normalizeOptionResponse(details) {
  if (!details) return null;
  return {
    underlyingInstrumentId: firstValue(details, 'underlyingInstrumentId', 'underlying_instrument_id') || null,
    underlyingSymbol: firstValue(details, 'underlyingSymbol', 'underlying_symbol'),
    optionType: firstValue(details, 'optionType', 'option_type'),
    strikePrice: firstValue(details, 'strikePrice', 'strike_price'),
    expiryDate: firstValue(details, 'expiryDate', 'expiry_date'),
    expiryAt: firstValue(details, 'expiryAt', 'expiry_at') || null,
    expiryTimezone: firstValue(details, 'expiryTimezone', 'expiry_timezone') || null,
    expiryTimeSource: firstValue(details, 'expiryTimeSource', 'expiry_time_source') || 'date_only',
    contractMultiplier: firstValue(details, 'contractMultiplier', 'contract_multiplier') ?? 1,
    lotSize: firstValue(details, 'lotSize', 'lot_size') ?? null,
    exerciseStyle: firstValue(details, 'exerciseStyle', 'exercise_style') || null,
    settlementType: firstValue(details, 'settlementType', 'settlement_type') || null,
    settlementAt: firstValue(details, 'settlementAt', 'settlement_at') || null,
    settlementPrice: firstValue(details, 'settlementPrice', 'settlement_price') ?? null,
    expirationOutcome: firstValue(details, 'expirationOutcome', 'expiration_outcome') || null,
  };
}

function normalizeMarketDetails(trade, instrumentType) {
  const rawDetails = firstValue(trade, 'market_details', 'marketDetails', 'product_details');
  const details = rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails) ? rawDetails : {};
  if (instrumentType === 'perpetual') return {
    leverage: firstValue(details, 'leverage') ?? null,
    marginMode: firstValue(details, 'marginMode', 'margin_mode') || null,
    liquidationPrice: firstValue(details, 'liquidationPrice', 'liquidation_price') ?? null,
    fundingFee: firstValue(details, 'fundingFee', 'funding_fee', 'funding') ?? null,
    contractType: firstValue(details, 'contractType', 'contract_type') || 'perpetual',
  };
  if (instrumentType === 'future') return {
    leverage: firstValue(details, 'leverage') ?? null,
    marginMode: firstValue(details, 'marginMode', 'margin_mode') || null,
    contractExpiry: firstValue(details, 'contractExpiry', 'contract_expiry') || null,
    contractMultiplier: firstValue(details, 'contractMultiplier', 'contract_multiplier', 'pnlMultiplier') ?? null,
    settlementPrice: firstValue(details, 'settlementPrice', 'settlement_price') ?? null,
  };
  if (instrumentType === 'spot') return {
    baseAsset: firstValue(details, 'baseAsset', 'base_asset') || null,
    quoteAsset: firstValue(details, 'quoteAsset', 'quote_asset') || null,
    executedQuantity: firstValue(details, 'executedQuantity', 'executed_quantity') ?? null,
    quoteQuantity: firstValue(details, 'quoteQuantity', 'quote_quantity') ?? null,
    tradingFee: firstValue(details, 'tradingFee', 'trading_fee') ?? null,
    feeAsset: firstValue(details, 'feeAsset', 'fee_asset') || null,
  };
  if (instrumentType === 'forex' || instrumentType === 'cfd') return {
    lotSize: firstValue(details, 'lotSize', 'lot_size') ?? null,
    leverage: firstValue(details, 'leverage') ?? null,
    commission: firstValue(details, 'commission') ?? null,
    swap: firstValue(details, 'swap') ?? null,
    contractSize: firstValue(details, 'contractSize', 'contract_size') ?? null,
    accountCurrency: firstValue(details, 'accountCurrency', 'account_currency') || null,
  };
  return null;
}

function buildNormalizedTradeResponse(trade, fieldsFilter = null) {
  const optionDetails = normalizeOptionResponse(firstValue(trade, 'option_details', 'optionDetails'));
  const instrumentType = normalizeProductType(firstValue(trade, 'instrumentType', 'product_type', 'productType'));
  const side = normalizeTradeSide(firstValue(trade, 'side', 'trade_type'));
  const entryPrice = firstValue(trade, 'entryPrice', 'entry_price', 'price');
  const netPnl = firstValue(trade, 'netPnl', 'net_pnl', 'final_pnl', 'pnl', 'gross_pnl') ?? 0;
  const entryAt = firstValue(trade, 'entryAt', 'entry_timestamp');
  const exitAt = firstValue(trade, 'exitAt', 'exit_timestamp') || null;
  const status = normalizeTradeStatus(trade.status, { exitAt, expirationOutcome: optionDetails?.expirationOutcome });
  const marketDetails = normalizeMarketDetails(trade, instrumentType);
  const journalDetails = trade.journal_details && typeof trade.journal_details === 'object' ? trade.journal_details : {};

  const rawCharges = trade.charges && typeof trade.charges === 'object' && !Array.isArray(trade.charges) ? trade.charges : {};
  const executionFeesSum = Array.isArray(trade.executions) ? trade.executions.reduce((sum, ex) => sum + (Number(ex.fees) || 0), 0) : 0;
  const objectChargesSum = Object.values(rawCharges).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const derivedCharges = objectChargesSum > 0 ? objectChargesSum : executionFeesSum;
  const rawTotalCharges = firstValue(trade, 'totalCharges', 'total_charges');
  const totalCharges = rawTotalCharges !== undefined && rawTotalCharges !== null && Number(rawTotalCharges) > 0
    ? Number(rawTotalCharges)
    : (derivedCharges > 0 ? derivedCharges : (rawTotalCharges !== undefined && rawTotalCharges !== null ? Number(rawTotalCharges) : null));

  const fullResponse = {
    unique_id: String(firstValue(trade, 'unique_id', 'id', 'ID') || ''),
    uniqueId: String(firstValue(trade, 'unique_id', 'id', 'ID') || ''),
    id: firstValue(trade, 'id', 'ID') ?? null,
    source: trade.source,
    platform: firstValue(trade, 'platform_name', 'platformName') || null,
    symbol: trade.symbol,
    productType: instrumentType,
    category: trade.category || null,
    side,
    positionDirection: normalizePositionDirection(trade.positionDirection, side, instrumentType),
    status,
    closeReason: normalizeCloseReason(trade.close_reason, status, optionDetails?.expirationOutcome),
    quantity: trade.quantity,
    quantityUnit: firstValue(trade, 'quantity_unit', 'quantityUnit') || null,
    entryPrice,
    exitPrice: firstValue(trade, 'exitPrice', 'exit_price') ?? null,
    entryAt,
    exitAt,
    grossPnl: firstValue(trade, 'grossPnl', 'gross_pnl') ?? null,
    totalCharges,
    charges: rawCharges,
    netPnl,
    pnl: netPnl,
    pnlCurrency: firstValue(trade, 'pnlCurrency', 'pnl_currency') || null,
    currency: firstValue(trade, 'currency', 'pnlCurrency', 'pnl_currency') || 'USD',
    strategy: trade.strategy || null,
    notes: trade.notes || null,
    mistakes: firstValue(journalDetails, 'mistakes') || trade.mistakes || null,
    customTags: firstValue(journalDetails, 'customTags', 'custom_tags') || firstValue(trade, 'custom_tags', 'customTags') || [],
    executionScore: firstValue(journalDetails, 'executionScore', 'execution_score') ?? firstValue(trade, 'execution_score', 'executionScore') ?? null,
    reviewSummary: firstValue(journalDetails, 'reviewSummary', 'review_summary') || firstValue(trade, 'review_summary', 'reviewSummary') || null,
    attachments: trade.attachments || [],
    optionDetails,
    marketDetails,
    ...(instrumentType === 'perpetual' ? { perpetualDetails: marketDetails } : {}),
    ...(instrumentType === 'future' ? { futureDetails: marketDetails } : {}),
    ...(instrumentType === 'spot' ? { spotDetails: marketDetails } : {}),
    executions: Array.isArray(trade.executions) ? trade.executions : [],
    instrumentDigits: firstValue(trade, 'instrument_digits', 'instrumentDigits') ?? null,
    instrument_digits: firstValue(trade, 'instrument_digits', 'instrumentDigits') ?? null,
    brokerName: firstValue(trade, 'broker_name', 'brokerName') || null,
    accountName: firstValue(trade, 'account_name', 'accountName') || null,
    percentChange: trade.percent_change ?? null,
    stopLoss: firstValue(trade, 'stop_loss', 'stopLoss') ?? null,
    takeProfit: firstValue(trade, 'take_profit', 'takeProfit') ?? null,
    isBreakeven: Boolean(trade.is_breakeven),
  };

  if (!fieldsFilter) return fullResponse;
  const allowedSet = fieldsFilter instanceof Set ? fieldsFilter : new Set(Array.isArray(fieldsFilter) ? fieldsFilter : String(fieldsFilter).split(',').map((f) => f.trim()).filter(Boolean));
  if (allowedSet.size === 0) return fullResponse;
  const projected = {};
  for (const key of allowedSet) {
    if (Object.prototype.hasOwnProperty.call(fullResponse, key)) projected[key] = fullResponse[key];
  }
  return projected;
}

function buildNormalizedTradeGroupResponse(group, members = []) {
  return {
    id: group.id,
    groupType: firstValue(group, 'group_type', 'groupType'),
    strategyKey: firstValue(group, 'strategy_key', 'strategyKey') || null,
    strategySource: firstValue(group, 'strategy_source', 'strategySource') || 'manual',
    name: group.name || null,
    status: group.status,
    openedAt: firstValue(group, 'opened_at', 'openedAt') || null,
    closedAt: firstValue(group, 'closed_at', 'closedAt') || null,
    notes: group.notes || null,
    members: members.map((member) => ({
      role: member.role || null,
      legNumber: firstValue(member, 'leg_number', 'legNumber') ?? null,
      quantityRatio: firstValue(member, 'quantity_ratio', 'quantityRatio') ?? null,
      trade: buildNormalizedTradeResponse(member.trade || member),
    })),
  };
}

function calculateTradePnl(trade, context = {}) {
  const productType = normalizeProductType(trade.productType) || 'stock_etf';
  if (!SUPPORTED_PRODUCT_TYPES.has(productType)) throw new Error('Unsupported product type');
  const side = normalizeTradeSide(trade.side);
  if (!['long', 'short'].includes(side)) throw new Error('Side must be long or short');
  const direction = side === 'long' ? 1 : -1;
  const quantity = Number(trade.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than zero');
  const details = trade.productDetails || {};
  const entryTime = new Date(trade.entryTime);
  const hasExitTime = trade.exitTime !== undefined && trade.exitTime !== null && trade.exitTime !== '';
  const exitTime = hasExitTime ? new Date(trade.exitTime) : null;
  if (Number.isNaN(entryTime.valueOf()) || (exitTime && Number.isNaN(exitTime.valueOf()))) throw new Error('Trade timestamps are invalid');
  if (exitTime && exitTime < entryTime) throw new Error('Exit time cannot be before entry time');

  let entry = Number(trade.entryPrice);
  if (!Number.isFinite(entry) || entry <= 0) throw new Error('Entry price must be greater than zero');
  let exit = exitTime ? Number(trade.exitPrice || 0) : 0;
  let grossPnl;
  let calculationModel = productType;
  let multiplier = 1;
  const warnings = [];

  if (!exitTime && details.closeType !== 'expired') {
    grossPnl = null;
    calculationModel = `${productType}_open`;
  } else if (productType === 'forex') {
    const rawSize = details.contractSize ?? context.defaults?.contractSize;
    multiplier = Number(rawSize) > 0 ? Number(rawSize) : 100000;
    grossPnl = new Decimal(exit).minus(entry).times(direction).times(quantity).times(multiplier);
    calculationModel = 'forex_spot';
  } else if (['future', 'perpetual', 'cfd'].includes(productType)) {
    const rawMult = firstValue(details, 'pnlMultiplier', 'contractSize') ?? firstValue(context?.defaults, 'pnlMultiplier', 'contractSize');
    multiplier = Number(rawMult) > 0 ? Number(rawMult) : 1;
    grossPnl = new Decimal(exit).minus(entry).times(direction).times(quantity).times(multiplier);
    calculationModel = productType === 'future' ? 'futures_linear' : `${productType}_linear`;
  } else if (productType === 'option') {
    const lotSize = Number(details.lotSize) > 0 ? Number(details.lotSize) : 1;
    multiplier = lotSize;
    entry = Number(details.entryPremium ?? trade.entryPrice);
    if (details.closeType === 'expired') {
      const settlement = Number(details.settlementPrice || 0);
      const strike = Number(details.strikePrice || 0);
      exit = details.optionType === 'call' ? Math.max(settlement - strike, 0) : Math.max(strike - settlement, 0);
      calculationModel = 'options_expiry';
    } else {
      exit = Number(details.exitPremium ?? trade.exitPrice ?? 0);
      calculationModel = 'options_premium';
    }
    grossPnl = new Decimal(exit).minus(entry).times(direction).times(lotSize).times(quantity);
  } else if (productType === 'bond' && details.quoteType === 'percentage') {
    multiplier = Number(details.faceValue || 100) / 100;
    grossPnl = new Decimal(exit).minus(entry).times(direction).times(quantity).times(multiplier);
    calculationModel = 'bond_percentage';
  } else {
    grossPnl = new Decimal(exit).minus(entry).times(direction).times(quantity);
    calculationModel = productType === 'bond' ? 'bond_actual_price' : productType;
  }

  let convertedGrossPnl = grossPnl == null ? null : new Decimal(grossPnl);
  const conversionRequired = ['forex', 'cfd'].includes(productType) && details.profitCurrency && details.accountCurrency && details.profitCurrency !== details.accountCurrency;
  if (conversionRequired && details.conversionRate !== '' && details.conversionRate != null) {
    convertedGrossPnl = convertedGrossPnl?.times(Number(details.conversionRate)) ?? null;
  }

  const rawChargesInput = typeof trade.charges === 'object' && trade.charges !== null ? (trade.charges.total ?? 0) : (firstValue(trade, 'charges', 'total_charges') ?? 0);
  const totalChargesVal = Math.abs(Number(rawChargesInput) || 0);
  const totalCharges = new Decimal(totalChargesVal);
  const netAdjustments = new Decimal(-totalChargesVal);
  const netPnl = convertedGrossPnl == null ? null : convertedGrossPnl.minus(totalCharges);
  const hasActual = trade.actualNetPnl !== undefined && trade.actualNetPnl !== null && trade.actualNetPnl !== '';
  const hasBroker = trade.brokerReportedNetPnl !== undefined && trade.brokerReportedNetPnl !== null && trade.brokerReportedNetPnl !== '';
  const finalPnl = hasActual ? new Decimal(Number(trade.actualNetPnl)) : hasBroker ? new Decimal(Number(trade.brokerReportedNetPnl)) : netPnl;
  const pnlSource = hasActual ? 'user_provided' : hasBroker ? 'broker_reported' : 'calculated';
  const pnlCurrency = trade.pnlCurrency || details.accountCurrency || null;
  const round = (value) => Number(new Decimal(value).toDecimalPlaces(8).toString());
  const optionalRound = (value) => value == null ? null : round(value);
  return {
    grossPnl: optionalRound(grossPnl),
    convertedGrossPnl: optionalRound(convertedGrossPnl),
    totalCharges: round(totalCharges),
    netAdjustments: round(netAdjustments),
    netPnl: optionalRound(netPnl),
    finalPnl: optionalRound(finalPnl),
    pnlCurrency,
    pnlSource,
    calculationModel,
    calculationInputs: { direction, entryPrice: entry, exitPrice: exit, quantity, quantityUnit: trade.quantityUnit, multiplier },
    charges: totalChargesVal,
    warnings,
  };
}

function mapTradeFields(rawTrade, fieldMapping) {
  if (!rawTrade || typeof rawTrade !== 'object' || Array.isArray(rawTrade)) return {};
  return Object.fromEntries(Object.entries(fieldMapping || {})
    .map(([officialField, sourceField]) => {
      const paths = Array.isArray(sourceField) ? sourceField : [sourceField];
      return [officialField, paths.map((path) => readField(rawTrade, path)).find(hasValue)];
    })
    .filter(([, value]) => value !== undefined));
}

function transformValue(value, rule, rawTrade) {
  const config = typeof rule === 'string' ? { type: rule } : rule;
  if (!config?.type || !hasValue(value)) return value;
  if (config.type === 'string') return String(value);
  if (config.type === 'symbol') return normalizeStoredSymbol(value);
  if (config.type === 'side') return ['buy', 'long', '1', 'b'].includes(String(value).toLowerCase()) ? 'long' : 'short';
  if (config.type === 'inverse_side') return ['sell', '2', 's', 'short'].includes(String(value).toLowerCase()) ? 'long' : 'short';
  if (config.type === 'timestamp') return new Date(value).getTime();
  if (config.type === 'scaled_number') {
    const digits = Number(readField(rawTrade, config.digitsField || 'moneyDigits') ?? 2);
    const scaled = Number(value) / (10 ** (Number.isInteger(digits) && digits >= 0 ? digits : 2));
    return config.negate ? -scaled : scaled;
  }
  if (config.type === 'ratio') {
    const divisor = Number(readField(rawTrade, config.divisorField || 'lotSize') ?? 1);
    return divisor > 0 ? Number(value) / divisor : Number(value);
  }
  if (config.type === 'template' && config.template) {
    return String(config.template).replace(/\{(\w+)\}/g, (_, key) => (key === 'value' ? String(value) : String(readField(rawTrade, key) ?? '')));
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return config.type === 'integer' ? Math.trunc(num) : num;
}

function normalizeTrade(rawTrade, normalization = {}) {
  if (!rawTrade || typeof rawTrade !== 'object') return null;
  const mappedFields = mapTradeFields(rawTrade, normalization.fieldMapping || {});
  const trade = { ...(normalization.defaults || {}), ...mappedFields };
  for (const [field, rule] of Object.entries(normalization.transforms || {})) {
    if (Object.prototype.hasOwnProperty.call(trade, field)) trade[field] = transformValue(trade[field], rule, rawTrade);
  }
  let chargesObj = typeof trade.charges === 'object' && trade.charges !== null ? { ...trade.charges } : {};
  if (normalization.chargeFields && typeof normalization.chargeFields === 'object') {
    for (const [targetKey, sourceKey] of Object.entries(normalization.chargeFields)) {
      const val = trade[targetKey] !== undefined ? trade[targetKey] : trade[sourceKey];
      if (hasValue(val) && Number.isFinite(Number(val))) chargesObj[targetKey] = Math.abs(Number(val));
    }
  }
  const calculatedCharges = Object.values(chargesObj).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const totalChargesVal = hasValue(trade.total_charges) ? Number(trade.total_charges) : (calculatedCharges > 0 ? calculatedCharges : (hasValue(trade.charges) && Number.isFinite(Number(trade.charges)) ? Math.abs(Number(trade.charges)) : 0));
  trade.total_charges = Number.isFinite(totalChargesVal) ? totalChargesVal : 0;
  trade.charges = Object.keys(chargesObj).length > 0 ? chargesObj : (typeof trade.charges === 'object' && trade.charges !== null ? trade.charges : { total: trade.total_charges });
  if (normalization.derivePnl && !hasValue(trade.net_pnl)) {
    try { trade.net_pnl = new Decimal(trade.gross_pnl || 0).minus(trade.total_charges || 0).toNumber(); } catch {}
  }
  if (trade.symbol) trade.symbol = normalizeStoredSymbol(trade.symbol);
  if (trade.entry_price === undefined || trade.entry_price === null) trade.entry_price = trade.price;
  trade.entry_price = trade.entry_price ?? null;
  if (trade.side === undefined || trade.side === null) trade.side = trade.trade_type;
  trade.side = normalizeTradeSide(trade.side, normalization.transforms?.side);
  trade.product_type = normalizeProductType(trade.product_type ?? rawTrade.productType ?? normalization.defaults?.product_type, normalization.transforms?.product_type);
  trade.status = normalizeTradeStatus(trade.status, { exitAt: trade.exit_timestamp, expirationOutcome: trade.expiration_outcome });
  if (!hasValue(trade.percent_change) && Number(trade.entry_price) > 0 && Number(trade.exit_price) > 0) {
    trade.percent_change = Number((((Number(trade.exit_price) - Number(trade.entry_price)) / Number(trade.entry_price)) * 100 * (trade.side === 'short' ? -1 : 1)).toFixed(4));
  }
  return trade;
}

async function mapConnectionTrades(userId, connectionId, rawTrades, database = require('../../infra/db/supabase')) {
  if (!Array.isArray(rawTrades) || !rawTrades.length) return [];
  const connResult = await database.query(`
    SELECT integration.trade_mapping AS normalization
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    WHERE connection.user_id = $1 AND connection.id = $2 LIMIT 1`, [userId, connectionId]);
  const row = connResult.rows[0];
  const mappingConfig = row?.normalization || {};
  const requiredHeaders = mappingConfig?.requiredHeaders || [];
  if (requiredHeaders.length && !requiredHeaders.includes('__broker_csv_mapping_not_configured__')) {
    if (!requiredHeaders.every((header) => Object.hasOwn(rawTrades[0] || {}, header))) return null;
  }
  return rawTrades.map((t) => normalizeTrade(t, mappingConfig)).filter(Boolean);
}

module.exports = {
  buildNormalizedTradeGroupResponse,
  buildNormalizedTradeResponse,
  calculateTradePnl,
  calculateTradeSummaryFromExecutions,
  firstValue,
  mapConnectionTrades,
  normalizeCloseReason,
  normalizeOptionDetails,
  normalizePositionDirection,
  normalizeProductType,
  normalizeTrade,
  normalizeTradeSide,
  normalizeTradeStatus,
  positiveDecimal,
  validateTradeTimestamps,
};
