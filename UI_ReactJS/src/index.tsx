import React from 'react';
import * as ReactDom from 'react-dom/client';
import App from './App';

// static root of spreadsheet in HTML
// const ss = document.querySelector('#ss')!;
// ss.innerHTML = '';
// create a new root element to avoid warnings
const root = document.getElementById('root')!;
// ss.append(root);

// render the App component using createRoot
ReactDom.createRoot(root).render(<App />);
