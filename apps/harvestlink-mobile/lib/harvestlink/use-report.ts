import { useCallback, useState } from 'react'
import { Alert, Platform, Share } from 'react-native'
import { getApiBaseUrl, supabase } from '@/lib/supabase'

/**
 * Creates and shares the signed activity report link.
 * Shared by the farmer home and the Signals screen so the behaviour cannot drift.
 */
export function useActivityReport() {
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')

  const share = useCallback(async (link: string) => {
    const text = `My HarvestLink activity report: ${link}\nThis is supporting evidence based on real marketplace activity, not a credit guarantee.`
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'HarvestLink activity report', text, url: link })
      } else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        Alert.alert('Report link copied', 'Your private activity report link is ready to share.')
      } else {
        await Share.share({ message: text, url: link, title: 'HarvestLink activity report' })
      }
    } catch {
      setMessage('Your report is ready. Use the share button again to send its private link.')
    }
  }, [])

  const create = useCallback(async () => {
    setBusy(true)
    setMessage('')
    const { data, error } = await supabase.rpc('create_activity_report')
    setBusy(false)
    if (error || !data) {
      setMessage(
        error?.message.includes('farmer_profile_required')
          ? 'Add your farmer profile details before creating a report.'
          : 'We couldn’t prepare the activity report. Try again shortly.',
      )
      return
    }
    const link = `${getApiBaseUrl()}/report/${data}`
    setUrl(link)
    await share(link)
  }, [share])

  return { busy, url, message, create, share }
}
