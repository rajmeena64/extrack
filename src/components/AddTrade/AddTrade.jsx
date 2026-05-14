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
        <header className="app-page-header add-trade-header">
          <div className="app-page-header__left">
            <button className="back-btn" onClick={() => navigate('/')}>
              <LegacyIcon className="fas fa-arrow-left" />
            </button>

            <h1 className="app-page-title">
              {activeTab === 'manual' ? 'Add Trade' : 'Trade Import'}
            </h1>
          </div>

          <div className="app-page-header__right">
            <label className="broker-select-card">
              <LegacyIcon className="fas fa-network-wired broker-select-icon" />
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
              <LegacyIcon className="fas fa-chevron-down broker-select-chevron" />
            </label>

            <div className="trade-tabs">
              <button
                className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                onClick={() => setActiveTab('manual')}
              >
                <LegacyIcon className="fas fa-keyboard" /> Manually
              </button>
              <button
                className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`}
                onClick={() => setActiveTab('api')}
              >
                <LegacyIcon className="fas fa-sync-alt" /> Exact Sync
              </button>
            </div>
          </div>
        </header>

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
