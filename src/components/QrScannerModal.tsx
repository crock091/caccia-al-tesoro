'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface Props {
  onScan: (text: string) => void
  onClose: () => void
}

export default function QrScannerModal({ onScan, onClose }: Props) {
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const calledBack = useRef(false)

  useEffect(() => {
    let stopped = false

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return
      const scanner = new Html5Qrcode('qr-scanner-el')
      scannerRef.current = scanner

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (text: string) => {
            if (calledBack.current) return
            calledBack.current = true
            try { scanner.stop() } catch { /* già fermato */ }
            onScan(text)
          },
          () => {
            // scan failure per frame — normale, non è un errore fatale
          }
        )
        .then(() => setReady(true))
        .catch(() => {
          setError('Impossibile accedere alla fotocamera. Controlla i permessi nelle impostazioni del browser.')
        })
    })

    return () => {
      stopped = true
      try { scannerRef.current?.stop() } catch { /* già fermato */ }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Scansiona il QR della tappa</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera area */}
        <div className="relative bg-black" style={{ minHeight: 280 }}>
          {!ready && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm opacity-70">Apertura fotocamera…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
              <p className="text-red-400 text-sm font-medium">{error}</p>
              <button
                onClick={onClose}
                className="text-xs text-white/60 underline"
              >
                Chiudi
              </button>
            </div>
          )}
          {/* html5-qrcode monta il video qui */}
          <div id="qr-scanner-el" className="w-full" />
        </div>

        <p className="text-xs text-gray-400 text-center py-3 px-4">
          Inquadra il codice QR nel riquadro — riconoscimento automatico
        </p>
      </div>
    </div>
  )
}
