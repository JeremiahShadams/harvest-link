import { useMemo, useState } from 'react'
import { router } from 'expo-router'
import { ArrowRight, Check, Clock3, MapPin, MessageCircle, PackageCheck, Phone, Star } from 'lucide-react-native'
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSWRConfig } from 'swr'
import { AppHeader } from './app-header'
import {
  AppButton,
  Card,
  colors,
  EmptyState,
  Eyebrow,
  fonts,
  MessageBanner,
  OrderCardSkeleton,
  StatusBadge,
} from './ui'
import { useHarvestLink } from './context'
import { useOrders } from '@/lib/harvestlink/use-data'
import { useAdvanceOrder, useRateOrder } from '@/lib/harvestlink/use-mutations'
import {
  buildPhoneLink,
  buildWhatsAppLink,
  formatDate,
  formatNaira,
  formatUnitCount,
  nextOrderStatus,
} from '@/lib/harvestlink/utils'
import { ORDER_STATUSES, ORDER_TIMELINE_STEPS, STATUS_LABELS } from '@/lib/harvestlink/types'
import type { HarvestOrder } from '@/lib/harvestlink/types'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'

export function OrdersScreen({ embedded = false }: { embedded?: boolean }) {
  const insets = useSafeAreaInsets()
  const { user, profile, activeSpace, t } = useHarvestLink()
  const { data: orders, error, isLoading, isValidating, mutate: mutateOrders } = useOrders(user?.id ?? null)
  const { advanceOrder } = useAdvanceOrder()
  const [manualView, setManualView] = useState<'buyer' | 'farmer' | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const view = manualView ?? (profile?.role === 'both' ? activeSpace : profile?.role === 'farmer' ? 'farmer' : 'buyer')
  const { mutate } = useSWRConfig()

  const visibleOrders = useMemo(
    () => (orders ?? []).filter((order) => (view === 'buyer' ? order.buyer_id === user?.id : order.farmer_id === user?.id)),
    [orders, user?.id, view],
  )

  const updateStatus = async (order: HarvestOrder) => {
    const next = nextOrderStatus(order.status)
    if (!user || !next) return
    const result = await advanceOrder(order.id, next)
    if (!result.success) {
      Alert.alert('Order not updated', result.error ?? 'We couldn’t save that status change. Refresh your orders and try again.')
    }
  }

  const handleRefresh = async () => {
    if (!user) return
    setRefreshing(true)
    try {
      await mutateOrders()
    } finally {
      setRefreshing(false)
    }
  }

  const body = (
    <>
      {embedded ? null : <AppHeader />}
      <View style={styles.heading}>
        <Eyebrow>{t('ordersEyebrow')}</Eyebrow>
        <Text style={styles.title}>{t('ordersTitle')}</Text>
        <Text style={styles.subtitle}>{t('ordersSubtitle')}</Text>
      </View>

      {profile?.role === 'both' ? (
        <View accessibilityRole="tablist" style={styles.segment}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: view === 'buyer' }}
            onPress={() => {
              triggerSelectionHaptic()
              setManualView('buyer')
            }}
            style={[styles.segmentOption, view === 'buyer' && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, view === 'buyer' && styles.segmentTextSelected]}>My orders</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: view === 'farmer' }}
            onPress={() => {
              triggerSelectionHaptic()
              setManualView('farmer')
            }}
            style={[styles.segmentOption, view === 'farmer' && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, view === 'farmer' && styles.segmentTextSelected]}>Farm orders</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View style={styles.bannerWrap}>
          <MessageBanner>We couldn’t load your orders. Pull down to refresh and try again.</MessageBanner>
        </View>
      ) : null}

      {!user ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Your orders are personal."
            message="Sign in with your phone to keep every order and delivery update together."
            action={<AppButton label="Continue with phone" onPress={() => router.push('/profile' as never)} />}
          />
        </View>
      ) : isLoading && !orders ? (
        <View style={styles.list}>
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </View>
      ) : visibleOrders.length ? (
        <View style={styles.list}>
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              mode={view}
              onAdvance={() => void updateStatus(order)}
              onRefresh={() => void mutate(['harvestlink-orders', user.id])}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState
            title={view === 'buyer' ? 'Your next good meal starts here.' : 'Your farm orders will show here.'}
            message={
              view === 'buyer'
                ? 'When you request a nearby harvest, we’ll keep its progress here.'
                : 'When a buyer requests your harvest, you can confirm and update its delivery here.'
            }
            action={
              <AppButton
                label={view === 'buyer' ? 'Browse fresh harvests' : 'Open farmer dashboard'}
                variant="secondary"
                icon={<ArrowRight color={colors.pine} size={16} />}
                onPress={() => router.push((view === 'buyer' ? '/' : '/farmer') as never)}
              />
            }
          />
        </View>
      )}

      <Card style={styles.helpCard}>
        <Clock3 color={colors.leaf} size={18} />
        <View style={styles.helpCopy}>
          <Text style={styles.helpTitle}>5-step delivery tracking</Text>
          <Text style={styles.helpText}>
            Requested → Accepted → Ready → On the way → Delivered. Both farmer and buyer stay aligned at each stage.
          </Text>
        </View>
      </Card>
    </>
  )

  if (embedded) return <View style={styles.content}>{body}</View>

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 104 + Math.max(14, insets.bottom) }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (isValidating && Boolean(orders?.length))}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.pine}
            colors={[colors.pine]}
          />
        }
      >
        {body}
      </ScrollView>
    </SafeAreaView>
  )
}

function OrderCard({
  order,
  mode,
  onAdvance,
  onRefresh,
}: {
  order: HarvestOrder
  mode: 'buyer' | 'farmer'
  onAdvance: () => void
  onRefresh: () => void
}) {
  const { user } = useHarvestLink()
  const { rateOrder, busy } = useRateOrder()
  const [rating, setRating] = useState(order.rating ?? 0)
  const [note, setNote] = useState('')
  const index = ORDER_STATUSES.indexOf(order.status)
  const unit = order.unit || order.listing?.unit || 'kg'
  const total = Number(order.quantity_kg) * Number(order.unit_price_per_kg)
  const isFarmerOrder = mode === 'farmer' && order.farmer_id === user?.id

  const counterpartyPhone = isFarmerOrder ? order.contact?.buyer_phone : order.contact?.farmer_phone
  const phoneUrl = buildPhoneLink(counterpartyPhone)
  const waUrl = buildWhatsAppLink(
    counterpartyPhone,
    `Hi, following up on HarvestLink order for ${order.listing?.crop ?? 'produce'} (${formatUnitCount(order.quantity_kg, unit)}).`,
  )

  const saveRating = async () => {
    if (!user || rating < 1) return
    const result = await rateOrder(order.id, rating, note.trim())
    if (!result.success) {
      Alert.alert('Rating not saved', result.error ?? 'We couldn’t save your feedback. Please try again.')
      return
    }
    Alert.alert('Thank you for sharing', 'Your feedback helps farmers keep improving their harvests.')
    onRefresh()
  }

  return (
    <Card style={styles.orderCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View details for ${order.listing?.crop ?? 'order'}`}
        onPress={() => router.push(`/order/${order.id}` as never)}
        style={styles.cardTop}
      >
        <View style={styles.orderIdentity}>
          <Text style={styles.crop} numberOfLines={1}>{order.listing?.crop ?? 'Fresh harvest'}</Text>
          <Text style={styles.farm} numberOfLines={1}>
            {order.listing?.farm_name ?? (isFarmerOrder ? order.contact?.buyer_name || 'Buyer' : 'Local farm')}
          </Text>
        </View>
        <StatusBadge
          label={STATUS_LABELS[order.status]}
          tone={order.status === 'delivered' ? 'green' : order.status === 'pending' ? 'gold' : 'gray'}
        />
      </Pressable>

      <View style={styles.orderMeta}>
        <View style={styles.metaItem}>
          <PackageCheck color={colors.leaf} size={15} />
          <Text style={styles.metaText}>{formatUnitCount(order.quantity_kg, unit)} · {formatNaira(total)}</Text>
        </View>
        <View style={styles.metaItem}>
          <MapPin color={colors.leaf} size={15} />
          <Text style={styles.metaText}>{order.delivery_area}</Text>
        </View>
        <Text style={styles.date}>Placed {formatDate(order.created_at)} · {order.delivery_window}</Text>
      </View>

      {/* Reconciled 5-step progress track matching ORDER_STATUSES 1:1 */}
      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          {ORDER_TIMELINE_STEPS.map((step, stepIndex) => (
            <View key={step.status} style={styles.progressStep}>
              <View style={[styles.progressDot, stepIndex <= index && styles.progressDone]}>
                {stepIndex < index ? <Check color={colors.white} size={10} /> : null}
              </View>
              {stepIndex < ORDER_TIMELINE_STEPS.length - 1 ? (
                <View style={[styles.progressLine, stepIndex < index && styles.progressLineDone]} />
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.progressLabels}>
          {ORDER_TIMELINE_STEPS.map((step, stepIndex) => (
            <Text
              key={step.status}
              style={[styles.progressLabel, stepIndex <= index && styles.progressLabelActive]}
              numberOfLines={1}
            >
              {step.shortLabel}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.cardActionsRow}>
        {isFarmerOrder && order.status !== 'delivered' ? (
          <AppButton
            label={
              order.status === 'pending'
                ? 'Accept order'
                : order.status === 'accepted'
                  ? 'Mark ready'
                  : order.status === 'ready'
                    ? 'Start delivery'
                    : 'Mark delivered'
            }
            onPress={onAdvance}
            icon={<ArrowRight color={colors.white} size={16} />}
            style={styles.actionFlex}
          />
        ) : (
          <AppButton
            label="Order details"
            variant="quiet"
            onPress={() => router.push(`/order/${order.id}` as never)}
            style={styles.actionFlex}
          />
        )}

        {phoneUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Call counterparty"
            onPress={() => void Linking.openURL(phoneUrl)}
            style={styles.contactButton}
          >
            <Phone color={colors.pine} size={18} />
          </Pressable>
        ) : null}
        {waUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="WhatsApp counterparty"
            onPress={() => void Linking.openURL(waUrl)}
            style={styles.contactButton}
          >
            <MessageCircle color={colors.pine} size={18} />
          </Pressable>
        ) : null}
      </View>

      {!isFarmerOrder && order.status === 'delivered' && !order.rating ? (
        <RatingForm rating={rating} setRating={setRating} note={note} setNote={setNote} onSave={() => void saveRating()} busy={busy} />
      ) : null}

      {!isFarmerOrder && order.status === 'delivered' && order.rating ? (
        <View style={styles.rated}>
          <Star color={colors.gold} fill={colors.gold} size={16} />
          <Text style={styles.ratedText}>
            You rated this harvest {order.rating} out of 5{order.rating_note ? ` — "${order.rating_note}"` : '.'}
          </Text>
        </View>
      ) : null}
    </Card>
  )
}

function RatingForm({
  rating,
  setRating,
  note,
  setNote,
  onSave,
  busy,
}: {
  rating: number
  setRating: (value: number) => void
  note: string
  setNote: (value: string) => void
  onSave: () => void
  busy: boolean
}) {
  return (
    <View style={styles.ratingWrap}>
      <Text style={styles.ratingTitle}>How was this harvest?</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
            accessibilityState={{ selected: rating === value }}
            onPress={() => {
              triggerSelectionHaptic()
              setRating(value)
            }}
            style={styles.starButton}
          >
            <Star
              color={value <= rating ? colors.gold : '#9BA299'}
              fill={value <= rating ? colors.gold : 'transparent'}
              size={24}
            />
          </Pressable>
        ))}
      </View>
      {rating > 0 ? (
        <>
          <TextInput
            accessibilityLabel="Delivery and freshness feedback note"
            maxLength={240}
            multiline
            numberOfLines={2}
            onChangeText={setNote}
            placeholder="Share a quick note on freshness or delivery (optional)"
            placeholderTextColor="#7A847D"
            style={styles.ratingNoteInput}
            value={note}
          />
          <AppButton
            label={busy ? 'Saving…' : 'Share feedback'}
            onPress={onSave}
            loading={busy}
            variant="secondary"
            style={styles.ratingButton}
          />
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { alignSelf: 'center', gap: 16, maxWidth: 520, paddingBottom: 32, width: '100%' },
  heading: { gap: 7, paddingHorizontal: 20, paddingTop: 4 },
  title: { fontFamily: fonts.heading, color: colors.ink, fontSize: 28, letterSpacing: -0.7 },
  subtitle: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 20 },
  segment: { backgroundColor: '#EAE6DA', borderRadius: 14, flexDirection: 'row', marginHorizontal: 18, padding: 4 },
  segmentOption: { alignItems: 'center', borderRadius: 10, flex: 1, justifyContent: 'center', minHeight: 44 },
  segmentSelected: { backgroundColor: colors.white },
  segmentText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13 },
  segmentTextSelected: { fontFamily: fonts.bodyBold, color: colors.pine },
  bannerWrap: { paddingHorizontal: 18 },
  emptyWrap: { paddingHorizontal: 18 },
  list: { gap: 12, paddingHorizontal: 18 },
  orderCard: { gap: 12, padding: 15 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between', minHeight: 44 },
  orderIdentity: { flex: 1, gap: 2, minWidth: 0 },
  crop: { fontFamily: fonts.heading, color: colors.ink, fontSize: 17 },
  farm: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
  orderMeta: { gap: 6 },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  metaText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 },
  date: { fontFamily: fonts.body, color: colors.muted, fontSize: 12 },
  progressWrap: { gap: 6, marginTop: 2 },
  progressRow: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 12 },
  progressStep: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  progressDot: { alignItems: 'center', backgroundColor: '#DFDCD0', borderRadius: 99, height: 18, justifyContent: 'center', width: 18, zIndex: 1 },
  progressDone: { backgroundColor: colors.leaf },
  progressLine: { backgroundColor: '#DFDCD0', flex: 1, height: 2, marginLeft: -1 },
  progressLineDone: { backgroundColor: colors.leaf },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, textAlign: 'center', width: '20%' },
  progressLabelActive: { fontFamily: fonts.bodyBold, color: colors.pine },
  cardActionsRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  actionFlex: { alignSelf: 'stretch', flex: 1 },
  contactButton: { alignItems: 'center', backgroundColor: colors.paleGreen, borderColor: '#D6E1D1', borderRadius: 14, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  ratingWrap: { borderTopColor: colors.line, borderTopWidth: 1, gap: 10, paddingTop: 12 },
  ratingTitle: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 },
  stars: { flexDirection: 'row', gap: 4 },
  starButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  ratingNoteInput: { fontFamily: fonts.body, backgroundColor: colors.creamSubtle, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 14, minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' },
  ratingButton: { alignSelf: 'flex-start' },
  rated: { alignItems: 'center', flexDirection: 'row', gap: 7, paddingTop: 4 },
  ratedText: { fontFamily: fonts.bodyMedium, color: colors.muted, flex: 1, fontSize: 13 },
  helpCard: { alignItems: 'flex-start', flexDirection: 'row', gap: 11, marginHorizontal: 18 },
  helpCopy: { flex: 1, gap: 4 },
  helpTitle: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 },
  helpText: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 18 },
})
