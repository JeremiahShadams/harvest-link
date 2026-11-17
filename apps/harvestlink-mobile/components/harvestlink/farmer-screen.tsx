import { useMemo, useState } from 'react'
import { router } from 'expo-router'
import { BadgeCheck, ChartNoAxesCombined, FileCheck2, Leaf, Plus, Share2, Sprout } from 'lucide-react-native'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader } from './app-header'
import { ListingForm } from './listing-form'
import { AppButton, Card, colors, EmptyState, Eyebrow, MessageBanner, SectionTitle, StatusBadge } from './ui'
import { useHarvestLink } from './context'
import { useFarmerListings, useOrders, useScans } from '@/lib/harvestlink/use-data'
import { formatDate, formatNaira, formatQuantity } from '@/lib/harvestlink/utils'
import { useActivityReport } from '@/lib/harvestlink/use-report'
import { computeFarmerSignals } from '@/lib/harvestlink/signals'
import { listingImage } from '@/lib/harvestlink/images'
import { Image } from 'expo-image'
import type { Listing } from '@/lib/harvestlink/types'

export function FarmerScreen() {
  const { user, profile, latestScan } = useHarvestLink()
  const { data: listings, error: listingError, isLoading: listingsLoading, mutate: mutateListings } = useFarmerListings(user?.id ?? null)
  const { data: orders, mutate: mutateOrders } = useOrders(user?.id ?? null)
  const { data: scans } = useScans(user?.id ?? null)
  const [showListingForm, setShowListingForm] = useState(false)
  const report = useActivityReport()

  const farmerOrders = useMemo(() => (orders ?? []).filter((order) => order.farmer_id === user?.id), [orders, user?.id])
  const activeListings = (listings ?? []).filter((listing) => listing.status === 'active')
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
  const activityScore = signals?.activityScore ?? 0
  const deliveryRate = signals?.deliveryRate ?? 0

  const farmerRole = profile?.role === 'farmer' || profile?.role === 'both'
  const lastScanMatches = latestScan && latestScan.crop.toLowerCase().includes('tomato') ? latestScan : latestScan

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader />
        <View style={styles.heading}>
          <Eyebrow>YOUR WORK, WELL RECORDED</Eyebrow>
          <Text style={styles.title}>{profile?.farm_name || 'Your farm'}</Text>
          <Text style={styles.subtitle}>A clear picture of the harvests, orders, and activity you’ve built.</Text>
        </View>

        {!user ? (
          <EmptyState title="Build your farm record as you grow." message="Sign in with your phone as a farmer to list harvests, manage orders, and create a shareable activity report." action={<AppButton label="Start farmer profile" onPress={() => router.push('/profile' as never)} />} />
        ) : !farmerRole ? (
          <Card style={styles.roleCard}><View style={styles.roleIcon}><Sprout color={colors.pine} size={19} /></View><Text style={styles.cardTitle}>Your farm belongs here.</Text><Text style={styles.subtitle}>Switch your profile to Farmer or Both to publish harvests and see your activity signals.</Text><AppButton label="Update profile" variant="secondary" onPress={() => router.push('/profile' as never)} /></Card>
        ) : (
          <>
            <Card style={styles.farmIdentity}>
              <View style={styles.farmIdentityTop}><View style={styles.farmMark}><Sprout color={colors.white} size={20} /></View><View style={styles.farmIdentityCopy}><Eyebrow>FARM PROFILE</Eyebrow><Text style={styles.farmName}>{profile.farm_name || 'Independent farm'}</Text><Text style={styles.owner}>{profile.display_name} · {profile.default_area}</Text></View><BadgeCheck color={colors.leaf} size={20} /></View>
              <View style={styles.identityDivider} />
              <Text style={styles.identityText}>Your listings and completed orders help create a transparent record of how your farm is showing up in the market.</Text>
            </Card>

            <View style={styles.metricsGrid}>
              <MetricCard label="Active harvests" value={activeListings.length} icon={<Leaf color={colors.leaf} size={17} />} />
              <MetricCard label="Orders received" value={signals?.ordersReceived ?? 0} icon={<ChartNoAxesCombined color={colors.leaf} size={17} />} />
              <MetricCard label="Delivered" value={signals?.ordersDelivered ?? 0} icon={<BadgeCheck color={colors.leaf} size={17} />} />
              <MetricCard label="Sales recorded" value={formatNaira(signals?.salesValue ?? 0)} icon={<FileCheck2 color={colors.leaf} size={17} />} />
            </View>

            <View style={styles.actionRow}>
              <AppButton label="List a harvest" icon={<Plus color={colors.white} size={16} />} onPress={() => setShowListingForm(true)} style={styles.actionFlex} />
              <AppButton label="Freshness scan" icon={<Leaf color={colors.pine} size={15} />} variant="secondary" onPress={() => router.push('/scan' as never)} style={styles.actionFlex} />
            </View>
            {latestScan ? <Card style={styles.scanAttached}><View style={styles.scanAttachedIcon}><CheckIcon /></View><View style={styles.scanAttachedCopy}><Text style={styles.scanAttachedTitle}>Recent scan ready to attach</Text><Text style={styles.helper}>{latestScan.crop} · {Math.round(latestScan.confidence * 100)}% visual confidence</Text></View><AppButton label="Use" variant="quiet" onPress={() => setShowListingForm(true)} /></Card> : null}

            <Card style={styles.signalCard}>
              <View style={styles.signalHead}><View><Eyebrow>ACTIVITY SIGNAL</Eyebrow><Text style={styles.cardTitle}>A steady rhythm.</Text></View><View style={styles.score}><Text style={styles.scoreValue}>{activityScore}</Text><Text style={styles.scoreOutOf}>/ 100</Text></View></View>
              <Text style={styles.signalDescription}>A simple, explainable summary of recent marketplace activity—not a credit score or lending decision.</Text>
              <View style={styles.signalTrack}><View style={[styles.signalFill, { width: `${activityScore}%` }]} /></View>
              <View style={styles.signalGrid}><SignalDetail label="Listed · 30 days" value={signals?.listingsCreated ?? 0} /><SignalDetail label="Scans · 30 days" value={signals?.scansCompleted ?? 0} /><SignalDetail label="Delivery rate" value={`${deliveryRate}%`} /></View>
            </Card>

            <View style={styles.reportRow}><View style={styles.reportCopy}><Eyebrow>SHARE YOUR STORY</Eyebrow><Text style={styles.reportTitle}>A real record, ready to share.</Text><Text style={styles.helper}>Create a private 30-day activity snapshot for a cooperative, bank, or grant programme.</Text></View><FileCheck2 color={colors.pine} size={21} /></View>
            {report.url ? <Card style={styles.reportReady}><View style={styles.reportLinkCopy}><Text style={styles.reportLinkLabel}>Your private report link</Text><Text style={styles.reportLink} numberOfLines={2}>{report.url}</Text></View><AppButton label="Share" variant="secondary" icon={<Share2 color={colors.pine} size={15} />} onPress={() => void report.share(report.url)} /></Card> : null}
            {report.message ? <MessageBanner tone={report.message.includes('ready') ? 'info' : 'error'}>{report.message}</MessageBanner> : null}
            <AppButton label={report.busy ? 'Preparing report…' : report.url ? 'Create a new report' : 'Generate activity report'} icon={<Share2 color={colors.white} size={16} />} onPress={() => void report.create()} loading={report.busy} style={styles.reportButton} />
            <Text style={styles.disclaimer}>This report reflects real marketplace activity. It does not guarantee a loan or replace a lender’s review.</Text>

            <View style={styles.listingsHead}><SectionTitle eyebrow="YOUR HARVESTS" title="Listings & orders" /><StatusBadge label={`${activeListings.length} active`} /></View>
            {listingError ? <MessageBanner>Your harvests could not be loaded. Check your connection and try again.</MessageBanner> : null}
            {listingsLoading && !listings ? <Card style={styles.loading}><ActivityIndicator color={colors.pine} /><Text style={styles.helper}>Loading your harvests…</Text></Card> : listings?.length ? <View style={styles.harvestList}>{listings.map((listing) => <HarvestRow key={listing.id} listing={listing} />)}</View> : <EmptyState title="Your first harvest starts here." message="List your crop, quantity, price, and area to help nearby buyers find it." action={<AppButton label="List a harvest" variant="secondary" onPress={() => setShowListingForm(true)} />} />}
            {farmerOrders.length ? <Text style={styles.orderNudge}>{farmerOrders.filter((order) => order.status !== 'delivered').length} orders still need your attention. <Text onPress={() => router.push('/orders' as never)} style={styles.inlineLink}>Open orders</Text></Text> : null}
          </>
        )}
      </ScrollView>
      <ListingForm visible={showListingForm} latestScan={lastScanMatches} onClose={() => { setShowListingForm(false); void Promise.all([mutateListings(), mutateOrders()]) }} />
    </SafeAreaView>
  )
}

function CheckIcon() {
  return <Text style={styles.checkGlyph}>✓</Text>
}

function MetricCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return <Card style={styles.metric}><View style={styles.metricIcon}>{icon}</View><Text style={styles.metricValue} numberOfLines={1}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></Card>
}

function SignalDetail({ label, value }: { label: string; value: number | string }) {
  return <View style={styles.signalDetail}><Text style={styles.signalDetailValue}>{value}</Text><Text style={styles.signalDetailLabel}>{label}</Text></View>
}

function HarvestRow({ listing }: { listing: Listing }) {
  return <Card style={styles.harvestRow}>
    <Image source={listingImage(listing)} contentFit="cover" transition={120} style={styles.harvestImage} accessibilityLabel={`${listing.crop} listing`} />
    <View style={styles.harvestCopy}><View style={styles.harvestTitleRow}><Text style={styles.harvestName}>{listing.crop}</Text><StatusBadge label={listing.status === 'active' ? 'Active' : listing.status} tone={listing.status === 'active' ? 'green' : 'gray'} /></View><Text style={styles.helper}>{formatQuantity(listing.available_kg)} kg · {formatNaira(listing.price_per_kg)}/kg</Text><Text style={styles.harvestDate}>Listed {formatDate(listing.created_at)} · {listing.area}</Text></View>
  </Card>
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { alignSelf: 'center', gap: 15, maxWidth: 520, paddingBottom: 32, width: '100%' },
  heading: { gap: 7, paddingHorizontal: 20, paddingTop: 3 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.9 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  roleCard: { alignItems: 'flex-start', gap: 12, marginHorizontal: 18 },
  roleIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  farmIdentity: { gap: 13, marginHorizontal: 18, padding: 15 },
  farmIdentityTop: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  farmMark: { alignItems: 'center', backgroundColor: colors.pine, borderRadius: 14, height: 43, justifyContent: 'center', width: 43 },
  farmIdentityCopy: { flex: 1, gap: 2 },
  farmName: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  owner: { color: colors.muted, fontSize: 10 },
  identityDivider: { backgroundColor: colors.line, height: 1 },
  identityText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 18 },
  metric: { alignItems: 'flex-start', flexBasis: '47%', flexGrow: 1, gap: 5, minHeight: 106, padding: 12 },
  metricIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 10, height: 30, justifyContent: 'center', width: 30 },
  metricValue: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.5, maxWidth: '100%' },
  metricLabel: { color: colors.muted, fontSize: 10 },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
  actionFlex: { alignSelf: 'stretch', flex: 1, minHeight: 45, paddingHorizontal: 10 },
  scanAttached: { alignItems: 'center', flexDirection: 'row', gap: 9, marginHorizontal: 18, padding: 11 },
  scanAttachedIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 11, height: 34, justifyContent: 'center', width: 34 },
  checkGlyph: { color: colors.leaf, fontSize: 18, fontWeight: '800' },
  scanAttachedCopy: { flex: 1, gap: 2 },
  scanAttachedTitle: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  signalCard: { gap: 10, marginHorizontal: 18 },
  signalHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  score: { alignItems: 'baseline', backgroundColor: colors.paleGreen, borderRadius: 13, flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7 },
  scoreValue: { color: colors.pine, fontSize: 20, fontWeight: '800' },
  scoreOutOf: { color: colors.muted, fontSize: 9 },
  signalDescription: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  signalTrack: { backgroundColor: '#E6E9E1', borderRadius: 99, height: 6, overflow: 'hidden' },
  signalFill: { backgroundColor: colors.leaf, borderRadius: 99, height: '100%' },
  signalGrid: { borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  signalDetail: { gap: 3 },
  signalDetailValue: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  signalDetailLabel: { color: colors.muted, fontSize: 9 },
  reportRow: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 2 },
  reportCopy: { flex: 1, gap: 4 },
  reportTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  reportReady: { alignItems: 'center', flexDirection: 'row', gap: 10, marginHorizontal: 18, padding: 11 },
  reportLinkCopy: { flex: 1, gap: 3 },
  reportLinkLabel: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  reportLink: { color: colors.muted, fontSize: 9, lineHeight: 13 },
  reportButton: { alignSelf: 'stretch', marginHorizontal: 18 },
  disclaimer: { color: colors.muted, fontSize: 9, lineHeight: 14, paddingHorizontal: 22, textAlign: 'center' },
  listingsHead: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 18 },
  loading: { alignItems: 'center', gap: 10, marginHorizontal: 18, paddingVertical: 22 },
  harvestList: { gap: 9, paddingHorizontal: 18 },
  harvestRow: { alignItems: 'center', flexDirection: 'row', gap: 11, padding: 10 },
  harvestImage: { backgroundColor: colors.paleGreen, borderRadius: 12, height: 70, width: 70 },
  harvestCopy: { flex: 1, gap: 4 },
  harvestTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'space-between' },
  harvestName: { color: colors.ink, flex: 1, fontSize: 13, fontWeight: '700' },
  harvestDate: { color: colors.muted, fontSize: 9 },
  orderNudge: { color: colors.muted, fontSize: 10, paddingHorizontal: 20 },
  inlineLink: { color: colors.pine, fontWeight: '700' },
})
