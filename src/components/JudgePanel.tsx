import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Badge } from './Badge';

interface Performance {
  id: string;
  user_id: string;
  show_id: string;
  title: string;
  talent_category: string;
  votes: number;
  score: number;
  status: string;
  user?: {
    username: string;
    avatar: string;
  };
  judge_decision?: {
    decision: 'yes' | 'no' | 'maybe';
    comments: string;
    score_bonus: number;
  };
}

interface JudgePanelProps {
  showId: string;
  judgeId: string;
  onDecisionMade?: (performanceId: string, decision: 'yes' | 'no' | 'maybe') => void;
}

export const JudgePanel: React.FC<JudgePanelProps> = ({
  showId,
  judgeId,
  onDecisionMade,
}) => {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerformance, setSelectedPerformance] = useState<Performance | null>(null);
  const [comments, setComments] = useState('');
  const [scoreBonus, setScoreBonus] = useState(0);

  const fetchPerformances = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch performances with user info
      const { data: perfData, error: perfError } = await supabase
        .from('performances')
        .select(`
          *,
          user:users!performances_user_id_fkey(username, avatar)
        `)
        .eq('show_id', showId)
        .neq('status', 'waiting')
        .order('created_at', { ascending: true });

      if (perfError) throw perfError;

      // Fetch judge decisions
      const { data: decisionData, error: decisionError } = await supabase
        .from('judge_decisions')
        .select('*')
        .eq('judge_id', judgeId);

      if (decisionError) throw decisionError;

      // Combine data
      const performancesWithDecisions = (perfData || []).map((perf: Record<string, unknown>) => {
        const decision = (decisionData || []).find(
          (d: Record<string, unknown>) => d.performance_id === perf.id
        );
        return {
          ...perf,
          judge_decision: decision || null,
        };
      });

      setPerformances(performancesWithDecisions as Performance[]);
    } catch (err) {
      console.error('Error fetching performances:', err);
    } finally {
      setLoading(false);
    }
  }, [showId, judgeId]);

  useEffect(() => {
    fetchPerformances();
  }, [fetchPerformances]);

  const handleDecision = async (decision: 'yes' | 'no' | 'maybe') => {
    if (!selectedPerformance) return;

    try {
      // Upsert judge decision
      const { error } = await supabase
        .from('judge_decisions')
        .upsert({
          judge_id: judgeId,
          performance_id: selectedPerformance.id,
          decision,
          comments,
          score_bonus: scoreBonus,
        }, {
          onConflict: 'judge_id,performance_id',
        });

      if (error) throw error;

      // Update performance score if bonus
      if (scoreBonus > 0) {
        await supabase.rpc('add_performance_score', {
          perf_id: selectedPerformance.id,
          bonus: scoreBonus,
        });
      }

      onDecisionMade?.(selectedPerformance.id, decision);
      
      // Refresh data
      fetchPerformances();
      setSelectedPerformance(null);
      setComments('');
      setScoreBonus(0);
    } catch (err) {
      console.error('Error saving decision:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const activePerformances = performances.filter(p => p.status === 'performing');
  const completedPerformances = performances.filter(p => p.status === 'completed');

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Badge type="judge" size="md" />
        <h3 className="text-lg font-semibold text-white">Judge Panel</h3>
      </div>

      {activePerformances.length === 0 && completedPerformances.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No performances yet</p>
      ) : (
        <>
          {/* Active Performance */}
          {activePerformances.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-purple-400 mb-2">
                Now Performing
              </h4>
              <div className="space-y-2">
                {activePerformances.map((perf) => (
                  <div
                    key={perf.id}
                    onClick={() => setSelectedPerformance(perf)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedPerformance?.id === perf.id
                        ? 'bg-purple-600/20 border border-purple-500'
                        : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                          {perf.user?.avatar ? (
                            <img
                              src={perf.user.avatar}
                              alt={perf.user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              👤
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {perf.user?.username || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-400">{perf.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Score: {perf.score}</p>
                        {perf.judge_decision && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            perf.judge_decision.decision === 'yes' ? 'bg-green-500/20 text-green-400' :
                            perf.judge_decision.decision === 'no' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {perf.judge_decision.decision.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Performances */}
          {completedPerformances.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">
                Completed
              </h4>
              <div className="space-y-2">
                {completedPerformances.map((perf) => (
                  <div
                    key={perf.id}
                    onClick={() => setSelectedPerformance(perf)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedPerformance?.id === perf.id
                        ? 'bg-purple-600/20 border border-purple-500'
                        : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                          {perf.user?.avatar ? (
                            <img
                              src={perf.user.avatar}
                              alt={perf.user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              👤
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {perf.user?.username || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-400">{perf.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Score: {perf.score}</p>
                        {perf.judge_decision && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            perf.judge_decision.decision === 'yes' ? 'bg-green-500/20 text-green-400' :
                            perf.judge_decision.decision === 'no' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {perf.judge_decision.decision.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Decision Modal */}
      {selectedPerformance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedPerformance(null)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <button
              onClick={() => setSelectedPerformance(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-4">
              Judge: {selectedPerformance.user?.username}
            </h3>
            <p className="text-gray-400 mb-4">
              Performance: {selectedPerformance.title}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleDecision('yes')}
                    className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    ✅ YES
                  </button>
                  <button
                    onClick={() => handleDecision('maybe')}
                    className="py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
                  >
                    🤔 MAYBE
                  </button>
                  <button
                    onClick={() => handleDecision('no')}
                    className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  >
                    ❌ NO
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Comments (optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Add feedback for the performer..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Score Bonus (0-50)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={scoreBonus}
                  onChange={(e) => setScoreBonus(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JudgePanel;
