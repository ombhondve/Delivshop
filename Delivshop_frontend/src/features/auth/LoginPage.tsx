import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, setAuthenticatedUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const user = await login({ email: email.trim(), password });
      setAuthenticatedUser(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card title="Portal Authentication" subtitle="Sign in to access Delivshop features">
        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@gmail.com"
            autoComplete="email"
            required
            disabled={loading}
          />
          <div style={{ position: 'relative' }}>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: '10px', top: '34px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Sign In to Portal
          </Button>
        </form>
      </Card>
    </div>
  );
};
