import { MapPin, ShieldCheck, ShoppingBasket } from 'lucide-react-native'
import { Image } from 'expo-image'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Listing } from '@/lib/harvestlink/types'
import { formatNaira, formatQuantity } from '@/lib/harvestlink/utils'
import { listingImage } from '@/lib/harvestlink/images'
import { colors, StatusBadge } from './ui'

export function ProductCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const days = Number(listing.estimated_shelf_life_days) || 0
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${listing.crop} from ${listing.farm_name}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={listingImage(listing)} contentFit="cover" transition={160} style={styles.image} accessibilityLabel={`${listing.crop} harvested at ${listing.farm_name}`} />
      <View style={styles.copy}>
        <View style={styles.metaRow}><Text style={styles.category}>{listing.category || 'Fresh produce'}</Text><StatusBadge label={`~${days} days`} tone={days <= 2 ? 'gold' : 'green'} /></View>
        <Text style={styles.crop}>{listing.crop}</Text>
        <Text style={styles.farm}>{listing.farm_name || 'Local farm'} · {listing.farmer_name}</Text>
        <View style={styles.location}><MapPin size={12} color={colors.leaf} /><Text style={styles.locationText}>{listing.area}</Text><Text style={styles.dot}>·</Text><Text style={styles.stock}>{formatQuantity(listing.available_kg)} kg available</Text></View>
        <View style={styles.bottomRow}>
          <View><Text style={styles.price}>{formatNaira(listing.price_per_kg)}<Text style={styles.unit}> / kg</Text></Text><View style={styles.signal}><ShieldCheck color={colors.leaf} size={12} /><Text style={styles.signalText}>Farmer listed</Text></View></View>
          <View style={styles.addButton}><ShoppingBasket color={colors.white} size={17} /></View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 19, borderWidth: 1, flexDirection: 'row', gap: 13, overflow: 'hidden', padding: 10 },
  image: { backgroundColor: colors.paleGreen, borderRadius: 14, height: 148, width: 112 },
  copy: { flex: 1, justifyContent: 'space-between', paddingVertical: 3 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  category: { color: colors.leaf, flex: 1, fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  crop: { color: colors.ink, fontSize: 18, fontWeight: '700', letterSpacing: -0.4, marginTop: 1 },
  farm: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 1 },
  location: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 2 },
  locationText: { color: colors.muted, fontSize: 10 },
  dot: { color: '#A0A69E', fontSize: 10 },
  stock: { color: colors.muted, flexShrink: 1, fontSize: 10 },
  bottomRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  price: { color: colors.pine, fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  unit: { color: colors.muted, fontSize: 10, fontWeight: '500', letterSpacing: 0 },
  signal: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 3 },
  signalText: { color: colors.leaf, fontSize: 9, fontWeight: '600' },
  addButton: { alignItems: 'center', backgroundColor: colors.pine, borderRadius: 12, height: 35, justifyContent: 'center', width: 35 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.995 }] },
})
