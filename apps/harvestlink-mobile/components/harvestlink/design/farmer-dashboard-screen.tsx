import { useCallback, useMemo, useState } from 'react'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { ArrowRight, Plus, Share2, Sprout, TrendingUp, Wheat } from 'lucide-react-native'
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
  SkeletonBox,
  StatTile,
  StatusBadge,
  colors,
  fonts,
  radii,
  space,
  typeScale,
} from '@/components/harvestlink/ui'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { listingImage } from '@/lib/harvestlink/images'
import { STATUS_LABELS, type HarvestOrder } from '@/lib/harvestlink/types'
import { useActivityReport, useFarmerListings, useOrders } from '@/lib/harvestlink/use-data'
import { formatDate, formatNaira, formatUnitCount } from '@/lib/harvestlink/utils'

function statusTone(status: HarvestOrder['status']): 'green' | 'gold' | 'gray' {
  if (status === 'delivered') return 'green'
  if (status === 'pending') return 'gold'
  return 'gray'
}

export function FarmerDashboardScreen() {
  const { user, profile, t } = useHarvestLink()
  const ordersResult = useOrders(user?.id ?? null)
  const listingsResult = useFarmerListings(user?.id ?? null)
  const report = useActivityReport()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    triggerSelectionHaptic()
    setRefreshing(true)
    await Promise.all([ordersResult.mutate(), listingsResult.mutate()])
    setRefreshing(false)
  }, [listingsResult, ordersResult])

  const farmerOrders = useMemo(
    () => (ordersResult.data ?? []).filter((order) => order.farmer_id === user?.id),
    [ordersResult.data, user?.id],
  )

  const farmerListings = useMemo(() => listingsResult.data ?? [], [listingsResult.data])
  const activeListings = useMemo(
    () => farmerListings.filter((item) => item.status === 'active' && Number(item.available_kg) > 0),
    [farmerListings],
  )
  const lowStockCount = useMemo(
    () => activeListings.filter((item) => Number(item.available_kg) <= 3).length,
    [activeListings],
  )

  const pendingOrders = useMemo(
    () => farmerOrders.filter((order) => order.status === 'pending'),
    [farmerOrders],
  )
  const deliveredOrders = useMemo(
    () => farmerOrders.filter((order) => order.status === 'delivered'),
    [farmerOrders],
  )
  const deliveredRevenue = useMemo(
    () =>
      deliveredOrders.reduce(
        (sum, order) => sum + Number(order.quantity_kg) * Number(order.unit_price_per_kg),
        0,
      ),
    [deliveredOrders],
  )

  const recentOrders = useMemo(() => farmerOrders.slice(0, 4), [farmerOrders])
  const isLoading = Boolean(user && ((ordersResult.isLoading && !ordersResult.data) || (listingsResult.isLoading && !listingsResult.data)))
  const canSell = profile?.role === 'farmer' || profile?.role === 'both'

  return (
    <ScreenScroll onRefresh={handleRefresh} refreshing={refreshing}>
      <AppHeader />

      {!user ? (
        <AnimatedEntrance delay={40}>
          <EmptyState
            title="Sell straight from your farm"
            message="Sign in with your Nigerian phone number to list harvests, receive direct orders, and build a verifiable sales record."
            action={<AppButton label="Sign in as Farmer" onPress={() => router.push('/profile')} />}
          />
        </AnimatedEntrance>
      ) : !canSell ? (
        <AnimatedEntrance delay={40}>
          <EmptyState
            title="Farmer tools are off"
            message="Switch your account role to Farmer or Both in Profile to publish harvests and fulfill orders."
            action={<AppButton label="Update role in Profile" onPress={() => router.push('/profile')} />}
          />
        </AnimatedEntrance>
      ) : (
        <>
          <AnimatedEntrance delay={30}>
            <Card style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroCopy}>
                  <Eyebrow light>{profile?.farm_name || profile?.default_area || 'Farm Workspace'}</Eyebrow>
                  <Text style={styles.heroTitle}>
                    {t('greeting')}, {profile?.display_name ?? t('farmerGreetingFallback')}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    {pendingOrders.length > 0
                      ? `${pendingOrders.length} pending buyer ${pendingOrders.length === 1 ? 'request needs' : 'requests need'} confirmation.`
                      : 'Keep stock and prices current so nearby buyers can order fresh stock today.'}
                  </Text>
                </View>
                <View style={styles.heroMark}>
                  <Sprout color={colors.gold} size={24} />
                </View>
              </View>

              <View style={styles.heroActions}>
                <AppButton
                  icon={<Plus color={colors.white} size={18} />}
                  label={t('createListing')}
                  onPress={() => router.push('/listing/new')}
                  style={styles.heroPrimaryBtn}
                />
                <AppButton
                  icon={<Wheat color={colors.pine} size={18} />}
                  label={`${t('myHarvestsTitle')} (${activeListings.length})`}
                  onPress={() => router.push('/harvests')}
                  style={styles.heroSecondaryBtn}
                  variant="secondary"
                />
              </View>
            </Card>
          </AnimatedEntrance>

          {isLoading ? (
            <View style={styles.sectionGap}>
              <View style={styles.statsRow}>
                <View style={styles.statSkeleton}>
                  <SkeletonBox height={26} width="50%" />
                  <SkeletonBox height={14} width="70%" />
                </View>
                <View style={styles.statSkeleton}>
                  <SkeletonBox height={26} width="50%" />
                  <SkeletonBox height={14} width="70%" />
                </View>
              </View>
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </View>
          ) : (
            <>
              <AnimatedEntrance delay={70}>
                <View style={styles.statsRow}>
                  <StatTile
                    hint={pendingOrders.length > 0 ? 'Tap Recent Orders to respond' : 'All caught up'}
                    label={t('pendingOrders')}
                    tone="gold"
                    value={pendingOrders.length}
                  />
                  <StatTile
                    hint={`${deliveredOrders.length} ${t('deliveredMonthly').toLowerCase()}`}
                    label="Settled Sales"
                    tone="green"
                    value={formatNaira(deliveredRevenue)}
                  />
                </View>
              </AnimatedEntrance>

              <AnimatedEntrance delay={110}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Manage active harvest listings"
                  onPress={() => router.push('/harvests')}
                  style={({ pressed }) => [styles.inventoryStrip, pressed && styles.pressed]}
                >
                  <View style={styles.inventoryStripCopy}>
                    <Text style={styles.inventoryStripTitle}>
                      {activeListings.length} {t('activeListings')}
                      {lowStockCount > 0 ? ` · ${lowStockCount} low stock` : ''}
                    </Text>
                    <Text style={styles.inventoryStripSubtitle}>
                      Update unit prices, adjust available stock, or pause listings anytime.
                    </Text>
                  </View>
                  <ArrowRight color={colors.pine} size={20} />
                </Pressable>
              </AnimatedEntrance>

              <AnimatedEntrance delay={150}>
                <SectionTitle
                  action={
                    farmerOrders.length > 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('viewAll')}
                        onPress={() => router.push('/orders')}
                        style={styles.viewAllBtn}
                      >
                        <Text style={styles.viewAllText}>{t('viewAll')}</Text>
                        <ArrowRight color={colors.pine} size={15} />
                      </Pressable>
                    ) : undefined
                  }
                  eyebrow="FULFILLMENT"
                  title={t('recentOrders')}
                />

                {ordersResult.error ? (
                  <MessageBanner>We couldn’t refresh your farm orders. Pull down to retry.</MessageBanner>
                ) : recentOrders.length === 0 ? (
                  <EmptyState
                    title="No buyer requests yet"
                    message={t('noOrdersYet')}
                    action={
                      activeListings.length === 0 ? (
                        <AppButton label={t('createListing')} onPress={() => router.push('/listing/new')} />
                      ) : undefined
                    }
                  />
                ) : (
                  <View style={styles.orderList}>
                    {recentOrders.map((order) => {
                      const cropName = order.listing?.crop ?? 'Farm Harvest'
                      const buyerLabel = order.contact?.buyer_name || order.delivery_area
                      const total = Number(order.quantity_kg) * Number(order.unit_price_per_kg)

                      return (
                        <Pressable
                          key={order.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Open order for ${cropName}`}
                          onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
                          style={({ pressed }) => [styles.orderCard, pressed && styles.pressed]}
                        >
                          <Image
                            contentFit="cover"
                            source={listingImage({
                              category: order.listing?.category ?? 'Other',
                              crop: cropName,
                              image_url: order.listing?.image_url ?? '',
                            })}
                            style={styles.orderThumb}
                            transition={180}
                          />
                          <View style={styles.orderBody}>
                            <View style={styles.orderTop}>
                              <Text numberOfLines={1} style={styles.orderCrop}>
                                {cropName}
                              </Text>
                              <StatusBadge label={STATUS_LABELS[order.status]} tone={statusTone(order.status)} />
                            </View>
                            <Text numberOfLines={1} style={styles.orderMeta}>
                              {formatUnitCount(order.quantity_kg, order.unit)} · {buyerLabel}
                            </Text>
                            <View style={styles.orderBottom}>
                              <Text style={styles.orderAmount}>{formatNaira(total)}</Text>
                              <Text style={styles.orderWindow}>
                                {formatDate(order.created_at)} · {order.delivery_window}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>
                )}
              </AnimatedEntrance>

              <AnimatedEntrance delay={190}>
                <Card style={styles.signalsCard}>
                  <View style={styles.signalsHeader}>
                    <View style={styles.signalsIconBox}>
                      <TrendingUp color={colors.pine} size={20} />
                    </View>
                    <View style={styles.signalsCopy}>
                      <Text style={styles.signalsTitle}>{t('signalsTitle')}</Text>
                      <Text style={styles.signalsSub}>{t('signalsSubtitle')}</Text>
                    </View>
                  </View>

                  {report.message ? <MessageBanner tone="info">{report.message}</MessageBanner> : null}

                  <View style={styles.signalsActions}>
                    <AppButton
                      icon={<Share2 color={colors.white} size={17} />}
                      label={report.busy ? 'Preparing…' : report.url ? 'Share Report' : t('generateReport')}
                      loading={report.busy}
                      onPress={() => (report.url ? void report.share(report.url) : void report.create())}
                      style={styles.flexButton}
                    />
                    <AppButton
                      label="Signals"
                      onPress={() => router.push('/signals')}
                      variant="secondary"
                    />
                  </View>
                </Card>
              </AnimatedEntrance>
            </>
          )}
        </>
      )}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.pine,
    borderColor: colors.pineDeep,
    gap: space.md,
    marginBottom: space.lg,
  },
  heroTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    gap: space.xs,
  },
  heroTitle: {
    ...typeScale.display,
    color: colors.white,
  },
  heroSubtitle: {
    ...typeScale.body,
    color: '#DDE7DF',
  },
  heroMark: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroActions: {
    gap: space.sm,
  },
  heroPrimaryBtn: {
    backgroundColor: colors.leaf,
  },
  heroSecondaryBtn: {
    backgroundColor: colors.cream,
    borderColor: colors.cream,
  },
  sectionGap: {
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
  inventoryStrip: {
    alignItems: 'center',
    backgroundColor: colors.paleGreen,
    borderColor: '#CEDBC8',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    marginBottom: space.lg,
    minHeight: 68,
    padding: space.md,
  },
  inventoryStripCopy: {
    flex: 1,
    gap: 2,
  },
  inventoryStripTitle: {
    fontFamily: fonts.heading,
    color: colors.pineDeep,
    fontSize: 16,
  },
  inventoryStripSubtitle: {
    ...typeScale.small,
    color: colors.pine,
  },
  viewAllBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: space.xs,
  },
  viewAllText: {
    fontFamily: fonts.bodyBold,
    color: colors.pine,
    fontSize: 13,
  },
  orderList: {
    gap: space.sm,
    marginBottom: space.lg,
  },
  orderCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 92,
    padding: space.sm,
  },
  orderThumb: {
    backgroundColor: colors.creamSubtle,
    borderRadius: radii.md,
    height: 76,
    width: 76,
  },
  orderBody: {
    flex: 1,
    gap: 4,
  },
  orderTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'space-between',
  },
  orderCrop: {
    fontFamily: fonts.heading,
    color: colors.ink,
    flex: 1,
    fontSize: 16,
  },
  orderMeta: {
    ...typeScale.small,
    color: colors.muted,
  },
  orderBottom: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
    marginTop: 2,
  },
  orderAmount: {
    fontFamily: fonts.bodyBold,
    color: colors.pine,
    fontSize: 15,
  },
  orderWindow: {
    ...typeScale.micro,
    color: colors.muted,
    flexShrink: 1,
  },
  signalsCard: {
    backgroundColor: colors.creamSubtle,
    gap: space.md,
  },
  signalsHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  signalsIconBox: {
    alignItems: 'center',
    backgroundColor: colors.paleGreen,
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  signalsCopy: {
    flex: 1,
    gap: 4,
  },
  signalsTitle: {
    fontFamily: fonts.heading,
    color: colors.ink,
    fontSize: 18,
  },
  signalsSub: {
    ...typeScale.small,
    color: colors.muted,
  },
  signalsActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  flexButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
})
