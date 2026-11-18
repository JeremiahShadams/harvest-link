import { useState } from 'react'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useSWRConfig } from 'swr'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Camera,
  MapPin,
  ScanLine,
  Search,
  Sparkles,
  X,
} from 'lucide-react-native'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { useHarvestLink } from '../context'
import { DesignButton, DesignScreen, DesignSelect } from './ui'
import { body, C, DESIGN_PRODUCE_IMAGE, heading, R, shadow } from './tokens'
import { useCreateListing } from '@/lib/harvestlink/use-mutations'
import { saveDesignValue } from '@/lib/harvestlink/design-local'

type Category = 'Peppers' | 'Tomatoes' | 'Leafy Greens' | 'Maize'

type Photo = { id: string; uri: string }

const UNIT_OPTIONS = [
  'Baskets (Big)',
  'Baskets (Small)',
  'Sacks',
  'Crates',
  'Kilograms (kg)',
] as const

type Unit = (typeof UNIT_OPTIONS)[number]

const CATEGORIES: { label: string; value: Category }[] = [
  { label: '🌶️ Peppers', value: 'Peppers' },
  { label: '🍅 Tomatoes', value: 'Tomatoes' },
  { label: '🥬 Leafy Greens', value: 'Leafy Greens' },
  { label: '🌽 Maize', value: 'Maize' },
]

export function CreateListingScreen() {
  const insets = useSafeAreaInsets()
  const { user, profile } = useHarvestLink()
  const { createListing, busy } = useCreateListing()
  const [crop, setCrop] = useState('Rodo (Scotch Bonnet Pepper)')
  const [category, setCategory] = useState<Category>('Peppers')
  const [photos, setPhotos] = useState<Photo[]>([{ id: 'design-pepper-photo', uri: DESIGN_PRODUCE_IMAGE }])
  const [quantity, setQuantity] = useState('5')
  const [unit, setUnit] = useState<Unit>('Baskets (Big)')
  const [price, setPrice] = useState('12500')
  const [harvestDate, setHarvestDate] = useState('')
  const [description, setDescription] = useState('')
  const [savingDraft, setSavingDraft] = useState(false)

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.navigate('/farmer' as never)
  }

  const selectCategory = (next: Category) => {
    setCategory(next)
    if (next === 'Tomatoes') setCrop('Tomatoes')
    if (next === 'Leafy Greens') setCrop('Leafy Greens')
    if (next === 'Maize') setCrop('Maize')
    if (next === 'Peppers') setCrop('Rodo (Scotch Bonnet Pepper)')
  }

  const addPhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert('Maximum photos reached', 'This listing already has four photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: 4 - photos.length,
    })
    if (result.canceled) return
    const next = result.assets.map((asset, index) => ({ id: `${Date.now()}-${index}`, uri: asset.uri }))
    setPhotos((current) => [...current, ...next].slice(0, 4))
  }

  const saveDraft = async () => {
    setSavingDraft(true)
    await saveDesignValue('listing-draft', {
      crop,
      category,
      photos,
      quantity,
      unit,
      price,
      harvestDate,
      description,
      savedAt: new Date().toISOString(),
    })
    setSavingDraft(false)
    Alert.alert('Draft saved on this device', 'You can return to this listing form and continue later.')
  }

  const validate = () => {
    if (!crop.trim()) return 'Add the produce you are listing.'
    const numericQuantity = Number(quantity)
    const numericPrice = Number(price)
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) return 'Add a quantity greater than zero.'
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return 'Add a unit price greater than zero.'
    if (harvestDate && Number.isNaN(new Date(harvestDate).getTime())) return 'Use a valid harvest date.'
    return ''
  }

  const publish = async () => {
    const validationMessage = validate()
    if (validationMessage) {
      Alert.alert('Check your listing', validationMessage)
      return
    }
    if (!user || !profile) {
      Alert.alert('Sign in required', 'Sign in with your farmer profile before publishing a listing.')
      return
    }
    const numericQuantity = Number(quantity)
    const numericPrice = Number(price)
    const result = await createListing({
      crop: crop.trim(),
      category,
      pricePerKg: numericPrice,
      availableKg: numericQuantity,
      harvestedOn: harvestDate || new Date().toISOString().slice(0, 10),
      estimatedShelfLifeDays: 0,
      imageUrl: photos[0]?.uri || DESIGN_PRODUCE_IMAGE,
      area: profile.default_area || 'Ikorodu Farm Hub, Lagos',
    })
    if (!result.success) {
      Alert.alert('Listing not published', result.error ?? 'Check the details and try again.')
      return
    }
    Alert.alert('Listing published', 'Your produce is now visible to nearby buyers.')
    goBack()
  }

  return (
    <>
      <View style={[styles.header, { paddingTop: 56 + insets.top }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={C.slate600} size={20} />
          </Pressable>
          <Text style={styles.headerTitle}>Create Listing</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Step 2 of 3</Text>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>
      </View>

      <DesignScreen activeTab="home" contentStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>What are you listing?</Text>
          <View style={styles.searchWrap}>
            <Search color={C.slate400} size={16} style={styles.searchIcon} />
            <TextInput
              accessibilityLabel="Produce name"
              onChangeText={setCrop}
              placeholder="e.g. Tomatoes, Peppers, Maize"
              placeholderTextColor={C.slate400}
              style={styles.searchInput}
              value={crop}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CATEGORIES.map((option) => {
              const selected = option.value === category
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectCategory(option.value)}
                  style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
                >
                  <Text numberOfLines={1} style={[styles.chipText, selected ? styles.chipTextSelected : styles.chipTextUnselected]}>{option.label}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Produce Photos</Text>
            <Text style={styles.helperMuted}>Max 4 photos</Text>
          </View>
          <View style={styles.photoGrid}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Photo"
              onPress={() => void addPhoto()}
              style={({ pressed }) => [styles.addPhoto, pressed && styles.pressed]}
            >
              <Camera color={C.slate400} size={24} style={styles.addPhotoIcon} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </Pressable>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoTile}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} contentFit="cover" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  onPress={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}
                  style={({ pressed }) => [styles.removePhoto, pressed && styles.pressedRemove]}
                >
                  <X color={C.white} size={12} />
                </Pressable>
              </View>
            ))}
            {photos.length < 2 ? <View style={styles.emptyPhotoSlot} /> : null}
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View>
            <Text style={styles.detailLabel}>Quantity &amp; Unit</Text>
            <View style={styles.quantityRow}>
              <TextInput
                accessibilityLabel="Quantity"
                keyboardType="number-pad"
                onChangeText={setQuantity}
                placeholder="0"
                style={styles.quantityInput}
                value={quantity}
              />
              <View style={styles.unitWrap}>
                <DesignSelect
                  accessibilityLabel="Unit"
                  onChange={(next) => setUnit(next)}
                  options={UNIT_OPTIONS.map((option) => ({ value: option, label: option }))}
                  style={styles.unitSelect}
                  value={unit}
                  textStyle={styles.unitText}
                />
              </View>
            </View>
          </View>

          <View>
            <Text style={styles.detailLabel}>Unit Price</Text>
            <View style={styles.priceWrap}>
              <Text style={styles.naira}>₦</Text>
              <TextInput
                accessibilityLabel="Unit price"
                keyboardType="number-pad"
                onChangeText={setPrice}
                placeholder="0.00"
                style={styles.priceInput}
                value={price}
              />
            </View>
          </View>

          <View>
            <Text style={styles.detailLabel}>Harvest Date</Text>
            <View style={styles.dateWrap}>
              <Calendar color={C.slate400} size={16} style={styles.dateIcon} />
              <TextInput
                accessibilityLabel="Harvest date"
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                onChangeText={setHarvestDate}
                placeholder=""
                style={styles.dateInput}
                value={harvestDate}
              />
            </View>
            <Text style={styles.dateHint}>Buyers prefer produce harvested within the last 48 hours.</Text>
          </View>

          <View>
            <Text style={styles.detailLabel}>Description (Optional)</Text>
            <TextInput
              accessibilityLabel="Description"
              multiline
              numberOfLines={3}
              onChangeText={setDescription}
              placeholder="Any extra details about quality, variety, or packaging..."
              placeholderTextColor={C.slate400}
              style={styles.descriptionInput}
              textAlignVertical="top"
              value={description}
            />
          </View>
        </View>

        <View style={styles.aiCard}>
          <Svg style={styles.aiGradient} viewBox="0 0 100 100" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="ai-card-gradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={C.farm50} />
                <Stop offset="100%" stopColor={C.amber50} stopOpacity={0.5} />
              </LinearGradient>
            </Defs>
            <Rect width="100" height="100" rx={0} fill="url(#ai-card-gradient)" />
          </Svg>
          <Sparkles color={C.amber200} size={60} style={styles.aiSparkles} />
          <View style={styles.aiGlow} />
          <View style={styles.aiContent}>
            <View style={styles.aiHeadingRow}>
              <View style={styles.aiIconWrap}><ScanLine color={C.farm700} size={18} /></View>
              <Text style={styles.aiTitle}>AI Shelf-Life Intelligence</Text>
            </View>
            <Text style={styles.aiCopy}>Scan a sample of your produce. We&apos;ll estimate remaining freshness days to build trust with buyers.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan Produce Now"
              onPress={() => router.push('/scan' as never)}
              style={({ pressed }) => [styles.aiButton, pressed && styles.pressedScan]}
            >
              <Camera color={C.slate400} size={16} />
              <Text style={styles.aiButtonText}>Scan Produce Now</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.locationCard}>
          <MapPin color={C.slate400} size={18} style={styles.locationIcon} />
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>Pickup Location</Text>
            <Text style={styles.locationText}>
              {profile?.default_area || 'Ikorodu Farm Hub, Lagos'}.{' '}
              <Text
                accessibilityRole="link"
                onPress={() => router.push('/profile' as never)}
                style={styles.locationLink}
              >Change in profile</Text>.
            </Text>
          </View>
        </View>

        <View style={styles.formActions}>
          <DesignButton
            label={savingDraft ? 'Saving Draft…' : 'Save Draft'}
            loading={savingDraft}
            onPress={() => void saveDraft()}
            variant="secondary"
            style={styles.draftButton}
          />
          <DesignButton
            label={busy ? 'Publish Listing…' : 'Publish Listing'}
            loading={busy}
            onPress={() => void publish()}
            iconAfter={<ArrowRight color={C.white} size={18} />}
            style={styles.publishButton}
          />
        </View>
      </DesignScreen>
    </>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: 'rgba(255,255,255,0.9)', borderBottomColor: C.slate100, borderBottomWidth: 1, paddingHorizontal: 20, paddingBottom: 16, zIndex: 30 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { alignItems: 'center', backgroundColor: C.slate50, borderColor: C.slate100, borderRadius: R.pill, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  headerTitle: heading({ color: C.slate900, fontSize: 18, fontWeight: '700', lineHeight: 22 }),
  headerSpacer: { height: 40, width: 40 },
  progressRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  progressLabel: body({ color: C.farm700, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }),
  progressTrack: { backgroundColor: C.slate100, borderRadius: R.pill, flex: 1, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: C.farm600, borderRadius: R.pill, height: '100%', width: '66.666%' },
  pressed: { transform: [{ scale: 0.95 }] },
  pressedRemove: { transform: [{ scale: 0.9 }] },
  pressedScan: { transform: [{ scale: 0.98 }] },
  content: { gap: 28, paddingBottom: 120, paddingHorizontal: 20, paddingTop: 24 },
  section: { gap: 12 },
  fieldLabel: body({ color: C.slate900, fontSize: 14, fontWeight: '600' }),
  searchWrap: { position: 'relative' },
  searchIcon: { left: 16, position: 'absolute', top: 17 },
  searchInput: body({ backgroundColor: C.white, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, color: C.slate900, fontSize: 14, fontWeight: '500', height: 50, paddingLeft: 40, paddingRight: 16, ...shadow.sm }),
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: { borderRadius: R.lg, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chipSelected: { backgroundColor: C.farm50, borderColor: C.farm200 },
  chipUnselected: { backgroundColor: C.slate100, borderColor: C.slate200 },
  chipText: body({ fontSize: 12 }),
  chipTextSelected: { color: C.farm800, fontWeight: '600' },
  chipTextUnselected: { color: C.slate600, fontWeight: '500' },
  labelRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  helperMuted: body({ color: C.slate400, fontSize: 11, fontWeight: '500' }),
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  addPhoto: { alignItems: 'center', aspectRatio: 1, backgroundColor: C.slate50, borderColor: C.slate300, borderRadius: R['2xl'], borderStyle: 'dashed', borderWidth: 2, flexBasis: '31%', justifyContent: 'center' },
  addPhotoIcon: { marginBottom: 6 },
  addPhotoText: body({ color: C.slate500, fontSize: 10, fontWeight: '600' }),
  photoTile: { aspectRatio: 1, backgroundColor: C.slate100, borderRadius: R['2xl'], flexBasis: '31%', overflow: 'hidden', position: 'relative', ...shadow.sm },
  photoImage: { height: '100%', width: '100%' },
  removePhoto: { alignItems: 'center', backgroundColor: C.black40, borderRadius: R.pill, height: 24, justifyContent: 'center', position: 'absolute', right: 6, top: 6, width: 24 },
  emptyPhotoSlot: { aspectRatio: 1, backgroundColor: C.slate50, borderColor: C.slate100, borderRadius: R['2xl'], borderWidth: 1, flexBasis: '31%', opacity: 0.5 },
  detailsCard: { backgroundColor: C.white, borderColor: C.slate100, borderRadius: R['3xl'], borderWidth: 1, gap: 20, padding: 20, ...shadow.card },
  detailLabel: body({ color: C.slate500, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }),
  quantityRow: { flexDirection: 'row', gap: 12 },
  quantityInput: body({ backgroundColor: C.slate50, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, color: C.slate900, fontSize: 14, fontWeight: '500', height: 48, paddingHorizontal: 16, width: 96 }),
  unitWrap: { flex: 1, position: 'relative' },
  unitSelect: { backgroundColor: C.slate50, borderRadius: R.xl, minHeight: 48, paddingRight: 40 },
  unitText: body({ color: C.slate900, fontSize: 14, fontWeight: '500' }),
  unitChevron: { position: 'absolute', right: 16, top: 15 },
  priceWrap: { position: 'relative' },
  naira: body({ color: C.slate500, fontSize: 16, fontWeight: '500', left: 16, position: 'absolute', top: 16 }),
  priceInput: body({ backgroundColor: C.slate50, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, color: C.slate900, fontSize: 14, fontWeight: '500', height: 48, paddingLeft: 32, paddingRight: 16, width: '100%' }),
  dateWrap: { position: 'relative' },
  dateIcon: { left: 16, position: 'absolute', top: 16 },
  dateInput: body({ backgroundColor: C.slate50, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, color: C.slate900, fontSize: 14, fontWeight: '500', height: 48, paddingLeft: 40, paddingRight: 16, width: '100%' }),
  dateHint: body({ color: C.slate400, fontSize: 10, marginLeft: 4, marginTop: 6 }),
  descriptionInput: body({ backgroundColor: C.slate50, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, color: C.slate900, fontSize: 14, height: 86, paddingHorizontal: 16, paddingVertical: 12, width: '100%' }),
  aiCard: { backgroundColor: C.farm50, borderColor: C.farm100, borderRadius: R['3xl'], borderWidth: 1, overflow: 'hidden', padding: 20, position: 'relative', ...shadow.sm },
  aiGradient: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  aiSparkles: { opacity: 0.4, position: 'absolute', right: -12, top: -12, transform: [{ rotate: '12deg' }] },
  aiGlow: { backgroundColor: C.farm200, borderRadius: R.pill, bottom: -40, height: 128, left: -40, opacity: 0.3, position: 'absolute', width: 128 },
  aiContent: { position: 'relative', zIndex: 10 },
  aiHeadingRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
  aiIconWrap: { alignItems: 'center', backgroundColor: C.white, borderColor: C.slate100, borderRadius: R.lg, borderWidth: 1, height: 32, justifyContent: 'center', padding: 6, ...shadow.sm },
  aiTitle: heading({ color: C.slate900, fontSize: 16, fontWeight: '700' }),
  aiCopy: body({ color: C.slate600, fontSize: 12, lineHeight: 19.5, marginBottom: 16, paddingRight: 24 }),
  aiButton: { alignItems: 'center', backgroundColor: C.white, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, flexDirection: 'row', gap: 8, height: 46, justifyContent: 'center', ...shadow.sm },
  aiButtonText: body({ color: C.slate800, fontSize: 14, fontWeight: '700' }),
  locationCard: { alignItems: 'flex-start', backgroundColor: 'rgba(241,245,249,0.5)', borderColor: C.slate200, borderRadius: R['2xl'], borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 },
  locationIcon: { marginTop: 2 },
  locationCopy: { flex: 1 },
  locationTitle: body({ color: C.slate900, fontSize: 14, fontWeight: '600', marginBottom: 2 }),
  locationText: body({ color: C.slate500, fontSize: 12, lineHeight: 18 }),
  locationLink: body({ color: C.farm600, fontWeight: '500' }),
  formActions: { flexDirection: 'row', gap: 12, paddingBottom: 24, paddingTop: 2 },
  draftButton: { flex: 1, height: 50 },
  publishButton: { flex: 2, height: 50 },
})
