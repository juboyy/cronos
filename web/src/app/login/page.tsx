'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, action: mode === 'signup' ? 'signup' : 'login' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Falha na autenticação');
        return;
      }

      if (mode === 'signup') {
        setError('');
        setMode('login');
        alert('Conta criada! Verifique seu email para confirmar.');
        return;
      }

      // Redirect to feed
      const params = new URLSearchParams(window.location.search);
      router.push(params.get('next') || '/');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const S = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: '24px',
    } as React.CSSProperties,
    card: {
      width: '100%',
      maxWidth: '380px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '32px',
    } as React.CSSProperties,
    header: {
      textAlign: 'center' as const,
    },
    title: {
      fontFamily: 'var(--font-serif)',
      fontSize: '2rem',
      fontWeight: 400,
      color: 'var(--text-primary)',
      letterSpacing: '-0.03em',
    },
    subtitle: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.625rem',
      color: 'var(--text-muted)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      marginTop: '8px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    },
    label: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.5625rem',
      color: 'var(--text-muted)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      display: 'block',
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '12px 16px',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-display)',
      fontSize: '0.875rem',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    button: {
      width: '100%',
      padding: '12px',
      background: 'var(--accent)',
      color: 'hsl(225 15% 4%)',
      border: 'none',
      borderRadius: 'var(--radius)',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      cursor: 'pointer',
    },
    error: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.6875rem',
      color: 'var(--signal-down)',
      textAlign: 'center' as const,
      padding: '8px 12px',
      background: 'hsl(0 65% 50% / 0.08)',
      borderRadius: 'var(--radius-sm)',
    },
    toggle: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.625rem',
      color: 'var(--text-tertiary)',
      textAlign: 'center' as const,
    },
    link: {
      color: 'var(--accent)',
      cursor: 'pointer',
      textDecoration: 'underline',
      background: 'none',
      border: 'none',
      fontFamily: 'inherit',
      fontSize: 'inherit',
    },
  };

  return (
    <div style={S.container}>
      <div style={S.card}>
        <div style={S.header}>
          <div style={S.title}>Cronos</div>
          <div style={S.subtitle}>Financial Intelligence Engine</div>
        </div>

        <form onSubmit={handleSubmit} style={S.form}>
          <div>
            <label style={S.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={S.input}
              required
              autoFocus
            />
          </div>

          <div>
            <label style={S.label}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={S.input}
              required
              minLength={6}
            />
          </div>

          {error && <div style={S.error}>{error}</div>}

          <button type="submit" style={{ ...S.button, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <div style={S.toggle}>
          {mode === 'login' ? (
            <>Não tem conta? <button style={S.link} onClick={() => setMode('signup')}>Criar conta</button></>
          ) : (
            <>Já tem conta? <button style={S.link} onClick={() => setMode('login')}>Entrar</button></>
          )}
        </div>
      </div>
    </div>
  );
}
