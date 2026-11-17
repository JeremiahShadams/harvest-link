import { useRef, useState } from 'react'
import { router } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { ArrowRight, Camera, Check, CircleHelp, ImagePlus, Leaf, RotateCcw, ScanLine, ShieldCheck, Sparkles } from 'lucide-react-native'
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSWRConfig } from 'swr'
import { AppHeader } from './app-header'
import { AppButton, Card, colors, Eyebrow, MessageBanner, StatusBadge } from './ui'
import { useHarvestLink } from './context'
import { supabase, getApiBaseUrl } from '@/lib/supabase'
import { useScans } from '@/lib/harvestlink/use-data'
import { formatDate } from '@/lib/harvestlink/utils'
import type { ProduceScan, ShelfLifeResult } from '@/lib/harvestlink/types'

type SelectedPhoto = { uri: string; file?: File; name: string; mimeType: string; fileSize?: number }

export function ScanScreen() {
  const { user, profile, setLatestScan } = useHarvestLink()
  const { data: scans, mutate: mutateScans } = useScans(user?.id ?? null)
  const { mutate } = useSWRConfig()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null)
  const [cropHint, setCropHint] = useState('')
  const [result, setResult] = useState<ShelfLifeResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const openCamera = async () => {
    setError('')
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission()
      if (!permission.granted) {
        setError('Camera access is off. Allow it in your device settings or choose a photo instead.')
        return
      }
    }
    setCameraOpen(true)
  }

  const capturePhoto = async () => {
    try {
      const picture = await cameraRef.current?.takePictureAsync({ quality: 0.72 })
      if (!picture?.uri) {
        setError('We couldn’t capture that photo. Try again or choose one from your library.')
        return
      }
      setPhoto({ uri: picture.uri, name: 'produce-photo.jpg', mimeType: 'image/jpeg' })
      setResult(null)
      setCameraOpen(false)
    } catch {
      setError('We couldn’t capture that photo. Try again or choose one from your library.')
    }
  }

  const choosePhoto = async () => {
    setError('')
    const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.72 })
    if (selection.canceled || !selection.assets[0]) return
    const asset = selection.assets[0]
    if (asset.fileSize && asset.fileSize > 6 * 1024 * 1024) {
      setError('Choose a photo smaller than 6 MB for a quicker estimate.')
      return
    }
    setPhoto({ uri: asset.uri, file: asset.file ?? undefined, name: asset.fileName || 'produce-photo.jpg', mimeType: asset.mimeType || 'image/jpeg', fileSize: asset.fileSize })
    setResult(null)
    setCameraOpen(false)
  }

  const analyzePhoto = async () => {
    if (!photo) return
    if (!user) {
      router.push('/profile' as never)
      return
    }
    const apiBase = getApiBaseUrl()
    if (!apiBase) {
      setError('Freshness analysis is not connected. Set the mobile app API URL and try again.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        router.push('/profile' as never)
        return
      }
      const formData = new FormData()
      formData.append('cropHint', cropHint.trim())
      if (Platform.OS === 'web' && photo.file) {
        formData.append('image', photo.file, photo.name)
      } else if (Platform.OS === 'web') {
        const response = await fetch(photo.uri)
        const blob = await response.blob()
        if (blob.size > 6 * 1024 * 1024) throw new Error('Choose a photo smaller than 6 MB for a quicker estimate.')
        formData.append('image', blob, photo.name)
      } else {
        formData.append('image', { uri: photo.uri, name: photo.name, type: photo.mimeType } as unknown as Blob)
      }
      const response = await fetch(`${apiBase}/api/shelf-scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const body = await response.json() as ShelfLifeResult | { error?: string }
      if (!response.ok) throw new Error('error' in body && body.error ? body.error : 'This scan could not be completed.')
      const scan = body as ShelfLifeResult
      setResult(scan)
      setLatestScan(scan)
      const { error: saveError } = await supabase.from('produce_scans').insert({
        user_id: user.id,
        crop: scan.crop,
        remaining_days: scan.remaining_days,
        confidence: scan.confidence,
        storage_tips: scan.storage_tips,
      })
      if (saveError) setError('Your estimate is ready, but it could not be added to your private scan history.')
      await Promise.all([mutateScans(), mutate(['harvestlink-notifications', user.id])])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The scan could not be completed. Please try another photo.')
    } finally {
      setBusy(false)
    }
  }

  const startOver = () => { setPhoto(null); setResult(null); setError(''); setCameraOpen(false) }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader />
        <View style={styles.heading}>
          <Eyebrow>A FRESHER WAY TO KNOW</Eyebrow>
          <Text style={styles.title}>See what freshness looks like.</Text>
          <Text style={styles.subtitle}>A careful visual estimate and a few practical tips for the produce in your hands.</Text>
        </View>

        <Card style={styles.scanCard}>
          <View style={styles.cardHeading}><View><Eyebrow>YOUR PRODUCE</Eyebrow><Text style={styles.cardTitle}>{result ? 'Your freshness notes' : 'Start with a clear photo.'}</Text></View><View style={styles.stepMark}><ScanLine color={colors.pine} size={17} /></View></View>
          <Text style={styles.cardIntro}>{result ? 'A little guidance for storage, based on what is visible in your photo.' : 'Good light and one kind of produce in frame help us give a more useful estimate.'}</Text>
          {cameraOpen ? (
            <View style={styles.cameraWrap}>
              <CameraView ref={cameraRef} facing="back" style={styles.camera} onMountError={() => { setCameraOpen(false); setError('The camera could not open. Choose a photo from your library instead.') }} />
              <View pointerEvents="none" style={styles.cameraFrame}><View style={styles.frameCorner} /><View style={[styles.frameCorner, styles.frameTopRight]} /><View style={[styles.frameCorner, styles.frameBottomLeft]} /><View style={[styles.frameCorner, styles.frameBottomRight]} /></View>
              <View style={styles.cameraFooter}><Text style={styles.cameraHint}>Keep one kind of produce in focus</Text><Pressable accessibilityRole="button" accessibilityLabel="Take produce photo" onPress={() => void capturePhoto()} style={styles.shutter}><View style={styles.shutterInner} /></Pressable><Pressable accessibilityRole="button" onPress={() => setCameraOpen(false)} style={styles.cancelCamera}><Text style={styles.cancelText}>Cancel</Text></Pressable></View>
            </View>
          ) : result ? (
            <View style={styles.resultBlock}>
              {photo ? <Image source={{ uri: photo.uri }} contentFit="cover" style={styles.resultPhoto} accessibilityLabel="Produce photo used for the freshness estimate" /> : null}
              <View style={styles.resultSummary}><View style={styles.resultMark}><Check color={colors.white} size={20} /></View><View style={styles.resultCrop}><Text style={styles.resultLabel}>VISUAL ESTIMATE FOR</Text><Text style={styles.resultTitle}>{result.crop}</Text></View><View style={styles.days}><Text style={styles.daysValue}>{result.remaining_days}</Text><Text style={styles.daysLabel}>{result.remaining_days === 1 ? 'day' : 'days'} left</Text></View></View>
              <View style={styles.confidenceRow}><Text style={styles.confidenceLabel}>Visual confidence</Text><Text style={styles.confidenceValue}>{Math.round(result.confidence * 100)}%</Text></View>
              <View style={styles.confidenceTrack}><View style={[styles.confidenceFill, { width: `${Math.round(result.confidence * 100)}%` }]} /></View>
              <View style={styles.tips}><Eyebrow>KEEP IT FRESH</Eyebrow>{result.storage_tips.map((tip) => <View key={tip} style={styles.tip}><Check color={colors.leaf} size={14} /><Text style={styles.tipText}>{tip}</Text></View>)}</View>
              <View style={styles.disclaimer}><CircleHelp color={colors.muted} size={15} /><Text style={styles.disclaimerText}>{result.disclaimer}</Text></View>
              {profile?.role === 'farmer' || profile?.role === 'both' ? <AppButton label="Attach to a new harvest" variant="secondary" icon={<ArrowRight color={colors.pine} size={15} />} onPress={() => router.push('/farmer' as never)} style={styles.fullButton} /> : null}
              <AppButton label="Scan another item" variant="quiet" icon={<RotateCcw color={colors.pine} size={15} />} onPress={startOver} style={styles.fullButton} />
            </View>
          ) : (
            <>
              {photo ? <View style={styles.photoPreview}><Image source={{ uri: photo.uri }} contentFit="cover" style={styles.previewImage} accessibilityLabel="Selected produce ready for a freshness scan" /><View style={styles.photoMeta}><Text style={styles.photoName} numberOfLines={1}>{photo.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Remove selected photo" onPress={() => setPhoto(null)}><Text style={styles.removePhoto}>Remove</Text></Pressable></View></View> : (
                <View style={styles.photoPrompt}><View style={styles.cameraMark}><Camera color={colors.pine} size={24} /></View><Text style={styles.promptTitle}>One clear photo is all it takes.</Text><Text style={styles.promptText}>Choose a picture of tomatoes, peppers, leafy greens, maize, or fruit.</Text></View>
              )}
              <View style={styles.photoActions}>
                {!photo ? <AppButton label="Open camera" icon={<Camera color={colors.white} size={16} />} onPress={() => void openCamera()} style={styles.flexButton} /> : null}
                <AppButton label={photo ? 'Choose another photo' : 'Choose a photo'} variant="secondary" icon={<ImagePlus color={colors.pine} size={16} />} onPress={() => void choosePhoto()} style={styles.flexButton} />
              </View>
              <View style={styles.field}><Text style={styles.fieldLabel}>What did you bring home? <Text style={styles.optional}>Optional</Text></Text><TextInput accessibilityLabel="Optional produce name" maxLength={60} onChangeText={setCropHint} placeholder="For example, tomatoes or ugu" placeholderTextColor="#899188" style={styles.input} value={cropHint} /></View>
              {error ? <MessageBanner>{error}</MessageBanner> : null}
              <AppButton label={busy ? 'Looking closely…' : user ? 'Estimate freshness' : 'Sign in to scan'} icon={busy ? undefined : <Sparkles color={colors.white} size={16} />} onPress={() => user ? void analyzePhoto() : router.push('/profile' as never)} loading={busy} disabled={!photo} style={styles.fullButton} />
              <View style={styles.privacy}><ShieldCheck color={colors.leaf} size={14} /><Text style={styles.privacyText}>Your photo is analyzed for this estimate and isn’t added to your public listing.</Text></View>
            </>
          )}
        </Card>

        <Card style={styles.guide}>
          <View style={styles.guideHead}><View style={styles.guideIcon}><Sparkles color={colors.pine} size={16} /></View><Eyebrow>A HELPFUL SIGNAL, NOT A PROMISE</Eyebrow></View>
          <Text style={styles.guideTitle}>Freshness is more than a photo.</Text>
          <Text style={styles.guideText}>Storage, temperature, handling, and time since harvest matter too. This estimate only reflects visible cues.</Text>
          <View style={styles.guideSteps}><GuideStep number="01" text="Use even, natural light." /><GuideStep number="02" text="Keep the produce close and in focus." /><GuideStep number="03" text="Follow the storage tip that fits your kitchen." /></View>
        </Card>

        {user ? <View style={styles.historySection}><View style={styles.historyHead}><View><Eyebrow>YOUR PRIVATE NOTES</Eyebrow><Text style={styles.historyTitle}>Recent scans</Text></View><StatusBadge label={`${scans?.length ?? 0} saved`} /></View>{scans?.length ? <View style={styles.historyList}>{scans.slice(0, 4).map((scan) => <ScanHistoryRow key={scan.id} scan={scan} />)}</View> : <Text style={styles.historyEmpty}>Your scan history will appear here after your first estimate.</Text>}</View> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function GuideStep({ number, text }: { number: string; text: string }) {
  return <View style={styles.guideStep}><Text style={styles.guideNumber}>{number}</Text><Text style={styles.guideStepText}>{text}</Text></View>
}

function ScanHistoryRow({ scan }: { scan: ProduceScan }) {
  return <View style={styles.historyRow}><View style={styles.historyIcon}><Leaf color={colors.leaf} size={15} /></View><View style={styles.historyCopy}><Text style={styles.historyCrop}>{scan.crop}</Text><Text style={styles.historyDate}>{formatDate(scan.created_at)}</Text></View><Text style={styles.historyDays}>{scan.remaining_days} days</Text></View>
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { alignSelf: 'center', gap: 15, maxWidth: 520, paddingBottom: 30, width: '100%' },
  heading: { gap: 7, paddingHorizontal: 20, paddingTop: 3 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.9, lineHeight: 33 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  scanCard: { gap: 12, marginHorizontal: 18, padding: 15 },
  cardHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  stepMark: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  cardIntro: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  photoPrompt: { alignItems: 'center', backgroundColor: '#F8F7F2', borderColor: colors.line, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, gap: 8, minHeight: 166, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 20 },
  cameraMark: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 17, height: 48, justifyContent: 'center', width: 48 },
  promptTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  promptText: { color: colors.muted, fontSize: 11, lineHeight: 16, maxWidth: 270, textAlign: 'center' },
  photoPreview: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  previewImage: { backgroundColor: colors.paleGreen, height: 210, width: '100%' },
  photoMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  photoName: { color: colors.ink, flex: 1, fontSize: 11, fontWeight: '600', marginRight: 8 },
  removePhoto: { color: colors.red, fontSize: 11, fontWeight: '700' },
  photoActions: { flexDirection: 'row', gap: 8 },
  flexButton: { alignSelf: 'stretch', flex: 1, minHeight: 43, paddingHorizontal: 10 },
  field: { gap: 7 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  optional: { color: colors.muted, fontSize: 10, fontWeight: '400' },
  input: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 12, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  fullButton: { alignSelf: 'stretch' },
  privacy: { alignItems: 'flex-start', flexDirection: 'row', gap: 7 },
  privacyText: { color: colors.muted, flex: 1, fontSize: 10, lineHeight: 15 },
  cameraWrap: { borderRadius: 16, height: 330, overflow: 'hidden', position: 'relative' },
  camera: { height: '100%', width: '100%' },
  cameraFrame: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  frameCorner: { borderColor: '#FFFFFF', borderLeftWidth: 3, borderTopWidth: 3, height: 26, left: 22, position: 'absolute', top: 24, width: 26 },
  frameTopRight: { borderLeftWidth: 0, borderRightWidth: 3, left: undefined, right: 22 },
  frameBottomLeft: { borderBottomWidth: 3, borderTopWidth: 0, bottom: 73, top: undefined },
  frameBottomRight: { borderBottomWidth: 3, borderLeftWidth: 0, borderRightWidth: 3, borderTopWidth: 0, bottom: 73, left: undefined, right: 22, top: undefined },
  cameraFooter: { alignItems: 'center', backgroundColor: 'rgba(24,38,29,0.76)', bottom: 0, flexDirection: 'row', justifyContent: 'space-between', left: 0, paddingHorizontal: 14, paddingVertical: 12, position: 'absolute', right: 0 },
  cameraHint: { color: colors.white, flex: 1, fontSize: 10 },
  shutter: { alignItems: 'center', borderColor: colors.white, borderRadius: 99, borderWidth: 3, height: 46, justifyContent: 'center', width: 46 },
  shutterInner: { backgroundColor: colors.white, borderRadius: 99, height: 32, width: 32 },
  cancelCamera: { alignItems: 'flex-end', flex: 1, padding: 5 },
  cancelText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  resultBlock: { gap: 12 },
  resultPhoto: { backgroundColor: colors.paleGreen, borderRadius: 15, height: 184, width: '100%' },
  resultSummary: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  resultMark: { alignItems: 'center', backgroundColor: colors.leaf, borderRadius: 14, height: 39, justifyContent: 'center', width: 39 },
  resultCrop: { flex: 1, gap: 2 },
  resultLabel: { color: colors.leaf, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  resultTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  days: { alignItems: 'flex-end' },
  daysValue: { color: colors.pine, fontSize: 26, fontWeight: '800', lineHeight: 28 },
  daysLabel: { color: colors.muted, fontSize: 9 },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  confidenceLabel: { color: colors.muted, fontSize: 10 },
  confidenceValue: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  confidenceTrack: { backgroundColor: '#E6E9E1', borderRadius: 99, height: 5, overflow: 'hidden' },
  confidenceFill: { backgroundColor: colors.leaf, borderRadius: 99, height: '100%' },
  tips: { gap: 8, paddingTop: 3 },
  tip: { alignItems: 'flex-start', flexDirection: 'row', gap: 7 },
  tipText: { color: colors.ink, flex: 1, fontSize: 11, lineHeight: 16 },
  disclaimer: { alignItems: 'flex-start', backgroundColor: '#F4F1E7', borderRadius: 12, flexDirection: 'row', gap: 7, padding: 10 },
  disclaimerText: { color: colors.muted, flex: 1, fontSize: 10, lineHeight: 15 },
  guide: { gap: 9, marginHorizontal: 18 },
  guideHead: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  guideIcon: { alignItems: 'center', backgroundColor: colors.paleGold, borderRadius: 12, height: 34, justifyContent: 'center', width: 34 },
  guideTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  guideText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  guideSteps: { borderTopColor: colors.line, borderTopWidth: 1, gap: 9, marginTop: 3, paddingTop: 12 },
  guideStep: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  guideNumber: { color: colors.leaf, fontSize: 10, fontWeight: '800' },
  guideStepText: { color: colors.ink, fontSize: 11 },
  historySection: { gap: 10, paddingHorizontal: 18 },
  historyHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  historyTitle: { color: colors.ink, fontSize: 19, fontWeight: '700', marginTop: 3 },
  historyList: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12 },
  historyRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 9, minHeight: 53 },
  historyIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 10, height: 30, justifyContent: 'center', width: 30 },
  historyCopy: { flex: 1, gap: 2 },
  historyCrop: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  historyDate: { color: colors.muted, fontSize: 9 },
  historyDays: { color: colors.pine, fontSize: 11, fontWeight: '700' },
  historyEmpty: { color: colors.muted, fontSize: 11, lineHeight: 17 },
})
