import { useCallback, useEffect, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import {
  Apple,
  Camera,
  Flame,
  ImagePlus,
  Leaf,
  Package,
  Sprout,
  Wheat,
  X,
} from 'lucide-react-native'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useHarvestLink } from '@/components/harvestlink/context'
import {
  AnimatedEntrance,
  AppButton,
  Card,
  EmptyState,
  Eyebrow,
  MessageBanner,
  SelectField,
  StackHeader,
  TextField,
  colors,
  fonts,
  radii,
  space,
  typeScale,
} from '@/components/harvestlink/ui'
import { clearDesignValue, loadDesignValue, saveDesignValue } from '@/lib/harvestlink/design-local'
import { triggerImpactHaptic, triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import type { ListingUnit } from '@/lib/harvestlink/types'
import { useCreateListing } from '@/lib/harvestlink/use-data'
import {
  BUYER_AREAS,
  CROPS,
  FARM_HUBS,
  UNIT_OPTIONS,
  categoryForCrop,
  formatNaira,
  formatUnitCount,
  formatUnitSingular,
  isDiscreteUnit,
  todayInLagos,
} from '@/lib/harvestlink/utils'

const DRAFT_KEY = 'listing-draft'

type ListingDraft = {
  crop: string
  customCrop: string
  unit: ListingUnit
  quantity: string
  price: string
  shelfLifeDays: string
  harvestedOn: string
  area: string
  farmName: string
  photoUri: string | null
}

const CROP_ICONS = {
  Tomatoes: Sprout,
  'Leafy greens': Leaf,
  Peppers: Flame,
  Maize: Wheat,
  Plantain: Apple,
  Other: Package,
} as const

const HUB_AND_AREA_OPTIONS = [
  ...FARM_HUBS.map((hub) => ({ value: hub, label: `${hub} (Farm hub)` })),
  ...BUYER_AREAS.map((area) => ({ value: area, label: `${area} (City zone)` })),
]

const UNIT_SELECT_OPTIONS = UNIT_OPTIONS.map((unit) => ({ value: unit, label: unit }))
const SHELF_LIFE_PRESETS = ['2', '4', '7', '14'] as const

export function CreateListingScreen() {
  const { user, profile, latestScan, setLatestScan } = useHarvestLink()
  const { createListing, busy, progress, error, setError } = useCreateListing()

  const [crop, setCrop] = useState<string>(() => {
    if (!latestScan) return 'Tomatoes'
    return CROPS.find((item) => item.toLowerCase() === latestScan.crop.toLowerCase()) ?? 'Other'
  })
  const [customCrop, setCustomCrop] = useState<string>(() => {
    if (!latestScan) return ''
    const matched = CROPS.find((item) => item.toLowerCase() === latestScan.crop.toLowerCase())
    return matched ? '' : latestScan.crop
  })
  const [unit, setUnit] = useState<ListingUnit>('Baskets (Big)')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [shelfLifeDays, setShelfLifeDays] = useState<string>(() =>
    latestScan ? String(Math.max(1, Math.min(60, Math.round(latestScan.remaining_days)))) : '4',
  )
  const [harvestedOn, setHarvestedOn] = useState(() => todayInLagos())
  const [area, setArea] = useState<string>(() => profile?.default_area || 'Ikorodu')
  const [farmName, setFarmName] = useState<string>(() => profile?.farm_name || '')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [scanConfidence, setScanConfidence] = useState<number | null>(() => latestScan?.confidence ?? null)
  const [draftLoaded, setDraftLoaded] = useState<boolean>(() => Boolean(latestScan))

  useEffect(() => {
    let active = true
    if (latestScan) {
      return () => { active = false }
    }

    void loadDesignValue<Partial<ListingDraft> | null>(DRAFT_KEY, null).then((draft) => {
      if (!active) return
      if (draft) {
        if (draft.crop) setCrop(draft.crop)
        if (draft.customCrop) setCustomCrop(draft.customCrop)
        if (draft.unit) setUnit(draft.unit)
        if (draft.quantity) setQuantity(draft.quantity)
        if (draft.price) setPrice(draft.price)
        if (draft.shelfLifeDays) setShelfLifeDays(draft.shelfLifeDays)
        if (draft.harvestedOn) setHarvestedOn(draft.harvestedOn)
        if (draft.area) setArea(draft.area)
        if (draft.farmName) setFarmName(draft.farmName)
        if (draft.photoUri) setPhotoUri(draft.photoUri)
      }
      setDraftLoaded(true)
    })

    return () => { active = false }
  }, [latestScan])

  useEffect(() => {
    if (!draftLoaded) return
    const timer = setTimeout(() => {
      const draft: ListingDraft = {
        crop,
        customCrop,
        unit,
        quantity,
        price,
        shelfLifeDays,
        harvestedOn,
        area,
        farmName,
        photoUri,
      }
      void saveDesignValue(DRAFT_KEY, draft)
    }, 250)
    return () => clearTimeout(timer)
  }, [area, crop, customCrop, draftLoaded, farmName, harvestedOn, photoUri, price, quantity, shelfLifeDays, unit])

  const pickPhoto = useCallback(async (source: 'library' | 'camera') => {
    setError(null)
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        setError('Camera permission is required to capture a harvest photo.')
        return
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        setError('Photo library permission is required to attach a harvest photo.')
        return
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.72, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.72, allowsEditing: true, aspect: [4, 3] })

    if (!result.canceled && result.assets[0]?.uri) {
      triggerImpactHaptic()
      setPhotoUri(result.assets[0].uri)
    }
  }, [setError])

  const handleClearDraft = useCallback(async () => {
    triggerSelectionHaptic()
    await clearDesignValue(DRAFT_KEY)
    setCrop('Tomatoes')
    setCustomCrop('')
    setUnit('Baskets (Big)')
    setQuantity('')
    setPrice('')
    setShelfLifeDays('4')
    setHarvestedOn(todayInLagos())
    setPhotoUri(null)
    setScanConfidence(null)
    setLatestScan(null)
    setError(null)
  }, [setError, setLatestScan])

  const resolvedCrop = crop === 'Other' ? customCrop.trim() || 'Other produce' : crop
  const numericQty = Number(quantity) || 0
  const numericPrice = Number(price) || 0
  const lotTotal = numericQty > 0 && numericPrice > 0 ? numericQty * numericPrice : 0
  const singularUnit = formatUnitSingular(unit)

  async function handlePublish() {
    const result = await createListing({
      crop: resolvedCrop,
      category: categoryForCrop(crop),
      pricePerKg: Number(price),
      availableKg: Number(quantity),
      unit,
      estimatedShelfLifeDays: Number(shelfLifeDays),
      harvestedOn: harvestedOn.trim() || todayInLagos(),
      scanConfidence,
      localPhotoUri: photoUri,
      area,
      farmName: farmName.trim() || profile?.farm_name || undefined,
    })

    if (!result.success) return

    await clearDesignValue(DRAFT_KEY)
    setLatestScan(null)
    router.replace('/harvests')
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <StackHeader
        rightAction={
          <Pressable
            accessibilityLabel="Clear draft"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => void handleClearDraft()}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
          >
            <Text style={styles.clearBtnText}>Reset</Text>
          </Pressable>
        }
        title="New Harvest Listing"
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!user || (profile?.role !== 'farmer' && profile?.role !== 'both') ? (
            <EmptyState
              title="Farmer account needed"
              message="Sign in and set your role to Farmer or Both in Profile before publishing a harvest."
              action={<AppButton label="Go to Profile" onPress={() => router.replace('/profile')} />}
            />
          ) : (
            <>
              <AnimatedEntrance delay={20}>
                <Card style={styles.sectionCard}>
                  <Eyebrow>1 · HARVEST PHOTO</Eyebrow>
                  <Text style={styles.sectionTitle}>Show buyers today’s batch</Text>
                  <Text style={styles.helperText}>
                    A real farm photo increases buyer confidence and prevents order disputes. Photos upload directly when you publish.
                  </Text>

                  {photoUri ? (
                    <View style={styles.photoPreviewBox}>
                      <Image contentFit="cover" source={{ uri: photoUri }} style={styles.photoPreview} />
                      <Pressable
                        accessibilityLabel="Remove selected photo"
                        accessibilityRole="button"
                        onPress={() => {
                          triggerSelectionHaptic()
                          setPhotoUri(null)
                        }}
                        style={({ pressed }) => [styles.removePhotoBtn, pressed && styles.pressed]}
                      >
                        <X color={colors.white} size={18} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.photoNotice}>
                      <Text style={styles.photoNoticeText}>
                        No farm photo attached yet — if skipped, a standard {resolvedCrop.toLowerCase()} illustration will be used.
                      </Text>
                    </View>
                  )}

                  <View style={styles.photoBtnRow}>
                    <AppButton
                      icon={<Camera color={colors.pine} size={18} />}
                      label="Take Photo"
                      onPress={() => void pickPhoto('camera')}
                      style={styles.flex}
                      variant="secondary"
                    />
                    <AppButton
                      icon={<ImagePlus color={colors.pine} size={18} />}
                      label="Gallery"
                      onPress={() => void pickPhoto('library')}
                      style={styles.flex}
                      variant="secondary"
                    />
                  </View>
                </Card>
              </AnimatedEntrance>

              <AnimatedEntrance delay={60}>
                <Card style={styles.sectionCard}>
                  <Eyebrow>2 · PRODUCE TYPE</Eyebrow>
                  <Text style={styles.sectionTitle}>What are you harvesting?</Text>

                  <View style={styles.cropGrid}>
                    {CROPS.map((item) => {
                      const Icon = CROP_ICONS[item]
                      const selected = crop === item
                      return (
                        <Pressable
                          key={item}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => {
                            triggerSelectionHaptic()
                            setCrop(item)
                          }}
                          style={[styles.cropChip, selected && styles.cropChipSelected]}
                        >
                          <Icon color={selected ? colors.white : colors.pine} size={16} />
                          <Text style={[styles.cropChipText, selected && styles.cropChipTextSelected]}>{item}</Text>
                        </Pressable>
                      )
                    })}
                  </View>

                  {crop === 'Other' ? (
                    <TextField
                      label="Crop or local produce name"
                      onChangeText={setCustomCrop}
                      placeholder="e.g. Tatashe, Ugu leaves, Yellow Plantain"
                      value={customCrop}
                    />
                  ) : null}
                </Card>
              </AnimatedEntrance>

              <AnimatedEntrance delay={100}>
                <Card style={styles.sectionCard}>
                  <Eyebrow>3 · UNIT, QUANTITY & PRICE</Eyebrow>
                  <Text style={styles.sectionTitle}>How is this batch sold?</Text>

                  <SelectField
                    label="Selling unit"
                    onChange={(nextUnit) => setUnit(nextUnit)}
                    options={UNIT_SELECT_OPTIONS}
                    value={unit}
                  />

                  <View style={styles.rowFields}>
                    <TextField
                      keyboardType={isDiscreteUnit(unit) ? 'number-pad' : 'decimal-pad'}
                      label={`Available (${singularUnit}s)`}
                      onChangeText={setQuantity}
                      placeholder={isDiscreteUnit(unit) ? 'e.g. 12' : 'e.g. 80'}
                      style={styles.flex}
                      value={quantity}
                    />
                    <TextField
                      keyboardType="number-pad"
                      label={`Price / ${singularUnit} (₦)`}
                      onChangeText={setPrice}
                      placeholder="e.g. 18000"
                      style={styles.flex}
                      value={price}
                    />
                  </View>

                  {lotTotal > 0 ? (
                    <View style={styles.lotSummary}>
                      <Text style={styles.lotSummaryLabel}>
                        Listing {formatUnitCount(numericQty, unit)} at {formatNaira(numericPrice)}/{singularUnit}
                      </Text>
                      <Text style={styles.lotSummaryTotal}>Lot value {formatNaira(lotTotal)}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.fieldLabel}>Estimated fresh shelf life</Text>
                  <View style={styles.presetRow}>
                    {SHELF_LIFE_PRESETS.map((days) => {
                      const active = shelfLifeDays === days
                      return (
                        <Pressable
                          key={days}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => {
                            triggerSelectionHaptic()
                            setShelfLifeDays(days)
                          }}
                          style={[styles.presetChip, active && styles.presetChipSelected]}
                        >
                          <Text style={[styles.presetText, active && styles.presetTextSelected]}>{days} days</Text>
                        </Pressable>
                      )
                    })}
                  </View>

                  <View style={styles.rowFields}>
                    <TextField
                      hint={scanConfidence ? `Verified from scan (${scanConfidence}% confidence)` : '1 to 60 days'}
                      keyboardType="number-pad"
                      label="Shelf life (days)"
                      onChangeText={setShelfLifeDays}
                      placeholder="4"
                      style={styles.flex}
                      value={shelfLifeDays}
                    />
                    <TextField
                      hint="YYYY-MM-DD (Lagos date)"
                      label="Harvested on"
                      onChangeText={setHarvestedOn}
                      placeholder={todayInLagos()}
                      style={styles.flex}
                      value={harvestedOn}
                    />
                  </View>
                </Card>
              </AnimatedEntrance>

              <AnimatedEntrance delay={140}>
                <Card style={styles.sectionCard}>
                  <Eyebrow>4 · FARM & DISPATCH ZONE</Eyebrow>
                  <Text style={styles.sectionTitle}>Where are buyers collecting from?</Text>

                  <TextField
                    label="Farm or cooperative name"
                    onChangeText={setFarmName}
                    placeholder="e.g. GreenAcres Farmstead"
                    value={farmName}
                  />

                  <SelectField
                    label="Primary farm hub or pickup area"
                    onChange={setArea}
                    options={HUB_AND_AREA_OPTIONS}
                    value={area}
                  />
                </Card>
              </AnimatedEntrance>

              {progress ? <MessageBanner tone="info">{progress}</MessageBanner> : null}
              {error ? <MessageBanner>{error}</MessageBanner> : null}

              <AppButton
                label={progress ?? 'Publish Harvest Listing'}
                loading={busy}
                onPress={() => void handlePublish()}
                style={styles.submitBtn}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.cream,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  clearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 52,
    paddingHorizontal: space.xs,
  },
  clearBtnText: {
    fontFamily: fonts.bodyBold,
    color: colors.muted,
    fontSize: 13,
  },
  scrollContent: {
    gap: space.md,
    padding: space.lg,
    paddingBottom: 40,
  },
  sectionCard: {
    gap: space.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    color: colors.ink,
    fontSize: 19,
  },
  helperText: {
    ...typeScale.small,
    color: colors.muted,
  },
  photoPreviewBox: {
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: {
    height: 190,
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
  photoNotice: {
    backgroundColor: colors.creamSubtle,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: space.md,
  },
  photoNoticeText: {
    ...typeScale.small,
    color: colors.muted,
  },
  photoBtnRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  cropChip: {
    alignItems: 'center',
    backgroundColor: colors.creamSubtle,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: space.md,
  },
  cropChipSelected: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  cropChipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    fontSize: 13,
  },
  cropChipTextSelected: {
    color: colors.white,
  },
  rowFields: {
    flexDirection: 'row',
    gap: space.sm,
  },
  lotSummary: {
    backgroundColor: colors.paleGreen,
    borderColor: '#CEDBC8',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    justifyContent: 'space-between',
    padding: space.md,
  },
  lotSummaryLabel: {
    ...typeScale.small,
    color: colors.pine,
    fontFamily: fonts.bodyMedium,
  },
  lotSummaryTotal: {
    fontFamily: fonts.heading,
    color: colors.pineDeep,
    fontSize: 15,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 13,
    marginTop: space.xs,
  },
  presetRow: {
    flexDirection: 'row',
    gap: space.xs,
  },
  presetChip: {
    alignItems: 'center',
    backgroundColor: colors.creamSubtle,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  presetChipSelected: {
    backgroundColor: colors.paleGold,
    borderColor: colors.gold,
  },
  presetText: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
  },
  presetTextSelected: {
    color: colors.goldDeep,
    fontFamily: fonts.bodyBold,
  },
  submitBtn: {
    marginTop: space.xs,
  },
  pressed: {
    opacity: 0.8,
  },
})
