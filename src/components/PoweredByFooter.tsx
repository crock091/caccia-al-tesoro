import Image from 'next/image'

export default function PoweredByFooter({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 py-4 text-xs font-medium ${dark ? 'text-white/50' : 'text-gray-400'}`}>
      <div className="flex items-center gap-2">
        <span>Powered by</span>
        <div style={{ borderRadius: '8px', overflow: 'hidden', mixBlendMode: dark ? 'screen' : 'multiply', opacity: 0.75 }}>
          <Image
            src="/VeniceAI_3tJwOMd.webp"
            alt="Venice AI"
            width={72}
            height={20}
            className="object-contain block"
            style={{ filter: dark ? 'invert(1)' : 'none' }}
          />
        </div>
      </div>
      <span style={{ opacity: 0.6 }}>© {new Date().getFullYear()} Venice AI</span>
    </div>
  )
}
