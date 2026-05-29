import React, { useState } from 'react';

const TABS = ['Orders', 'Open Positions', 'Closed Positions', 'Journal'];
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function EmptyState({ label }) {
  return <div className="backtest-empty-state">{label}</div>;
}

function BacktestBottomPanel({ orders, openPositions, closedPositions, journalDrafts, onClosePosition, onJournalTrade }) {
  const [activeTab, setActiveTab] = useState('Orders');

  return (
    <section className="backtest-bottom-panel">
      <div className="backtest-tabs" role="tablist" aria-label="Backtest records">
        {TABS.map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      <div className="backtest-table-wrap">
        {activeTab === 'Orders' && (
          orders.length ? (
            <table>
              <thead><tr><th>Time</th><th>Side</th><th>Type</th><th>Qty</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{new Date(order.timestamp).toLocaleString()}</td>
                    <td className={order.side === 'buy' ? 'is-positive' : 'is-negative'}>{order.side}</td>
                    <td>{order.type}</td>
                    <td>{order.quantity}</td>
                    <td>{order.price}</td>
                    <td>{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState label="No simulated orders yet." />
        )}

        {activeTab === 'Open Positions' && (
          openPositions.length ? (
            <table>
              <thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>SL</th><th>TP</th><th>Unrealized</th><th></th></tr></thead>
              <tbody>
                {openPositions.map((position) => (
                  <tr key={position.id}>
                    <td>{position.symbol}</td>
                    <td className={position.side === 'buy' ? 'is-positive' : 'is-negative'}>{position.side}</td>
                    <td>{position.quantity}</td>
                    <td>{position.entryPrice}</td>
                    <td>{position.stopLoss || '-'}</td>
                    <td>{position.takeProfit || '-'}</td>
                    <td className={position.unrealizedPnL >= 0 ? 'is-positive' : 'is-negative'}>{currency.format(position.unrealizedPnL || 0)}</td>
                    <td><button type="button" onClick={() => onClosePosition(position.id)}>Close</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState label="No open positions." />
        )}

        {activeTab === 'Closed Positions' && (
          closedPositions.length ? (
            <table>
              <thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>Exit</th><th>P&L</th><th>R</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {closedPositions.map((trade) => (
                  <tr key={trade.id}>
                    <td>{trade.symbol}</td>
                    <td className={trade.side === 'buy' ? 'is-positive' : 'is-negative'}>{trade.side}</td>
                    <td>{trade.quantity}</td>
                    <td>{trade.entryPrice}</td>
                    <td>{trade.exitPrice}</td>
                    <td className={trade.pnl >= 0 ? 'is-positive' : 'is-negative'}>{currency.format(trade.pnl)}</td>
                    <td>{trade.rMultiple}</td>
                    <td>{trade.closeReason}</td>
                    <td><button type="button" onClick={() => onJournalTrade(trade)}>Journal</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState label="Closed positions will appear here after replay hits SL/TP or manual close." />
        )}

        {activeTab === 'Journal' && (
          journalDrafts.length ? (
            <table>
              <thead><tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Notes</th></tr></thead>
              <tbody>
                {journalDrafts.map((draft) => (
                  <tr key={draft.unique_id}>
                    <td>{draft.symbol}</td>
                    <td>{draft.trade_type}</td>
                    <td>{draft.price}</td>
                    <td>{draft.exit_price}</td>
                    <td>{currency.format(draft.pnl || 0)}</td>
                    <td>{draft.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState label="Local journal drafts and saved backtest notes appear here." />
        )}
      </div>
    </section>
  );
}

export default BacktestBottomPanel;
