import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Mic, Music, Sparkles, FileVideo, Calendar, Send, CheckCircle } from 'lucide-react'

const talentCategories = [
  { id: 'singing', label: 'Singing', icon: Music },
  { id: 'dancing', label: 'Dancing', icon: Sparkles },
  { id: 'comedy', label: 'Comedy', icon: Sparkles },
  { id: 'magic', label: 'Magic', icon: Sparkles },
  { id: 'other', label: 'Other', icon: Mic },
]

export function AuditionPage() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    talent_category: '',
    bio: '',
    video_url: '',
    availability: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In production: Submit to Supabase
    setSubmitted(true)
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
              onClick={() => setSubmitted(false)}
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
          
          {/* Upload area */}
          <div className="border-2 border-dashed border-neon-gold/30 rounded-xl p-8 text-center hover:border-neon-gold/50 transition-colors cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-neon-gold" />
            <p className="text-gray-300 mb-2">Drag and drop your video here</p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <button type="button" className="btn-neon-gold px-6 py-2 rounded-full">
              Browse Files
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Supported formats: MP4, MOV, AVI (Max 100MB)
            </p>
          </div>

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
            className="btn-neon-red px-8 py-3 rounded-full flex items-center gap-2 neon-glow-red"
          >
            <Send className="w-5 h-5" />
            Submit Audition
          </button>
        </div>
      </form>
    </div>
  )
}
