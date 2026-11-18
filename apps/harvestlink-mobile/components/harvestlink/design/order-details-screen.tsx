import { useMemo } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock4,
  Map,
  MapPin,
  MessageCircle,
  ScanLine,
} from 'lucide-react-native'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHarvestLink } from '../context'
import { DesignButton, DesignHeader, DesignScreen } from './ui'
import { body, C, heading, R, shadow } from './tokens'
import { useOrders } from '@/lib/harvestlink/use-data'
import { useAdvanceOrder } from '@/lib/harvestlink/use-mutations'
import { formatNaira, formatQuantity, getListingImageUrl, nextOrderStatus } from '@/lib/harvestlink/utils'
import { STATUS_LABELS, type HarvestOrder } from '@/lib/harvestlink/types'

type DisplayItem = {
  id: string
  name: string
  amount: string
  meta: string
  image: string | null
}

const TIMELINE = [
  { title: 'Order Pending', subtitle: 'Waiting for your acceptance.' },
  { title: 'Order Accepted' },
  { title: 'Ready for Pickup' },
  { title: 'Delivered' },
] as const

export function OrderDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id
  const { user, profile } = useHarvestLink()
  const { data: orders, error, isLoading } = useOrders(user?.id ?? null)
  const { advanceOrder, busy } = useAdvanceOrder()
  const insets = useSafeAreaInsets()

  const order = useMemo(
    () => (orders ?? []).find((candidate) => candidate.id === routeId) ?? null,
    [orders, routeId],
  )

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.navigate('/orders' as never)
  }

  const userName = profile?.display_name?.trim().split(/\s+/)[0] || 'there'
  const location = profile?.default_area ?? ''
  const header = <DesignHeader userName={userName} location={location} />

  if (isLoading && !order) {
    return (
      <DesignScreen activeTab="orders" header={header} contentStyle={styles.content}>
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Loading this order…</Text>
        </View>
      </DesignScreen>
    )
  }

  if (error && !order) {
    return (
      <DesignScreen activeTab="orders" header={header} contentStyle={styles.content}>
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>We couldn’t load this order.</Text>
          <Text style={styles.messageBody}>Check your connection and try again from your orders list.</Text>
          <DesignButton label="Back to Orders" onPress={goBack} variant="secondary" style={styles.messageCta} />
        </View>
      </DesignScreen>
    )
  }

  if (!order) {
    return (
      <DesignScreen activeTab="orders" header={header} contentStyle={styles.content}>
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>This order isn’t available.</Text>
          <Text style={styles.messageBody}>It may have been removed, or it isn’t part of your account. Return to your orders and choose another one.</Text>
          <DesignButton label="Back to Orders" onPress={goBack} style={styles.messageButton} />
        </View>
      </DesignScreen>
    )
  }

  const displayId = shortId(order.id)
  const status = order.status
  const statusIndex = statusIndexFor(status)
  const nextStatus = nextOrderStatus(status)

  const items: DisplayItem[] = [{
    id: order.id,
    name: order.listing?.crop ?? 'Produce details unavailable',
    amount: formatNaira(Number(order.quantity_kg) * Number(order.unit_price_per_kg)),
    meta: `${formatQuantity(order.quantity_kg)} kg • ${formatNaira(order.unit_price_per_kg)}/kg`,
    image: getListingImageUrl({ image_url: order.listing?.image_url ?? '' }),
  }]

  const subtotal = Number(order.quantity_kg) * Number(order.unit_price_per_kg)
  const placedAt = `Placed ${formatDateTime(order.created_at)}`
  const deliveryArea = order.delivery_area || 'Not provided'
  const deliveryWindow = order.delivery_window || 'Not provided'

  const acceptOrder = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in before updating an order.')
      return
    }
    if (!nextStatus) {
      Alert.alert('Order already complete', 'This order has reached its final status.')
      return
    }
    const result = await advanceOrder(order.id, nextStatus)
    if (!result.success) {
      Alert.alert('Order not updated', result.error ?? 'We couldn’t save that status change. Refresh and try again.')
      return
    }
    Alert.alert('Order updated', `Status is now ${STATUS_LABELS[nextStatus].toLowerCase()}.`)
  }

  const declineOrder = () => {
    Alert.alert(
      'Decline not supported',
      'The current HarvestLink backend has no declined-order status, so this order was left unchanged.',
    )
  }

  const actionLabel = !nextStatus
    ? 'Order complete'
    : busy
      ? 'Updating…'
      : status === 'pending'
        ? 'Accept Order'
        : `Mark ${STATUS_LABELS[nextStatus]}`

  return (
    <DesignScreen
      activeTab="orders"
      header={header}
      contentStyle={styles.content}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Orders" onPress={goBack} style={styles.backRow}>
        <ArrowLeft color={C.slate500} size={14} />
        <Text style={styles.backText}>Back to Orders</Text>
      </Pressable>

      <View style={styles.orderHeading}>
        <View>
          <Text style={styles.orderTitle}>Order #{displayId}</Text>
          <Text style={styles.orderDate}>{placedAt}</Text>
        </View>
        <View style={[styles.statusBadge, status === 'delivered' ? styles.statusDelivered : styles.statusPending]}>
          {status === 'pending' ? <Clock4 color={C.amber600} size={11} /> : <CheckCircle2 color={C.farm700} size={12} />}
          <Text style={[styles.statusText, status === 'delivered' ? styles.statusTextDelivered : styles.statusTextPending]}>
            {STATUS_LABELS[status].toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.buyerCard}>
        <View style={styles.buyerRow}>
          <View style={styles.buyerIdentity}>
            <View style={styles.buyerInitial}>
              <Text style={styles.buyerInitialText}>{shortId(order.buyer_id).slice(0, 1)}</Text>
            </View>
            <View>
              <Text style={styles.buyerName}>Buyer {shortId(order.buyer_id)}</Text>
              <View style={styles.buyerLocationRow}>
                <MapPin color={C.slate500} size={11} />
                <Text style={styles.buyerLocation}>{deliveryArea}</Text>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Message buyer"
            onPress={() => router.push('/chats' as never)}
            style={({ pressed }) => [styles.messageButton, pressed && styles.pressed]}
          >
            <MessageCircle color={C.farm700} size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.timelineCard}>
        <Text style={styles.cardTitle}>Order Status</Text>
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          {TIMELINE.map((step, index) => {
            const active = index === statusIndex
            const past = index < statusIndex
            return (
              <View
                key={step.title}
                style={[styles.timelineStep, index < TIMELINE.length - 1 && styles.timelineStepGap, index > statusIndex && styles.timelineStepFuture]}
              >
                <View style={styles.timelineDotSlot}>
                  {active ? <View style={styles.timelineDotRing} /> : null}
                  <View style={[
                    styles.timelineDot,
                    active ? styles.timelineDotActive : past ? styles.timelineDotPast : styles.timelineDotFuture,
                    !active && styles.timelineDotSmall,
                  ]} />
                </View>
                <View>
                  <Text style={[styles.timelineTitle, index > statusIndex && styles.timelineTitleFuture]}>{step.title}</Text>
                  {'subtitle' in step && step.subtitle ? <Text style={styles.timelineSubtitle}>{step.subtitle}</Text> : null}
                </View>
              </View>
            )
          })}
        </View>
      </View>

      <View style={styles.itemsCard}>
        <View style={styles.itemsHeader}><Text style={styles.itemsTitle}>Order Items</Text></View>
        <View style={styles.itemsBody}>
          {items.map((item, index) => (
            <View key={item.id} style={[styles.itemRow, index < items.length - 1 && styles.itemRowBorder]}>
              <View style={styles.itemImageWrap}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.itemImage} contentFit="cover" />
                ) : (
                  <View style={styles.itemImagePlaceholder}><ScanLine color={C.slate400} size={22} /></View>
                )}
              </View>
              <View style={styles.itemCopy}>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemAmount}>{item.amount}</Text>
                </View>
                <Text style={styles.itemMeta}>{item.meta}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.totals}>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{formatNaira(subtotal)}</Text></View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}><Text style={styles.totalEarningsLabel}>Order total</Text><Text style={styles.totalEarnings}>{formatNaira(subtotal)}</Text></View>
        </View>
      </View>

      <View style={styles.deliveryCard}>
        <Text style={styles.deliveryTitle}>Delivery Details</Text>
        <View style={styles.deliveryList}>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryIconWrap}><Map color={C.slate500} size={16} /></View>
            <View>
              <Text style={styles.deliveryLabel}>Delivery Area</Text>
              <Text style={styles.deliveryValue}>{deliveryArea}</Text>
            </View>
          </View>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryIconWrap}><CalendarClock color={C.slate500} size={16} /></View>
            <View>
              <Text style={styles.deliveryLabel}>Preferred Window</Text>
              <Text style={styles.deliveryValue}>{deliveryWindow}</Text>
              {order.notes ? <Text style={styles.deliverySubValue}>{order.notes}</Text> : null}
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.actionBar, { bottom: Math.max(34, insets.bottom) + 56 }]}>
        <DesignButton label="Decline" onPress={declineOrder} variant="secondary" style={styles.declineButton} />
        <DesignButton
          label={actionLabel}
          loading={busy}
          disabled={!nextStatus}
          onPress={() => void acceptOrder()}
          icon={nextStatus ? <CheckCircle2 color={C.white} size={18} /> : undefined}
          style={styles.acceptButton}
        />
      </View>
    </DesignScreen>
  )
}

function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 4).toUpperCase() : value
}

function statusIndexFor(status: HarvestOrder['status']) {
  if (status === 'pending') return 0
  if (status === 'accepted') return 1
  if (status === 'ready' || status === 'out_for_delivery') return 2
  return 3
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(date)
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingBottom: 180, paddingHorizontal: 20, paddingTop: 16 },
  pressed: { transform: [{ scale: 0.98 }] },
  messageCard: { alignItems: 'flex-start', backgroundColor: C.white, borderColor: C.slate200, borderRadius: R['2xl'], borderWidth: 1, gap: 10, padding: 20, ...shadow.sm },
  messageTitle: heading({ color: C.slate900, fontSize: 18, fontWeight: '700' }),
  messageBody: body({ color: C.slate500, fontSize: 13, lineHeight: 20 }),
  messageCta: { alignSelf: 'stretch', marginTop: 4 },
  backRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  backText: body({ color: C.slate500, fontSize: 14, fontWeight: '500' }),
  orderHeading: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  orderTitle: heading({ color: C.slate900, fontSize: 24, fontWeight: '700' }),
  orderDate: body({ color: C.slate500, fontSize: 12, marginTop: 2 }),
  statusBadge: { alignItems: 'center', borderRadius: R.md, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  statusPending: { backgroundColor: C.amber50 },
  statusDelivered: { backgroundColor: C.farm50 },
  statusText: body({ fontSize: 11, fontWeight: '700', letterSpacing: 0.55 }),
  statusTextPending: { color: C.amber600 },
  statusTextDelivered: { color: C.farm700 },
  buyerCard: { backgroundColor: C.white, borderColor: C.slate200, borderRadius: R['2xl'], borderWidth: 1, padding: 16, ...shadow.sm },
  buyerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  buyerIdentity: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  buyerInitial: { alignItems: 'center', backgroundColor: C.farm50, borderRadius: R.pill, height: 40, justifyContent: 'center', width: 40 },
  buyerInitialText: heading({ color: C.farm700, fontSize: 16, fontWeight: '700' }),
  buyerName: body({ color: C.slate900, fontSize: 14, fontWeight: '700' }),
  buyerLocationRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 2 },
  buyerLocation: body({ color: C.slate500, fontSize: 11 }),
  messageButton: { alignItems: 'center', backgroundColor: C.farm50, borderRadius: R.pill, height: 36, justifyContent: 'center', width: 36 },
  timelineCard: { backgroundColor: C.white, borderColor: C.slate200, borderRadius: R['2xl'], borderWidth: 1, padding: 20, ...shadow.sm },
  cardTitle: heading({ color: C.slate900, fontSize: 16, fontWeight: '700', marginBottom: 16 }),
  itemsTitle: heading({ color: C.slate900, fontSize: 16, fontWeight: '700' }),
  timeline: { marginLeft: 8, position: 'relative' },
  timelineLine: { backgroundColor: C.slate100, bottom: 8, left: 7, position: 'absolute', top: 8, width: 2 },
  timelineStep: { flexDirection: 'row', gap: 16, position: 'relative', zIndex: 1 },
  timelineStepGap: { marginBottom: 20 },
  timelineStepFuture: { opacity: 0.5 },
  timelineDotSlot: { height: 16, marginTop: 2, position: 'relative', width: 16 },
  timelineDotRing: { borderColor: C.amber100, borderRadius: R.pill, borderWidth: 2, height: 20, left: -2, position: 'absolute', top: -2, width: 20 },
  timelineDot: { borderRadius: R.pill, height: 16, width: 16 },
  timelineDotActive: { backgroundColor: C.amber500, borderColor: C.white, borderWidth: 3 },
  timelineDotPast: { backgroundColor: C.farm600, borderColor: C.white, borderWidth: 3 },
  timelineDotFuture: { backgroundColor: C.slate200, borderColor: C.white, borderWidth: 2 },
  timelineDotSmall: { height: 16, width: 16 },
  timelineTitle: body({ color: C.slate900, fontSize: 14, fontWeight: '700' }),
  timelineTitleFuture: { color: C.slate700, fontWeight: '600' },
  timelineSubtitle: body({ color: C.slate500, fontSize: 11 }),
  itemsCard: { backgroundColor: C.white, borderColor: C.slate200, borderRadius: R['2xl'], borderWidth: 1, overflow: 'hidden', padding: 4, ...shadow.sm },
  itemsHeader: { borderBottomColor: C.slate100, borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 16 },
  itemsBody: { padding: 8 },
  itemRow: { flexDirection: 'row', gap: 12, padding: 8 },
  itemRowBorder: { borderBottomColor: C.slate50, borderBottomWidth: 1 },
  itemImageWrap: { backgroundColor: C.slate100, borderRadius: R.xl, height: 64, overflow: 'hidden', width: 64 },
  itemImage: { height: '100%', width: '100%' },
  itemImagePlaceholder: { alignItems: 'center', height: '100%', justifyContent: 'center', width: '100%' },
  itemCopy: { flex: 1, paddingVertical: 2 },
  itemTitleRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', paddingRight: 8 },
  itemTitle: body({ color: C.slate900, flex: 1, fontSize: 14, fontWeight: '700' }),
  itemAmount: body({ color: C.slate900, fontSize: 14, fontWeight: '700' }),
  itemMeta: body({ color: C.slate500, fontSize: 12, marginTop: 2 }),
  totals: { backgroundColor: C.slate50, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl, borderTopColor: C.slate100, borderTopWidth: 1, gap: 8, padding: 16 },
  totalRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: body({ color: C.slate500, fontSize: 14 }),
  totalValue: body({ color: C.slate900, fontSize: 14, fontWeight: '500' }),
  totalDivider: { backgroundColor: C.slate200, height: 1 },
  totalEarningsLabel: body({ color: C.slate900, fontSize: 14, fontWeight: '700' }),
  totalEarnings: heading({ color: C.farm800, fontSize: 20, fontWeight: '700' }),
  deliveryCard: { backgroundColor: C.white, borderColor: C.slate200, borderRadius: R['2xl'], borderWidth: 1, padding: 16, ...shadow.sm },
  deliveryTitle: heading({ color: C.slate900, fontSize: 16, fontWeight: '700', marginBottom: 12 }),
  deliveryList: { gap: 16 },
  deliveryRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  deliveryIconWrap: { alignItems: 'center', backgroundColor: C.slate50, borderRadius: R.pill, height: 32, justifyContent: 'center', width: 32 },
  deliveryLabel: body({ color: C.slate500, fontSize: 11, fontWeight: '500', letterSpacing: 0.55, marginBottom: 2, textTransform: 'uppercase' }),
  deliveryValue: body({ color: C.slate900, fontSize: 14, fontWeight: '500' }),
  deliverySubValue: body({ color: C.slate500, fontSize: 12, marginTop: 2 }),
  actionBar: { backgroundColor: C.white, borderTopColor: C.slate100, borderTopWidth: 1, flexDirection: 'row', gap: 12, left: 0, paddingHorizontal: 20, paddingVertical: 16, position: 'absolute', right: 0, zIndex: 30, ...shadow.actionBar },
  declineButton: { elevation: 0, flex: 1, height: 48, shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0 },
  acceptButton: { flex: 2, height: 48 },
})
