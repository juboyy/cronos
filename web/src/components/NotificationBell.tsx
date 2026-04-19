'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  severity: string;
  ticker: string | null;
  read: boolean;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--signal-down, #ef4444)',
  warning: 'var(--signal-neutral, #eab308)',
  info: 'var(--accent, #3b82f6)',
  success: 'var(--signal-up, #22c55e)',
};

const TYPE_ICONS: Record<string, string> = {
  alert: '⚡',
  sentiment: '◐',
  price: '◇',
  volume: '▮',
  pattern: '◎',
  system: '⊕',
  crawler: '◈',
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffM = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffM < 1) return 'agora';
  if (diffM < 60) return `${diffM}m`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/cronos/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((n: Notification) => !n.read).length);
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    await fetch('/api/cronos/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await fetch('/api/cronos/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const S = {
    mono: { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' as const },
    label: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          background: 'none',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
          cursor: 'pointer',
          color: open ? 'var(--accent)' : 'var(--text-tertiary)',
          transition: 'all 150ms',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          ...S.mono,
          fontSize: '0.75rem',
        }}
      >
        <span>◈</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: 'var(--signal-down, #ef4444)',
            color: 'white',
            fontSize: '0.5rem',
            fontWeight: 700,
            minWidth: '14px',
            height: '14px',
            borderRadius: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            ...S.mono,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '360px',
          maxHeight: '460px',
          background: 'var(--bg-elevated, #111)',
          border: '1px solid var(--border, #222)',
          borderRadius: 'var(--radius, 6px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ ...S.label, color: 'var(--text-tertiary)' }}>Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  ...S.mono, fontSize: '0.5625rem',
                  background: 'none', border: 'none',
                  color: 'var(--accent)', cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                Marcar todas lidas
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
              }}>
                Nenhuma notificação.
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: n.read ? 'transparent' : 'hsl(225 30% 8%)',
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'background 150ms',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Type icon + severity */}
                  <div style={{
                    fontSize: '0.875rem',
                    color: SEVERITY_COLORS[n.severity] || 'var(--text-tertiary)',
                    flexShrink: 0,
                    paddingTop: '2px',
                  }}>
                    {TYPE_ICONS[n.type] || '●'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: n.read ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      lineHeight: 1.4,
                      fontWeight: n.read ? 400 : 500,
                    }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{
                        fontSize: '0.6875rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                        marginTop: '2px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {n.body}
                      </div>
                    )}
                    <div style={{
                      display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center',
                    }}>
                      {n.ticker && (
                        <span style={{
                          ...S.mono, fontSize: '0.5rem',
                          padding: '1px 4px',
                          background: 'var(--accent-bg, rgba(59,130,246,0.1))',
                          borderRadius: '2px',
                          color: 'var(--accent)',
                        }}>
                          {n.ticker}
                        </span>
                      )}
                      <span style={{ ...S.mono, fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{
                      width: 6, height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      flexShrink: 0,
                      marginTop: '6px',
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
