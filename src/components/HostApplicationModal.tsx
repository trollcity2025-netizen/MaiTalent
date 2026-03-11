import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface HostApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const HostApplicationModal: React.FC<HostApplicationModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    hostingExperience: '',
    style: '',
    equipment: '',
    availability: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if already applied
      const { data: existing } = await supabase
        .from('host_applications')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'approved'])
        .single();

      if (existing) {
        setError('You have already applied to be a host');
        setLoading(false);
        return;
      }

      // Submit application
      const { error: insertError } = await supabase
        .from('host_applications')
        .insert({
          user_id: userId,
          full_name: formData.fullName,
          hosting_experience: formData.hostingExperience,
          hosting_style: formData.style,
          equipment: formData.equipment,
          availability: formData.availability,
          status: 'pending',
        });

      if (insertError) throw insertError;

      // Get admin users to notify
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('is_admin', true);

      // Create notifications for all admins
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'host_application',
          title: 'New Host Application',
          message: `${formData.fullName} has applied to be a host`,
          link: '/admin?tab=host_applications',
          is_read: false,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Also notify CEO if exists
      const { data: ceo } = await supabase
        .from('users')
        .select('id')
        .eq('is_ceo', true)
        .single();

      if (ceo) {
        await supabase.from('notifications').insert({
          user_id: ceo.id,
          type: 'host_application',
          title: 'New Host Application',
          message: `${formData.fullName} has applied to be a host`,
          link: '/admin?tab=host_applications',
          is_read: false,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          fullName: '',
          hostingExperience: '',
          style: '',
          equipment: '',
          availability: '',
        });
      }, 2000);
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
          Apply to be a Host
        </h2>
        <p className="text-gray-400 mb-6">
          Share your hosting experience to become a host on MaiTalent Live Shows
        </p>

        {success ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Application Submitted!
            </h3>
            <p className="text-gray-400">
              We'll review your application and get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-neon-gold focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Hosting Experience *
              </label>
              <textarea
                required
                rows={3}
                value={formData.hostingExperience}
                onChange={(e) => setFormData({ ...formData, hostingExperience: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-neon-gold focus:border-transparent resize-none"
                placeholder="Tell us about your hosting experience..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Hosting Style
              </label>
              <textarea
                rows={3}
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-neon-gold focus:border-transparent resize-none"
                placeholder="Describe your hosting style and personality..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Equipment
              </label>
              <textarea
                rows={2}
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-neon-gold focus:border-transparent resize-none"
                placeholder="What equipment do you have? (microphone, camera, lighting, etc.)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Availability *
              </label>
              <select
                required
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-neon-gold focus:border-transparent"
              >
                <option value="">Select your availability</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekends">Weekends</option>
                <option value="any">Any time</option>
                <option value="specific">Specific dates (explain in experience)</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-neon-gold to-yellow-500 hover:from-neon-yellow hover:to-yellow-400 text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default HostApplicationModal;
