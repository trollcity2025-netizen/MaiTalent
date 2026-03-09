import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './components/MainLayout'
import { HomePage } from './pages/HomePage'
import { LiveShowPage } from './pages/LiveShowPage'
import { ContestantStagePage } from './pages/ContestantStagePage'
import { AuditionPage } from './pages/AuditionPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { ProfilePage } from './pages/ProfilePage'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/live-shows" element={<HomePage />} />
          <Route path="/shows" element={<HomePage />} />
          <Route path="/auditions" element={<AuditionPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/wallet" element={<div className="text-center py-20"><h1 className="text-3xl font-bold shimmer-gold">Wallet Coming Soon</h1></div>} />
          <Route path="/settings" element={<div className="text-center py-20"><h1 className="text-3xl font-bold shimmer-gold">Settings Coming Soon</h1></div>} />
          <Route path="/search" element={<div className="text-center py-20"><h1 className="text-3xl font-bold shimmer-gold">Search Coming Soon</h1></div>} />
        </Route>
        
        {/* Show pages - full screen */}
        <Route path="/show/:id" element={<LiveShowPage />} />
        
        {/* Contestant stage - full screen */}
        <Route path="/go-live" element={<ContestantStagePage />} />
        <Route path="/stage/:id" element={<ContestantStagePage />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
