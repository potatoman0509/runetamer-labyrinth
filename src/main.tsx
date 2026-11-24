import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { clearLocalSave } from './game/save';
import './index.css';

declare const __STANDALONE_ARTIFACT__: boolean | undefined;

interface ErrorBoundaryState {
  error: Error | null;
}

class GameErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RuneTamer runtime error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 16,
            color: '#f7f1e1',
            background: '#1b1922',
            minHeight: '100vh',
            fontFamily: 'sans-serif',
            fontSize: 13,
          }}
        >
          <h2 style={{ color: '#ff7a7a', marginTop: 0 }}>エラーが発生しました</h2>
          <pre
            style={{
              background: '#110f16',
              padding: 10,
              borderRadius: 6,
              overflowX: 'auto',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
            }}
          >
            {String(this.state.error.message || this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => {
              clearLocalSave();
              this.setState({ error: null });
              window.location.reload();
            }}
            style={{
              marginTop: 10,
              padding: '8px 14px',
              background: '#c97c2b',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            セーブを初期化して再起動
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function mountApp() {
  let rootEl = document.getElementById('root');
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);
  }
  createRoot(rootEl).render(
    <StrictMode>
      <GameErrorBoundary>
        <App />
      </GameErrorBoundary>
    </StrictMode>,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp, { once: true });
} else {
  mountApp();
}

// Register PWA service worker safely ONLY in deployed web builds (never in standalone HTML artifacts)
const isStandalone = typeof __STANDALONE_ARTIFACT__ !== 'undefined' && __STANDALONE_ARTIFACT__;
if (!isStandalone) {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    ) {
      window.addEventListener('load', () => {
        try {
          navigator.serviceWorker?.register('./sw.js').catch(() => {
            // Ignore SW registration failures gracefully
          });
        } catch {
          // Ignore sandboxed SecurityError
        }
      });
    }
  } catch {
    // Ignore restricted navigator/location access
  }
}
