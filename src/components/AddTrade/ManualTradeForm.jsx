import React, { useState } from 'react';
import ManualEntryForm from './ManualEntryForm';
import CSVUploadForm from './CSVUploadForm';
import CustomSelect from '../Common/CustomSelect';

function ManualTradeForm({ API_URL, csvData, setCsvData,trades }) {
  const [uploadType, setUploadType] = useState('single');

  return (
    <div className="add-trade-form-container manual-section" style={{display: 'block'}}>
      <div className="entry-type-control">
        <span className="entry-type-control__label">Entry Type</span>
        <CustomSelect
          id="entryTypeSelect"
          name="entryType"
          className="entry-type-select"
          value={uploadType}
          onChange={(event) => setUploadType(event.target.value)}
          options={[
            { value: 'single', label: 'Single Entry' },
            { value: 'csv', label: 'CSV Bulk Upload' },
          ]}
          ariaLabel="Entry Type"
        />
      </div>

      {uploadType === 'single' ? (
        <ManualEntryForm API_URL={API_URL} trades={trades} />
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

