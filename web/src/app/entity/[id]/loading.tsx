export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
      {/* Breadcrumb Skeleton */}
      <div style={{ width: '100px', height: '10px', background: 'var(--bg-surface)', borderRadius: '2px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />

      {/* Header Skeleton */}
      <section style={{ 
        padding: '24px', 
        background: 'var(--bg-surface)', 
        border: '1px solid var(--border-subtle)', 
        borderLeft: '3px solid var(--border-subtle)', 
        borderRadius: 'var(--radius)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '60px', height: '16px', background: 'var(--border-subtle)', borderRadius: '2px' }} />
            <div style={{ width: '200px', height: '32px', background: 'var(--border-subtle)', borderRadius: '4px' }} />
            <div style={{ width: '150px', height: '16px', background: 'var(--border-subtle)', borderRadius: '2px' }} />
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ width: '80px', height: '48px', background: 'var(--border-subtle)', borderRadius: '4px' }} />
            <div style={{ width: '80px', height: '48px', background: 'var(--border-subtle)', borderRadius: '4px' }} />
          </div>
        </div>
        <div style={{ height: '56px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '2px', background: 'var(--accent)', opacity: 0.2, animation: 'pulse-amber 2s infinite' }} />
        </div>
      </section>

      {/* Content Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ 
              height: '80px', 
              background: 'var(--bg-surface)', 
              borderBottom: '1px solid var(--border-subtle)',
              padding: '12px',
              display: 'flex',
              gap: '12px'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-subtle)', marginTop: '4px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ width: '80%', height: '14px', background: 'var(--border-subtle)', borderRadius: '2px' }} />
                <div style={{ width: '95%', height: '10px', background: 'var(--border-subtle)', borderRadius: '2px' }} />
                <div style={{ width: '40%', height: '10px', background: 'var(--border-subtle)', borderRadius: '2px' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ height: '200px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }} />
          <div style={{ height: '150px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }} />
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes pulse-amber {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.4; background-color: var(--accent); }
        }
      `}</style>
    </div>
  );
}
