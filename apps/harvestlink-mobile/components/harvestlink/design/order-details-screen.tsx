import { useCallback, useState } from 'react'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Phone,
  Star,
} from 'lucide-react-native'
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
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
  StatusBadge,
  TextField,
  colors,
  fonts,
  radii,
  space,
  typeScale,
} from '@/components/harvestlink/ui'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { listingImage } from '@/lib/harvestlink/images'
import {
  ORDER_STATUSES,
  ORDER_TIMELINE_STEPS,
  STATUS_LABELS,
  type HarvestOrder,
} from '@/lib/harvestlink/types'
import { useAdvanceOrder, useOrders, useRateOrder } from '@/lib/harvestlink/use-data'
import {
  buildPhoneLink,
  buildWhatsAppLink,
  formatDate,
  formatNaira,
  formatUnitCount,
  formatUnitSingular,
  nextOrderStatus,
} from '@/lib/harvestlink/utils'

function actionLabel(nextStatus: HarvestOrder['status']) {
  if (nextStatus === 'accepted') return 'Accept Order'
  if (nextStatus === 'ready') return 'Mark Ready for Pickup'
  if (nextStatus === 'out_for_delivery') return 'Dispatch for Delivery'
  return 'Confirm Delivered'
}

export function OrderDetailsScreen({ orderId: propOrderId }: { orderId?: string }) {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const orderId = propOrderId ?? (Array.isArray(id) ? id[0] : id) ?? ''
  const insets = useSafeAreaInsets()
  const { user } = useHarvestLink()
  const ordersResult = useOrders(user?.id ?? null)
  const { advanceOrder, busy, error, setError } = useAdvanceOrder()
  const { rateOrder, busy: ratingBusy, error: ratingError } = useRateOrder()

  const [refreshing, setRefreshing] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [selectedRating, setSelectedRating] = useState(5)
  const [ratingNote, setRatingNote] = useState('')

  const handleRefresh = useCallback(async () => {
    triggerSelectionHaptic()
    setRefreshing(true)
    await ordersResult.mutate()
    setRefreshing(false)
  }, [ordersResult])

  const order = ordersResult.data?.find((item) => item.id === orderId) ?? null
  const isFarmer = Boolean(user && order && order.farmer_id === user.id)
  const isBuyer = Boolean(user && order && order.buyer_id === user.id)
  const nextStatus = order && isFarmer ? nextOrderStatus(order.status) : null
  const currentStepIdx = order ? Math.max(0, ORDER_STATUSES.indexOf(order.status)) : 0

  const counterpartyName = order
    ? isFarmer
      ? order.contact?.buyer_name || 'Buyer'
      : order.contact?.farmer_name || order.listing?.farm_name || 'Farmer'
    : ''
  const counterpartyPhone = order
    ? isFarmer
      ? order.contact?.buyer_phone
      : order.contact?.farmer_phone
    : null
  const phoneUrl = buildPhoneLink(counterpartyPhone)
  const whatsAppUrl = buildWhatsAppLink(
    counterpartyPhone,
    order
      ? `Hello ${counterpartyName}, following up on HarvestLink order #${order.id.slice(0, 6)} for ${order.listing?.crop ?? 'produce'}.`
      : undefined,
  )

  async function openContactUrl(url: string | null) {
    setContactError(null)
    if (!url) {
      setContactError('No phone number is available for this counterparty yet.')
      return
    }
    try {
      await Linking.openURL(url)
    } catch {
      setContactError('Could not open that contact app on this device.')
    }
  }

  async function handleAdvance() {
    if (!order || !nextStatus) return
    setError(null)
    await advanceOrder(order.id, nextStatus)
  }

  async function handleSubmitRating() {
    if (!order) return
    await rateOrder(order.id, selectedRating, ratingNote)
  }

  const cropName = order?.listing?.crop ?? 'Harvest Order'
  const totalAmount = order ? Number(order.quantity_kg) * Number(order.unit_price_per_kg) : 0

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.topBarBtn, pressed && styles.pressed]}
        >
          <ArrowLeft color={colors.pine} size={22} />
        </Pressable>
        <Text style={styles.topBarTitle}>Order #{orderId.slice(0, 8)}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            nextStatus ? styles.scrollContentWithBar : { paddingBottom: Math.max(32, insets.bottom + 20) },
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              colors={[colors.pine]}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              tintColor={colors.pine}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {!user ? (
            <EmptyState
              title="Sign in to view orders"
              message="Order details are private to the buyer and farmer on the transaction."
              action={<AppButton label="Sign in" onPress={() => router.replace('/profile')} />}
            />
          ) : ordersResult.isLoading && !ordersResult.data ? (
            <View style={styles.skeletonWrap}>
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </View>
          ) : !order ? (
            <EmptyState
              title="Order not found"
              message="This order could not be found on your account. Pull down to refresh or return to your orders list."
              action={<AppButton label="Back to Orders" onPress={() => router.replace('/orders')} />}
            />
          ) : (
            <>
              <AnimatedEntrance delay={20}>
                <Card style={styles.summaryCard}>
                  <View style={styles.summaryHead}>
                    <Image
                      contentFit="cover"
                      source={listingImage({
                        category: order.listing?.category ?? 'Other',
                        crop: cropName,
                        image_url: order.listing?.image_url ?? '',
                      })}
                      style={styles.thumb}
                    />
                    <View style={styles.summaryCopy}>
                      <Eyebrow>{order.listing?.farm_name || 'Harvest lot'}</Eyebrow>
                      <Text style={styles.cropTitle}>{cropName}</Text>
                      <Text style={styles.qtySub}>
                        {formatUnitCount(order.quantity_kg, order.unit)} · {formatNaira(order.unit_price_per_kg)} /{' '}
                        {formatUnitSingular(order.unit)}
                      </Text>
                      <View style={styles.badgeWrap}>
                        <StatusBadge
                          label={STATUS_LABELS[order.status]}
                          tone={order.status === 'delivered' ? 'green' : order.status === 'pending' ? 'gold' : 'gray'}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.kvGroup}>
                    <KeyValueRow emphasis label="Order total" value={formatNaira(totalAmount)} />
                    <KeyValueRow label="Delivery window" value={order.delivery_window} />
                    <KeyValueRow label="Delivery zone" value={order.delivery_area} />
                    <KeyValueRow label="Placed on" value={formatDate(order.created_at)} />
                  </View>

                  {order.notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Buyer instructions</Text>
                      <Text style={styles.notesBody}>{order.notes}</Text>
                    </View>
                  ) : null}
                </Card>
              </AnimatedEntrance>

              <AnimatedEntrance delay={70}>
                <Card style={styles.sectionCard}>
                  <Eyebrow>FULFILLMENT TRACKING</Eyebrow>
                  <Text style={styles.sectionTitle}>Order Timeline</Text>

                  <View style={styles.timeline}>
                    {ORDER_TIMELINE_STEPS.map((step, index) => {
                      const completed = index < currentStepIdx || (order.status === 'delivered' && index === currentStepIdx)
                      const active = index === currentStepIdx && order.status !== 'delivered'
                      const isLast = index === ORDER_TIMELINE_STEPS.length - 1

                      return (
                        <View key={step.status} style={styles.timelineRow}>
                          <View style={styles.timelineRail}>
                            <View
                              style={[
                                styles.timelineDot,
                                completed && styles.timelineDotDone,
                                active && styles.timelineDotActive,
                              ]}
                            >
                              {completed ? <Check color={colors.white} size={13} /> : null}
                            </View>
                            {!isLast ? (
                              <View style={[styles.timelineLine, completed && styles.timelineLineDone]} />
                            ) : null}
                          </View>

                          <View style={styles.timelineCopy}>
                            <Text
                              style={[
                                styles.timelineTitle,
                                (completed || active) && styles.timelineTitleStrong,
                              ]}
                            >
                              {step.title}
                            </Text>
                            {step.subtitle ? (
                              <Text style={styles.timelineSub}>{step.subtitle}</Text>
                            ) : null}
                          </View>
                        </View>
                      )
                    })}
                  </View>
                </Card>
              </AnimatedEntrance>

              <AnimatedEntrance delay={110}>
                <Card style={styles.sectionCard}>
                  <Eyebrow>{isFarmer ? 'BUYER CONTACT' : 'FARMER CONTACT'}</Eyebrow>
                  <Text style={styles.sectionTitle}>{counterpartyName}</Text>
                  <Text style={styles.helperText}>
                    {phoneUrl
                      ? 'Coordinate dispatch time or pickup landmarks directly by phone or WhatsApp.'
                      : 'Phone contact is shown once the counterparty contact record is available.'}
                  </Text>

                  {contactError ? <MessageBanner>{contactError}</MessageBanner> : null}

                  <View style={styles.contactButtons}>
                    <AppButton
                      disabled={!phoneUrl}
                      icon={<Phone color={colors.pine} size={18} />}
                      label="Call"
                      onPress={() => void openContactUrl(phoneUrl)}
                      style={styles.flex}
                      variant="secondary"
                    />
                    <AppButton
                      disabled={!whatsAppUrl}
                      icon={<MessageCircle color={colors.pine} size={18} />}
                      label="WhatsApp"
                      onPress={() => void openContactUrl(whatsAppUrl)}
                      style={styles.flex}
                      variant="secondary"
                    />
                  </View>
                </Card>
              </AnimatedEntrance>

              {isBuyer && order.status === 'delivered' ? (
                <AnimatedEntrance delay={150}>
                  <Card style={styles.sectionCard}>
                    <Eyebrow>QUALITY FEEDBACK</Eyebrow>
                    <Text style={styles.sectionTitle}>
                      {order.rating ? `You rated this harvest ${order.rating}/5` : 'Rate your delivery'}
                    </Text>

                    {order.rating ? (
                      <>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((value) => (
                            <View key={value} style={styles.starDisplayBox}>
                              <Star
                                color={value <= (order.rating ?? 0) ? colors.gold : colors.line}
                                fill={value <= (order.rating ?? 0) ? colors.gold : 'transparent'}
                                size={22}
                              />
                            </View>
                          ))}
                        </View>
                        {order.rating_note ? <Text style={styles.helperText}>“{order.rating_note}”</Text> : null}
                      </>
                    ) : (
                      <>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Pressable
                              key={value}
                              accessibilityLabel={`Rate ${value} star${value === 1 ? '' : 's'}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected: value <= selectedRating }}
                              onPress={() => {
                                triggerSelectionHaptic()
                                setSelectedRating(value)
                              }}
                              style={styles.starBtn}
                            >
                              <Star
                                color={value <= selectedRating ? colors.gold : colors.muted}
                                fill={value <= selectedRating ? colors.gold : 'transparent'}
                                size={24}
                              />
                            </Pressable>
                          ))}
                        </View>

                        <TextField
                          label="Delivery & freshness note (optional)"
                          multiline
                          onChangeText={setRatingNote}
                          placeholder="How was the produce weight, freshness, and handoff?"
                          value={ratingNote}
                        />

                        {ratingError ? <MessageBanner>{ratingError}</MessageBanner> : null}

                        <AppButton
                          label="Submit Review"
                          loading={ratingBusy}
                          onPress={() => void handleSubmitRating()}
                        />
                      </>
                    )}
                  </Card>
                </AnimatedEntrance>
              ) : null}

              {error ? <MessageBanner>{error}</MessageBanner> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {nextStatus ? (
        <View style={[styles.stickyBar, { paddingBottom: Math.max(space.md, insets.bottom) }]}>
          <AppButton
            label={actionLabel(nextStatus)}
            loading={busy}
            onPress={() => void handleAdvance()}
          />
        </View>
      ) : null}
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
  topBar: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  topBarBtn: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  topBarTitle: {
    fontFamily: fonts.heading,
    color: colors.ink,
    fontSize: 17,
  },
  topBarSpacer: {
    height: 44,
    width: 44,
  },
  scrollContent: {
    gap: space.md,
    padding: space.lg,
  },
  scrollContentWithBar: {
    paddingBottom: 112,
  },
  skeletonWrap: {
    gap: space.md,
  },
  summaryCard: {
    gap: space.md,
  },
  summaryHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  thumb: {
    backgroundColor: colors.creamSubtle,
    borderRadius: radii.md,
    height: 84,
    width: 84,
  },
  summaryCopy: {
    flex: 1,
    gap: 3,
  },
  cropTitle: {
    fontFamily: fonts.heading,
    color: colors.ink,
    fontSize: 20,
  },
  qtySub: {
    ...typeScale.small,
    color: colors.muted,
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  kvGroup: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: space.xs,
    paddingTop: space.sm,
  },
  notesBox: {
    backgroundColor: colors.creamSubtle,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
    padding: space.sm,
  },
  notesLabel: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 12,
  },
  notesBody: {
    ...typeScale.small,
    color: colors.muted,
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
  timeline: {
    marginTop: space.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: space.md,
    minHeight: 54,
  },
  timelineRail: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    alignItems: 'center',
    backgroundColor: colors.creamSubtle,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  timelineDotDone: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  timelineDotActive: {
    backgroundColor: colors.paleGold,
    borderColor: colors.gold,
  },
  timelineLine: {
    backgroundColor: colors.line,
    flex: 1,
    marginVertical: 4,
    width: 2,
  },
  timelineLineDone: {
    backgroundColor: colors.pine,
  },
  timelineCopy: {
    flex: 1,
    gap: 2,
    paddingBottom: space.sm,
  },
  timelineTitle: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 14,
  },
  timelineTitleStrong: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  timelineSub: {
    ...typeScale.small,
    color: colors.muted,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: space.sm,
  },
  starRow: {
    flexDirection: 'row',
    gap: space.xs,
  },
  starDisplayBox: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  starBtn: {
    alignItems: 'center',
    backgroundColor: colors.creamSubtle,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  stickyBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    position: 'absolute',
    right: 0,
  },
  pressed: {
    opacity: 0.8,
  },
})
