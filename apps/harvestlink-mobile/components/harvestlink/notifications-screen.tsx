import { router } from 'expo-router'
import { ArrowLeft, Bell, Check, CircleCheck, Leaf, PackageCheck } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useHarvestLink } from './context'
import { AppButton, Card, colors, EmptyState, Eyebrow, MessageBanner } from './ui'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/harvestlink/use-data'
import { formatDate } from '@/lib/harvestlink/utils'

export function NotificationsScreen({ embedded = false }: { embedded?: boolean }) {
  const { user } = useHarvestLink()
  const { data: notifications, error, isLoading } = useNotifications(user?.id ?? null)
  const { markRead, busy: markReadBusy, error: markReadError } = useMarkNotificationRead()
  const { markAllRead, busy: markAllBusy, error: markAllError } = useMarkAllNotificationsRead()
  const busy = markReadBusy || markAllBusy
  const actionError = markReadError ?? markAllError

  const body = (
    <>
        <View style={styles.topline}>
          {embedded ? null : <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={19} color={colors.ink} /></Pressable>}
          <View style={styles.titleGroup}><Eyebrow>YOUR INBOX</Eyebrow><Text style={styles.title}>Updates</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Mark all notifications as read" onPress={() => void markAllRead()} disabled={busy || !notifications?.some((item) => !item.read_at)} style={styles.markAll}>
            <Check color={colors.pine} size={14} /><Text style={styles.markAllText}>Read all</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Order changes and freshness notes, all in one place.</Text>
        {error ? <MessageBanner>We couldn’t load your updates. Pull to refresh or try again shortly.</MessageBanner> : null}
        {actionError ? <MessageBanner>{actionError}</MessageBanner> : null}
        {!user ? (
          <EmptyState title="Sign in to see your updates." message="Order progress and freshness reminders will be kept here for your account." action={<AppButton label="Sign in with phone" onPress={() => router.push('/profile' as never)} />} />
        ) : isLoading && !notifications ? (
          <Card style={styles.loading}><Text style={styles.subtitle}>Loading your updates…</Text></Card>
        ) : !notifications?.length ? (
          <EmptyState title="Your next update will find you here." message="We’ll let you know when an order changes or a freshness scan needs your attention." action={<AppButton label="Browse the market" variant="secondary" onPress={() => router.push('/' as never)} />} />
        ) : (
          <View style={styles.list}>
            {notifications.map((item) => {
              const Icon = item.kind === 'short_shelf_life' ? Leaf : item.kind === 'order_placed' ? PackageCheck : CircleCheck
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}. ${item.message}. ${item.read_at ? 'Read' : 'Unread'}`}
                  onPress={() => {
                    if (!item.read_at) void markRead(item.id)
                    if (item.order_id) router.push('/orders' as never)
                  }}
                  style={({ pressed }) => [styles.notification, !item.read_at && styles.unread, pressed && styles.pressed]}
                >
                  <View style={[styles.iconWrap, item.kind === 'short_shelf_life' && styles.iconGold]}><Icon color={item.kind === 'short_shelf_life' ? '#865D1D' : colors.pine} size={18} /></View>
                  <View style={styles.notificationCopy}>
                    <View style={styles.notificationHeading}><Text style={styles.notificationTitle}>{item.title}</Text>{!item.read_at ? <View style={styles.unreadDot} /> : null}</View>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                    <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                  </View>
                  {!item.read_at ? <Bell color={colors.leaf} size={15} /> : null}
                </Pressable>
              )
            })}
          </View>
        )}
    </>
  )

  if (embedded) return <View style={styles.content}>{body}</View>

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { alignSelf: 'center', gap: 12, maxWidth: 520, paddingBottom: 34, paddingHorizontal: 18, paddingTop: 8, width: '100%' },
  topline: { alignItems: 'center', flexDirection: 'row', gap: 11, minHeight: 46 },
  backButton: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 13, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  titleGroup: { flex: 1, gap: 3 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '700', letterSpacing: -0.7 },
  markAll: { alignItems: 'center', flexDirection: 'row', gap: 4, padding: 7 },
  markAllText: { color: colors.pine, fontSize: 11, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  loading: { marginTop: 8 },
  list: { gap: 9, marginTop: 6 },
  notification: { alignItems: 'flex-start', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 14 },
  unread: { backgroundColor: '#FBFCF8', borderColor: '#C8D7C0' },
  iconWrap: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 13, height: 38, justifyContent: 'center', width: 38 },
  iconGold: { backgroundColor: colors.paleGold },
  notificationCopy: { flex: 1, gap: 4 },
  notificationHeading: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  notificationTitle: { color: colors.ink, flex: 1, fontSize: 13, fontWeight: '700' },
  notificationMessage: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  date: { color: colors.muted, fontSize: 10, marginTop: 2 },
  unreadDot: { backgroundColor: colors.gold, borderRadius: 99, height: 7, width: 7 },
  pressed: { opacity: 0.8 },
})
