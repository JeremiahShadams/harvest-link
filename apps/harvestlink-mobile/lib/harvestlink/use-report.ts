import { useCallback, useState } from 'react'
import { Share } from 'react-native'
import { getApiBaseUrl, supabase } from '@/lib/supabase'
import { RPCS, type CreateActivityReportResult } from './types'

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
      await Share.share({ message: text, url: link, title: 'HarvestLink activity report' })
    } catch {
      setMessage('Your report is ready. Use the share button again to send its private link.')
    }
  }, [])

  const create = useCallback(async () => {
    setBusy(true)
    setMessage('')
    const { data, error } = await supabase.rpc(RPCS.createActivityReport)
    setBusy(false)
    if (error || !data) {
      setMessage(
        error?.message.includes('farmer_profile_required')
          ? 'Add your farmer profile details before creating a report.'
          : 'We couldn’t prepare the activity report. Try again shortly.',
      )
      return
    }
    const link = `${getApiBaseUrl()}/report/${data as CreateActivityReportResult}`
    setUrl(link)
    await share(link)
  }, [share])

  return { busy, url, message, create, share }
}
