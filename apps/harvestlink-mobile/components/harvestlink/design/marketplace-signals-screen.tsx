import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  FileDown,
  Info,
  PackageCheck,
  ShieldCheck,
  Star,
  Timer,
  Zap,
} from 'lucide-react-native'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useHarvestLink } from '../context'
import { DesignHeader, DesignScreen, DesignSelect } from './ui'
import { body, C, heading, R, shadow } from './tokens'
import { useFarmerListings, useOrders, useScans } from '@/lib/harvestlink/use-data'
import { computeFarmerSignals } from '@/lib/harvestlink/signals'
import { useActivityReport } from '@/lib/harvestlink/use-report'
import { formatNaira } from '@/lib/harvestlink/utils'

type Range = '30' | '90'

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
]

const SALES_BARS = [40, 60, 45, 80, 70, 100]
const BAR_COLORS = [C.farm100, C.farm200, C.farm300, C.farm400, C.farm500, C.farm600]

export function MarketplaceSignalsScreen() {
  const { user, profile } = useHarvestLink()
  const { data: listings } = useFarmerListings(user?.id ?? null)
  const { data: orders } = useOrders(user?.id ?? null)
  const { data: scans } = useScans(user?.id ?? null)
  const report = useActivityReport()
  const [range, setRange] = useState<Range>('30')

  const signals = useMemo(() => {
    if (!user) return null
    return computeFarmerSignals({
      userId: user.id,
      listings: listings ?? [],
      orders: orders ?? [],
      scans: scans ?? [],
      days: range === '90' ? 90 : 30,
    })
  }, [listings, orders, range, scans, user])

  useEffect(() => {
    if (report.message) Alert.alert('Activity report', report.message)
  }, [report.message])

  const score = signals?.activityScore ?? (user ? 0 : 92)
  const deliveryRate = signals?.deliveryRate ?? (user ? 0 : 98)
  const sales = signals?.salesValue ?? (user ? 0 : 450000)
  const listingsCreated = signals?.listingsCreated ?? (user ? 0 : 14)
  const ordersCompleted = signals?.ordersDelivered ?? (user ? 0 : 38)
  const scansCompleted = signals?.scansCompleted ?? (user ? 0 : 22)
  const userName = profile?.display_name?.trim().split(/\s+/)[0] || 'Adebayo'
  const location = profile?.default_area || 'Ikorodu Farm Hub, Lagos'

  return (
    <DesignScreen
      activeTab="signals"
      header={<DesignHeader userName={userName} location={location} />}
      contentStyle={styles.content}
    >
      <View style={styles.titleBlock}>
        <Text style={styles.pageTitle}>Marketplace Signals</Text>
        <Text style={styles.pageSubtitle}>
          Building your track record. These metrics support your financial credibility.
        </Text>
      </View>

      <View style={styles.scoreCard}>
        <View style={styles.scoreGlow} />
        <View style={styles.scoreHeader}>
          <View>
            <Text style={styles.scoreLabel}>Consistency Score</Text>
            <View style={styles.scoreValueRow}>
              <Text style={styles.scoreValue}>{score}</Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
          </View>
          <View style={styles.awardWrap}><Award color={C.farm600} size={24} /></View>
        </View>
        <View style={styles.metricGrid}>
          <View style={styles.metricTile}>
            <View style={styles.metricLabelRow}>
              <PackageCheck color={C.slate400} size={16} />
              <Text style={styles.metricLabel}>Delivery Rate</Text>
            </View>
            <Text style={styles.metricValue}>{deliveryRate}%</Text>
          </View>
          <View style={styles.metricTile}>
            <View style={styles.metricLabelRow}>
              <Timer color={C.slate400} size={16} />
              <Text style={styles.metricLabel}>Response Time</Text>
            </View>
            <Text style={styles.metricValue}>{'< 2 hrs'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.trustSection}>
        <View style={styles.trustHeader}>
          <Text style={styles.sectionTitle}>Trust Badges</Text>
          <Info color={C.slate400} size={16} />
        </View>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, styles.badgeVerified]}>
            <ShieldCheck color={C.farm600} size={18} />
            <Text style={[styles.badgeText, styles.badgeTextVerified]}>Verified Seller</Text>
          </View>
          <View style={[styles.badge, styles.badgeFast]}>
            <Zap color={C.amber500} size={18} />
            <Text style={[styles.badgeText, styles.badgeTextFast]}>Fast Responder</Text>
          </View>
          <View style={[styles.badge, styles.badgeRating]}>
            <Star color={C.blue500} size={18} />
            <Text style={[styles.badgeText, styles.badgeTextRating]}>4.8 Avg Rating</Text>
          </View>
        </View>
      </View>

      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Activity ({Number(range)} Days)</Text>
          <DesignSelect
            accessibilityLabel="Activity date range"
            onChange={(next) => setRange(next)}
            options={RANGE_OPTIONS}
            style={styles.rangeSelect}
            textStyle={styles.rangeText}
            value={range}
          />
        </View>

        <View style={styles.salesBlock}>
          <View style={styles.salesLabelRow}>
            <Text style={styles.salesLabel}>Sales Volume</Text>
            <Text style={styles.salesValue}>{formatNaira(sales)}</Text>
          </View>
          <View style={styles.barChart}>
            {SALES_BARS.map((height, index) => (
              <View
                key={`${height}-${index}`}
                style={[styles.bar, { backgroundColor: BAR_COLORS[index], height: `${height}%` }]}
              />
            ))}
          </View>
        </View>

        <View style={styles.activityStats}>
          <View style={styles.activityRow}>
            <Text style={styles.activityLabel}>Listings Created</Text>
            <Text style={styles.activityValue}>{listingsCreated}</Text>
          </View>
          <View style={styles.activityRow}>
            <Text style={styles.activityLabel}>Orders Completed</Text>
            <Text style={styles.activityValue}>{ordersCompleted}</Text>
          </View>
          <View style={styles.activityRow}>
            <Text style={styles.activityLabel}>Quality Scans</Text>
            <Text style={styles.activityValue}>{scansCompleted}</Text>
          </View>
        </View>
      </View>

      <View style={styles.reportSection}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate Activity Report"
          disabled={report.busy}
          onPress={() => void report.create()}
          style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}
        >
          <FileDown color={C.white} size={18} />
          <Text style={styles.reportButtonText}>Generate Activity Report</Text>
        </Pressable>
        <Text style={styles.reportCaption}>
          Shareable PDF summarizing your marketplace activity for cooperatives and financial institutions.
        </Text>
      </View>
    </DesignScreen>
  )
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingBottom: 112, paddingHorizontal: 20, paddingTop: 16 },
  pressed: { transform: [{ scale: 0.98 }] },
  titleBlock: { marginBottom: 8 },
  pageTitle: heading({ color: C.slate900, fontSize: 24, fontWeight: '700' }),
  pageSubtitle: body({ color: C.slate500, fontSize: 14, lineHeight: 20, marginTop: 4 }),
  scoreCard: { backgroundColor: C.white, borderColor: C.slate200, borderRadius: R['3xl'], borderWidth: 1, overflow: 'hidden', padding: 20, ...shadow.sm },
  scoreGlow: { backgroundColor: C.farm50, borderRadius: R.pill, height: 160, opacity: 0.6, position: 'absolute', right: -40, top: -40, width: 160 },
  scoreHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, position: 'relative', zIndex: 1 },
  scoreLabel: body({ color: C.slate500, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 4, textTransform: 'uppercase' }),
  scoreValueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 8 },
  scoreValue: heading({ color: C.farm800, fontSize: 48, fontWeight: '700', lineHeight: 48 }),
  scoreOutOf: body({ color: C.slate400, fontSize: 18, fontWeight: '500' }),
  awardWrap: { alignItems: 'center', backgroundColor: C.farm50, borderRadius: R.pill, height: 48, justifyContent: 'center', width: 48 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 },
  metricTile: { backgroundColor: C.slate50, borderRadius: R['2xl'], flexBasis: '47%', flexGrow: 1, padding: 14 },
  metricLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 4 },
  metricLabel: body({ color: C.slate500, fontSize: 12, fontWeight: '500' }),
  metricValue: heading({ color: C.slate900, fontSize: 20, fontWeight: '700' }),
  trustSection: { gap: 16 },
  trustHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: heading({ color: C.slate900, fontSize: 18, fontWeight: '700' }),
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: { alignItems: 'center', borderRadius: R.xl, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  badgeVerified: { backgroundColor: C.farm50, borderColor: C.farm100 },
  badgeFast: { backgroundColor: C.amber50, borderColor: C.amber100 },
  badgeRating: { backgroundColor: C.blue50, borderColor: C.blue100 },
  badgeText: body({ fontSize: 14, fontWeight: '600' }),
  badgeTextVerified: { color: C.farm800 },
  badgeTextFast: { color: C.amber700 },
  badgeTextRating: { color: C.blue700 },
  activityCard: { backgroundColor: C.white, borderColor: C.slate200, borderRadius: R['3xl'], borderWidth: 1, padding: 20, ...shadow.sm },
  activityHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  rangeSelect: { backgroundColor: C.slate50, borderRadius: R.lg, minHeight: 26, paddingHorizontal: 8, paddingRight: 28, width: 108 },
  rangeText: body({ color: C.slate600, fontSize: 12, fontWeight: '400' }),
  salesBlock: {},
  salesLabelRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  salesLabel: body({ color: C.slate700, fontSize: 14, fontWeight: '500' }),
  salesValue: body({ color: C.slate900, fontSize: 16, fontWeight: '700' }),
  barChart: { alignItems: 'flex-end', flexDirection: 'row', gap: 4, height: 48 },
  bar: { borderTopLeftRadius: 2, borderTopRightRadius: 2, flex: 1 },
  activityStats: { borderTopColor: C.slate100, borderTopWidth: 1, gap: 12, marginTop: 20, paddingTop: 16 },
  activityRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  activityLabel: body({ color: C.slate600, fontSize: 14 }),
  activityValue: body({ color: C.slate900, fontSize: 16, fontWeight: '600' }),
  reportSection: { gap: 12, paddingTop: 8 },
  reportButton: { alignItems: 'center', backgroundColor: C.farm800, borderRadius: R.xl, flexDirection: 'row', gap: 8, height: 48, justifyContent: 'center', ...shadow.action },
  reportButtonText: body({ color: C.white, fontSize: 14, fontWeight: '700' }),
  reportCaption: body({ color: C.slate500, fontSize: 12, lineHeight: 16, paddingHorizontal: 16, textAlign: 'center' }),
})
