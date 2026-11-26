import { MapPin, ShieldCheck, ShoppingBasket } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import type { Listing } from '@/lib/harvestlink/types'
import { formatNaira, formatUnitCount, formatUnitSingular } from '@/lib/harvestlink/utils'
import { listingImage } from '@/lib/harvestlink/images'
import { colors, fonts, HarvestListCard, StatusBadge } from './ui'

export function ProductCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const days = Number(listing.estimated_shelf_life_days) || 0
  const unitLabel = formatUnitSingular(listing.unit)

  return (
    <HarvestListCard
      accessibilityLabel={`View ${listing.crop} from ${listing.farm_name}`}
      badge={<StatusBadge label={`~${days} days`} tone={days <= 2 ? 'gold' : 'green'} />}
      eyebrow={listing.category || 'Fresh produce'}
      imageAccessibilityLabel={`${listing.crop} harvested at ${listing.farm_name}`}
      imageSource={listingImage(listing)}
      imageVariant="tall"
      onPress={onPress}
      subtitle={`${listing.farm_name || 'Local farm'} · ${listing.farmer_name}`}
      title={listing.crop}
    >
      <View style={styles.location}>
        <MapPin size={13} color={colors.leaf} />
        <Text style={styles.locationText} numberOfLines={1}>{listing.area}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.stock} numberOfLines={1}>{formatUnitCount(listing.available_kg, listing.unit)} available</Text>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.priceBlock}>
          <Text style={styles.price}>
            {formatNaira(listing.price_per_kg)}
            <Text style={styles.unit}> / {unitLabel}</Text>
          </Text>
          <View style={styles.signal}>
            <ShieldCheck color={colors.leaf} size={13} />
            <Text style={styles.signalText}>Farmer listed</Text>
          </View>
        </View>
        <View style={styles.addButton}>
          <ShoppingBasket color={colors.white} size={18} />
        </View>
      </View>
    </HarvestListCard>
  )
}

const styles = StyleSheet.create({
  location: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 2 },
  locationText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 12, flexShrink: 0 },
  dot: { fontFamily: fonts.body, color: '#9BA299', fontSize: 12 },
  stock: { fontFamily: fonts.bodyMedium, color: colors.muted, flexShrink: 1, fontSize: 12 },
  bottomRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  priceBlock: { flex: 1, minWidth: 0 },
  price: { fontFamily: fonts.headingExtra, color: colors.pine, fontSize: 17, letterSpacing: -0.3 },
  unit: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, letterSpacing: 0 },
  signal: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 3 },
  signalText: { fontFamily: fonts.bodyMedium, color: colors.leaf, fontSize: 12 },
  addButton: { alignItems: 'center', backgroundColor: colors.pine, borderRadius: 13, height: 44, justifyContent: 'center', width: 44 },
})
