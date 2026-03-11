import React, { useState, useEffect } from 'react'
import { Loader2, AlertCircle, Check } from 'lucide-react'
import { usePerformerApplication } from '../hooks/useUserFollows'

interface PerformerApplicationModalProps {
  isOpen: boolean
  onClose: () => void
}

export const PerformerApplicationModal: React.FC<PerformerApplicationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { application, loading: appLoading, canResubmit, submitApplication } = usePerformerApplication()
  
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    talentCategory: '',
    bio: '',
    videoUrl: '',
    availability: '',
    paypalEmail: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load user data if they have an application
  useEffect(() => {
    if (application) {
      setFormData({
        fullName: application.full_name || '',
        dateOfBirth: application.date_of_birth || '',
        email: application.email || '',
        phone: application.phone || '',
        talentCategory: application.talent_category || '',
        bio: application.bio || '',
        videoUrl: application.video_url || '',
        availability: application.availability || '',
        paypalEmail: application.paypal_email || '',
      })
    }
  }, [application])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate PayPal email
      if (formData.paypalEmail !== formData.email && 
          !formData.paypalEmail.toLowerCase().includes('@paypal.com') &&
          !formData.paypalEmail.toLowerCase().includes('@gmail.com') &&
          !formData.paypalEmail.toLowerCase().includes('@yahoo.com') &&
          !formData.paypalEmail.toLowerCase().includes('@hotmail.com') &&
          !formData.paypalEmail.toLowerCase().includes('@outlook.com')) {
        // Allow it but warn
        console.warn('PayPal email may not match primary email')
      }

      const success = await submitApplication({
        full_name: formData.fullName,
        date_of_birth: formData.dateOfBirth,
        email: formData.email,
        phone: formData.phone || undefined,
        talent_category: formData.talentCategory,
        bio: formData.bio || undefined,
        video_url: formData.videoUrl || undefined,
        availability: formData.availability || undefined,
        paypal_email: formData.paypalEmail,
      })

      if (!success) {
        throw new Error('Failed to submit application')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Error submitting application:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Show current application status
  if (application && !canResubmit && application.status === 'denied') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            ✕
          </button>

          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 mx-auto text-orange-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Application Denied
            </h2>
            <p className="text-gray-400 mb-4">
              Your performer application was denied.
            </p>
            {application.denial_reason && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-400">Reason:</p>
                <p className="text-white">{application.denial_reason}</p>
              </div>
            )}
            <p className="text-gray-500 text-sm">
              You can resubmit your application after 48 hours.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show approved status
  if (application && application.status === 'approved') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            ✕
          </button>

          <div className="text-center py-8">
            <Check className="w-16 h-16 mx-auto text-green-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Application Approved!
            </h2>
            <p className="text-gray-400">
              Your performer application has been approved. You can now join queues for auditions.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show pending status
  if (application && application.status === 'pending') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            ✕
          </button>

          <div className="text-center py-8">
            <Loader2 className="w-16 h-16 mx-auto text-yellow-400 mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Application Pending
            </h2>
            <p className="text-gray-400">
              Your performer application is being reviewed. Check back soon!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">
          Performer Application
        </h2>
        <p className="text-gray-400 mb-6">
          Apply to become a performer on MaiTalent. Required for joining audition queues.
        </p>

        {success ? (
          <div className="text-center py-8">
            <Check className="w-16 h-16 mx-auto text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Application Submitted!
            </h3>
            <p className="text-gray-400">
              We'll review your application and get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Required Fields Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                ⚠️ PayPal email must match your payout details for verification.
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-gray-500 text-xs mt-1">Must be 18+ to perform</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* PayPal Email - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                PayPal Email (for payouts) *
              </label>
              <input
                type="email"
                required
                value={formData.paypalEmail}
                onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="yourpaypal@email.com"
              />
              <p className="text-gray-500 text-xs mt-1">
                Must match your PayPal account for payouts
              </p>
            </div>

            {/* Talent Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Talent Category *
              </label>
              <select
                required
                value={formData.talentCategory}
                onChange={(e) => setFormData({ ...formData, talentCategory: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                <option value="Singing">Singing</option>
                <option value="Dancing">Dancing</option>
                <option value="Comedy">Comedy</option>
                <option value="Magic">Magic</option>
                <option value="Variety">Variety Act</option>
                <option value="Instrumental">Instrumental</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Bio
              </label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Tell us about yourself and your talent..."
              />
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Video URL (optional)
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Availability
              </label>
              <select
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select availability</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekends">Weekends</option>
                <option value="any">Any time</option>
                <option value="specific">Specific dates</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || appLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading || appLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default PerformerApplicationModal
