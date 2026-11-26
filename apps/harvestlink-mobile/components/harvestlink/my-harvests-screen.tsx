import { useMemo, useState } from 'react'
import { router } from 'expo-router'
import { Eye, EyeOff, Pencil, Plus, Trash2, X } from 'lucide-react-native'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppHeader } from './app-header'
import {
  AppButton,
  colors,
  EmptyState,
  Eyebrow,
  fonts,
  HarvestListCard,
  MessageBanner,
  OrderCardSkeleton,
  SegmentedControl,
  SelectField,
  StatusBadge,
  TextField,
} from './ui'
import { useHarvestLink } from './context'
import { useDeleteListing, useFarmerListings, useUpdateListing } from '@/lib/harvestlink/use-data'
import { listingImage } from '@/lib/harvestlink/images'
import {
  formatDate,
  formatNaira,
  formatUnitCount,
  formatUnitSingular,
  normalizeUnit,
  UNIT_OPTIONS,
} from '@/lib/harvestlink/utils'
import type { Listing, ListingUnit } from '@/lib/harvestlink/types'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'

type StatusFilter = 'all' | 'active' | 'hidden' | 'sold'

export function MyHarvestsScreen() {
  const insets = useSafeAreaInsets()
  const { user, profile, t } = useHarvestLink()
  const { data: listings, error, isLoading, isValidating, mutate } = useFarmerListings(user?.id ?? null)
  const { updateListing, busy: updateBusy, error: updateError } = useUpdateListing()
  const { deleteListing, busy: deleteBusy } = useDeleteListing()

  const [filter, setFilter] = useState<StatusFilter>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [editing, setEditing] = useState<Listing | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editQty, setEditQty] = useState('')
  const [editUnit, setEditUnit] = useState<ListingUnit>('kg')
  const [editShelfDays, setEditShelfDays] = useState('')

  const filtered = useMemo(() => {
    const items = listings ?? []
    if (filter === 'all') return items
    return items.filter((item) => item.status === filter)
  }, [filter, listings])

  const openEditor = (item: Listing) => {
    triggerSelectionHaptic()
    setEditing(item)
    setEditPrice(String(item.price_per_kg))
    setEditQty(String(item.available_kg))
    setEditUnit(normalizeUnit(item.unit))
    setEditShelfDays(String(item.estimated_shelf_life_days))
  }

  const saveEdit = async () => {
    if (!editing) return
    const result = await updateListing({
      listingId: editing.id,
      pricePerKg: Number(editPrice),
      availableKg: Number(editQty),
      unit: editUnit,
      estimatedShelfLifeDays: Number(editShelfDays),
    })
    if (!result.success) {
      Alert.alert('Update failed', result.error ?? 'Could not save listing updates.')
      return
    }
    setEditing(null)
    Alert.alert('Listing updated', 'Buyers now see your updated price and stock.')
  }

  const toggleVisibility = async (item: Listing) => {
    const nextStatus = item.status === 'active' ? 'hidden' : 'active'
    const result = await updateListing({ listingId: item.id, status: nextStatus })
    if (!result.success) {
      Alert.alert('Status not changed', result.error ?? 'Could not update listing visibility.')
    }
  }

  const markSold = async (item: Listing) => {
    const result = await updateListing({ listingId: item.id, status: 'sold', availableKg: 0 })
    if (!result.success) {
      Alert.alert('Update failed', result.error ?? 'Could not mark this harvest as sold.')
    }
  }

  const confirmDelete = (item: Listing) => {
    Alert.alert(
      `Remove ${item.crop}?`,
      'This removes the listing permanently. Listings with existing orders should be hidden instead.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteListing(item.id).then((res) => {
              if (!res.success && res.error) Alert.alert('Could not delete', res.error)
            })
          },
        },
      ],
    )
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await mutate()
    } finally {
      setRefreshing(false)
    }
  }

  const isFarmerRole = profile?.role === 'farmer' || profile?.role === 'both'

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 104 + Math.max(14, insets.bottom) }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (isValidating && Boolean(listings?.length))}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.pine}
            colors={[colors.pine]}
          />
        }
      >
        <AppHeader />

        <View style={styles.topRow}>
          <View style={styles.heading}>
            <Eyebrow>FARM INVENTORY</Eyebrow>
            <Text style={styles.title}>{t('myHarvestsTitle')}</Text>
            <Text style={styles.subtitle}>{t('myHarvestsSubtitle')}</Text>
          </View>
          {user && isFarmerRole ? (
            <AppButton
              label="New"
              icon={<Plus color={colors.white} size={17} />}
              onPress={() => router.push('/listing/new' as never)}
            />
          ) : null}
        </View>

        {user && isFarmerRole ? (
          <View style={styles.filterWrap}>
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'hidden', label: 'Hidden' },
                { value: 'sold', label: 'Sold' },
              ]}
            />
          </View>
        ) : null}

        {error ? (
          <View style={styles.pad}>
            <MessageBanner>Could not load your harvests. Pull down to try again.</MessageBanner>
          </View>
        ) : null}

        {!user ? (
          <View style={styles.pad}>
            <EmptyState
              title="Sign in to manage your farm inventory."
              message="Publish harvests, adjust prices, and pause stock when a crop sells out."
              action={<AppButton label="Sign in with phone" onPress={() => router.push('/profile' as never)} />}
            />
          </View>
        ) : isLoading && !listings ? (
          <View style={styles.list}>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </View>
        ) : filtered.length ? (
          <View style={styles.list}>
            {filtered.map((item) => {
              const unitLabel = formatUnitSingular(item.unit)
              const tone = item.status === 'active' ? 'green' : item.status === 'sold' ? 'gold' : 'gray'
              return (
                <HarvestListCard
                  key={item.id}
                  badge={<StatusBadge label={item.status === 'active' ? 'Active' : item.status === 'sold' ? 'Sold' : 'Hidden'} tone={tone} />}
                  footer={
                    <View style={styles.actionsRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${item.crop}`}
                        onPress={() => openEditor(item)}
                        style={styles.actionPill}
                      >
                        <Pencil color={colors.pine} size={15} />
                        <Text style={styles.actionText}>Edit</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={item.status === 'active' ? `Hide ${item.crop}` : `Activate ${item.crop}`}
                        onPress={() => void toggleVisibility(item)}
                        disabled={updateBusy}
                        style={styles.actionPill}
                      >
                        {item.status === 'active' ? <EyeOff color={colors.pine} size={15} /> : <Eye color={colors.pine} size={15} />}
                        <Text style={styles.actionText}>{item.status === 'active' ? 'Pause' : 'Show'}</Text>
                      </Pressable>

                      {item.status !== 'sold' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Mark ${item.crop} sold`}
                          onPress={() => void markSold(item)}
                          disabled={updateBusy}
                          style={styles.actionPill}
                        >
                          <Text style={styles.actionText}>Mark sold</Text>
                        </Pressable>
                      ) : null}

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${item.crop}`}
                        onPress={() => confirmDelete(item)}
                        disabled={deleteBusy}
                        style={styles.deleteButton}
                      >
                        <Trash2 color={colors.red} size={17} />
                      </Pressable>
                    </View>
                  }
                  imageAccessibilityLabel={item.crop}
                  imageSource={listingImage(item)}
                  title={item.crop}
                >
                  <Text style={styles.price}>
                    {formatNaira(item.price_per_kg)} / {unitLabel}
                  </Text>
                  <Text style={styles.meta}>
                    {formatUnitCount(item.available_kg, item.unit)} left · {item.area} · {formatDate(item.created_at)}
                  </Text>
                </HarvestListCard>
              )
            })}
          </View>
        ) : (
          <View style={styles.pad}>
            <EmptyState
              title="No harvests here yet."
              message={
                filter === 'all'
                  ? 'Add your first produce listing so nearby buyers can request it directly.'
                  : `You have no ${filter} listings right now.`
              }
              action={
                <AppButton
                  label="Create New Listing"
                  icon={<Plus color={colors.white} size={16} />}
                  onPress={() => router.push('/listing/new' as never)}
                />
              }
            />
          </View>
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={Boolean(editing)} onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Edit {editing?.crop}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close editor" onPress={() => setEditing(null)} style={styles.closeBtn}>
                <X color={colors.ink} size={20} />
              </Pressable>
            </View>
            <SelectField
              label="Selling unit"
              value={editUnit}
              onChange={setEditUnit}
              options={UNIT_OPTIONS.map((option) => ({ value: option, label: option }))}
            />
            <TextField
              label={`Price per ${formatUnitSingular(editUnit)} (₦)`}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="number-pad"
            />
            <TextField
              label={`Quantity available (${formatUnitSingular(editUnit)})`}
              value={editQty}
              onChangeText={setEditQty}
              keyboardType="decimal-pad"
            />
            <TextField
              label="Estimated shelf life (days)"
              value={editShelfDays}
              onChangeText={setEditShelfDays}
              keyboardType="number-pad"
            />
            {updateError ? <MessageBanner>{updateError}</MessageBanner> : null}
            <AppButton
              label={updateBusy ? 'Saving…' : 'Save listing changes'}
              onPress={() => void saveEdit()}
              loading={updateBusy}
              style={styles.saveEditButton}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { alignSelf: 'center', gap: 16, maxWidth: 520, paddingBottom: 32, width: '100%' },
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4 },
  heading: { flex: 1, gap: 6 },
  title: { fontFamily: fonts.heading, color: colors.ink, fontSize: 28, letterSpacing: -0.7 },
  subtitle: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 20 },
  filterWrap: { paddingHorizontal: 18 },
  pad: { paddingHorizontal: 18 },
  list: { gap: 12, paddingHorizontal: 18 },
  price: { fontFamily: fonts.headingExtra, color: colors.pine, fontSize: 15 },
  meta: { fontFamily: fonts.body, color: colors.muted, fontSize: 12 },
  actionsRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  actionPill: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 11, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  actionText: { fontFamily: fonts.bodyBold, color: colors.pine, fontSize: 13 },
  deleteButton: { alignItems: 'center', backgroundColor: colors.paleRed, borderRadius: 11, height: 44, justifyContent: 'center', marginLeft: 'auto', width: 44 },
  modalBackdrop: { backgroundColor: 'rgba(24,38,29,0.5)', flex: 1, justifyContent: 'flex-end' },
  modalSheet: { alignSelf: 'center', backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 14, maxWidth: 520, padding: 20, paddingBottom: 32, width: '100%' },
  modalHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { fontFamily: fonts.heading, color: colors.ink, fontSize: 20 },
  closeBtn: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  saveEditButton: { alignSelf: 'stretch', marginTop: 4 },
})
