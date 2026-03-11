import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Mic, Music, Sparkles, FileVideo, Calendar, Send, CheckCircle, Loader2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const talentCategories = [
  { id: 'singing', label: 'Singing', icon: Music },
  { id: 'dancing', label: 'Dancing', icon: Sparkles },
  { id: 'comedy', label: 'Comedy', icon: Sparkles },
  { id: 'magic', label: 'Magic', icon: Sparkles },
  { id: 'other', label: 'Other', icon: Mic },
]

export function AuditionPage() {
  const navigate = useNavigate()
  const { user } = useAppStore()
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    talent_category: '',
    bio: '',
    video_url: '',
    availability: '',
  })
  
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload MP4, MOV, AVI, or WebM.')
      return
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large. Maximum size is 100MB.')
      return
    }

    setError(null)
    setVideoFile(file)
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setVideoPreview(previewUrl)
  }

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
    setVideoFile(null)
    setVideoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadVideo = async (): Promise<string | null> => {
    if (!videoFile || !user) return formData.video_url || null

    setUploading(true)
    setUploadProgress(0)

    try {
      const fileExt = videoFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('auditions')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('auditions')
        .getPublicUrl(fileName)

      setUploadProgress(100)
      return publicUrl
    } catch (err) {
      console.error('Error uploading video:', err)
      setError('Failed to upload video. Please try again or use a URL instead.')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('Please log in to submit an audition.')
      return
    }

    if (!formData.talent_category) {
      setError('Please select a talent category.')
      return
    }

    if (!formData.bio.trim()) {
      setError('Please tell us about yourself.')
      return
    }

    // Get user's auth email
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const userEmail = authUser?.email || ''

    // If there's a video file, upload it first
    let finalVideoUrl: string | undefined = formData.video_url
    if (videoFile) {
      const uploadedUrl = await handleUploadVideo()
      if (uploadedUrl) {
        finalVideoUrl = uploadedUrl
      } else if (!formData.video_url) {
        return // Error already set in handleUploadVideo
      }
    }

    try {
      // Check if user already has a pending application
      const { data: existingApp } = await supabase
        .from('performer_applications')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle()

      if (existingApp) {
        setError('You already have an active application. Please wait for it to be reviewed.')
        return
      }

      // Submit application to database
      const { error: submitError } = await supabase
        .from('performer_applications')
        .insert({
          user_id: user.id,
          talent_category: formData.talent_category,
          bio: formData.bio,
          video_url: finalVideoUrl || null,
          availability: formData.availability || null,
          full_name: user.username || 'Unknown',
          email: userEmail,
          date_of_birth: new Date().toISOString().split('T')[0], // Placeholder - should be from form
          paypal_email: userEmail,
          status: 'pending',
        })

      if (submitError) {
        console.error('Submit error:', submitError)
        throw submitError
      }

      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting audition:', err)
      setError('Failed to submit audition. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="glass rounded-2xl p-8 neon-border-gold">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-neon-gold/20 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-neon-gold" />
          </div>
          <h1 className="text-3xl font-bold mb-4 shimmer-gold">Application Submitted!</h1>
          <p className="text-gray-300 mb-6">
            Thank you for auditioning for MAI Talent! Our team will review your application and get back to you within 5-7 business days.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="btn-neon-red px-6 py-3 rounded-full"
            >
              Back to Home
            </button>
            <button
              onClick={() => {
                setSubmitted(false)
                setFormData({ talent_category: '', bio: '', video_url: '', availability: '' })
                removeVideo()
              }}
              className="btn-neon-gold px-6 py-3 rounded-full"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black mb-2">
          <span className="shimmer-red">Submit Your</span>{' '}
          <span className="shimmer-gold">Audition</span>
        </h1>
        <p className="text-gray-400">
          Show us what you've got! Fill out the form below to audition for MAI Talent.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-white"
          >
            <X className="w-4 h-4 inline" />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Talent Category */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-bold text-neon-yellow mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Select Your Talent
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {talentCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setFormData({ ...formData, talent_category: category.id })}
                className={`p-4 rounded-xl transition-all ${
                  formData.talent_category === category.id
                    ? 'bg-candy-red/20 border-2 border-candy-red neon-glow-red'
                    : 'glass hover:bg-white/10 border-2 border-transparent'
                }`}
              >
                <category.icon className={`w-8 h-8 mx-auto mb-2 ${
                  formData.talent_category === category.id ? 'text-candy-red' : 'text-gray-400'
                }`} />
                <span className={formData.talent_category === category.id ? 'text-candy-red' : ''}>
                  {category.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-bold text-neon-yellow mb-4">Tell Us About Yourself</h3>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Share your story, experience, and what makes your talent unique..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl input-neon resize-none"
            required
          />
          <p className="text-xs text-gray-500 mt-2">{formData.bio.length}/500 characters</p>
        </div>

        {/* Video Upload */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-bold text-neon-yellow mb-4 flex items-center gap-2">
            <FileVideo className="w-5 h-5" />
            Upload Your Audition Video
          </h3>
          
          {/* Video Preview */}
          {videoPreview && (
            <div className="mb-4 relative rounded-lg overflow-hidden bg-black">
              <video 
                src={videoPreview} 
                className="w-full max-h-48 object-contain"
                controls
              />
              <button
                type="button"
                onClick={removeVideo}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full p-1"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">Uploading...</span>
                <span className="text-sm text-gray-300">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-neon-gold h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload area */}
          {!videoPreview && !uploading && (
            <div 
              className="border-2 border-dashed border-neon-gold/30 rounded-xl p-8 text-center hover:border-neon-gold/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-neon-gold" />
              <p className="text-gray-300 mb-2">Drag and drop your video here</p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <button type="button" className="btn-neon-gold px-6 py-2 rounded-full">
                Browse Files
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: MP4, MOV, AVI (Max 100MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Or paste URL */}
          <div className="mt-4">
            <label className="text-sm text-gray-400 mb-2 block">Or paste a video URL</label>
            <input
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-xl input-neon"
            />
          </div>
        </div>

        {/* Availability */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-bold text-neon-yellow mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Your Availability
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Weekdays', 'Weekends', 'Evenings', 'Anytime'].map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setFormData({ ...formData, availability: time })}
                className={`p-3 rounded-xl transition-all ${
                  formData.availability === time
                    ? 'bg-neon-gold/20 border-2 border-neon-gold'
                    : 'glass hover:bg-white/10 border-2 border-transparent'
                }`}
              >
                <span className={formData.availability === time ? 'text-neon-gold' : ''}>{time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-8 py-3 rounded-full border border-gray-600 hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="btn-neon-red px-8 py-3 rounded-full flex items-center gap-2 neon-glow-red disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Audition
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
