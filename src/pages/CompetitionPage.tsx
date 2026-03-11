import { useState } from 'react'
import { useCurrentSeason, useCompetitionRounds, useSeasonAuditions, useAllSeasons } from '../hooks/useCompetition'
import type { Season, CompetitionRound, SeasonAudition } from '../lib/supabase'

export function CompetitionPage() {
  const { season, loading: seasonLoading } = useCurrentSeason()
  const { seasons } = useAllSeasons()
  const { rounds, loading: roundsLoading } = useCompetitionRounds(season?.id || null)
  const { auditions, loading: auditionsLoading } = useSeasonAuditions(season?.id || null)
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)

  const currentSeason = selectedSeason || season

  if (seasonLoading || roundsLoading || auditionsLoading) {
    return (
      <div className="competition-page loading">
        <div className="loading-spinner">Loading competition...</div>
      </div>
    )
  }

  return (
    <div className="competition-page">
      <div className="page-header">
        <h1>🏆 Mai Talent Competition 🏆</h1>
        <p>Compete for the crown and become the next champion!</p>
      </div>

      {seasons.length > 0 && (
        <div className="season-selector">
          <label>Select Season:</label>
          <select 
            value={selectedSeason?.id || season?.id || ''}
            onChange={(e) => {
              const s = seasons.find(ss => ss.id === e.target.value)
              setSelectedSeason(s || null)
            }}
          >
            <option value="">Current Season</option>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {currentSeason ? (
        <>
          <div className="season-info-card">
            <div className="season-badge">
              <span className="season-name">{currentSeason.name}</span>
              <span className={`season-status ${currentSeason.status}`}>
                {currentSeason.status.toUpperCase()}
              </span>
            </div>
            <div className="season-dates">
              <span>📅 {new Date(currentSeason.start_date).toLocaleDateString()} - {new Date(currentSeason.end_date).toLocaleDateString()}</span>
            </div>
            {currentSeason.status === 'active' && (
              <div className="season-cta">
                <button className="apply-btn">Apply for Auditions</button>
              </div>
            )}
          </div>

          <div className="rounds-section">
            <h2>📊 Competition Rounds</h2>
            {rounds.length === 0 ? (
              <div className="no-rounds">
                <p>Rounds will be announced soon!</p>
              </div>
            ) : (
              <div className="rounds-grid">
                {rounds.map((round) => (
                  <RoundCard key={round.id} round={round} />
                ))}
              </div>
            )}
          </div>

          {auditions.length > 0 && (
            <div className="auditions-section">
              <h2>🎤 Auditions Leaderboard</h2>
              <div className="auditions-list">
                {auditions.slice(0, 20).map((audition, index) => (
                  <AuditionRow key={audition.id} audition={audition} rank={index + 1} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="no-season">
          <h2>No Active Competition</h2>
          <p>Check back soon for the next season!</p>
        </div>
      )}
    </div>
  )
}

function RoundCard({ round }: { round: CompetitionRound }) {
  return (
    <div className={`round-card ${round.status}`}>
      <div className="round-number">#{round.round_number}</div>
      <div className="round-name">{round.round_name}</div>
      <div className="round-description">{round.description}</div>
      <span className={`round-status ${round.status}`}>{round.status}</span>
    </div>
  )
}

function AuditionRow({ audition, rank }: { audition: SeasonAudition; rank: number }) {
  return (
    <div className="audition-row">
      <div className={`audition-rank ${rank <= 3 ? 'top-3' : ''}`}>#{rank}</div>
      <img src="/default-avatar.png" alt="avatar" className="audition-avatar" />
      <div className="audition-info">
        <div className="audition-username">User #{audition.user_id.slice(0, 8)}</div>
        <div className="audition-category">{audition.talent_category}</div>
      </div>
      <div className="audition-score">
        <div className="audition-final-score">{audition.final_score.toFixed(1)}</div>
        <div className="audition-votes">{audition.audience_score + audition.judge_score} pts</div>
      </div>
    </div>
  )
}
