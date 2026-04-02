import React, { useState } from 'react';
import ManualEntryForm from './ManualEntryForm';
import CSVUploadForm from './CSVUploadForm';

function ManualTradeForm({ API_URL, csvData, setCsvData,trades }) {
  const [uploadType, setUploadType] = useState('single');

  const showSingleEntry = () => {
    setUploadType('single');
  };

  const showCSVUpload = () => {
    setUploadType('csv');
  };

  return (
    <div className="form-container manual-section" style={{display: 'block'}}>
      {/* Upload Options */}
      <div className="upload-options">
        <div 
          className={`upload-option-btn ${uploadType === 'single' ? 'active' : ''}`} 
          id="singleEntryBtn"
          onClick={showSingleEntry}
        >
          <i className="fas fa-plus-circle"></i> Single Entry
        </div>
        <div 
          className={`upload-option-btn ${uploadType === 'csv' ? 'active' : ''}`} 
          id="csvUploadBtn"
          onClick={showCSVUpload}
        >
          <i className="fas fa-file-csv"></i> CSV Bulk Upload
        </div>
      </div>

      {uploadType === 'single' ? (
        <ManualEntryForm API_URL={API_URL} />
      ) : (
        <CSVUploadForm 
          API_URL={API_URL} 
          csvData={csvData}
          setCsvData={setCsvData}
          trades={trades}
        />
      )}
    </div>
  );
}

export default ManualTradeForm;