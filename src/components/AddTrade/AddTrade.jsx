import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManualTradeForm from './ManualTradeForm';
import ApiImportForm from './ApiImportForm';
import './AddTrade.css';
import { API_URL } from "../../utils/constants";

const brokers = [
  { id: 1, name: 'MT5 Broker 1' },
  { id: 2, name: 'MT5 Broker 2' },
  { id: 3, name: 'Binance' },
];

function AddTrade({trades}) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('manual');
  const [csvData, setCsvData] = useState(null);
  const [selectedBrokerId, setSelectedBrokerId] = useState(brokers[0].id);


   


  const selectedBroker = brokers.find(b => b.id === selectedBrokerId);

  return (
    <div className="main-content">
      {/* Header */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>{activeTab === 'manual' ? 'Add Trade' : 'Trade Import'}</h1>

        {/* Broker Dropdown */}
        <select
          className="broker-dropdown"
          value={selectedBrokerId}
          onChange={(e) => setSelectedBrokerId(parseInt(e.target.value))}
        >
          {brokers.map(broker => (
            <option key={broker.id} value={broker.id}>{broker.name}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
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
          API Import
        </button>
      </div>

      {/* Content */}
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
    </div>
  );
}

export default AddTrade;
