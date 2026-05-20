import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import StudioPage from './pages/StudioPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <div className="dark min-h-screen bg-bg text-text font-sans">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}
