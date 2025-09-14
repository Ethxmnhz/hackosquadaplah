import React from 'react';

interface AvatarProps {
  username?: string;
  avatarUrl?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ username, avatarUrl, size = 40 }) => (
  avatarUrl ? (
    <img src={avatarUrl} alt={username} style={{ width: size, height: size }} className="rounded-full border-2 border-white" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-white/20 flex items-center justify-center text-lg font-bold text-white border-2 border-white"
    >
      {username ? username[0].toUpperCase() : '?'}
    </div>
  )
);
