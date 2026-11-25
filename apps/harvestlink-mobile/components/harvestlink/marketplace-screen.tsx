import { useMemo, useState } from 'react'
import { ImageBackground } from 'expo-image'
import { router } from 'expo-router'
import { ArrowDownWideNarrow, ArrowRight, MapPin, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react-native'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader } from './app-header'
import { OrderSheet } from './order-sheet'
import { ProductCard } from './product-card'
import {
  AnimatedEntrance,
  AppButton,
  Card,
  colors,
  EmptyState,
  Eyebrow,
  fonts,
  MessageBanner,
  ProductCardSkeleton,
  SectionTitle,
} from './ui'
import { useListings } from '@/lib/harvestlink/use-data'
import { AREAS, CATEGORIES } from '@/lib/harvestlink/utils'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { useHarvestLink } from './context'
import type { Listing } from '@/lib/harvestlink/types'

const heroImage = require('../../assets/images/harvest-hero.jpg')

export function MarketplaceScreen() {
  const { profile, t } = useHarvestLink()
  const { data: listings, isLoading, isValidating, error, mutate } = useListings()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All produce')
  const [area, setArea] = useState('All areas')
  const [sortByPrice, setSortByPrice] = useState(false)
  const [longerLasting, setLongerLasting] = useState(false)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return [...(listings ?? [])]
      .filter(
        (listing) =>
          !needle ||
          [listing.crop, listing.farm_name, listing.farmer_name, listing.area].some((value) =>
            value.toLowerCase().includes(needle),
          ),
      )
      .filter(
        (listing) =>
          category === 'All produce' ||
          listing.category.toLowerCase() === category.toLowerCase() ||
          listing.crop.toLowerCase().includes(category.toLowerCase().replace('leafy greens', 'leaf')),
      )
      .filter((listing) => area === 'All areas' || listing.area === area)
      .filter((listing) => !longerLasting || Number(listing.estimated_shelf_life_days) >= 3)
      .sort((a, b) =>
        sortByPrice
          ? Number(a.price_per_kg) - Number(b.price_per_kg)
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
  }, [area, category, listings, longerLasting, search, sortByPrice])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await mutate()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (isValidating && Boolean(listings?.length))}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.pine}
            colors={[colors.pine]}
          />
        }
      >
        <AppHeader />

        <AnimatedEntrance>
          <ImageBackground source={heroImage} contentFit="cover" style={styles.hero} imageStyle={styles.heroImage}>
            <View style={styles.heroShade} />
            <View style={styles.heroCopy}>
              <Eyebrow light>{t('marketEyebrow')}</Eyebrow>
              <Text style={styles.heroTitle}>{t('marketTitle')}</Text>
              <Text style={styles.heroSubtitle}>{t('marketSubtitle')}</Text>
              <View style={styles.heroLocation}>
                <MapPin color="#F3E6C8" size={14} />
                <Text style={styles.heroLocationText}>{profile?.default_area ?? 'Discover across Lagos & Ogun'}</Text>
              </View>
            </View>
          </ImageBackground>
        </AnimatedEntrance>

        <View style={styles.searchWrap}>
          <Search color={colors.muted} size={18} />
          <TextInput
            accessibilityLabel="Search produce, farms, or area"
            onChangeText={setSearch}
            placeholder={t('marketSearchPlaceholder')}
            placeholderTextColor="#7A847D"
            returnKeyType="search"
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch('')}
              style={styles.clearSearchButton}
            >
              <X color={colors.muted} size={18} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionRow}>
          <SectionTitle eyebrow={t('marketPicksEyebrow')} title={t('marketPicksTitle')} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sortByPrice ? 'Sort by newest' : 'Sort by lowest price'}
            onPress={() => {
              triggerSelectionHaptic()
              setSortByPrice((value) => !value)
            }}
            style={styles.sortButton}
          >
            <ArrowDownWideNarrow color={colors.pine} size={16} />
            <Text style={styles.sortText}>{sortByPrice ? 'Lowest price' : 'Newest'}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((option) => (
            <FilterChip
              key={option}
              label={option}
              selected={category === option}
              onPress={() => {
                triggerSelectionHaptic()
                setCategory(option)
              }}
            />
          ))}
        </ScrollView>

        <View style={styles.areaHeading}>
          <MapPin size={14} color={colors.leaf} />
          <Text style={styles.areaLabel}>Filter by farm hub or area</Text>
          <SlidersHorizontal size={14} color={colors.muted} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {['All areas', ...AREAS].map((option) => (
            <FilterChip
              key={option}
              label={option}
              selected={area === option}
              onPress={() => {
                triggerSelectionHaptic()
                setArea(option)
              }}
            />
          ))}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: longerLasting }}
          onPress={() => {
            triggerSelectionHaptic()
            setLongerLasting((value) => !value)
          }}
          style={[styles.freshnessFilter, longerLasting && styles.freshnessFilterSelected]}
        >
          <Sparkles color={longerLasting ? colors.white : colors.leaf} size={15} />
          <Text style={[styles.freshnessText, longerLasting && styles.freshnessTextSelected]}>
            At least 3 days of estimated freshness
          </Text>
        </Pressable>

        {error ? (
          <View style={styles.errorWrap}>
            <MessageBanner>We couldn’t load the market just now. Pull down to refresh.</MessageBanner>
          </View>
        ) : null}

        {isLoading && !listings?.length ? (
          <View style={styles.productList}>
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </View>
        ) : filtered.length ? (
          <View style={styles.productList}>
            {filtered.map((listing) => (
              <ProductCard key={listing.id} listing={listing} onPress={() => setSelectedListing(listing)} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyState
              title={listings?.length ? 'No harvests match these filters.' : 'A fresh market is taking root.'}
              message={
                listings?.length
                  ? 'Try another crop or area to see what’s available.'
                  : 'There are no active farmer listings in this area yet. Pull down to refresh or list a harvest.'
              }
              action={
                listings?.length ? (
                  <AppButton
                    label="Clear filters"
                    variant="secondary"
                    onPress={() => {
                      setSearch('')
                      setCategory('All produce')
                      setArea('All areas')
                      setLongerLasting(false)
                    }}
                  />
                ) : (
                  <AppButton
                    label="Open profile"
                    variant="secondary"
                    icon={<ArrowRight color={colors.pine} size={15} />}
                    onPress={() => router.push('/profile' as never)}
                  />
                )
              }
            />
          </View>
        )}

        <Card style={styles.scanPrompt}>
          <View style={styles.scanIcon}><Sparkles color={colors.pine} size={18} /></View>
          <View style={styles.scanCopy}>
            <Text style={styles.scanTitle}>Already brought something home?</Text>
            <Text style={styles.scanText}>Get a careful visual freshness estimate and storage tips.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open freshness scanner"
            onPress={() => router.push('/scan' as never)}
            style={styles.scanArrow}
          >
            <ArrowRight color={colors.pine} size={18} />
          </Pressable>
        </Card>

        <Text style={styles.disclaimer}>Shelf-life badges are visual estimates, not food-safety assessments.</Text>
      </ScrollView>

      <OrderSheet listing={selectedListing} onClose={() => setSelectedListing(null)} />
    </SafeAreaView>
  )
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { alignSelf: 'center', gap: 13, maxWidth: 520, paddingBottom: 32, width: '100%' },
  hero: { borderRadius: 23, height: 198, justifyContent: 'flex-end', marginHorizontal: 18, overflow: 'hidden' },
  heroImage: { borderRadius: 23 },
  heroShade: { backgroundColor: 'rgba(18,45,31,0.56)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  heroCopy: { gap: 6, padding: 18 },
  heroTitle: { fontFamily: fonts.headingExtra, color: colors.white, fontSize: 27, letterSpacing: -0.7, lineHeight: 32, maxWidth: 300 },
  heroSubtitle: { fontFamily: fonts.body, color: '#F3F1E8', fontSize: 13, lineHeight: 18, maxWidth: 320 },
  heroLocation: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 2 },
  heroLocationText: { fontFamily: fonts.bodyMedium, color: '#F3E6C8', fontSize: 12 },
  searchWrap: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 9, marginHorizontal: 18, minHeight: 50, paddingLeft: 14, paddingRight: 8 },
  searchInput: { fontFamily: fonts.body, color: colors.ink, flex: 1, fontSize: 14, paddingVertical: 12 },
  clearSearchButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  sectionRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 4 },
  sortButton: { alignItems: 'center', flexDirection: 'row', gap: 5, marginBottom: 10, minHeight: 44, paddingHorizontal: 8 },
  sortText: { fontFamily: fonts.bodyBold, color: colors.pine, fontSize: 12 },
  chips: { gap: 8, paddingHorizontal: 18 },
  chip: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 15 },
  chipSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  chipText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13 },
  chipTextSelected: { fontFamily: fonts.bodyBold, color: colors.white },
  areaHeading: { alignItems: 'center', flexDirection: 'row', gap: 6, marginHorizontal: 19, marginTop: 2 },
  areaLabel: { fontFamily: fonts.bodyBold, color: colors.ink, flex: 1, fontSize: 13 },
  freshnessFilter: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 7, marginHorizontal: 18, minHeight: 44, paddingHorizontal: 14 },
  freshnessFilterSelected: { backgroundColor: colors.leaf, borderColor: colors.leaf },
  freshnessText: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13 },
  freshnessTextSelected: { fontFamily: fonts.bodyBold, color: colors.white },
  errorWrap: { paddingHorizontal: 18 },
  emptyWrap: { paddingHorizontal: 18 },
  productList: { gap: 12, paddingHorizontal: 18 },
  scanPrompt: { alignItems: 'center', flexDirection: 'row', gap: 12, marginHorizontal: 18, padding: 14 },
  scanIcon: { alignItems: 'center', backgroundColor: colors.paleGold, borderRadius: 13, height: 44, justifyContent: 'center', width: 44 },
  scanCopy: { flex: 1, gap: 3 },
  scanTitle: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 14 },
  scanText: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 17 },
  scanArrow: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 12, height: 44, justifyContent: 'center', width: 44 },
  disclaimer: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 17, paddingHorizontal: 20, textAlign: 'center' },
})
