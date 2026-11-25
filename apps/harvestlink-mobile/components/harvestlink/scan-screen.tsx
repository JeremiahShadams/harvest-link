import { useCallback, useRef, useState } from 'react'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { ArrowRight, Camera, ImagePlus, Sparkles, X } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { AppHeader } from '@/components/harvestlink/app-header'
import { useHarvestLink } from '@/components/harvestlink/context'
import {
  AnimatedEntrance,
  AppButton,
  Card,
  EmptyState,
  Eyebrow,
  MessageBanner,
  OrderCardSkeleton,
  ScreenScroll,
  SectionTitle,
  StatusBadge,
  TextField,
  colors,
  fonts,
  radii,
  space,
  typeScale,
} from '@/components/harvestlink/ui'
import { triggerImpactHaptic, triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { useAnalyzeScan, useScans, type SelectedScanPhoto } from '@/lib/harvestlink/use-data'
import { formatDate } from '@/lib/harvestlink/utils'

export function ScanScreen() {
  const { user, latestScan, setLatestScan, profile } = useHarvestLink()
  const scansResult = useScans(user?.id ?? null)
  const scans = scansResult.data ?? []
  const { analyze, busy, error, setError } = useAnalyzeScan()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView | null>(null)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [cropHint, setCropHint] = useState('')
  const [selected, setSelected] = useState<SelectedScanPhoto | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    triggerSelectionHaptic()
    setRefreshing(true)
    await scansResult.mutate()
    setRefreshing(false)
  }, [scansResult])

  const openCamera = async () => {
    setError(null)
    if (!permission?.granted) {
      const response = await requestPermission()
      if (!response.granted) {
        setError('Allow camera access in settings or choose a photo from your library.')
        return
      }
    }
    triggerSelectionHaptic()
    setCameraOpen(true)
  }

  const capturePhoto = async () => {
    const picture = await cameraRef.current?.takePictureAsync({ quality: 0.72 })
    if (!picture?.uri) return
    triggerImpactHaptic()
    setSelected({ uri: picture.uri, name: `scan-${Date.now()}.jpg`, mimeType: 'image/jpeg' })
    setCameraOpen(false)
  }

  const pickPhoto = async () => {
    setError(null)
    const response = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.72,
    })
    if (response.canceled || !response.assets[0]) return
    const asset = response.assets[0]
    triggerImpactHaptic()
    setSelected({
      uri: asset.uri,
      file: (asset as { file?: File }).file,
      name: asset.fileName ?? `scan-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileSize: asset.fileSize,
    })
  }

  const runScan = async () => {
    if (!selected) return
    const result = await analyze(selected, cropHint)
    if (result.success) setSelected(null)
  }

  const canList = profile?.role === 'farmer' || profile?.role === 'both'
  const isLoadingScans = Boolean(user && scansResult.isLoading && !scansResult.data)

  return (
    <ScreenScroll keyboardAvoiding onRefresh={handleRefresh} refreshing={refreshing}>
      <AppHeader />

      <AnimatedEntrance delay={20}>
        <View style={styles.intro}>
          <Eyebrow>FRESHNESS CHECK</Eyebrow>
          <Text style={styles.title}>Check a harvest batch before listing or buying.</Text>
          <Text style={styles.subtitle}>
            Take a well-lit photo of tomatoes, peppers, leafy greens, or fruit for a visual shelf-life guide.
          </Text>
        </View>
      </AnimatedEntrance>

      {cameraOpen ? (
        <Card style={styles.cameraCard}>
          <CameraView facing="back" ref={cameraRef} style={styles.camera} />
          <View style={styles.cameraActions}>
            <AppButton label="Capture Photo" onPress={() => void capturePhoto()} style={styles.flex} />
            <AppButton label="Cancel" onPress={() => setCameraOpen(false)} variant="quiet" />
          </View>
        </Card>
      ) : (
        <AnimatedEntrance delay={60}>
          <Card style={styles.card}>
            {selected ? (
              <View style={styles.previewWrap}>
                <Image contentFit="cover" source={{ uri: selected.uri }} style={styles.preview} />
                <Pressable
                  accessibilityLabel="Remove photo"
                  accessibilityRole="button"
                  onPress={() => {
                    triggerSelectionHaptic()
                    setSelected(null)
                  }}
                  style={styles.removePhotoBtn}
                >
                  <X color={colors.white} size={18} />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.photoRow}>
              <AppButton
                icon={<Camera color={colors.pine} size={18} />}
                label="Take Photo"
                onPress={() => void openCamera()}
                style={styles.flex}
                variant="secondary"
              />
              <AppButton
                icon={<ImagePlus color={colors.pine} size={18} />}
                label="Choose Photo"
                onPress={() => void pickPhoto()}
                style={styles.flex}
                variant="secondary"
              />
            </View>

            <TextField
              label="Crop hint (optional)"
              onChangeText={setCropHint}
              placeholder="e.g. Roma tomatoes, Ugu, Scotch bonnet"
              value={cropHint}
            />

            {error ? <MessageBanner>{error}</MessageBanner> : null}

            {!user ? (
              <AppButton label="Sign in to run scan" onPress={() => router.push('/profile')} variant="secondary" />
            ) : (
              <AppButton
                disabled={!selected}
                icon={<Sparkles color={colors.white} size={18} />}
                label={busy ? 'Checking freshness…' : 'Check Freshness'}
                loading={busy}
                onPress={() => void runScan()}
              />
            )}
          </Card>
        </AnimatedEntrance>
      )}

      {latestScan ? (
        <AnimatedEntrance delay={100}>
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultCrop}>{latestScan.crop}</Text>
              <StatusBadge
                label={`${latestScan.remaining_days} days left · ${latestScan.confidence}%`}
                tone={latestScan.remaining_days <= 2 ? 'gold' : 'green'}
              />
            </View>
            <View style={styles.tips}>
              {latestScan.storage_tips.map((tip) => (
                <Text key={tip} style={styles.tip}>
                  • {tip}
                </Text>
              ))}
            </View>
            <Text style={styles.disclaimer}>{latestScan.disclaimer}</Text>

            {canList ? (
              <AppButton
                iconAfter={<ArrowRight color={colors.white} size={17} />}
                label="Use in New Harvest Listing"
                onPress={() => {
                  setLatestScan(latestScan)
                  router.push('/listing/new')
                }}
              />
            ) : null}
          </Card>
        </AnimatedEntrance>
      ) : null}

      <AnimatedEntrance delay={140}>
        <SectionTitle eyebrow="HISTORY" title="Recent Scans" />
        {!user ? (
          <EmptyState
            title="Your scan history stays here"
            message="Sign in to keep a record of produce freshness checks across your orders and harvests."
          />
        ) : isLoadingScans ? (
          <View style={styles.gap}>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </View>
        ) : scans.length === 0 ? (
          <EmptyState
            title="No scans yet"
            message="Capture or select a crop photo above to save your first freshness estimate."
          />
        ) : (
          <View style={styles.gap}>
            {scans.map((scan) => (
              <Card key={scan.id} style={styles.scanRow}>
                <View style={styles.resultHeader}>
                  <Text style={styles.scanCrop}>{scan.crop}</Text>
                  <StatusBadge
                    label={`${scan.remaining_days} days left`}
                    tone={scan.remaining_days <= 2 ? 'gold' : 'green'}
                  />
                </View>
                <Text style={styles.scanMeta}>
                  {scan.confidence}% confidence · {formatDate(scan.created_at)}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </AnimatedEntrance>
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  intro: {
    gap: space.xs,
    marginBottom: space.md,
  },
  title: {
    ...typeScale.display,
    color: colors.pineDeep,
  },
  subtitle: {
    ...typeScale.body,
    color: colors.muted,
  },
  cameraCard: {
    gap: space.md,
    marginBottom: space.lg,
  },
  camera: {
    borderRadius: radii.md,
    height: 300,
    overflow: 'hidden',
    width: '100%',
  },
  cameraActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  card: {
    gap: space.md,
    marginBottom: space.lg,
  },
  previewWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  preview: {
    height: 200,
    width: '100%',
  },
  removePhotoBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 48, 21, 0.85)',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: space.sm,
    top: space.sm,
    width: 44,
  },
  photoRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  resultCard: {
    backgroundColor: colors.paleGreen,
    borderColor: '#CEDBC8',
    gap: space.sm,
    marginBottom: space.lg,
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  resultCrop: {
    fontFamily: fonts.heading,
    color: colors.pineDeep,
    flex: 1,
    fontSize: 19,
  },
  tips: {
    gap: 5,
  },
  tip: {
    ...typeScale.body,
    color: colors.ink,
  },
  disclaimer: {
    ...typeScale.micro,
    color: colors.muted,
  },
  gap: {
    gap: space.sm,
  },
  scanRow: {
    gap: 6,
  },
  scanCrop: {
    fontFamily: fonts.heading,
    color: colors.ink,
    flex: 1,
    fontSize: 17,
  },
  scanMeta: {
    ...typeScale.small,
    color: colors.muted,
  },
})
