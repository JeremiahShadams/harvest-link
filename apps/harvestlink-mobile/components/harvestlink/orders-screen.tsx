import { useMemo, useState } from 'react'
import { router } from 'expo-router'
import { ArrowRight, Check, Clock3, MapPin, PackageCheck, Star } from 'lucide-react-native'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSWRConfig } from 'swr'
import { AppHeader } from './app-header'
import { AppButton, Card, colors, EmptyState, Eyebrow, MessageBanner, StatusBadge } from './ui'
import { useHarvestLink } from './context'
import { useOrders } from '@/lib/harvestlink/use-data'
import { formatDate, formatNaira, formatQuantity, nextOrderStatus } from '@/lib/harvestlink/utils'
import { ORDER_STATUSES, STATUS_LABELS } from '@/lib/harvestlink/types'
import type { HarvestOrder } from '@/lib/harvestlink/types'
import { supabase } from '@/lib/supabase'

export function OrdersScreen() {
  const { user, profile } = useHarvestLink()
  const { data: orders, error, isLoading } = useOrders(user?.id ?? null)
  const [manualView, setManualView] = useState<'buyer' | 'farmer' | null>(null)
  const view = manualView ?? (profile?.role === 'farmer' ? 'farmer' : 'buyer')
  const { mutate } = useSWRConfig()

  const visibleOrders = useMemo(() => (orders ?? []).filter((order) => view === 'buyer' ? order.buyer_id === user?.id : order.farmer_id === user?.id), [orders, user?.id, view])
  const updateStatus = async (order: HarvestOrder) => {
    const next = nextOrderStatus(order.status)
    if (!user || !next) return
    const { error: updateError } = await supabase.rpc('advance_order_status', { p_order_id: order.id, p_next_status: next })
    if (updateError) {
      Alert.alert('Order not updated', 'We couldn’t save that status change. Refresh your orders and try again.')
      return
    }
    await Promise.all([mutate(['harvestlink-orders', user.id]), mutate(['harvestlink-notifications', user.id])])
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader />
        <View style={styles.heading}>
          <Eyebrow>THE JOURNEY FROM FARM TO TABLE</Eyebrow>
          <Text style={styles.title}>Orders, in one place.</Text>
          <Text style={styles.subtitle}>Follow each handoff from a farmer’s confirmation to your door.</Text>
        </View>
        {profile?.role === 'both' ? (
          <View accessibilityRole="tablist" style={styles.segment}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: view === 'buyer' }} onPress={() => setManualView('buyer')} style={[styles.segmentOption, view === 'buyer' && styles.segmentSelected]}><Text style={[styles.segmentText, view === 'buyer' && styles.segmentTextSelected]}>My orders</Text></Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: view === 'farmer' }} onPress={() => setManualView('farmer')} style={[styles.segmentOption, view === 'farmer' && styles.segmentSelected]}><Text style={[styles.segmentText, view === 'farmer' && styles.segmentTextSelected]}>Farm orders</Text></Pressable>
          </View>
        ) : null}
        {error ? <MessageBanner>We couldn’t load your orders. Check your connection and try again.</MessageBanner> : null}
        {!user ? (
          <EmptyState title="Your orders are personal." message="Sign in with your phone to keep every order and delivery update together." action={<AppButton label="Continue with phone" onPress={() => router.push('/profile' as never)} />} />
        ) : isLoading && !orders ? (
          <Card style={styles.loading}><ActivityIndicator color={colors.pine} /><Text style={styles.subtitle}>Loading your orders…</Text></Card>
        ) : visibleOrders.length ? (
          <View style={styles.list}>
            {visibleOrders.map((order) => <OrderCard key={order.id} order={order} mode={view} onAdvance={() => void updateStatus(order)} onRefresh={() => mutate(['harvestlink-orders', user.id])} />)}
          </View>
        ) : (
          <EmptyState title={view === 'buyer' ? 'Your next good meal starts here.' : 'Your farm orders will show here.'} message={view === 'buyer' ? 'When you request a nearby harvest, we’ll keep its progress here.' : 'When a buyer requests your harvest, you can confirm and update its delivery here.'} action={<AppButton label={view === 'buyer' ? 'Browse fresh harvests' : 'Open farmer tools'} variant="secondary" icon={<ArrowRight color={colors.pine} size={15} />} onPress={() => router.push(view === 'buyer' ? '/' as never : '/farmer' as never)} />} />
        )}
        <Card style={styles.helpCard}><Clock3 color={colors.leaf} size={18} /><View style={styles.helpCopy}><Text style={styles.helpTitle}>What each update means</Text><Text style={styles.helpText}>Pending → Accepted → Ready → On the way → Delivered. Your farmer updates the order as it moves.</Text></View></Card>
      </ScrollView>
    </SafeAreaView>
  )
}

function OrderCard({ order, mode, onAdvance, onRefresh }: { order: HarvestOrder; mode: 'buyer' | 'farmer'; onAdvance: () => void; onRefresh: () => void }) {
  const { user } = useHarvestLink()
  const [rating, setRating] = useState(order.rating ?? 0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const index = ORDER_STATUSES.indexOf(order.status)
  const total = Number(order.quantity_kg) * Number(order.unit_price_per_kg)
  const isFarmerOrder = mode === 'farmer' && order.farmer_id === user?.id

  const saveRating = async () => {
    if (!user || rating < 1) return
    setBusy(true)
    const { error } = await supabase.rpc('rate_delivered_order', { p_order_id: order.id, p_rating: rating, p_note: note.trim() })
    setBusy(false)
    if (error) {
      Alert.alert('Rating not saved', 'We couldn’t save your feedback. Please try again.')
      return
    }
    Alert.alert('Thank you for sharing', 'Your feedback helps farmers keep improving their harvests.')
    onRefresh()
  }

  return (
    <Card style={styles.orderCard}>
      <View style={styles.cardTop}>
        <View style={styles.orderIdentity}><Text style={styles.crop}>{order.listing?.crop ?? 'Fresh harvest'}</Text><Text style={styles.farm}>{order.listing?.farm_name ?? (isFarmerOrder ? 'Your farm' : 'Local farm')}</Text></View>
        <StatusBadge label={STATUS_LABELS[order.status]} tone={order.status === 'delivered' ? 'green' : order.status === 'pending' ? 'gold' : 'gray'} />
      </View>
      <View style={styles.orderMeta}>
        <View style={styles.metaItem}><PackageCheck color={colors.leaf} size={14} /><Text style={styles.metaText}>{formatQuantity(order.quantity_kg)} kg · {formatNaira(total)}</Text></View>
        <View style={styles.metaItem}><MapPin color={colors.leaf} size={14} /><Text style={styles.metaText}>{order.delivery_area}</Text></View>
        <Text style={styles.date}>Placed {formatDate(order.created_at)} · {order.delivery_window}</Text>
      </View>
      <View style={styles.progressRow}>
        {ORDER_STATUSES.map((status, stepIndex) => <View key={status} style={styles.progressStep}>
          <View style={[styles.progressDot, stepIndex <= index && styles.progressDone]}>{stepIndex < index ? <Check color={colors.white} size={9} /> : null}</View>
          {stepIndex < ORDER_STATUSES.length - 1 ? <View style={[styles.progressLine, stepIndex < index && styles.progressLineDone]} /> : null}
        </View>)}
      </View>
      <View style={styles.progressLabels}><Text style={styles.progressLabel}>Requested</Text><Text style={styles.progressLabel}>Confirmed</Text><Text style={styles.progressLabel}>On the way</Text><Text style={styles.progressLabel}>Delivered</Text></View>
      {isFarmerOrder && order.status !== 'delivered' ? <AppButton label={order.status === 'pending' ? 'Accept order' : order.status === 'accepted' ? 'Mark ready' : order.status === 'ready' ? 'Start delivery' : 'Mark delivered'} onPress={onAdvance} icon={<ArrowRight color={colors.white} size={15} />} style={styles.actionButton} /> : null}
      {!isFarmerOrder && order.status === 'delivered' && !order.rating ? <RatingForm rating={rating} setRating={setRating} note={note} setNote={setNote} onSave={() => void saveRating()} busy={busy} /> : null}
      {!isFarmerOrder && order.status === 'delivered' && order.rating ? <View style={styles.rated}><Star color={colors.gold} fill={colors.gold} size={15} /><Text style={styles.ratedText}>You rated this harvest {order.rating} out of 5.</Text></View> : null}
    </Card>
  )
}

function RatingForm({ rating, setRating, note, setNote, onSave, busy }: { rating: number; setRating: (value: number) => void; note: string; setNote: (value: string) => void; onSave: () => void; busy: boolean }) {
  return (
    <View style={styles.ratingWrap}>
      <Text style={styles.ratingTitle}>How was this harvest?</Text>
      <View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`} accessibilityState={{ selected: rating === value }} onPress={() => setRating(value)} style={styles.starButton}><Star color={value <= rating ? colors.gold : '#B7BDB4'} fill={value <= rating ? colors.gold : 'transparent'} size={22} /></Pressable>)}</View>
      {rating > 0 ? <AppButton label={busy ? 'Saving…' : 'Share feedback'} onPress={onSave} loading={busy} variant="secondary" style={styles.ratingButton} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { alignSelf: 'center', gap: 16, maxWidth: 520, paddingBottom: 30, width: '100%' },
  heading: { gap: 7, paddingHorizontal: 20, paddingTop: 3 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.9 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  segment: { backgroundColor: '#EBE9E1', borderRadius: 13, flexDirection: 'row', marginHorizontal: 20, padding: 3 },
  segmentOption: { alignItems: 'center', borderRadius: 10, flex: 1, justifyContent: 'center', minHeight: 36 },
  segmentSelected: { backgroundColor: colors.white },
  segmentText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  segmentTextSelected: { color: colors.pine, fontWeight: '700' },
  list: { gap: 11, paddingHorizontal: 18 },
  loading: { alignItems: 'center', gap: 12, marginHorizontal: 18, paddingVertical: 26 },
  orderCard: { gap: 12, padding: 14 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  orderIdentity: { flex: 1, gap: 2 },
  crop: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  farm: { color: colors.muted, fontSize: 11 },
  orderMeta: { gap: 6 },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  metaText: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  date: { color: colors.muted, fontSize: 10 },
  progressRow: { alignItems: 'center', flexDirection: 'row', marginTop: 3, paddingHorizontal: 7 },
  progressStep: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  progressDot: { alignItems: 'center', backgroundColor: '#E1E4DC', borderRadius: 99, height: 16, justifyContent: 'center', width: 16, zIndex: 1 },
  progressDone: { backgroundColor: colors.leaf },
  progressLine: { backgroundColor: '#E1E4DC', flex: 1, height: 2, marginLeft: -1 },
  progressLineDone: { backgroundColor: colors.leaf },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -7 },
  progressLabel: { color: colors.muted, fontSize: 8, textAlign: 'center', width: '25%' },
  actionButton: { alignSelf: 'stretch', minHeight: 42 },
  ratingWrap: { borderTopColor: colors.line, borderTopWidth: 1, gap: 10, paddingTop: 12 },
  ratingTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  stars: { flexDirection: 'row', gap: 6 },
  starButton: { padding: 3 },
  ratingButton: { alignSelf: 'flex-start', minHeight: 38 },
  rated: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  ratedText: { color: colors.muted, fontSize: 11 },
  helpCard: { alignItems: 'flex-start', flexDirection: 'row', gap: 11, marginHorizontal: 18 },
  helpCopy: { flex: 1, gap: 4 },
  helpTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  helpText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
})
