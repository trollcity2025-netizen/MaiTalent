import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, UserMinus, MessageSquare, Shield, Flag, Loader2, X } from 'lucide-react'
import { useFollow, useBlock, useReport, useIsFollowing, useIsBlocked } from '../hooks/useUserFollows'

interface UserActionsModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    username: string
    avatar: string
    bio?: string
  }
}

export const UserActionsModal: React.FC<UserActionsModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [followRefreshKey, setFollowRefreshKey] = useState(0)
  const { isFollowing, loading: followCheckLoading } = useIsFollowing(user.id, followRefreshKey)
  const { isBlocked, loading: blockCheckLoading } = useIsBlocked(user.id)
  const { toggleFollow, loading: followLoading } = useFollow()
  const { block, loading: blockLoading } = useBlock()
  const { report, loading: reportLoading } = useReport()

  const [showReportForm, setShowReportForm] = useState(false)
  const [reportType, setReportType] = useState<'spam' | 'harassment' | 'inappropriate' | 'fake_account' | 'other'>('spam')
  const [reportDescription, setReportDescription] = useState('')
  const [reportSuccess, setReportSuccess] = useState(false)
  const [blockSuccess, setBlockSuccess] = useState(false)

  const handleFollowClick = async () => {
    await toggleFollow(user.id, isFollowing)
    setFollowRefreshKey(prev => prev + 1)
  }

  const handleBlockClick = async () => {
    if (confirm('Are you sure you want to block this user?')) {
      const success = await block(user.id)
      if (success) {
        setBlockSuccess(true)
        setTimeout(() => {
          onClose()
          setBlockSuccess(false)
        }, 1500)
      }
    }
  }

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await report(user.id, reportType, reportDescription)
    if (success) {
      setReportSuccess(true)
      setTimeout(() => {
        onClose()
        setReportSuccess(false)
        setShowReportForm(false)
      }, 1500)
    }
  }

  if (!isOpen) return null

  const loading = followCheckLoading || blockCheckLoading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Profile Preview */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-700">
          <div className="w-16 h-16 rounded-full bg-gray-700 overflow-hidden">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                👤
              </div>
            )}
          </div>
          <div>
            <Link
              to={`/profile/${user.id}`}
              onClick={onClose}
              className="text-xl font-bold text-white hover:text-neon-gold"
            >
              @{user.username}
            </Link>
            {user.bio && (
              <p className="text-gray-400 text-sm line-clamp-2 mt-1">{user.bio}</p>
            )}
          </div>
        </div>

        {reportSuccess ? (
          <div className="text-center py-4">
            <Flag className="w-12 h-12 mx-auto text-green-400 mb-2" />
            <p className="text-white font-semibold">Report Submitted</p>
            <p className="text-gray-400 text-sm">Thank you for your feedback</p>
          </div>
        ) : blockSuccess ? (
          <div className="text-center py-4">
            <Shield className="w-12 h-12 mx-auto text-green-400 mb-2" />
            <p className="text-white font-semibold">User Blocked</p>
            <p className="text-gray-400 text-sm">You will no longer see this user</p>
          </div>
        ) : showReportForm ? (
          <form onSubmit={handleReportSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Report User</h3>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Reason</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate">Inappropriate Content</option>
                <option value="fake_account">Fake Account</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Description (optional)</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                rows={3}
                placeholder="Provide more details..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReportForm(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reportLoading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white flex items-center justify-center gap-2"
              >
                {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Submit
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {/* Follow/Unfollow */}
            <button
              onClick={handleFollowClick}
              disabled={loading || followLoading || isBlocked}
              className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                isFollowing
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-candy-red hover:bg-red-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {followLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserMinus className="w-5 h-5" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Follow
                </>
              )}
            </button>

            {/* Message */}
            <Link
              to={`/chats?user=${user.id}`}
              onClick={onClose}
              className="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              Message
            </Link>

            {/* Block */}
            <button
              onClick={handleBlockClick}
              disabled={loading || blockLoading}
              className="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {blockLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Block User
                </>
              )}
            </button>

            {/* Report */}
            <button
              onClick={() => setShowReportForm(true)}
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flag className="w-5 h-5" />
              Report
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserActionsModal
