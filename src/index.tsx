import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './App.css';
import './index.css'

const rootElement = document.getElementById('root')!; // 👈 non-null assertion
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
