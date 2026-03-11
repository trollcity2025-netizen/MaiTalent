import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useAppStore } from '../store/useAppStore'

export function MainLayout() {
  const { sidebarCollapsed } = useAppStore()

  return (
    <div className="min-h-screen spotlight-gradient flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={`flex-1 transition-all duration-300 overflow-x-hidden pt-16 ${
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}
        >
          <div className="h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
