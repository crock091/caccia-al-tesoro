export default function PoweredByFooter({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
      <div className="flex items-center gap-2">
        <span>Powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LOGO11.png"
          alt="Crock"
          width={36}
          height={36}
          style={{ objectFit: 'contain', display: 'block', opacity: 0.85 }}
        />
      </div>
      <span style={{ opacity: 0.55 }}>© {new Date().getFullYear()} Crock</span>
    </div>
  )
}
