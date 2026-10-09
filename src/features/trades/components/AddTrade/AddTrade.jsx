import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManualTradeForm from './ManualTradeForm/ManualTradeForm';
import SyncAccounts from './SyncAccounts/SyncAccounts';
import MainContentWrapper from '@/components/Layout/MainContentWrapper';
import PageHeader from '@/components/Layout/PageHeader';
import CurrencyFilterDropdown from '@/components/Header/CurrencyFilterDropdown';
import { Button } from "@/components/ui";

function AddTrade({ currencyCode = 'USD', defaultCurrencyCode = 'USD', onCurrencyChange }) {
  const navigate = useNavigate();
  const openSyncTab = new URLSearchParams(window.location.search).has('oauth') || new URLSearchParams(window.location.search).has('ctrader') || new URLSearchParams(window.location.search).get('tab') === 'sync';
  const [activeTab, setActiveTab] = useState(openSyncTab ? 'sync' : null);
  const [showEntryMethods, setShowEntryMethods] = useState(openSyncTab);
  const [fileData, setFileData] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState(null);

  const selectedBroker = brokers.find((broker) => broker.id === selectedBrokerId);
  const openTradeEntry = (broker = selectedBroker) => {
    const supportsSync = String(broker?.tradeMethod || '').endsWith('_sync');
    setShowEntryMethods(true);
    setActiveTab(supportsSync ? 'sync' : 'manual');
  };
  const openManualEntry = () => {
    setShowEntryMethods(true);
    setActiveTab('manual');
  };

  return (
    <MainContentWrapper className="add-trade-page">
      <section className="flex flex-col gap-3.5 w-full">
        <PageHeader
          title={showEntryMethods ? 'Add Trade' : 'Trading Accounts'}
          onBack={() => navigate('/')}
          className="add-trade-header"
          actions={
            <div className="flex items-center gap-2">
              <CurrencyFilterDropdown
                currencyCode={currencyCode}
                defaultCurrencyCode={defaultCurrencyCode}
                onCurrencyChange={onCurrencyChange}
              />
              {showEntryMethods && (
                <Button
                  color="secondary"
                  size="sm"
                  onClick={() => {
                    setShowEntryMethods(false);
                    setActiveTab(null);
                  }}
                >
                  Accounts
                </Button>
              )}
            </div>
          }
        />

        {showEntryMethods ? (
          <section className="flex items-center justify-end w-full pb-0.5" aria-label="Trade entry mode">
            <div className="grid grid-cols-3 items-stretch gap-1 p-1 w-full max-w-[440px] min-h-[44px] border border-[var(--divider-strong)] rounded-2xl bg-[var(--bg-card)] shadow-xs">
              <button
                type="button"
                className={`w-full min-w-0 min-h-[34px] px-2.5 py-1.5 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-[var(--button-bg)] text-[var(--button-text)] border-[var(--button-bg)] shadow-xs'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--heading)] hover:bg-[var(--surface-subtle)]'
                }`}
                onClick={() => setActiveTab('manual')}
              >
                Manually
              </button>
              <button
                type="button"
                className={`w-full min-w-0 min-h-[34px] px-2.5 py-1.5 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer ${
                  activeTab === 'file'
                    ? 'bg-[var(--button-bg)] text-[var(--button-text)] border-[var(--button-bg)] shadow-xs'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--heading)] hover:bg-[var(--surface-subtle)]'
                }`}
                onClick={() => setActiveTab('file')}
              >
                File Upload
              </button>
              <button
                type="button"
                className={`w-full min-w-0 min-h-[34px] px-2.5 py-1.5 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer ${
                  activeTab === 'sync'
                    ? 'bg-[var(--button-bg)] text-[var(--button-text)] border-[var(--button-bg)] shadow-xs'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--heading)] hover:bg-[var(--surface-subtle)]'
                }`}
                onClick={() => setActiveTab('sync')}
              >
                Exact Sync
              </button>
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-3.5 w-full">
          {!showEntryMethods ? (
            <ManualTradeForm
              fileData={fileData}
              setFileData={setFileData}
              broker={selectedBroker}
              entryMode="accounts"
              brokers={brokers}
              selectedBrokerId={selectedBrokerId}
              setSelectedBrokerId={setSelectedBrokerId}
              setBrokers={setBrokers}
              onOpenEntryMethods={openTradeEntry}
              onOpenManualEntry={openManualEntry}
              currencyCode={currencyCode}
              onCurrencyChange={onCurrencyChange}
            />
          ) : activeTab === 'manual' ? (
            <ManualTradeForm
              fileData={fileData}
              setFileData={setFileData}
              entryMode="trade"
              brokers={brokers}
              selectedBrokerId={selectedBrokerId}
              setSelectedBrokerId={setSelectedBrokerId}
              setBrokers={setBrokers}
              currencyCode={currencyCode}
              onCurrencyChange={onCurrencyChange}
            />
          ) : activeTab === 'file' ? (
            <ManualTradeForm fileData={fileData} setFileData={setFileData} entryMode="file" brokers={brokers} selectedBrokerId={selectedBrokerId} setSelectedBrokerId={setSelectedBrokerId} setBrokers={setBrokers} currencyCode={currencyCode} onCurrencyChange={onCurrencyChange} />
          ) : activeTab === 'sync' ? (
            <SyncAccounts accounts={brokers} />
          ) : null}
        </section>
      </section>
    </MainContentWrapper>
  );
}

export default AddTrade;
