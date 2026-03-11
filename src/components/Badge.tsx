import React from 'react';

export type BadgeType = 
  | 'ceo' 
  | 'judge' 
  | 'auditioner' 
  | 'performer' 
  | 'winner' 
  | 'top_performer' 
  | 'moderator' 
  | 'vip';

interface BadgeProps {
  type: BadgeType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const badgeConfig: Record<BadgeType, { icon: string; label: string; color: string; bgColor: string; glowColor: string }> = {
  ceo: {
    icon: '👑',
    label: 'CEO',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
    glowColor: '0 0 10px rgba(255, 215, 0, 0.5)',
  },
  judge: {
    icon: '⭐',
    label: 'Judge',
    color: '#9333EA',
    bgColor: 'rgba(147, 51, 234, 0.15)',
    glowColor: '0 0 10px rgba(147, 51, 234, 0.5)',
  },
  auditioner: {
    icon: '🎤',
    label: 'Auditioner',
    color: '#EAB308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    glowColor: '0 0 10px rgba(234, 179, 8, 0.5)',
  },
  performer: {
    icon: '🎭',
    label: 'Performer',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    glowColor: '0 0 10px rgba(239, 68, 68, 0.5)',
  },
  winner: {
    icon: '🏆',
    label: 'Winner',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
    glowColor: '0 0 10px rgba(255, 215, 0, 0.5)',
  },
  top_performer: {
    icon: '🔥',
    label: 'Top',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    glowColor: '0 0 10px rgba(249, 115, 22, 0.5)',
  },
  moderator: {
    icon: '🛡️',
    label: 'Mod',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    glowColor: '0 0 10px rgba(59, 130, 246, 0.5)',
  },
  vip: {
    icon: '💎',
    label: 'VIP',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    glowColor: '0 0 10px rgba(6, 182, 212, 0.5)',
  },
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs gap-1',
  md: 'px-2 py-1 text-sm gap-1.5',
  lg: 'px-3 py-1.5 text-base gap-2',
};

const iconSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export const Badge: React.FC<BadgeProps> = ({ type, size = 'md', showLabel = true }) => {
  const config = badgeConfig[type];

  if (!config) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizeClasses[size]}`}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        boxShadow: config.glowColor,
        border: `1px solid ${config.color}40`,
      }}
    >
      <span className={iconSizes[size]}>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

interface BadgeListProps {
  badges: BadgeType[];
  size?: 'sm' | 'md' | 'lg';
  maxShow?: number;
}

export const BadgeList: React.FC<BadgeListProps> = ({ badges, size = 'sm', maxShow = 3 }) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  const displayBadges = badges.slice(0, maxShow);
  const remaining = badges.length - maxShow;

  return (
    <div className="flex flex-wrap gap-1">
      {displayBadges.map((badge) => (
        <Badge key={badge} type={badge} size={size} showLabel={false} />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-400 self-center">+{remaining}</span>
      )}
    </div>
  );
};

export default Badge;
