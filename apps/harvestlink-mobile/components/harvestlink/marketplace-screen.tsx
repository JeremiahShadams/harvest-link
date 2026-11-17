import { useMemo, useState } from 'react'
import { ImageBackground } from 'expo-image'
import { router } from 'expo-router'
import { ArrowDownWideNarrow, ArrowRight, MapPin, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader } from './app-header'
import { OrderSheet } from './order-sheet'
import { ProductCard } from './product-card'
import { AppButton, Card, colors, EmptyState, Eyebrow, MessageBanner, SectionTitle } from './ui'
import { useListings } from '@/lib/harvestlink/use-data'
import { AREAS, CATEGORIES } from '@/lib/harvestlink/utils'
import { useHarvestLink } from './context'
import type { Listing } from '@/lib/harvestlink/types'

const heroImage = require('../../assets/images/harvest-hero.png')

export function MarketplaceScreen() {
  const { profile } = useHarvestLink()
  const { data: listings, isLoading, error, mutate } = useListings()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All produce')
  const [area, setArea] = useState('All areas')
  const [sortByPrice, setSortByPrice] = useState(false)
  const [longerLasting, setLongerLasting] = useState(false)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return [...(listings ?? [])]
      .filter((listing) => !needle || [listing.crop, listing.farm_name, listing.farmer_name, listing.area].some((value) => value.toLowerCase().includes(needle)))
      .filter((listing) => category === 'All produce' || listing.category === category || listing.crop.toLowerCase().includes(category.toLowerCase().replace('leafy greens', 'leaf')))
      .filter((listing) => area === 'All areas' || listing.area === area)
      .filter((listing) => !longerLasting || Number(listing.estimated_shelf_life_days) >= 3)
      .sort((a, b) => sortByPrice ? Number(a.price_per_kg) - Number(b.price_per_kg) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [area, category, listings, longerLasting, search, sortByPrice])

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppHeader />
        <ImageBackground source={heroImage} contentFit="cover" style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroShade} />
          <View style={styles.heroCopy}>
            <Eyebrow light>FRESH, FROM NEARBY</Eyebrow>
            <Text style={styles.heroTitle}>A little closer to fresh.</Text>
            <Text style={styles.heroSubtitle}>Good harvests, from farms around your corner of Lagos.</Text>
            <View style={styles.heroLocation}><MapPin color="#F3E6C8" size={13} /><Text style={styles.heroLocationText}>{profile?.default_area ?? 'Discover across Lagos'}</Text></View>
          </View>
        </ImageBackground>

        <View style={styles.searchWrap}>
          <Search color={colors.muted} size={18} />
          <TextInput accessibilityLabel="Search produce, farms, or area" onChangeText={setSearch} placeholder="What would you like today?" placeholderTextColor="#899188" returnKeyType="search" style={styles.searchInput} value={search} />
          {search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}><X color={colors.muted} size={17} /></Pressable> : null}
        </View>

        <View style={styles.sectionRow}><SectionTitle eyebrow="THE MARKET" title="Fresh picks near you" /><Pressable accessibilityRole="button" accessibilityLabel={sortByPrice ? 'Sort by newest' : 'Sort by lowest price'} onPress={() => setSortByPrice((value) => !value)} style={styles.sortButton}><ArrowDownWideNarrow color={colors.pine} size={16} /><Text style={styles.sortText}>{sortByPrice ? 'Lowest price' : 'Newest'}</Text></Pressable></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((option) => <FilterChip key={option} label={option} selected={category === option} onPress={() => setCategory(option)} />)}
        </ScrollView>
        <View style={styles.areaHeading}><MapPin size={13} color={colors.leaf} /><Text style={styles.areaLabel}>Pick an area</Text><SlidersHorizontal size={13} color={colors.muted} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {['All areas', ...AREAS].map((option) => <FilterChip key={option} label={option} selected={area === option} onPress={() => setArea(option)} small />)}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: longerLasting }} onPress={() => setLongerLasting((value) => !value)} style={[styles.freshnessFilter, longerLasting && styles.freshnessFilterSelected]}>
          <Sparkles color={longerLasting ? colors.white : colors.leaf} size={14} /><Text style={[styles.freshnessText, longerLasting && styles.freshnessTextSelected]}>At least 3 days of estimated freshness</Text>
        </Pressable>

        {error ? <MessageBanner>We couldn’t load the market just now. Check your connection and try again.</MessageBanner> : null}
        {isLoading && !listings?.length ? <Card style={styles.loadingCard}><Text style={styles.loadingText}>Finding fresh harvests…</Text></Card> : filtered.length ? (
          <View style={styles.productList}>
            {filtered.map((listing) => <ProductCard key={listing.id} listing={listing} onPress={() => setSelectedListing(listing)} />)}
          </View>
        ) : (
          <EmptyState
            title={listings?.length ? 'No harvests match these filters.' : 'A fresh market is taking root.'}
            message={listings?.length ? 'Try another crop or area to see what’s available.' : 'There are no active farmer listings in this area yet. Check back soon, or join as a farmer to share your next harvest.'}
            action={listings?.length
              ? <AppButton label="Clear filters" variant="secondary" onPress={() => { setSearch(''); setCategory('All produce'); setArea('All areas'); setLongerLasting(false) }} />
              : <AppButton label="Explore farmer tools" variant="secondary" icon={<ArrowRight color={colors.pine} size={15} />} onPress={() => router.push('/farmer' as never)} />}
          />
        )}
        <Card style={styles.scanPrompt}>
          <View style={styles.scanIcon}><Sparkles color={colors.pine} size={17} /></View>
          <View style={styles.scanCopy}><Text style={styles.scanTitle}>Already brought something home?</Text><Text style={styles.scanText}>Get a careful visual freshness estimate and practical storage tips.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open freshness scanner" onPress={() => router.push('/scan' as never)} style={styles.scanArrow}><ArrowRight color={colors.pine} size={17} /></Pressable>
        </Card>
        <Text style={styles.disclaimer}>Shelf-life badges are visual estimates, not food-safety assessments.</Text>
        <Pressable accessibilityRole="button" onPress={() => void mutate()} style={styles.refreshLink}><Text style={styles.refreshText}>Refresh market</Text></Pressable>
      </ScrollView>
      <OrderSheet listing={selectedListing} onClose={() => setSelectedListing(null)} />
    </SafeAreaView>
  )
}

function FilterChip({ label, selected, onPress, small = false }: { label: string; selected: boolean; onPress: () => void; small?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, small && styles.smallChip, selected && styles.chipSelected]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text></Pressable>
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { alignSelf: 'center', gap: 13, maxWidth: 520, paddingBottom: 26, width: '100%' },
  hero: { borderRadius: 23, height: 196, justifyContent: 'flex-end', marginHorizontal: 18, overflow: 'hidden' },
  heroImage: { borderRadius: 23 },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,45,31,0.52)' },
  heroCopy: { gap: 7, padding: 18 },
  heroTitle: { color: colors.white, fontSize: 26, fontWeight: '700', letterSpacing: -0.8, lineHeight: 30, maxWidth: 300 },
  heroSubtitle: { color: '#F3F1E8', fontSize: 12, lineHeight: 17, maxWidth: 310 },
  heroLocation: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 2 },
  heroLocationText: { color: '#F3E6C8', fontSize: 11, fontWeight: '600' },
  searchWrap: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 9, marginHorizontal: 18, minHeight: 50, paddingHorizontal: 14 },
  searchInput: { color: colors.ink, flex: 1, fontSize: 13, paddingVertical: 12 },
  sectionRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 5 },
  sortButton: { alignItems: 'center', flexDirection: 'row', gap: 5, marginBottom: 14, padding: 5 },
  sortText: { color: colors.pine, fontSize: 10, fontWeight: '700' },
  chips: { gap: 7, paddingHorizontal: 18 },
  chip: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  smallChip: { paddingHorizontal: 11, paddingVertical: 7 },
  chipSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  chipTextSelected: { color: colors.white },
  areaHeading: { alignItems: 'center', flexDirection: 'row', gap: 5, marginHorizontal: 19, marginTop: 1 },
  areaLabel: { color: colors.ink, flex: 1, fontSize: 11, fontWeight: '700' },
  freshnessFilter: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 7, marginHorizontal: 18, paddingHorizontal: 12, paddingVertical: 8 },
  freshnessFilterSelected: { backgroundColor: colors.leaf, borderColor: colors.leaf },
  freshnessText: { color: colors.ink, fontSize: 10, fontWeight: '600' },
  freshnessTextSelected: { color: colors.white },
  loadingCard: { marginHorizontal: 18, paddingVertical: 22 },
  loadingText: { color: colors.muted, fontSize: 13 },
  productList: { gap: 10, paddingHorizontal: 18 },
  scanPrompt: { alignItems: 'center', flexDirection: 'row', gap: 11, marginHorizontal: 18, padding: 13 },
  scanIcon: { alignItems: 'center', backgroundColor: colors.paleGold, borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  scanCopy: { flex: 1, gap: 3 },
  scanTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  scanText: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  scanArrow: { alignItems: 'center', height: 35, justifyContent: 'center', width: 30 },
  disclaimer: { color: colors.muted, fontSize: 9, lineHeight: 14, paddingHorizontal: 20, textAlign: 'center' },
  refreshLink: { alignSelf: 'center', padding: 6 },
  refreshText: { color: colors.leaf, fontSize: 10, fontWeight: '700' },
})
