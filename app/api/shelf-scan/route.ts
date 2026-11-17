import { generateText } from 'ai'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createCookieClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const MAX_SCANS_PER_HOUR = 8
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return {}
  try {
    const hostname = new URL(origin).hostname
    const allowed = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.v0.build') || hostname.endsWith('.v0.app') || origin === process.env.EXPO_PUBLIC_WEB_ORIGIN
    return allowed ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    } : {}
  } catch {
    return {}
  }
}

function jsonResponse(request: NextRequest, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(request), 'Cache-Control': 'no-store' } })
}

function parseEstimate(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  const crop = typeof parsed.crop === 'string' ? parsed.crop.trim().slice(0, 80) : ''
  const days = Number(parsed.remaining_days)
  const confidence = Number(parsed.confidence)
  const tips = Array.isArray(parsed.storage_tips) ? parsed.storage_tips.filter((tip): tip is string => typeof tip === 'string').map((tip) => tip.trim().slice(0, 160)).filter(Boolean).slice(0, 4) : []

  if (crop.length < 2 || !Number.isFinite(days) || !Number.isFinite(confidence) || tips.length === 0) throw new Error('invalid_model_output')
  return {
    crop,
    remaining_days: Math.max(0, Math.min(30, Math.round(days))),
    confidence: Math.max(0, Math.min(1, confidence)),
    storage_tips: tips,
    disclaimer: 'This is an AI estimate based on visible cues, not a food-safety assessment. Check the produce yourself and follow local food-safety guidance.',
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

export async function POST(request: NextRequest) {
  const accessToken = request.headers.get('authorization')?.match(/^Bearer\\s+(.+)$/i)?.[1]
  const supabase = accessToken
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      })
    : await createCookieClient()
  const { data: { user }, error: authError } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : await supabase.auth.getUser()
  if (authError || !user) return jsonResponse(request, { error: 'Sign in to save and use freshness scans.' }, 401)

  const form = await request.formData()
  const image = form.get('image')
  const cropHint = String(form.get('cropHint') ?? '').trim().slice(0, 60)
  if (!(image instanceof File) || !supportedImageTypes.has(image.type)) {
    return jsonResponse(request, { error: 'Choose a JPG, PNG, or WebP photo of produce.' }, 400)
  }
  if (image.size < 1 || image.size > MAX_IMAGE_BYTES) {
    return jsonResponse(request, { error: 'Choose a photo smaller than 6 MB.' }, 413)
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('produce_scans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', hourAgo)
  if (countError) return jsonResponse(request, { error: 'Scan history is temporarily unavailable. Please try again.' }, 503)
  if ((count ?? 0) >= MAX_SCANS_PER_HOUR) {
    return jsonResponse(request, { error: 'You’ve reached the hourly scan limit. Try again a little later.' }, 429)
  }

  try {
    const { text } = await generateText({
      model: 'google/gemini-3-flash',
      instructions: [
        'You assess visible freshness cues in photos of fruit and vegetables. You are not a food-safety inspector.',
        'Do not claim that any food is safe, unsafe, healthy, organic, or free of contamination. Do not infer exact harvest time.',
        'Estimate remaining days only as a rough visual guide, conservatively and with uncertainty. Consider visible wilting, bruising, color, and firmness cues only when actually visible.',
        'Give two to four practical, low-risk storage suggestions. Do not advise eating visibly spoiled food.',
        'If no fresh produce is clearly visible, set crop to "Unclear produce" and remaining_days to 0, confidence to 0, and provide a tip asking for a clearer photo.',
        'Return only a JSON object with keys crop (string), remaining_days (integer from 0 to 30), confidence (number from 0 to 1), storage_tips (array of strings).',
      ].join(' '),
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Give a cautious visual freshness estimate. ${cropHint ? `The user thinks this may be: ${cropHint}.` : ''}` },
          { type: 'file', mediaType: image.type, data: new Uint8Array(await image.arrayBuffer()) },
        ],
      }],
      maxOutputTokens: 400,
      abortSignal: request.signal,
    })
    return jsonResponse(request, parseEstimate(text))
  } catch {
    return jsonResponse(request, { error: 'We couldn’t read that photo just now. Try a clear image in natural light.' }, 503)
  }
}
