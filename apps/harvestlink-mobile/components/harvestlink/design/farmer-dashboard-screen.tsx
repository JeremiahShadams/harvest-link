import { useEffect, useMemo } from 'react'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import {
  Camera,
  CheckCircle2,
  Clock4,
  FileText,
  Info,
  Leaf,
  PlusCircle,
  Star,
  TrendingUp,
} from 'lucide-react-native'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useHarvestLink } from '../context'
import { DesignHeader, DesignScreen } from './ui'
import { body, C, heading, R, shadow } from './tokens'
import { useFarmerListings, useOrders, useScans } from '@/lib/harvestlink/use-data'
import { computeFarmerSignals } from '@/lib/harvestlink/signals'
import { useActivityReport } from '@/lib/harvestlink/use-report'
import { formatQuantity } from '@/lib/harvestlink/utils'

const DESIGN_TOMATOES = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=150&auto=format&fit=crop'

type FeedOrder = {
  id: string
  title: string
  status: 'pending' | 'delivered'
  meta: string
  image: string
  rating?: number
}

export function FarmerDashboardScreen({ showBottomNav = true }: { showBottomNav?: boolean }) {
  const { user, profile } = useHarvestLink()
  const { data: listings } = useFarmerListings(user?.id ?? null)
  const { data: orders } = useOrders(user?.id ?? null)
  const { data: scans } = useScans(user?.id ?? null)
  const report = useActivityReport()

  const signals = useMemo(() => {
    if (!user) return null
    return computeFarmerSignals({
      userId: user.id,
      listings: listings ?? [],
      orders: orders ?? [],
      scans: scans ?? [],
      days: 30,
    })
  }, [listings, orders, scans, user])

  useEffect(() => {
    if (report.message) Alert.alert('Activity report', report.message)
  }, [report.message])

  const activeListings = listings?.filter((listing) => listing.status === 'active').length ?? 0
  const pending = signals?.pendingOrders ?? 0
  const monthly = signals?.completedThisMonth ?? 0
  const score = signals?.activityScore ?? 0
  const deliveryRate = signals?.deliveryRate ?? 0
  const sales = signals?.salesValue ?? 0

  const farmerOrders = useMemo(
    () => (orders ?? []).filter((order) => order.farmer_id === user?.id),
    [orders, user?.id],
  )
  const feedOrders: FeedOrder[] = farmerOrders.slice(0, 2).map((order) => ({
    id: order.id,
    title: `${formatQuantity(order.quantity_kg)} Baskets ${order.listing?.crop ?? 'Produce'}`,
    status: order.status === 'delivered' ? 'delivered' : 'pending',
    meta: `Order #${shortOrderId(order.id)} • ${relativeTime(order.created_at)}`,
    image: order.listing?.image_url?.startsWith('http') ? order.listing.image_url : DESIGN_TOMATOES,
    rating: order.rating ?? undefined,
  }))

  const userName = profile?.display_name?.trim().split(/\s+/)[0] || 'there'
  const location = profile?.default_area || 'Add your area in your profile'

  return (
    <DesignScreen
      activeTab="home"
      showBottomNav={showBottomNav}
      header={<DesignHeader userName={userName} location={location} />}
      contentStyle={[styles.content, !showBottomNav && styles.contentWithoutNav]}
    >
      <View style={styles.overviewGrid}>
        <View style={styles.primaryMetric}>
          <View style={styles.primaryGlow} />
          <View style={styles.primaryMetricTop}>
            <View>
              <Text style={styles.primaryLabel}>Active Listings</Text>
              <Text style={styles.primaryValue}>{activeListings}</Text>
            </View>
            <View style={styles.primaryIconWrap}><Leaf color={C.white} size={20} /></View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create New Listing"
            onPress={() => router.push('/listing/new' as never)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <PlusCircle color={C.farm900} size={18} />
            <Text style={styles.primaryButtonText}>Create New Listing</Text>
          </Pressable>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricCardTop}>
            <Clock4 color={C.amber500} size={20} />
            <View style={styles.amberBadge}><Text style={styles.amberBadgeText}>Pending</Text></View>
          </View>
          <Text style={styles.metricValue}>{pending}</Text>
          <Text style={styles.metricCaption}>Awaiting acceptance</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricCardTop}>
            <CheckCircle2 color={C.farm600} size={20} />
            <View style={styles.slateBadge}><Text style={styles.slateBadgeText}>Monthly</Text></View>
          </View>
          <Text style={styles.metricValue}>{monthly}</Text>
          <Text style={styles.metricCaption}>Completed orders</Text>
        </View>
      </View>

      <View style={styles.signalCard}>
        <View style={styles.signalHead}>
          <View>
            <View style={styles.signalTitleRow}>
              <Text style={styles.sectionTitle}>Activity Signals</Text>
              <Info color={C.slate400} size={14} />
            </View>
            <Text style={styles.sectionSubtitle}>Your marketplace reputation (30 days)</Text>
          </View>
          {signals?.hasHistory ? (
            <View style={styles.topBadge}>
              <TrendingUp color={C.farm700} size={12} />
              <Text style={styles.topBadgeText}>Live activity</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.signalBody}>
          <View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Consistency Score</Text>
              <Text style={styles.scoreValue}>{score}<Text style={styles.scoreOutOf}>/100</Text></Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, score))}%` }]} />
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Delivery Rate</Text>
              <Text style={styles.statValue}>{deliveryRate}%</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Sales Volume</Text>
              <Text style={styles.statValue}>{formatCompactNaira(sales)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="View all orders" onPress={() => router.push('/orders' as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        <View style={styles.orderList}>
          {feedOrders.length ? feedOrders.map((order) => {
            const rating = order.rating ?? 0
            return (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                accessibilityLabel={order.title}
                onPress={() => router.push(`/order/${order.id}` as never)}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <View style={styles.orderCard}>
                  <View style={styles.orderImageWrap}>
                    <Image source={{ uri: order.image }} style={styles.orderImage} contentFit="cover" />
                  </View>
                  <View style={styles.orderCopy}>
                    <View style={styles.orderTitleRow}>
                      <Text style={styles.orderTitle} numberOfLines={1}>{order.title}</Text>
                      <View style={[styles.statusBadge, order.status === 'pending' ? styles.statusPending : styles.statusDelivered]}>
                        <Text style={[styles.statusText, order.status === 'pending' ? styles.statusTextPending : styles.statusTextDelivered]}>
                          {order.status === 'pending' ? 'Pending' : 'Delivered'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderMetaRow}>
                      <Text style={styles.orderMeta} numberOfLines={1}>{order.meta}</Text>
                      {rating > 0 ? (
                        <View style={styles.stars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              color={star <= rating ? C.amber400 : C.slate300}
                              fill={star <= rating ? C.amber400 : 'transparent'}
                              size={10}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Pressable>
            )
          }) : (
            <Text style={styles.sectionSubtitle}>No orders yet. New orders will appear here.</Text>
          )}
        </View>
      </View>

      <View style={styles.pageActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan & List Produce"
          onPress={() => router.push('/listing/new' as never)}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
        >
          <Camera color={C.white} size={18} />
          <Text style={styles.primaryActionText}>Scan &amp; List Produce</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate Activity Report"
          disabled={report.busy}
          onPress={() => void report.create()}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
        >
          <FileText color={C.slate400} size={18} />
          <Text style={styles.secondaryActionText}>{report.busy ? 'Generating Activity Report…' : 'Generate Activity Report'}</Text>
        </Pressable>
      </View>
    </DesignScreen>
  )
}

function shortOrderId(id: string) {
  return id.length > 6 ? id.slice(0, 4).toUpperCase() : id
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} mins ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  if (hours < 48) return 'Yesterday'
  return `${Math.floor(hours / 24)} days ago`
}

function formatCompactNaira(value: number) {
  const naira = Number(value) || 0
  if (naira >= 1000) return `₦${Math.round(naira / 1000)}k`
  return `₦${naira}`
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingBottom: 112, paddingHorizontal: 20, paddingTop: 16 },
  contentWithoutNav: { paddingBottom: 24 },
  pressed: { transform: [{ scale: 0.98 }] },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  primaryMetric: { backgroundColor: C.farm800, borderRadius: R['2xl'], overflow: 'hidden', padding: 20, position: 'relative', width: '100%', ...shadow.sm },
  primaryGlow: { backgroundColor: C.white10, borderRadius: R.pill, height: 128, opacity: 0.5, position: 'absolute', right: -24, top: -24, width: 128 },
  primaryMetricTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', position: 'relative', zIndex: 10 },
  primaryLabel: body({ color: C.farm100, fontSize: 14, fontWeight: '500', marginBottom: 4 }),
  primaryValue: heading({ color: C.white, fontSize: 36, fontWeight: '700', marginBottom: 16 }),
  primaryIconWrap: { alignItems: 'center', backgroundColor: C.white20, borderRadius: R.pill, height: 40, justifyContent: 'center', width: 40 },
  primaryButton: { alignItems: 'center', backgroundColor: C.white, borderRadius: R.xl, flexDirection: 'row', gap: 8, height: 40, justifyContent: 'center', width: '100%' },
  primaryButtonText: body({ color: C.farm900, fontSize: 14, fontWeight: '600' }),
  metricCard: { backgroundColor: C.white, borderColor: C.slate100, borderRadius: R['2xl'], borderWidth: 1, flexBasis: '47%', flexGrow: 1, padding: 16, ...shadow.sm },
  metricCardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amberBadge: { backgroundColor: C.amber50, borderRadius: R.md, paddingHorizontal: 8, paddingVertical: 2 },
  amberBadgeText: body({ color: C.amber600, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }),
  slateBadge: { backgroundColor: C.slate50, borderRadius: R.md, paddingHorizontal: 8, paddingVertical: 2 },
  slateBadgeText: body({ color: C.slate600, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }),
  metricValue: heading({ color: C.slate900, fontSize: 24, fontWeight: '700' }),
  metricCaption: body({ color: C.slate500, fontSize: 12, marginTop: 4 }),
  signalCard: { backgroundColor: C.white, borderColor: C.slate200, borderRadius: R['3xl'], borderWidth: 1, padding: 20, ...shadow.card },
  signalHead: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  signalTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 4 },
  sectionTitle: heading({ color: C.slate900, fontSize: 18, fontWeight: '700' }),
  sectionSubtitle: body({ color: C.slate500, fontSize: 12 }),
  topBadge: { alignItems: 'center', backgroundColor: C.farm50, borderRadius: R.pill, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  topBadgeText: body({ color: C.farm700, fontSize: 12, fontWeight: '600' }),
  signalBody: { gap: 16 },
  scoreRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreLabel: body({ color: C.slate700, fontSize: 14, fontWeight: '500' }),
  scoreValue: heading({ color: C.slate900, fontSize: 16, fontWeight: '700' }),
  scoreOutOf: body({ color: C.slate500, fontSize: 12, fontWeight: '400' }),
  progressTrack: { backgroundColor: C.slate100, borderRadius: R.pill, height: 8, overflow: 'hidden', width: '100%' },
  progressFill: { backgroundColor: C.farm600, borderRadius: R.pill, height: '100%' },
  statsGrid: { flexDirection: 'row', gap: 16, paddingTop: 8 },
  statTile: { backgroundColor: C.slate50, borderRadius: R.xl, flex: 1, padding: 12 },
  statLabel: body({ color: C.slate500, fontSize: 11, fontWeight: '500', letterSpacing: 0.3, marginBottom: 4, textTransform: 'uppercase' }),
  statValue: heading({ color: C.slate900, fontSize: 18, fontWeight: '700' }),
  sectionHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  viewAll: body({ color: C.farm700, fontSize: 14, fontWeight: '500' }),
  orderList: { gap: 12 },
  orderCard: { alignItems: 'center', backgroundColor: C.white, borderColor: C.slate100, borderRadius: R['2xl'], borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14, ...shadow.sm },
  orderImageWrap: { backgroundColor: C.slate100, borderRadius: R.xl, height: 48, overflow: 'hidden', width: 48 },
  orderImage: { height: '100%', width: '100%' },
  orderCopy: { flex: 1, minWidth: 0 },
  orderTitleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginBottom: 2 },
  orderTitle: heading({ color: C.slate900, flex: 1, fontSize: 14, fontWeight: '700' }),
  statusBadge: { borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 },
  statusPending: { backgroundColor: C.amber50 },
  statusDelivered: { backgroundColor: C.farm50 },
  statusText: body({ fontSize: 12, fontWeight: '600' }),
  statusTextPending: { color: C.amber600 },
  statusTextDelivered: { color: C.farm700 },
  orderMetaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  orderMeta: body({ color: C.slate500, flex: 1, fontSize: 12 }),
  stars: { flexDirection: 'row', gap: 0 },
  pageActions: { gap: 12, paddingBottom: 24, paddingTop: 16 },
  primaryAction: { alignItems: 'center', backgroundColor: C.farm800, borderRadius: R.xl, flexDirection: 'row', gap: 8, height: 48, justifyContent: 'center', ...shadow.action },
  primaryActionText: body({ color: C.white, fontSize: 14, fontWeight: '700' }),
  secondaryAction: { alignItems: 'center', backgroundColor: C.white, borderColor: C.slate200, borderRadius: R.xl, borderWidth: 1, flexDirection: 'row', gap: 8, height: 48, justifyContent: 'center', ...shadow.sm },
  secondaryActionText: body({ color: C.slate700, fontSize: 14, fontWeight: '700' }),
})
