import { useCallback, useState } from 'react'
import { router } from 'expo-router'
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react-native'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
  StatusBadge,
  colors,
  fonts,
  radii,
  space,
  typeScale,
} from '@/components/harvestlink/ui'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import type { HarvestNotification } from '@/lib/harvestlink/types'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/lib/harvestlink/use-data'
import { formatDate } from '@/lib/harvestlink/utils'

function badgeForKind(kind: HarvestNotification['kind']): { label: string; tone: 'green' | 'gold' | 'red' } {
  if (kind === 'short_shelf_life') return { label: 'Freshness alert', tone: 'red' }
  if (kind === 'order_placed') return { label: 'New order', tone: 'gold' }
  return { label: 'Order update', tone: 'green' }
}

export function NotificationsScreen({ embedded = false }: { embedded?: boolean }) {
  const { user } = useHarvestLink()
  const notificationsResult = useNotifications(user?.id ?? null)
  const notifications = notificationsResult.data ?? []
  const unread = useUnreadCount(notifications)
  const { markRead, busy: markingOne, error: oneError } = useMarkNotificationRead()
  const { markAllRead, busy: markingAll, error: allError } = useMarkAllNotificationsRead()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    triggerSelectionHaptic()
    setRefreshing(true)
    await notificationsResult.mutate()
    setRefreshing(false)
  }, [notificationsResult])

  const handleOpenNotification = async (item: HarvestNotification) => {
    triggerSelectionHaptic()
    if (!item.read_at) {
      await markRead(item.id)
    }
    if (item.order_id) {
      router.push({ pathname: '/order/[id]', params: { id: item.order_id } })
    }
  }

  const isLoading = Boolean(user && notificationsResult.isLoading && !notificationsResult.data)

  const content = (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
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
      {embedded ? (
        <AppHeader />
      ) : (
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <ArrowLeft color={colors.pine} size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Updates</Text>
          {unread > 0 ? (
            <Pressable
              accessibilityLabel="Mark all notifications read"
              accessibilityRole="button"
              disabled={markingAll}
              onPress={() => {
                triggerSelectionHaptic()
                void markAllRead()
              }}
              style={({ pressed }) => [styles.markAllBtn, pressed && styles.pressed]}
            >
              <CheckCheck color={colors.pine} size={17} />
              <Text style={styles.markAllText}>Mark all</Text>
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
      )}

      {oneError || allError ? <MessageBanner>{oneError ?? allError}</MessageBanner> : null}

      {!user ? (
        <EmptyState
          title="Sign in to view updates"
          message="Order notifications and shelf-life reminders will appear here once you sign in."
          action={<AppButton label="Sign in" onPress={() => router.replace('/profile')} />}
        />
      ) : isLoading ? (
        <View style={styles.gap}>
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="All quiet here"
          message="When you place an order, receive a request, or save a short shelf-life scan, updates land right here."
        />
      ) : (
        <View style={styles.list}>
          <Eyebrow>{unread > 0 ? `${unread} UNREAD` : 'RECENT ACTIVITY'}</Eyebrow>
          {notifications.map((item, idx) => {
            const badge = badgeForKind(item.kind)
            const isUnread = !item.read_at
            return (
              <AnimatedEntrance key={item.id} delay={Math.min(idx * 35, 180)}>
                <Pressable
                  accessibilityLabel={`${item.title}. ${isUnread ? 'Unread' : 'Read'}`}
                  accessibilityRole="button"
                  disabled={markingOne}
                  onPress={() => void handleOpenNotification(item)}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <Card style={[styles.itemCard, isUnread && styles.itemCardUnread]}>
                    <View style={styles.itemTop}>
                      <StatusBadge label={badge.label} tone={badge.tone} />
                      <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                    </View>
                    <View style={styles.titleRow}>
                      {isUnread ? <Bell color={colors.goldDeep} size={15} /> : null}
                      <Text style={styles.itemTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.itemMessage}>{item.message}</Text>
                  </Card>
                </Pressable>
              </AnimatedEntrance>
            )
          })}
        </View>
      )}
    </ScrollView>
  )

  return embedded ? content : <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>{content}</SafeAreaView>
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.cream,
    flex: 1,
  },
  scrollContent: {
    gap: space.md,
    padding: space.lg,
    paddingBottom: 40,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    color: colors.pineDeep,
    fontSize: 20,
  },
  markAllBtn: {
    alignItems: 'center',
    backgroundColor: colors.paleGreen,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: space.md,
  },
  markAllText: {
    fontFamily: fonts.bodyBold,
    color: colors.pine,
    fontSize: 13,
  },
  spacer: {
    height: 44,
    width: 44,
  },
  gap: {
    gap: space.md,
  },
  list: {
    gap: space.sm,
  },
  itemCard: {
    gap: space.xs,
  },
  itemCardUnread: {
    backgroundColor: colors.creamSubtle,
    borderColor: colors.gold,
  },
  itemTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 12,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  itemTitle: {
    fontFamily: fonts.heading,
    color: colors.ink,
    flex: 1,
    fontSize: 17,
  },
  itemMessage: {
    ...typeScale.body,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.82,
  },
})
