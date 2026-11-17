import { useMemo, useState, type ReactNode } from 'react'
import { router } from 'expo-router'
import { ChartNoAxesCombined, FileCheck2, Leaf, Share2, Sprout } from 'lucide-react-native'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { AppHeader } from './app-header'
import { useHarvestLink } from './context'
import {
  AppButton,
  Card,
  Eyebrow,
  MessageBanner,
  ProgressBar,
  ScreenScroll,
  SectionTitle,
  SegmentedControl,
  StatTile,
  StatusBadge,
  colors,
  radii,
  typeScale,
} from './ui'
import { useFarmerListings, useOrders, useScans } from '@/lib/harvestlink/use-data'
import { computeFarmerSignals, type SignalWindow } from '@/lib/harvestlink/signals'
import { useActivityReport } from '@/lib/harvestlink/use-report'
import { formatNaira } from '@/lib/harvestlink/utils'

const windowOptions: { value: `${SignalWindow}`; label: string }[] = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

export function SignalsScreen() {
  const { user, profile } = useHarvestLink()
  const { data: listings, isLoading: listingsLoading } = useFarmerListings(user?.id ?? null)
  const { data: orders, isLoading: ordersLoading } = useOrders(user?.id ?? null)
  const { data: scans } = useScans(user?.id ?? null)
  const [range, setRange] = useState<'30' | '90'>('30')
  const report = useActivityReport()

  const signals = useMemo(() => {
    if (!user) return null
    return computeFarmerSignals({
      userId: user.id,
      listings: listings ?? [],
      orders: orders ?? [],
      scans: scans ?? [],
      days: Number(range) as SignalWindow,
    })
  }, [listings, orders, scans, user, range])

  const loading = (listingsLoading && !listings) || (ordersLoading && !orders)
  const maxWeekly = Math.max(...(signals?.weeklySales.map((week) => week.value) ?? [0]), 1)
  const isFarmer = profile?.role === 'farmer' || profile?.role === 'both'

  return (
    <ScreenScroll contentContainerStyle={styles.content}>
      <AppHeader />
      <View style={styles.heading}>
        <Eyebrow>MARKETPLACE SIGNALS</Eyebrow>
        <Text style={styles.title}>The record behind your farm.</Text>
        <Text style={styles.subtitle}>
          Real listings, orders and freshness scans, summarised so a cooperative, bank or grant
          programme can see how your farm is showing up.
        </Text>
      </View>

      {!user ? (
        <Card style={styles.gateCard}>
          <View style={styles.gateIcon}><Sprout color={colors.pine} size={20} /></View>
          <Text style={styles.gateTitle}>Signals start with your first season.</Text>
          <Text style={styles.subtitle}>
            Sign in as a farmer to build a record from real marketplace activity.
          </Text>
          <AppButton label="Continue with phone" onPress={() => router.push('/profile' as never)} />
        </Card>
      ) : !isFarmer ? (
        <Card style={styles.gateCard}>
          <View style={styles.gateIcon}><Sprout color={colors.pine} size={20} /></View>
          <Text style={styles.gateTitle}>This space is for your farm.</Text>
          <Text style={styles.subtitle}>
            Switch your profile to Farmer or Both to publish harvests and build your record.
          </Text>
          <AppButton label="Update profile" variant="secondary" onPress={() => router.push('/profile' as never)} />
        </Card>
      ) : loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.pine} />
          <Text style={styles.subtitle}>Reading your marketplace activity…</Text>
        </Card>
      ) : signals ? (
        <>
          <SegmentedControl
            options={windowOptions}
            value={range}
            onChange={(value) => setRange(value)}
            style={styles.segment}
          />

          <Card style={styles.scoreCard}>
            <View style={styles.scoreHead}>
              <View style={styles.scoreCopy}>
                <Eyebrow>ACTIVITY SIGNAL</Eyebrow>
                <Text style={styles.scoreTitle}>
                  {signals.hasHistory ? 'A record in motion.' : 'Your record starts here.'}
                </Text>
              </View>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreValue}>{signals.activityScore}</Text>
                <Text style={styles.scoreOutOf}>/ 100</Text>
              </View>
            </View>
            <ProgressBar value={signals.activityScore} />
            <Text style={styles.helper}>
              Built from listings published, orders delivered, freshness scans and your delivery
              rate. It is supporting evidence — not a credit score or a lending decision.
            </Text>
            <View style={styles.statRow}>
              <StatTile label="Consistency" value={`${signals.consistency}%`} hint="Active weeks" />
              <StatTile label="Delivery rate" value={`${signals.deliveryRate}%`} hint="Orders delivered" />
              <StatTile label="Sales volume" value={formatNaira(signals.salesValue)} hint="Delivered" tone="gold" />
            </View>
          </Card>

          <Card style={styles.chartCard}>
            <SectionTitle
              eyebrow="WEEK BY WEEK"
              title="Weekly sales"
              action={<StatusBadge label={`${signals.days} days`} tone="gray" />}
            />
            {maxWeekly > 1 ? (
              <View style={styles.chart} accessibilityRole="image" accessibilityLabel="Weekly sales bar chart">
                {signals.weeklySales.map((week) => (
                  <View key={week.weekStart} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(4, Math.round((week.value / maxWeekly) * 78)) },
                          week.value === maxWeekly && styles.barPeak,
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel} numberOfLines={1}>{week.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.helper}>
                No delivered sales in the last eight weeks yet. Your first completed order will
                appear here.
              </Text>
            )}
          </Card>

          <Card style={styles.activityCard}>
            <SectionTitle eyebrow="WHAT MAKES UP THE SCORE" title="Activity this period" />
            <View style={styles.activityGrid}>
              <ActivityRow icon={<Leaf color={colors.leaf} size={16} />} label="Listings published" value={signals.listingsCreated} />
              <ActivityRow icon={<ChartNoAxesCombined color={colors.leaf} size={16} />} label="Orders received" value={signals.ordersReceived} />
              <ActivityRow icon={<FileCheck2 color={colors.leaf} size={16} />} label="Orders delivered" value={signals.ordersDelivered} />
              <ActivityRow icon={<Sprout color={colors.leaf} size={16} />} label="Freshness scans" value={signals.scansCompleted} />
            </View>
            <View style={styles.footnote}>
              <Text style={styles.footnoteText}>
                Active listings right now: {signals.activeListings} · Pending orders:{' '}
                {signals.pendingOrders} · Completed this month: {signals.completedThisMonth}
              </Text>
            </View>
          </Card>

          <View style={styles.reportRow}>
            <View style={styles.reportCopy}>
              <Eyebrow>SHARE YOUR STORY</Eyebrow>
              <Text style={styles.reportTitle}>A private link, ready when you are.</Text>
              <Text style={styles.helper}>
                Creates a signed snapshot you can send to a cooperative, bank or grant programme.
              </Text>
            </View>
            <FileCheck2 color={colors.pine} size={22} />
          </View>

          {report.url ? (
            <Card style={styles.reportReady}>
              <View style={styles.reportLinkCopy}>
                <Text style={styles.reportLinkLabel}>Your private report link</Text>
                <Text style={styles.reportLink} numberOfLines={2}>{report.url}</Text>
              </View>
              <AppButton
                label="Share"
                variant="secondary"
                icon={<Share2 color={colors.pine} size={15} />}
                onPress={() => void report.share(report.url)}
              />
            </Card>
          ) : null}

          {report.message ? (
            <MessageBanner tone={report.message.includes('ready') ? 'info' : 'error'}>
              {report.message}
            </MessageBanner>
          ) : null}

          <AppButton
            label={report.busy ? 'Preparing report…' : report.url ? 'Create a new report' : 'Generate activity report'}
            icon={<Share2 color={colors.white} size={16} />}
            loading={report.busy}
            onPress={() => void report.create()}
            style={styles.reportButton}
          />
          <Text style={styles.disclaimer}>
            This report reflects real marketplace activity. It does not guarantee a loan or replace
            a lender’s review.
          </Text>
        </>
      ) : null}
    </ScreenScroll>
  )
}

function ActivityRow({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityIcon}>{icon}</View>
      <Text style={styles.activityLabel}>{label}</Text>
      <Text style={styles.activityValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: 15, paddingBottom: 36 },
  heading: { gap: 7, paddingHorizontal: 20, paddingTop: 3 },
  title: { ...typeScale.display },
  subtitle: { ...typeScale.small, color: colors.muted },
  segment: { marginHorizontal: 18 },
  gateCard: { alignItems: 'flex-start', gap: 12, marginHorizontal: 18 },
  gateIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: radii.md, height: 42, justifyContent: 'center', width: 42 },
  gateTitle: { ...typeScale.heading, color: colors.ink },
  loadingCard: { alignItems: 'center', gap: 12, marginHorizontal: 18, paddingVertical: 26 },
  scoreCard: { gap: 12, marginHorizontal: 18 },
  scoreHead: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  scoreCopy: { flex: 1, gap: 4 },
  scoreTitle: { ...typeScale.heading, color: colors.ink },
  scoreBadge: { alignItems: 'baseline', backgroundColor: colors.paleGreen, borderRadius: radii.md, flexDirection: 'row', paddingHorizontal: 11, paddingVertical: 8 },
  scoreValue: { color: colors.pine, fontSize: 22, fontWeight: '800' },
  scoreOutOf: { color: colors.muted, fontSize: 9 },
  helper: { ...typeScale.micro, color: colors.muted },
  statRow: { flexDirection: 'row', gap: 8 },
  chartCard: { gap: 4, marginHorizontal: 18 },
  chart: { alignItems: 'flex-end', flexDirection: 'row', gap: 7, height: 112, paddingTop: 6 },
  barColumn: { alignItems: 'center', flex: 1, gap: 6 },
  barTrack: { alignItems: 'center', flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar: { backgroundColor: colors.paleGreen, borderRadius: 5, width: '72%' },
  barPeak: { backgroundColor: colors.leaf },
  barLabel: { color: colors.muted, fontSize: 8 },
  activityCard: { gap: 4, marginHorizontal: 18 },
  activityGrid: { gap: 2 },
  activityRow: { alignItems: 'center', borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingVertical: 10 },
  activityIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 9, height: 28, justifyContent: 'center', width: 28 },
  activityLabel: { color: colors.ink, flex: 1, fontSize: 12, fontWeight: '600' },
  activityValue: { color: colors.pine, fontSize: 15, fontWeight: '800' },
  footnote: { backgroundColor: colors.cream, borderRadius: radii.sm, padding: 10 },
  footnoteText: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  reportRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 4 },
  reportCopy: { flex: 1, gap: 4 },
  reportTitle: { ...typeScale.heading, color: colors.ink },
  reportReady: { alignItems: 'center', flexDirection: 'row', gap: 10, marginHorizontal: 18, padding: 11 },
  reportLinkCopy: { flex: 1, gap: 3 },
  reportLinkLabel: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  reportLink: { color: colors.muted, fontSize: 9, lineHeight: 13 },
  reportButton: { alignSelf: 'stretch', marginHorizontal: 18 },
  disclaimer: { color: colors.muted, fontSize: 9, lineHeight: 14, paddingHorizontal: 24, textAlign: 'center' },
})
