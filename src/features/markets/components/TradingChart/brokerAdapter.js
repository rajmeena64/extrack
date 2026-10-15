export function createTvBrokerAdapter() {
  const delegate = () => {
    const list = new Set();
    return {
      subscribe: (_ctx, fn) => list.add(fn),
      unsubscribe: (_ctx, fn) => list.delete(fn),
      fire: (...args) => list.forEach((fn) => fn(...args)),
    };
  };

  return {
    connectionStatus: () => 1,
    metainfo: () => ({
      id: "entrack_terminal",
      title: "Entrack Paper",
      configFlags: {
        supportPositions: true,
        supportOrdersHistory: true,
        supportTradeHistoryTabInAccountManager: true,
      },
    }),
    accountManagerInfo: () => ({
      accountTitle: "Entrack Trading",
      summary: [
        { text: "Balance", value: "$10,000.00" },
        { text: "Equity", value: "$10,000.00" },
        { text: "Open P&L", value: "$0.00" },
      ],
      orderColumns: [
        { id: "id", title: "Order ID" },
        { id: "symbol", title: "Symbol" },
        { id: "side", title: "Side" },
        { id: "qty", title: "Qty" },
        { id: "status", title: "Status" },
        { id: "price", title: "Price" },
      ],
      positionColumns: [
        { id: "symbol", title: "Symbol" },
        { id: "side", title: "Side" },
        { id: "qty", title: "Qty" },
        { id: "avgPrice", title: "Entry Price" },
        { id: "pl", title: "P&L" },
      ],
      pages: [],
    }),
    getSymbolSpecificTradingOptions: () => Promise.resolve({}),
    positions: () => Promise.resolve([]),
    positionPartialUpdate: delegate(),
    positionUpdate: delegate(),
    subscribePL: () => {},
    orders: () => Promise.resolve([]),
    orderPartialUpdate: delegate(),
    orderUpdate: delegate(),
    ordersHistory: () => Promise.resolve([]),
    chartContextMenuActions: () => Promise.resolve([]),
    isTradable: () => Promise.resolve(true),
  };
}
