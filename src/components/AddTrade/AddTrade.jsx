import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManualTradeForm from './ManualTradeForm';
import ApiImportForm from './ApiImportForm';
import './AddTrade.css';
import LegacyIcon from '../Common/LegacyIcon';
import { API_URL } from "../../utils/constants";

const brokers = [
  { id: 1, name: 'MT5 Broker 1' },
  { id: 2, name: 'MT5 Broker 2' },
  { id: 3, name: 'Binance' },
];

function AddTrade({ trades }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('manual');
  const [csvData, setCsvData] = useState(null);
  const [selectedBrokerId, setSelectedBrokerId] = useState(brokers[0].id);

  const selectedBroker = brokers.find((broker) => broker.id === selectedBrokerId);

  return (
    <div className="main-content add-trade-page">
      <section className="add-trade-shell">
        <div className="add-trade-hero">
          <div className="add-trade-hero__content">
            <div className="add-trade-hero__headline">
              <button className="back-btn" onClick={() => navigate('/')}>
                <LegacyIcon className="fas fa-arrow-left" />
              </button>

              <div className="add-trade-hero__title-wrap">
                <span className="add-trade-hero__eyebrow">Trade Journal</span>
                <h1 className="app-page-title">{activeTab === 'manual' ? 'Add Trade' : 'Trade Import'}</h1>
                <p className="add-trade-hero__copy">
                  {activeTab === 'manual'
                    ? 'Capture entries with cleaner fields, quick screenshots, and broker-aware context.'
                    : 'Connect accounts or import trade history with the same dashboard theme and workflow.'}
                </p>
              </div>
            </div>

            <div className="add-trade-hero__actions">
              <label className="broker-select-card">
                <span className="broker-select-card__label">Broker</span>
                <select
                  className="broker-dropdown"
                  value={selectedBrokerId}
                  onChange={(e) => setSelectedBrokerId(parseInt(e.target.value, 10))}
                >
                  {brokers.map((broker) => (
                    <option key={broker.id} value={broker.id}>
                      {broker.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="trade-tabs">
                <button
                  className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                  onClick={() => setActiveTab('manual')}
                >
                  Manual Trade
                </button>
                <button
                  className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`}
                  onClick={() => setActiveTab('api')}
                >
                  Sync Import
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="add-trade-stage">
          {activeTab === 'manual' ? (
            <ManualTradeForm
              API_URL={API_URL}
              trades={trades}
              csvData={csvData}
              setCsvData={setCsvData}
              broker={selectedBroker}
            />
          ) : (
            <ApiImportForm
              API_URL={API_URL}
              selectedBroker={selectedBroker}
              setSelectedBrokerId={setSelectedBrokerId}
            />
          )}
        </section>
      </section>
    </div>
  );
}

export default AddTrade;
