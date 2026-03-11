import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './components/MainLayout'
import { StoreModal } from './components/StoreModal'
import { PayoutModal } from './components/PayoutModal'
import { PayPalModal } from './components/PayPalModal'
import { PerformerApplicationModal } from './components/PerformerApplicationModal'
import { UserActionsModal } from './components/UserActionsModal'
import { HomePage } from './pages/HomePage'
import { AuthPage } from './pages/AuthPage'
import { TermsPage } from './pages/TermsPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { LiveShowPage } from './pages/LiveShowPage'
import { AuditionPage } from './pages/AuditionPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { MaiChatsPage } from './pages/MaiChatsPage'
import { HallOfChampionsPage } from './pages/HallOfChampionsPage'
import { CompetitionPage } from './pages/CompetitionPage'
import { CalendarPage } from './pages/CalendarPage'
import { FansPage } from './pages/FansPage'
import { useAppStore } from './store/useAppStore'

function App() {
  const { performerAppOpen, userActionsOpen, selectedUserForActions, setPerformerAppOpen, setUserActionsOpen } = useAppStore()
  
  return (
    <Router>
      <StoreModal />
      <PayoutModal />
      <PayPalModal />
      <PerformerApplicationModal 
        isOpen={performerAppOpen} 
        onClose={() => setPerformerAppOpen(false)} 
      />
      {selectedUserForActions && (
        <UserActionsModal
          isOpen={userActionsOpen}
          onClose={() => setUserActionsOpen(false)}
          user={selectedUserForActions}
        />
      )}
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/live-shows" element={<HomePage />} />
          <Route path="/shows" element={<HomePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/auditions" element={<AuditionPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/wallet" element={<div className="text-center py-20"><h1 className="text-3xl font-bold shimmer-gold">Wallet Coming Soon</h1></div>} />
          <Route path="/settings" element={<ProfilePage />} />
          <Route path="/search" element={<div className="text-center py-20"><h1 className="text-3xl font-bold shimmer-gold">Search Coming Soon</h1></div>} />
          <Route path="/chats" element={<MaiChatsPage />} />
          <Route path="/fans" element={<FansPage />} />
          <Route path="/fans/:tab" element={<FansPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/champions" element={<HallOfChampionsPage />} />
          <Route path="/competition" element={<CompetitionPage />} />
        </Route>
        
        {/* Show pages - full screen (both preview and live shows use the same LiveShowPage) */}
        <Route path="/show/:id" element={<LiveShowPage />} />
        <Route path="/show" element={<LiveShowPage />} />
        
        {/* Legacy routes - now redirect to LiveShowPage */}
        <Route path="/go-live" element={<LiveShowPage />} />
        <Route path="/stage/:id" element={<LiveShowPage />} />
        
        {/* Auth pages - full screen (no layout) */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthPage />} />
        
        {/* Terms page - must accept before signup */}
        <Route path="/terms" element={<TermsPage />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
