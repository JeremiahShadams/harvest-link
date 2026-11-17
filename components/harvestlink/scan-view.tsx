'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Camera, Check, CircleHelp, Clock3, ImagePlus, Leaf, LoaderCircle, RotateCcw, ShieldCheck, Sparkles, Upload } from 'lucide-react'
import type { ProduceScan, ShelfLifeResult } from '@/lib/harvestlink/types'
import { createClient } from '@/lib/supabase/client'

type ScanViewProps = {
  userId: string | null
  onRequireAuth: () => void
  onScanComplete: (result: ShelfLifeResult) => void
}

export function ScanView({ userId, onRequireAuth, onScanComplete }: ScanViewProps) {
  const [file, setFile] = useState<File | null>(null)
  const [cropHint, setCropHint] = useState('')
  const [result, setResult] = useState<ShelfLifeResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    setError('')
    setResult(null)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(nextFile.type)) {
      setError('Choose a JPG, PNG, or WebP photo for the best scan.')
      return
    }
    if (nextFile.size > 6 * 1024 * 1024) {
      setError('Choose a photo smaller than 6 MB.')
      return
    }
    setFile(nextFile)
  }

  const analyze = async () => {
    if (!file) return
    if (!userId) {
      onRequireAuth()
      return
    }
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.set('image', file)
      formData.set('cropHint', cropHint)
      const response = await fetch('/api/shelf-scan', { method: 'POST', body: formData })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'This scan could not be completed.')
      const scan = body as ShelfLifeResult
      setResult(scan)
      const supabase = createClient()
      const { error: saveError } = await supabase.from('produce_scans').insert({
        user_id: userId,
        crop: scan.crop,
        remaining_days: scan.remaining_days,
        confidence: scan.confidence,
        storage_tips: scan.storage_tips,
      })
      if (saveError) setError('Your estimate is ready, but we couldn’t add it to your scan history.')
      onScanComplete(scan)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The scan could not be completed. Please try another photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading-row scan-heading">
        <div><span className="eyebrow">A FRESHER WAY TO KNOW</span><h1>See what freshness looks like.</h1><p>A quick visual estimate and a few practical tips for the produce in your hands.</p></div>
        <span className="scan-heading-mark"><Leaf aria-hidden="true" /></span>
      </section>

      <div className="scan-layout">
        <section className="scan-panel" aria-labelledby="scan-panel-title">
          {!result ? (
            <>
              <div className="scan-panel-top"><span className="scan-step">01</span><span className="eyebrow">YOUR PRODUCE</span></div>
              <h2 id="scan-panel-title">Start with a clear photo.</h2>
              <p>Good light and one kind of produce in the frame help us give a more useful estimate.</p>
              <label className={`upload-zone${file ? ' has-file' : ''}`}>
                {previewUrl ? <img className="scan-preview" src={previewUrl} alt="Selected produce for freshness scan" /> : <span className="upload-illustration"><Camera aria-hidden="true" /><span><ImagePlus aria-hidden="true" /></span></span>}
                <span className="upload-zone-copy"><strong>{file ? file.name : 'Take a photo or choose one'}</strong><small>{file ? 'Tap to choose another image' : 'JPG, PNG, or WebP · up to 6 MB'}</small></span>
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} aria-label="Take a photo or choose produce image" />
                <span className="upload-action"><Upload aria-hidden="true" /> Choose photo</span>
              </label>
              <label className="field-label" htmlFor="crop-hint">What did you bring home? <span className="optional-label">Optional</span></label>
              <input id="crop-hint" value={cropHint} onChange={(event) => setCropHint(event.target.value)} placeholder="For example, tomatoes or ugu" maxLength={60} />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary button-wide scan-action" onClick={analyze} disabled={!file || busy}>
                {busy ? <><LoaderCircle className="spin-icon" aria-hidden="true" /> Looking closely…</> : <><Sparkles aria-hidden="true" /> Estimate freshness</>}
              </button>
              <div className="scan-privacy"><ShieldCheck aria-hidden="true" /><span>Your photo is analyzed for this estimate and isn&apos;t added to your public listing.</span></div>
            </>
          ) : (
            <div className="scan-result" aria-live="polite">
              <div className="result-success-mark"><Check aria-hidden="true" /></div>
              <span className="eyebrow">A VISUAL ESTIMATE FOR</span>
              <h2 id="scan-panel-title">{result.crop}</h2>
              <div className="result-days"><strong>{result.remaining_days}</strong><span>{result.remaining_days === 1 ? 'day' : 'days'}<br />estimated</span></div>
              <div className="confidence-row"><span>Visual confidence</span><strong>{Math.round(result.confidence * 100)}%</strong><div className="confidence-track"><span style={{ width: `${Math.round(result.confidence * 100)}%` }} /></div></div>
              <div className="storage-tips"><span className="eyebrow">KEEP IT FRESH</span>{result.storage_tips.map((tip) => <p key={tip}><Check aria-hidden="true" /> {tip}</p>)}</div>
              <button className="button button-outline button-wide" onClick={() => { setResult(null); setFile(null); setError('') }}><RotateCcw aria-hidden="true" /> Scan another item</button>
              <p className="scan-result-disclaimer"><CircleHelp aria-hidden="true" /> {result.disclaimer}</p>
            </div>
          )}
        </section>

        <aside className="scan-guide">
          <div className="scan-guide-card"><span className="scan-guide-icon"><Sparkles aria-hidden="true" /></span><span className="eyebrow">A HELPFUL SIGNAL, NOT A PROMISE</span><h2>Freshness is more than a photo.</h2><p>Our estimate looks at visible cues. Storage, temperature, handling, and the time since harvest all matter too.</p><div className="guide-rule" /><div className="guide-item"><span>01</span><p>Look for even, natural light.</p></div><div className="guide-item"><span>02</span><p>Keep the produce close and in focus.</p></div><div className="guide-item"><span>03</span><p>Use the storage tip that fits your kitchen.</p></div></div>
          <div className="scan-history-card"><div><span className="scan-history-icon"><Clock3 aria-hidden="true" /></span><span><strong>My scan history</strong><small>Your private freshness notes</small></span></div><p>Every scan is saved to your account so you can refer back to it later.</p></div>
        </aside>
      </div>
    </div>
  )
}
