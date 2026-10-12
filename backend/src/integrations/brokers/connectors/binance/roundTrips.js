const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
function createRoundTripAssembler(market) {
  const positions = new Map();
  function open(key, direction, fill, quantity, commission) {
    const price = finite(fill.price);
    if (!(price > 0) || !(quantity > 0)) return;
    const current = positions.get(key);
    if (!current || current.direction !== direction) {
      positions.set(key, {
        direction, quantity, entryPrice: price, entryTime: fill.time,
        commission, commissionAsset: fill.commissionAsset || null,
        executions: [{
          action: direction, positionEffect: 'open', quantity, price, executedAt: fill.time,
          fees: commission, feeCurrency: fill.commissionAsset || null,
          brokerOrderId: String(fill.orderId ?? ''), brokerExecutionId: String(fill.id ?? ''),
        }],
      });
      return;
    }
    current.entryPrice = ((current.entryPrice * current.quantity) + (price * quantity)) / (current.quantity + quantity);
    current.quantity += quantity;
    current.commission += commission;
    current.executions.push({
      action: direction, positionEffect: 'open', quantity, price, executedAt: fill.time,
      fees: commission, feeCurrency: fill.commissionAsset || null,
      brokerOrderId: String(fill.orderId ?? ''), brokerExecutionId: String(fill.id ?? ''),
    });
  }
  function push(fill) {
    const quantity = finite(fill.qty);
    const exitPrice = finite(fill.price);
    if (!(quantity > 0) || !(exitPrice > 0) || !Number.isSafeInteger(Number(fill.time))) return [];
    const side = String(market === 'spot' ? (fill.isBuyer ? 'BUY' : 'SELL') : fill.side).toUpperCase();
    const positionSide = market === 'spot' ? 'LONG' : String(fill.positionSide || 'BOTH').toUpperCase();
    const key = `${fill.symbol}:${positionSide}`;
    let current = positions.get(key);
    const explicitDirection = positionSide === 'LONG' ? 'long' : positionSide === 'SHORT' ? 'short' : null;
    const fillDirection = side === 'BUY' ? 'long' : 'short';
    const realizedPnl = finite(fill.realizedPnl);
    if (!current && !explicitDirection && market !== 'spot' && realizedPnl !== null && realizedPnl !== 0) return [];
    const closes = explicitDirection ? fillDirection !== explicitDirection : current ? fillDirection !== current.direction : false;
    const commission = Math.max(finite(fill.commission) || 0, 0);
    if (!closes) {
      open(key, explicitDirection || fillDirection, fill, quantity, commission);
      return [];
    }
    let entryPrice = current?.entryPrice;
    let entryTime = current?.entryTime;
    let closeQuantity = current ? Math.min(current.quantity, quantity) : quantity;
    const direction = current?.direction || explicitDirection || (side === 'SELL' ? 'long' : 'short');
    if (!(entryPrice > 0) || !Number.isSafeInteger(Number(entryTime))) return [];
    const entryCommission = current ? current.commission * (closeQuantity / current.quantity) : 0;
    const exitCommission = commission * (closeQuantity / quantity);
    const sameCommissionAsset = !current?.commissionAsset || !fill.commissionAsset || current.commissionAsset === fill.commissionAsset;
    const totalCommission = sameCommissionAsset ? entryCommission + exitCommission : exitCommission;
    const grossPnl = realizedPnl ?? ((exitPrice - entryPrice) * closeQuantity * (direction === 'long' ? 1 : -1));
    const pnlCurrency = fill.pnlCurrency || (market === 'spot' ? null : fill.commissionAsset || current?.commissionAsset) || null;
    const netPnl = fill.commissionAsset && pnlCurrency === fill.commissionAsset ? grossPnl - totalCommission : grossPnl;
    const percentChange = ((exitPrice - entryPrice) / entryPrice) * 100 * (direction === 'long' ? 1 : -1);
    const closed = {
      ...fill,
      isRoundTrip: true,
      uniqueId: `binance:${market}:roundtrip:${fill.symbol}:${fill.id}`,
      tradeType: direction,
      quantity: closeQuantity,
      entryPrice,
      exitPrice,
      entryTime,
      exitTime: fill.time,
      grossPnl,
      netPnl,
      pnlCurrency,
      percentChange,
      charges: totalCommission ? { commission: totalCommission } : {},
      positionSide,
      executions: [
        ...(current?.executions || []).map((execution) => {
          const ratio = current.quantity > 0 ? closeQuantity / current.quantity : 0;
          return { ...execution, quantity: execution.quantity * ratio, fees: execution.fees * ratio };
        }),
        {
          action: fillDirection, positionEffect: 'close', quantity: closeQuantity,
          price: exitPrice, executedAt: fill.time, fees: exitCommission,
          feeCurrency: fill.commissionAsset || null, brokerOrderId: String(fill.orderId ?? ''),
          brokerExecutionId: String(fill.id ?? ''),
        },
      ],
    };
    if (current) {
      const retainedRatio = current.quantity > 0 ? Math.max((current.quantity - closeQuantity) / current.quantity, 0) : 0;
      current.executions = current.executions
        .map((execution) => ({ ...execution, quantity: execution.quantity * retainedRatio, fees: execution.fees * retainedRatio }))
        .filter((execution) => execution.quantity > 0);
      current.quantity -= closeQuantity;
      current.commission -= entryCommission;
      if (current.quantity <= 0) positions.delete(key);
    }
    const remainder = quantity - closeQuantity;
    if (remainder > 0 && !explicitDirection) open(key, fillDirection, fill, remainder, commission - exitCommission);
    return [closed];
  }
  return { push };
}
function assembleRoundTrips(market, fills) {
  const assembler = createRoundTripAssembler(market);
  return [...fills]
    .sort((left, right) => Number(left.time) - Number(right.time) || Number(left.id) - Number(right.id))
    .flatMap(assembler.push);
}
module.exports = { assembleRoundTrips, createRoundTripAssembler };
