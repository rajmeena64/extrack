import api from './serve';

export class TradeManager {
  constructor() {
    this.trades = [];
  }

  // Load trades based on mode ('manual', 'api', or 'all')
  async loadTrades(userId, mode) {
    try {
      if (mode === 'manual') {
        await this.loadManualTrades(userId);
      } else if (mode === 'api') {
        await this.loadAPITrades(userId);
      } else {
        await this.loadAllTrades(userId);
      }
      return this.trades;
    } catch {
      return []; 
    }
  }

  // Manual trades loader
  async loadManualTrades(userId) {
    try {
      const { data } = await api.get(`/user-trades/${userId}`);
      this.trades = data.trades?.map(t => ({
        ID: t.ID,
        user_id: t.user_id,
        symbol: t.symbol,
        trade_type: t.trade_type,
        price: t.price,
        category: t.category,
        exit_price: t.exit_price,
        strategy: t.strategy,
        quantity: t.quantity,
        pnl: t.pnl,
        notes: t.notes,
        screenshots: t.screenshots,
        is_breakeven: Boolean(t.is_breakeven),
        open_timestamp: t.open_timestamp,
        close_timestamp: t.close_timestamp || t.exit_timestamp || null,
        unique_id: t.unique_id
      })) || [];
    } catch {
      this.trades = [];
    }
  }

  // API trades loader
  async loadAPITrades(userId) {
    try {
      const { data } = await api.get(`/user-api-trades/${userId}`);

      this.trades = data.trades?.map(t => ({
        id: t.id,
        user_id: t.user_id,
        account_id: t.account_id,
        platform: t.platform,
        symbol: t.symbol,
        category: t.category,
        symbol_path: t.symbol_path,
        symbol_description: t.symbol_description,
        trade_type: t.trade_type,
        quantity: t.quantity,
        price: t.price,
        exit_price: t.exit_price,
        pnl: t.pnl,
        open_timestamp: t.open_timestamp,          // ✅ entry timestamp
        close_timestamp: t.close_timestamp || t.exit_timestamp || null, // ✅ exit timestamp
        created_at: t.created_at,
        ticket: t.ticket,
        notes: t.notes,
        screenshots: t.screenshots,
        strategy: t.strategy,
        is_breakeven: Boolean(t.is_breakeven),
        unique_id: t.unique_id
      })) || [];
    } catch {
      this.trades = [];
    }
  }

  // Load both manual + API trades (merge)
  async loadAllTrades(userId) {
    try {
      const [manualRes, apiRes] = await Promise.all([
        api.get(`/user-trades/${userId}`).then(({ data }) => data).catch(() => ({ trades: [] })),
        api.get(`/user-api-trades/${userId}`).then(({ data }) => data).catch(() => ({ trades: [] }))
      ]);

      let allTrades = [];

      if (manualRes.trades) {
        const manualTrades = manualRes.trades.map(t => ({
          ID: t.ID,
          user_id: t.user_id,
          symbol: t.symbol,
          trade_type: t.trade_type,
          price: t.price,
          category: t.category,
          exit_price: t.exit_price,
          strategy: t.strategy,
          quantity: t.quantity,
          pnl: t.pnl,
          notes: t.notes,
          screenshots: t.screenshots,
          is_breakeven: Boolean(t.is_breakeven),
          open_timestamp: t.open_timestamp,
          close_timestamp: t.close_timestamp || t.exit_timestamp || null,
          unique_id: t.unique_id
        }));
        allTrades.push(...manualTrades);
      }

      if (apiRes.trades) {
        const apiTrades = apiRes.trades.map(t => ({

          id: t.id,
          user_id: t.user_id,
          account_id: t.account_id,
          platform: t.platform,
          symbol: t.symbol,
          category: t.category,
          symbol_path: t.symbol_path,
          symbol_description: t.symbol_description,
          trade_type: t.trade_type,
          quantity: t.quantity,
          price: t.price,
          exit_price: t.exit_price,
          pnl: t.pnl,
          open_timestamp: t.open_timestamp,
          close_timestamp: t.close_timestamp || t.exit_timestamp || null,
          created_at: t.created_at,
          ticket: t.ticket,
          notes: t.notes,
          screenshots: t.screenshots,
          strategy: t.strategy,
          is_breakeven: Boolean(t.is_breakeven),
          unique_id: t.unique_id
        }));
        allTrades.push(...apiTrades);
      }

      this.trades = allTrades;
    } catch {
      this.trades = [];
    }
  }

  setMode(mode) {
    this.mode = mode;
  }
}
