import { API_URL } from './constants';

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
    } catch (error) {
      console.error('Error loading trades:', error);
      return []; 
    }
  }

  // Manual trades loader
  async loadManualTrades(userId) {
    try {
      const response = await fetch(`${API_URL}/api/user-trades/${userId}`);
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
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
        timestamp: t.timestamp,          // ✅ entry timestamp
        open_timestamp: t.open_timestamp,
        close_timestamp: t.exit_timestamp || null, // ✅ exit timestamp
        unique_id: t.unique_id
      })) || [];
    } catch (error) {
      console.error('Error loading manual trades:', error);
      this.trades = [];
    }
  }

  // API trades loader
  async loadAPITrades(userId) {
    try {
      const response = await fetch(`${API_URL}/api/user-api-trades/${userId}`);
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
    console.log("API TRADES RESPONSE:", data);

      this.trades = data.trades?.map(t => ({
   
  

        id: t.id,
        user_id: t.user_id,
        account_id: t.account_id,
        platform: t.platform,
        symbol: t.symbol,
        trade_type: t.trade_type,
        quantity: t.quantity,
        price: t.price,
        exit_price: t.exit_price,
        pnl: t.pnl,
        timestamp: t.timestamp,   
        open_timestamp: t.open_timestamp,          // ✅ entry timestamp
        close_timestamp: t.close_timestamp || t.exit_timestamp || null, // ✅ exit timestamp
        created_at: t.created_at,
        ticket: t.ticket,
        notes: t.notes,
        screenshots: t.screenshots,
        strategy: t.strategy,
        unique_id: t.unique_id
      })) || [];
    } catch (error) {
      console.error('Error loading API trades:', error);
    
      this.trades = [];
    }
  }

  // Load both manual + API trades (merge)
  async loadAllTrades(userId) {
    try {
      const [manualRes, apiRes] = await Promise.all([
        fetch(`${API_URL}/api/user-trades/${userId}`).then(r => r.ok ? r.json() : { trades: [] }),
        fetch(`${API_URL}/api/user-api-trades/${userId}`).then(r => r.ok ? r.json() : { trades: [] })
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
          timestamp: t.timestamp,
          open_timestamp: t.open_timestamp,
          close_timestamp: t.exit_timestamp || null,
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
          trade_type: t.trade_type,
          quantity: t.quantity,
          price: t.price,
          exit_price: t.exit_price,
          pnl: t.pnl,
          timestamp: t.timestamp,
          open_timestamp: t.open_timestamp,
          close_timestamp: t.close_timestamp || t.exit_timestamp || null,
          created_at: t.created_at,
          ticket: t.ticket,
          notes: t.notes,
          screenshots: t.screenshots,
          strategy: t.strategy,
          unique_id: t.unique_id
        }));
        allTrades.push(...apiTrades);
      }

      this.trades = allTrades;
    } catch (error) {
      console.error('Error loading all trades:', error);



  
      this.trades = [];
    }

  
  }

  setMode(mode) {
    this.mode = mode;
  }


}