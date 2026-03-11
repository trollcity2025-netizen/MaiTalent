import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeList } from './Badge';
import type { BadgeType } from './Badge';

interface UserBadgeProps {
  username: string;
  userId: string;
  badges?: BadgeType[];
  size?: 'sm' | 'md' | 'lg';
  showBadges?: boolean;
}

export const UserBadge: React.FC<UserBadgeProps> = ({
  username,
  userId,
  badges = [],
  size = 'md',
  showBadges = true,
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div 
      className={`inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${textSizes[size]}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e as unknown as React.MouseEvent)}
    >
      <span className="font-semibold text-white hover:underline">
        {username}
      </span>
      {showBadges && badges.length > 0 && (
        <BadgeList badges={badges} size={size === 'lg' ? 'md' : 'sm'} maxShow={2} />
      )}
    </div>
  );
};

interface UserBadgeWithAdminProps {
  username: string;
  userId: string;
  badges?: BadgeType[];
  showAdminMenu?: boolean;
  onAdminAction?: (action: 'view_profile' | 'disable_chat' | 'disable_payouts' | 'disable_gifts' | 'manage_badges', userId: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showBadges?: boolean;
}

export const UserBadgeWithAdmin: React.FC<UserBadgeWithAdminProps> = ({
  username,
  userId,
  badges = [],
  showAdminMenu = false,
  onAdminAction,
  size = 'md',
  showBadges = true,
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  const handleAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action: 'view_profile' | 'disable_chat' | 'disable_payouts' | 'disable_gifts' | 'manage_badges') => {
    onAdminAction?.(action, userId);
    setShowMenu(false);
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      <div 
        className={`inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${textSizes[size]}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick(e as unknown as React.MouseEvent)}
      >
        <span className="font-semibold text-white hover:underline">
          {username}
        </span>
        {showBadges && badges.length > 0 && (
          <BadgeList badges={badges} size={size === 'lg' ? 'md' : 'sm'} maxShow={2} />
        )}
      </div>
      
      {showAdminMenu && (
        <>
          <button
            onClick={handleAdminClick}
            className="text-gray-400 hover:text-white"
            aria-label="Admin options"
          >
            ⚙️
          </button>
          
          {showMenu && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-lg py-2 min-w-[180px] z-50 border border-gray-700">
              <button
                onClick={() => handleAction('view_profile')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700"
              >
                👤 View Profile
              </button>
              <button
                onClick={() => handleAction('manage_badges')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700"
              >
                🏅 Manage Badges
              </button>
              <hr className="my-2 border-gray-700" />
              <button
                onClick={() => handleAction('disable_chat')}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
              >
                🔇 Disable Chat
              </button>
              <button
                onClick={() => handleAction('disable_payouts')}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
              >
                💰 Disable Payouts
              </button>
              <button
                onClick={() => handleAction('disable_gifts')}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
              >
                🎁 Disable Gifts
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserBadge;
