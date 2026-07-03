import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from '@/App'
import { AuthProvider } from '@/hooks/useAuth'
import '@/styles/globals.css'

async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { enableMocking } = await import('@/mocks/handlers')
    await enableMocking()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}

void bootstrap()
