import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ComparePage } from './pages/ComparePage'

const rootElement = document.getElementById('root')
if (rootElement === null) throw new Error('Root element #root saknas i index.html')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ComparePage />
    </ErrorBoundary>
  </StrictMode>,
)
