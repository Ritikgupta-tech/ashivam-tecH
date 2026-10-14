import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initAnalytics } from './utils/analytics'
import './styles/globals.css'
import './styles/animations.css'

initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
