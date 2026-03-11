import React from 'react'
import { useAppStore } from '../store/useAppStore'

interface ClickableUsernameProps {
  userId: string
  username: string
  avatar?: string
  bio?: string
  className?: string
  showAtSymbol?: boolean
}

export const ClickableUsername: React.FC<ClickableUsernameProps> = ({
  userId,
  username,
  avatar,
  bio,
  className = '',
  showAtSymbol = true,
}) => {
  const { setUserActionsOpen } = useAppStore()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUserActionsOpen(true, {
      id: userId,
      username,
      avatar: avatar || '',
      bio,
    })
  }

  return (
    <button
      onClick={handleClick}
      className={`text-neon-gold hover:text-neon-yellow hover:underline transition-colors ${className}`}
    >
      {showAtSymbol ? `@${username}` : username}
    </button>
  )
}

export default ClickableUsername
