import { useCallback, useMemo, useState } from 'react'
import { router } from 'expo-router'
import { CheckCircle2, Share2, ShieldCheck, Star, TrendingUp } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { AppHeader } from '@/components/harvestlink/app-header'
import { useHarvestLink } from '@/components/harvestlink/context'
import {
  AnimatedEntrance,
  AppButton,
  Card,
  EmptyState,
  Eyebrow,
  KeyValueRow,
  MessageBanner,
  OrderCardSkeleton,
  ProgressBar,
  ScreenScroll,
  SelectField,
  SkeletonBox,
  StatTile,
  colors,
  fonts,
  radii,
  space,
  typeScale,
} from '@/components/harvestlink/ui'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { useActivityReport, useFarmerListings, useOrders, useScans } from '@/lib/harvestlink/use-data'
import { formatNaira } from '@/lib/harvestlink/utils'

type PeriodKey = '30d' | '90d' | 'all'

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All recorded activity' },
]

function isWithinPeriod(isoDate: string, period: PeriodKey): boolean {
  if (period === 'all') return true
  const createdMs = new Date(isoDate).getTime()
  if (!Number.isFinite(createdMs)) return true
  const days = period === '30d' ? 30 : 90
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return createdMs >= cutoff
}

export function MarketplaceSignalsScreen() {
  const { user, profile, t } = useHarvestLink()
  const ordersResult = useOrders(user?.id ?? null)
  const listingsResult = useFarmerListings(user?.id ?? null)
  const scansResult = useScans(user?.id ?? null)
  const report = useActivityReport()

  const [period, setPeriod] = useState<PeriodKey>('30d')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    triggerSelectionHaptic()
    setRefreshing(true)
    await Promise.all([ordersResult.mutate(), listingsResult.mutate(), scansResult.mutate()])
    setRefreshing(false)
  }, [listingsResult, ordersResult, scansResult])

  const farmerOrders = useMemo(
    () =>
      (ordersResult.data ?? []).filter(
        (order) => order.farmer_id === user?.id && isWithinPeriod(order.created_at, period),
      ),
    [ordersResult.data, period, user?.id],
  )

  const filteredScans = useMemo(
    () => (scansResult.data ?? []).filter((scan) => isWithinPeriod(scan.created_at, period)),
    [period, scansResult.data],
  )

  const deliveredOrders = useMemo(
    () => farmerOrders.filter((order) => order.status === 'delivered'),
    [farmerOrders],
  )

  const totalRevenue = useMemo(
    () =>
      deliveredOrders.reduce(
        (sum, order) => sum + Number(order.quantity_kg) * Number(order.unit_price_per_kg),
        0,
      ),
    [deliveredOrders],
  )

  const fulfillmentRate = useMemo(() => {
    if (farmerOrders.length === 0) return 0
    return Math.round((deliveredOrders.length / farmerOrders.length) * 100)
  }, [deliveredOrders.length, farmerOrders.length])

  const averageRating = useMemo(() => {
    const rated = deliveredOrders.filter((order) => typeof order.rating === 'number' && order.rating > 0)
    if (rated.length === 0) return null
    const sum = rated.reduce((acc, order) => acc + Number(order.rating), 0)
    return { value: (sum / rated.length).toFixed(1), count: rated.length }
  }, [deliveredOrders])

  const cropSummary = useMemo(() => {
    const byCrop = new Map<string, { orders: number; revenue: number }>()
    for (const order of deliveredOrders) {
      const crop = order.listing?.crop ?? 'Harvest lot'
      const prev = byCrop.get(crop) ?? { orders: 0, revenue: 0 }
      byCrop.set(crop, {
        orders: prev.orders + 1,
        revenue: prev.revenue + Number(order.quantity_kg) * Number(order.unit_price_per_kg),
      })
    }
    return [...byCrop.entries()].sort((a, b) => b[1].revenue - a[1].revenue)
  }, [deliveredOrders])

  const activeListingCount = useMemo(
    () => (listingsResult.data ?? []).filter((item) => item.status === 'active' && Number(item.available_kg) > 0).length,
    [listingsResult.data],
  )

  const isLoading = Boolean(
    user &&
      ((ordersResult.isLoading && !ordersResult.data) || (listingsResult.isLoading && !listingsResult.data)),
  )

  return (
    <ScreenScroll onRefresh={handleRefresh} refreshing={refreshing}>
      <AppHeader />

      <AnimatedEntrance delay={20}>
        <View style={styles.intro}>
          <Eyebrow>VERIFIED TRADE HISTORY</Eyebrow>
          <Text style={styles.title}>{t('signalsTitle')}</Text>
          <Text style={styles.subtitle}>{t('signalsSubtitle')}</Text>
        </View>
      </AnimatedEntrance>

      {!user ? (
        <EmptyState
          title="Sign in to view your market record"
          message="Your completed orders, freshness scans, and co-op shareable reports appear once you sign in."
          action={<AppButton label="Sign in" onPress={() => router.push('/profile')} />}
        />
      ) : isLoading ? (
        <View style={styles.gapMd}>
          <View style={styles.statsRow}>
            <View style={styles.statSkeleton}>
              <SkeletonBox height={26} width="60%" />
              <SkeletonBox height={14} width="75%" />
            </View>
            <View style={styles.statSkeleton}>
              <SkeletonBox height={26} width="60%" />
              <SkeletonBox height={14} width="75%" />
            </View>
          </View>
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </View>
      ) : (
        <>
          <AnimatedEntrance delay={50}>
            <SelectField
              label="Activity window"
              onChange={setPeriod}
              options={PERIOD_OPTIONS}
              value={period}
            />
          </AnimatedEntrance>

          <AnimatedEntrance delay={80}>
            <View style={styles.statsRow}>
              <StatTile
                hint={`${deliveredOrders.length} settled`}
                label="Settled Sales"
                tone="green"
                value={formatNaira(totalRevenue)}
              />
              <StatTile
                hint={`${activeListingCount} live on market`}
                label="Freshness Scans"
                tone="gold"
                value={filteredScans.length}
              />
            </View>
          </AnimatedEntrance>

          <AnimatedEntrance delay={120}>
            <Card style={styles.sectionCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricCopy}>
                  <Eyebrow>FULFILLMENT RELIABILITY</Eyebrow>
                  <Text style={styles.cardTitle}>
                    {farmerOrders.length > 0 ? `${fulfillmentRate}% orders delivered` : 'No orders in this window'}
                  </Text>
                </View>
                <CheckCircle2 color={colors.pine} size={22} />
              </View>
              <ProgressBar tone="leaf" value={fulfillmentRate} />
              <View style={styles.kvGroup}>
                <KeyValueRow label="Total buyer requests" value={farmerOrders.length} />
                <KeyValueRow label="Delivered orders" value={deliveredOrders.length} />
                <KeyValueRow
                  label="Buyer quality rating"
                  value={averageRating ? `${averageRating.value} / 5 (${averageRating.count})` : 'No ratings yet'}
                />
              </View>
            </Card>
          </AnimatedEntrance>

          <AnimatedEntrance delay={160}>
            <Card style={styles.sectionCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricCopy}>
                  <Eyebrow>BY PRODUCE LINE</Eyebrow>
                  <Text style={styles.cardTitle}>Completed crop volume</Text>
                </View>
                <TrendingUp color={colors.leaf} size={22} />
              </View>
              {cropSummary.length === 0 ? (
                <Text style={styles.helperText}>
                  No delivered crop lots in this window yet. Completed orders automatically populate here.
                </Text>
              ) : (
                <View style={styles.kvGroup}>
                  {cropSummary.map(([cropName, metrics]) => (
                    <KeyValueRow
                      key={cropName}
                      emphasis
                      label={`${cropName} (${metrics.orders} ${metrics.orders === 1 ? 'order' : 'orders'})`}
                      value={formatNaira(metrics.revenue)}
                    />
                  ))}
                </View>
              )}
            </Card>
          </AnimatedEntrance>

          <AnimatedEntrance delay={200}>
            <Card style={styles.reportCard}>
              <View style={styles.reportHead}>
                <View style={styles.reportIcon}>
                  <ShieldCheck color={colors.pine} size={22} />
                </View>
                <View style={styles.metricCopy}>
                  <Text style={styles.cardTitle}>Shareable Co-op Report</Text>
                  <Text style={styles.helperText}>
                    Generates a signed private link summarizing real orders for {profile?.farm_name || profile?.display_name || 'your farm'}. Supporting trade record only — not a credit guarantee.
                  </Text>
                </View>
              </View>

              {report.message ? <MessageBanner tone="info">{report.message}</MessageBanner> : null}

              <AppButton
                icon={report.url ? <Share2 color={colors.white} size={18} /> : <Star color={colors.white} size={18} />}
                label={report.busy ? 'Preparing link…' : report.url ? 'Share Activity Report' : t('generateReport')}
                loading={report.busy}
                onPress={() => (report.url ? void report.share(report.url) : void report.create())}
              />
            </Card>
          </AnimatedEntrance>
        </>
      )}
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
  gapMd: {
    gap: space.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.md,
  },
  statSkeleton: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: space.sm,
    padding: space.md,
  },
  sectionCard: {
    gap: space.sm,
    marginBottom: space.md,
  },
  metricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  metricCopy: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    color: colors.ink,
    fontSize: 18,
  },
  kvGroup: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: space.xs,
    marginTop: space.xs,
    paddingTop: space.sm,
  },
  helperText: {
    ...typeScale.small,
    color: colors.muted,
  },
  reportCard: {
    backgroundColor: colors.paleGreen,
    borderColor: '#CEDBC8',
    gap: space.md,
  },
  reportHead: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  reportIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
})
