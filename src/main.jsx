import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/style.css';

import App from './App';

// Hide loading screen (safe check)
const loading = document.getElementById('loading');
if (loading) loading.style.display = 'none';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
