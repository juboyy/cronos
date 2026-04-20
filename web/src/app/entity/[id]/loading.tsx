export default function Loading() {
  const shimmer = {
    background: 'linear-gradient(90deg, var(--bg-surface) 25%, rgba(212,160,23,0.08) 50%, var(--bg-surface) 75%)',
    backgroundSize: '200% 100%',
  } as const;

  const bar = (w: string, h: string) => ({
    width: w,
    height: h,
    borderRadius: '2px',
    opacity: 0.6,
    ...shimmer,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
      <div style={bar('100px', '10px')} />

      <section style={{
        padding: '24px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: '3px solid var(--border-subtle)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={bar('60px', '16px')} />
            <div style={bar('200px', '32px')} />
            <div style={bar('150px', '16px')} />
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={bar('80px', '48px')} />
            <div style={bar('80px', '48px')} />
          </div>
        </div>
        <div style={{ height: '56px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '2px', background: 'var(--accent)', opacity: 0.15 }} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{
              height: '80px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '12px',
              display: 'flex',
              gap: '12px',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-subtle)', marginTop: '4px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={bar('80%', '14px')} />
                <div style={bar('95%', '10px')} />
                <div style={bar('40%', '10px')} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ height: '200px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }} />
          <div style={{ height: '150px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }} />
        </div>
      </div>
    </div>
  );
}
