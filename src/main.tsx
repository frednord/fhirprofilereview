import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ComparePage } from './pages/ComparePage'

const rootElement = document.getElementById('root')
if (rootElement === null) throw new Error('Root element #root saknas i index.html')

createRoot(rootElement).render(
  <StrictMode>
    <ComparePage />
  </StrictMode>,
)
