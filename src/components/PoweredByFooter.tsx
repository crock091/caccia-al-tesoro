export default function PoweredByFooter({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-xs font-medium text-white/60">
      <div className="flex items-center gap-2">
        <span>Powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span style={{ display: 'inline-block', mixBlendMode: dark ? 'screen' : 'multiply', opacity: dark ? 0.85 : 1 }}>
          <img
            src="/LOGO11.png"
            alt="Crock"
            width={36}
            height={36}
            style={{ objectFit: 'contain', display: 'block' }}
          />
        </span>
      </div>
      <span style={{ opacity: 0.55 }}>© {new Date().getFullYear()} Crock</span>
    </div>
  )
}
