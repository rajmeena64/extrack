import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManualTradeForm from './ManualTradeForm';
import ApiImportForm from './ApiImportForm';
import './AddTrade.css';
import LegacyIcon from '../Common/LegacyIcon';
import CustomSelect from '../Common/CustomSelect';
import { API_URL } from "../../utils/constants";
import MainContentWrapper from '../Layout/MainContentWrapper';
import PageHeader from '../Layout/PageHeader';

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
    <MainContentWrapper className="add-trade-page">
      <section className="add-trade-shell">
        <PageHeader
          title={activeTab === 'manual' ? 'Add Trade' : 'Trade Import'}
          onBack={() => navigate('/')}
          className="add-trade-header"
          actions={(
            <>
            {activeTab === 'manual' && (
              <div className="broker-select-card">
                <LegacyIcon className="fas fa-network-wired broker-select-icon" />
                <span className="broker-select-card__label">Broker</span>
                <CustomSelect
                  className="broker-dropdown"
                  value={selectedBrokerId}
                  onChange={(e) => setSelectedBrokerId(parseInt(e.target.value, 10))}
                  options={brokers.map((broker) => ({ value: broker.id, label: broker.name }))}
                  ariaLabel="Broker"
                />
              </div>
            )}

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
            </>
          )}
        />

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
    </MainContentWrapper>
  );
}

export default AddTrade;
