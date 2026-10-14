import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-logo">📦</span>
        <h1 className="brand-title">Delivshop Web Portal</h1>
      </div>

      <div className="header-actions">
        {user && (
          <div className="user-profile">
            <span className="user-name">{user.name}</span>
            <Badge variant="info">{user.role}</Badge>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
