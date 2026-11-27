import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router, useIsFocused } from 'expo-router'
import { ArrowRight, History, ImagePlus, RotateCcw, Sparkles, X, Zap, ZapOff } from 'lucide-react-native'
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHarvestLink } from '@/components/harvestlink/context'
import {
  AppButton,
  Card,
  EmptyState,
  MessageBanner,
  OrderCardSkeleton,
  StatusBadge,
  colors,
  fonts,
  radii,
  space,
  typeScale,
} from '@/components/harvestlink/ui'
import { triggerImpactHaptic, triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { useAnalyzeScan, useScans, type SelectedScanPhoto } from '@/lib/harvestlink/use-data'
import { formatConfidence, formatDate } from '@/lib/harvestlink/utils'

export function ScanScreen() {
  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { user, latestScan, setLatestScan, profile } = useHarvestLink()
  const scansResult = useScans(user?.id ?? null)
  const scans = scansResult.data ?? []
  const { analyze, cancel, busy, error, setError } = useAnalyzeScan()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView | null>(null)
  const autoRequestedRef = useRef(false)

  const [torchOn, setTorchOn] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [cropHint, setCropHint] = useState('')
  const [selected, setSelected] = useState<SelectedScanPhoto | null>(null)
  const [lastPreviewUri, setLastPreviewUri] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!isFocused) return
    if (permission && !permission.granted && permission.canAskAgain && !autoRequestedRef.current) {
      autoRequestedRef.current = true
      void requestPermission()
    }
  }, [isFocused, permission, requestPermission])

  const handleRefreshHistory = useCallback(async () => {
    triggerSelectionHaptic()
    setRefreshing(true)
    await scansResult.mutate()
    setRefreshing(false)
  }, [scansResult])

  const capturePhoto = async () => {
    if (busy) return
    setError(null)
    try {
      const picture = await cameraRef.current?.takePictureAsync({ quality: 0.72 })
      if (!picture?.uri) return
      triggerImpactHaptic()
      setLatestScan(null)
      setLastPreviewUri(picture.uri)
      setSelected({ uri: picture.uri, name: `scan-${Date.now()}.jpg`, mimeType: 'image/jpeg' })
    } catch {
      setError('Could not capture photo. Hold steady and try again.')
    }
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
    setLatestScan(null)
    setLastPreviewUri(asset.uri)
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
    if (result.success) {
      setSelected(null)
      setCropHint('')
    }
  }

  const resetToCamera = () => {
    triggerSelectionHaptic()
    cancel()
    setSelected(null)
    setLatestScan(null)
    setLastPreviewUri(null)
    setCropHint('')
  }

  const canList = profile?.role === 'farmer' || profile?.role === 'both'
  const isLoadingScans = Boolean(user && scansResult.isLoading && !scansResult.data)
  const dockBottom = 86 + Math.max(14, insets.bottom)
  const topOffset = Math.max(12, insets.top + 8)

  const cameraActive = Boolean(isFocused && permission?.granted && !selected && !latestScan && !historyOpen)
  const backdropUri = selected?.uri ?? (latestScan ? lastPreviewUri : null)

  return (
    <View style={styles.root}>
      {backdropUri ? (
        <Image contentFit="cover" source={{ uri: backdropUri }} style={StyleSheet.absoluteFill} />
      ) : permission?.granted ? (
        isFocused ? (
          <CameraView
            active={cameraActive}
            animateShutter
            enableTorch={torchOn}
            facing="back"
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={styles.darkCanvas} />
        )
      ) : (
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Allow camera access so Scan opens straight into the viewfinder.
          </Text>
          <AppButton
            label={permission?.canAskAgain === false ? 'Open Settings' : 'Enable Camera'}
            onPress={() => {
              if (permission?.canAskAgain === false) {
                void Linking.openSettings()
              } else {
                void requestPermission()
              }
            }}
            style={styles.permissionBtn}
          />
          <AppButton label="Choose Photo" onPress={() => void pickPhoto()} variant="secondary" />
        </View>
      )}

      {/* Subtle corner reticle strictly on live viewfinder */}
      {!selected && !latestScan && permission?.granted ? (
        <View pointerEvents="none" style={styles.reticleWrap}>
          <View style={styles.reticle}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
      ) : null}

      {/* Minimal top HUD */}
      <View pointerEvents="box-none" style={[styles.topHud, { top: topOffset }]}>
        {selected || latestScan ? (
          <Pressable
            accessibilityLabel="Retake photo"
            accessibilityRole="button"
            onPress={resetToCamera}
            style={({ pressed }) => [styles.hudPill, pressed && styles.pressed]}
          >
            {latestScan ? <X color={colors.white} size={18} /> : <RotateCcw color={colors.white} size={17} />}
            <Text style={styles.hudPillText}>{latestScan ? 'Scan again' : 'Retake'}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel={scans.length ? `Scan history, ${scans.length} items` : 'Scan history'}
            accessibilityRole="button"
            onPress={() => {
              triggerSelectionHaptic()
              setHistoryOpen(true)
            }}
            style={({ pressed }) => [styles.hudPill, pressed && styles.pressed]}
          >
            <History color={colors.white} size={17} />
            <Text style={styles.hudPillText}>{scans.length ? `History (${scans.length})` : 'History'}</Text>
          </Pressable>
        )}

        {!selected && !latestScan && permission?.granted ? (
          <Pressable
            accessibilityLabel={torchOn ? 'Turn flash off' : 'Turn flash on'}
            accessibilityRole="button"
            accessibilityState={{ selected: torchOn }}
            onPress={() => {
              triggerSelectionHaptic()
              setTorchOn((prev) => !prev)
            }}
            style={({ pressed }) => [styles.hudCircle, torchOn && styles.hudCircleActive, pressed && styles.pressed]}
          >
            {torchOn ? <Zap color={colors.pineDeep} size={20} /> : <ZapOff color={colors.white} size={20} />}
          </Pressable>
        ) : (
          <View style={styles.hudSpacer} />
        )}
      </View>

      {/* Bottom Camera Shutter Bar */}
      {!selected && !latestScan && permission?.granted ? (
        <View pointerEvents="box-none" style={[styles.bottomControls, { bottom: dockBottom }]}>
          {error ? (
            <View style={styles.floatingError}>
              <MessageBanner>{error}</MessageBanner>
            </View>
          ) : null}

          <View style={styles.shutterRow}>
            <Pressable
              accessibilityLabel="Choose photo from library"
              accessibilityRole="button"
              onPress={() => void pickPhoto()}
              style={({ pressed }) => [styles.sideAction, pressed && styles.pressed]}
            >
              <ImagePlus color={colors.white} size={22} />
            </Pressable>

            <Pressable
              accessibilityLabel="Take produce photo"
              accessibilityRole="button"
              onPress={() => void capturePhoto()}
              style={({ pressed }) => [styles.shutterOuter, pressed && styles.shutterPressed]}
            >
              <View style={styles.shutterInner} />
            </Pressable>

            <View style={styles.hudSpacer} />
          </View>
        </View>
      ) : null}

      {/* Captured Photo Confirm Bar */}
      {selected && !latestScan ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={12}
          pointerEvents="box-none"
          style={[styles.sheetDock, { bottom: dockBottom }]}
        >
          <Card style={styles.reviewCard}>
            <TextInput
              accessibilityLabel="Crop hint (optional)"
              onChangeText={setCropHint}
              placeholder="Crop name (optional, e.g. Tomatoes)"
              placeholderTextColor="#7A847D"
              returnKeyType="done"
              style={styles.hintInput}
              value={cropHint}
            />

            {error ? <MessageBanner>{error}</MessageBanner> : null}

            {!user ? (
              <AppButton
                label="Sign in to Scan"
                onPress={() => router.push('/profile')}
                style={styles.fullBtn}
              />
            ) : (
              <AppButton
                icon={<Sparkles color={colors.white} size={18} />}
                label={busy ? 'Checking freshness…' : 'Check Freshness'}
                loading={busy}
                onPress={() => void runScan()}
                style={styles.fullBtn}
              />
            )}
          </Card>
        </KeyboardAvoidingView>
      ) : null}

      {/* Scan Result Sheet */}
      {latestScan ? (
        <View pointerEvents="box-none" style={[styles.sheetDock, { bottom: dockBottom }]}>
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text numberOfLines={1} style={styles.resultCrop}>
                {latestScan.crop}
              </Text>
              <StatusBadge
                label={`${latestScan.remaining_days} days left · ${formatConfidence(latestScan.confidence)}`}
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

            <View style={styles.resultActions}>
              {canList ? (
                <AppButton
                  iconAfter={<ArrowRight color={colors.white} size={17} />}
                  label="Use in New Listing"
                  onPress={() => {
                    setLatestScan(latestScan)
                    setLastPreviewUri(null)
                    router.push('/listing/new')
                  }}
                  style={styles.flex}
                />
              ) : (
                <AppButton label="Scan Another" onPress={resetToCamera} style={styles.flex} />
              )}
            </View>
          </Card>
        </View>
      ) : null}

      {/* Deferred Scan History Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setHistoryOpen(false)}
        presentationStyle="pageSheet"
        visible={historyOpen}
      >
        <View style={[styles.modalRoot, { paddingTop: Math.max(16, insets.top) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recent Scans</Text>
            <Pressable
              accessibilityLabel="Close history"
              accessibilityRole="button"
              onPress={() => setHistoryOpen(false)}
              style={styles.modalCloseBtn}
            >
              <X color={colors.ink} size={20} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
            refreshControl={
              <RefreshControl
                colors={[colors.pine]}
                onRefresh={handleRefreshHistory}
                refreshing={refreshing}
                tintColor={colors.pine}
              />
            }
          >
            {!user ? (
              <EmptyState
                action={
                  <AppButton
                    label="Sign in"
                    onPress={() => {
                      setHistoryOpen(false)
                      router.push('/profile')
                    }}
                  />
                }
                message="Sign in to view your saved produce scans."
                title="Sign in for scan history"
              />
            ) : isLoadingScans ? (
              <View style={styles.gap}>
                <OrderCardSkeleton />
                <OrderCardSkeleton />
              </View>
            ) : scans.length === 0 ? (
              <EmptyState
                message="Take a photo of produce to keep a record of freshness estimates."
                title="No scans yet"
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
                      {formatConfidence(scan.confidence)} confidence · {formatDate(scan.created_at)}
                    </Text>
                  </Card>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0B120E',
    flex: 1,
  },
  darkCanvas: {
    backgroundColor: '#0B120E',
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  permissionWrap: {
    alignItems: 'center',
    flex: 1,
    gap: space.md,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  permissionTitle: {
    ...typeScale.title,
    color: colors.white,
    textAlign: 'center',
  },
  permissionBody: {
    ...typeScale.body,
    color: '#D5DDD7',
    maxWidth: 300,
    textAlign: 'center',
  },
  permissionBtn: {
    marginTop: space.xs,
  },
  reticleWrap: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    paddingBottom: 60,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  reticle: {
    height: 236,
    position: 'relative',
    width: 236,
  },
  corner: {
    borderColor: 'rgba(255, 255, 255, 0.72)',
    height: 26,
    position: 'absolute',
    width: 26,
  },
  cornerTL: {
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
    borderTopWidth: 3,
    left: 0,
    top: 0,
  },
  cornerTR: {
    borderRightWidth: 3,
    borderTopRightRadius: 12,
    borderTopWidth: 3,
    right: 0,
    top: 0,
  },
  cornerBL: {
    borderBottomLeftRadius: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 0,
    left: 0,
  },
  cornerBR: {
    borderBottomRightRadius: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 0,
    right: 0,
  },
  topHud: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  hudPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 28, 20, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  hudPillText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  hudCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 28, 20, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  hudCircleActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  hudSpacer: {
    height: 48,
    width: 48,
  },
  bottomControls: {
    alignItems: 'center',
    gap: space.md,
    left: 20,
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  floatingError: {
    width: '100%',
  },
  shutterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 320,
    width: '100%',
  },
  sideAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 28, 20, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  shutterOuter: {
    alignItems: 'center',
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 4,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  shutterInner: {
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 60,
    width: 60,
  },
  shutterPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
  sheetDock: {
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 12,
  },
  reviewCard: {
    backgroundColor: colors.cream,
    gap: space.sm,
  },
  hintInput: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  fullBtn: {
    alignSelf: 'stretch',
  },
  resultCard: {
    backgroundColor: colors.cream,
    gap: space.sm,
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  resultCrop: {
    color: colors.pineDeep,
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 20,
  },
  tips: {
    gap: 4,
  },
  tip: {
    ...typeScale.small,
    color: colors.ink,
  },
  disclaimer: {
    ...typeScale.micro,
    color: colors.muted,
  },
  resultActions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: 2,
  },
  modalRoot: {
    backgroundColor: colors.cream,
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  modalTitle: {
    ...typeScale.title,
    color: colors.pineDeep,
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  modalScroll: {
    padding: space.lg,
    paddingBottom: 40,
  },
  gap: {
    gap: space.sm,
  },
  scanRow: {
    gap: 6,
  },
  scanCrop: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 17,
  },
  scanMeta: {
    ...typeScale.small,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.82,
  },
})
