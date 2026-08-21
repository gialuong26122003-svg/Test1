'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        window.location.href = '/index.html';
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Tài khoản hoặc mật khẩu không đúng');
    } catch {
      setError('Không kết nối được máy chủ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1420' }}>
      <form onSubmit={handleSubmit} style={{ background: '#131f30', padding: 32, borderRadius: 12, border: '1px solid #24384f', width: '100%', maxWidth: 360, boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
        <h2 style={{ margin: '0 0 20px', color: '#f2a93b', fontSize: 16, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' }}>
          Đăng nhập hệ thống
        </h2>
        {error && (
          <div style={{ color: '#e2604f', fontSize: 12, marginBottom: 16, background: 'rgba(226,96,79,.1)', padding: 8, borderRadius: 4, border: '1px solid rgba(226,96,79,.4)' }}>
            {error}
          </div>
        )}
        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#8fa1b3', fontSize: 12, marginBottom: 4 }}>Tài khoản</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #24384f', background: '#0b1420', color: '#e6edf3', fontSize: 14 }}
          />
        </div>
        <div style={{ textAlign: 'left', marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#8fa1b3', fontSize: 12, marginBottom: 4 }}>Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #24384f', background: '#0b1420', color: '#e6edf3', fontSize: 14 }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 12, background: '#f2a93b', color: '#0b1420', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, letterSpacing: .5, cursor: loading ? 'default' : 'pointer' }}
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
