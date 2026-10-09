import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/utils/common/serve';
import { useAuth } from '@/context/AuthContext';
import { Button, DropdownSelect as CustomSelect } from "@/components/ui";
import TradeSaveOverlay from '../TradeSaveOverlay/TradeSaveOverlay';

export default function FileUploadForm({ brokers = [], selectedBrokerId, setSelectedBrokerId, brokerConnectionId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingTrades, setIsUploadingTrades] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [failedLogoPath, setFailedLogoPath] = useState(null);
  const fileInputRef = useRef(null);

  const selectedBroker = brokers.find((b) => b.id === selectedBrokerId);
  const accountOptions = brokers.map((b) => ({ value: b.id, label: `${b.accountName ? b.accountName : b.name} - ${b.name}` }));
  const brokerInitials = String(selectedBroker?.name || 'Account').slice(0, 2).toUpperCase();
  const hasBrokerLogo = Boolean(selectedBroker?.logoPath && failedLogoPath !== selectedBroker.logoPath);

  const handleUploadedFile = (file) => {
    setErrorMessage(null);
    if (!brokerConnectionId) {
      toast.error('Choose a trading account before adding a file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size too large. Please upload a file smaller than 10MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleUploadedFile(e.dataTransfer.files[0]);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const changeAccount = (e) => {
    const next = brokers.find((b) => String(b.id) === e.target.value);
    if (next?.id === selectedBrokerId) return;
    removeFile();
    setSelectedBrokerId(next?.id ?? null);
  };

  const submitUploadedTrades = async () => {
    if (isUploadingTrades) return;
    if (!selectedFile) {
      toast.error('No trade file selected for upload.');
      return;
    }
    if (!brokerConnectionId) {
      toast.error('Choose a trading account before uploading.');
      return;
    }
    if (!user?.ID) {
      toast.error('Please sign in to continue.');
      return navigate('/login');
    }
    setIsUploadingTrades(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('brokerConnectionId', brokerConnectionId);

      const { data: res } = await api.post('/trades/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res?.success) {
        await queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });
        toast.success(`Successfully saved ${res.count || 0} trades!`);
        navigate('/dashboard');
      } else {
        throw new Error(res?.message || 'File upload failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'File upload failed. Please check the file format and account selection.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsUploadingTrades(false);
    }
  };

  return (
    <>
      {isUploadingTrades ? <TradeSaveOverlay label="Uploading trades and processing statement..." /> : null}
      <div id="csv-upload-form" className="w-full flex flex-col gap-4">
        {errorMessage ? (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs font-semibold flex items-center justify-between gap-3">
            <span>⚠️ {errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 font-bold hover:underline">Dismiss</button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(270px,0.75fr)] gap-4 items-stretch">
          <section className="flex flex-col gap-5 p-5 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
            <header className="flex flex-col gap-1 pb-4 border-b border-[var(--divider-strong)]">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">File import</span>
              <h2 className="text-lg font-bold text-[var(--heading)] tracking-tight m-0">Import your trades</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0">Choose where these trades belong, then add your CSV, Excel, JSON, or HTML statement file.</p>
            </header>
            <div className="flex flex-col gap-1.5 w-full max-w-sm">
              <label htmlFor="file-account-select" className="text-xs font-bold text-[var(--heading)]">Trading account <span className="text-rose-500">*</span></label>
              <CustomSelect
                id="file-account-select" name="file-account-select" className="w-full" value={selectedBrokerId ?? ''} onChange={changeAccount} options={accountOptions}
                placeholder={brokers.length ? 'Choose an account' : 'No trading accounts available'}
                triggerText={selectedBroker ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex items-center justify-center size-7 rounded-lg border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-[10px] font-bold text-[var(--text-secondary)]" aria-hidden="true">
                      {hasBrokerLogo ? <img src={selectedBroker.logoPath} alt="" className="size-4 object-contain" onError={() => setFailedLogoPath(selectedBroker.logoPath)} /> : brokerInitials}
                    </span>
                    <span className="flex flex-col gap-0.5 min-w-0 text-left">
                      <strong className="text-xs font-bold text-[var(--heading)] truncate">{selectedBroker.accountName ? selectedBroker.accountName : selectedBroker.name}</strong>
                      <small className="text-[10px] text-[var(--text-muted)] truncate">{selectedBroker.name}</small>
                    </span>
                  </div>
                ) : undefined}
                ariaLabel="Choose trading account" disabled={brokers.length === 0 || isUploadingTrades}
              />
            </div>

            {!selectedFile ? (
              <div
                className={`flex flex-col items-center justify-center min-h-[220px] p-6 text-center border-2 border-dashed rounded-2xl transition-all duration-150 ${isDragging ? 'border-brand-solid bg-brand-solid/5 scale-[0.99]' : !brokerConnectionId ? 'border-[var(--divider-strong)] bg-[var(--surface-subtle)] opacity-60 cursor-not-allowed' : 'border-[var(--divider-strong)] bg-[var(--surface-subtle)] hover:border-brand-solid/60'}`}
                onDragOver={(e) => { e.preventDefault(); if (brokerConnectionId) setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-center size-12 mb-3 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-xs font-black tracking-wider text-[var(--heading)] shadow-xs" aria-hidden="true">FILE</div>
                <div className="text-sm font-bold text-[var(--heading)] mb-1">Drop your trade file here</div>
                <div className="max-w-sm text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">Supports CSV, Excel (.xlsx/.xls), JSON, or HTML detailed statements (MT4/MT5). Max size: 10 MB.</div>
                <Button color="primary" size="md" onClick={() => fileInputRef.current?.click()} isDisabled={!brokerConnectionId}>Choose File</Button>
                <input type="file" ref={fileInputRef} accept=".csv,.json,.html,.htm,.txt,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && handleUploadedFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="flex flex-col border border-[var(--divider-strong)] rounded-xl bg-[var(--bg-card)] p-4 shadow-xs" id="filePreview">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold text-xs">READY</span>
                    <div className="flex flex-col">
                      <h4 className="text-xs font-bold text-[var(--heading)] m-0">{selectedFile.name}</h4>
                      <span className="text-[11px] text-[var(--text-secondary)]">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for server processing</span>
                    </div>
                  </div>
                  <Button color="link-destructive" size="xs" onClick={removeFile}>Remove file</Button>
                </div>
              </div>
            )}
          </section>

          <aside className="flex flex-col justify-between gap-6 p-5 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--divider-strong)]">
                <div className="flex flex-wrap gap-1.5" aria-label="Import details">
                  <span className="px-2.5 py-1 rounded-full bg-brand-solid/10 text-brand-solid text-[10px] font-bold">All Formats</span>
                  <span className="px-2.5 py-1 rounded-full bg-[var(--surface-subtle)] border border-[var(--divider-strong)] text-[var(--text-secondary)] text-[10px] font-bold">Up to 10 MB</span>
                  <span className="px-2.5 py-1 rounded-full bg-[var(--surface-subtle)] border border-[var(--divider-strong)] text-[var(--text-secondary)] text-[10px] font-bold">Server Verified</span>
                </div>
                {selectedBroker ? (
                  <span className="flex items-center justify-center size-9 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-[10px] font-black text-[var(--text-secondary)]" aria-hidden="true">
                    {hasBrokerLogo ? <img src={selectedBroker.logoPath} alt="" className="size-5 object-contain" onError={() => setFailedLogoPath(selectedBroker.logoPath)} /> : brokerInitials}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-[var(--heading)] m-0">Before you upload</h3>
                <ol className="m-0 p-0 list-none flex flex-col gap-3">
                  <li className="grid grid-cols-[24px_1fr] gap-3 items-start">
                    <span className="flex items-center justify-center size-6 rounded-lg bg-brand-solid/10 border border-brand-solid/20 text-brand-solid text-xs font-bold">1</span>
                    <p className="m-0 flex flex-col gap-0.5"><strong className="text-xs font-bold text-[var(--heading)]">Export your trades</strong><small className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Download the trade history from your broker as a CSV, Excel, JSON, or HTML statement.</small></p>
                  </li>
                  <li className="grid grid-cols-[24px_1fr] gap-3 items-start">
                    <span className="flex items-center justify-center size-6 rounded-lg bg-brand-solid/10 border border-brand-solid/20 text-brand-solid text-xs font-bold">2</span>
                    <p className="m-0 flex flex-col gap-0.5"><strong className="text-xs font-bold text-[var(--heading)]">Keep the original columns</strong><small className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Leave the exported headers and timestamps unchanged.</small></p>
                  </li>
                  <li className="grid grid-cols-[24px_1fr] gap-3 items-start">
                    <span className="flex items-center justify-center size-6 rounded-lg bg-brand-solid/10 border border-brand-solid/20 text-brand-solid text-xs font-bold">3</span>
                    <p className="m-0 flex flex-col gap-0.5"><strong className="text-xs font-bold text-[var(--heading)]">Automatic Trade Import</strong><small className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Your trades are verified and saved directly to your journal.</small></p>
                  </li>
                </ol>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button color="secondary" size="md" onClick={() => navigate('/')} isDisabled={isUploadingTrades}>Cancel</Button>
          <Button color="primary" size="md" onClick={submitUploadedTrades} isDisabled={!selectedFile || !brokerConnectionId || isUploadingTrades} isLoading={isUploadingTrades} id="submitFileBtn">
            {isUploadingTrades ? 'Uploading trades...' : 'Upload Trades'}
          </Button>
        </div>
      </div>
    </>
  );
}
