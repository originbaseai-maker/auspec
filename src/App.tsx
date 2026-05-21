import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import StudioPage from './pages/StudioPage'
import DashboardPage from './pages/DashboardPage'
import { AnalyzerProvider } from '@/contexts/AnalyzerContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function App() {
  return (
    <div className="dark min-h-screen bg-bg text-text font-sans">
      <BrowserRouter>
        <AnalyzerProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/studio"
              element={
                <ProtectedRoute>
                  <StudioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AnalyzerProvider>
      </BrowserRouter>
    </div>
  )
}
