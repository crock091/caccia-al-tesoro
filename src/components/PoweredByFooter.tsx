export default function PoweredByFooter({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4 text-xs font-medium text-white/70">
      <div className="flex items-center gap-2">
        <span>Powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LOGO11.png"
          alt="Crock"
          width={24}
          height={24}
          style={{ objectFit: 'contain', opacity: 0.8, filter: 'invert(1) brightness(2)' }}
        />
        <span>Crock</span>
      </div>
      <span style={{ opacity: 0.5 }}>© {new Date().getFullYear()} Crock</span>
    </div>
  )
}
