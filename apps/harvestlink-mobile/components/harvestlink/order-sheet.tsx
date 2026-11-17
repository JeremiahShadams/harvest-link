import { useState } from 'react'
import { router } from 'expo-router'
import { ArrowRight, Minus, Plus, X } from 'lucide-react-native'
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSWRConfig } from 'swr'
import type { Listing } from '@/lib/harvestlink/types'
import { DELIVERY_WINDOWS, formatNaira, formatQuantity } from '@/lib/harvestlink/utils'
import { supabase } from '@/lib/supabase'
import { useHarvestLink } from './context'
import { AppButton, colors, Eyebrow, MessageBanner } from './ui'

export function OrderSheet({ listing, onClose }: { listing: Listing | null; onClose: () => void }) {
  const { user, profile } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [quantity, setQuantity] = useState(1)
  const [deliveryWindow, setDeliveryWindow] = useState(DELIVERY_WINDOWS[0])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!listing) return null
  const price = Number(listing.price_per_kg) || 0
  const max = Number(listing.available_kg) || 0
  const total = price * quantity

  const changeQuantity = (next: number) => {
    setQuantity(Math.max(0.5, Math.min(max || 0.5, Number(next.toFixed(1)))))
    setError('')
  }

  const submitOrder = async () => {
    if (!user) {
      onClose()
      router.push('/profile' as never)
      return
    }
    if (!profile || (profile.role !== 'buyer' && profile.role !== 'both')) {
      setError('Choose Buyer or Both in your profile before placing an order.')
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > max) {
      setError('Choose a valid quantity that is still available.')
      return
    }
    setBusy(true)
    setError('')
    const { error: orderError } = await supabase.rpc('place_order', {
      p_listing_id: listing.id,
      p_quantity_kg: quantity,
      p_delivery_window: deliveryWindow,
      p_delivery_area: profile.default_area,
      p_notes: notes.trim(),
    })
    setBusy(false)
    if (orderError) {
      const message = orderError.message.toLowerCase()
      setError(message.includes('insufficient_stock')
        ? 'That harvest quantity changed. Choose a little less and try again.'
        : message.includes('listing_unavailable')
          ? 'This harvest has just been picked up. Choose another listing.'
          : 'We couldn’t place that order. Check your connection and try again.')
      return
    }
    await Promise.all([
      mutate(['harvestlink-orders', user.id]),
      mutate(['harvestlink-notifications', user.id]),
      mutate('harvestlink-listings'),
    ])
    onClose()
    Alert.alert('Order sent to the farm', 'The farmer will confirm your harvest soon. You can follow every step in Orders.')
  }

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close order details" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.topline}><View><Eyebrow>FROM {listing.area.toUpperCase()}</Eyebrow><Text style={styles.title}>{listing.crop}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}><X color={colors.ink} size={20} /></Pressable></View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.farm}>{listing.farm_name} · {listing.farmer_name}</Text>
            <Text style={styles.price}>{formatNaira(price)} <Text style={styles.unit}>per kg</Text><Text style={styles.stock}>  ·  {formatQuantity(max)} kg available</Text></Text>
            <View style={styles.quantityRow}>
              <View><Text style={styles.label}>How much would you like?</Text><Text style={styles.helper}>Harvested nearby and sold by weight.</Text></View>
              <View style={styles.counter}>
                <Pressable accessibilityRole="button" accessibilityLabel="Reduce quantity" onPress={() => changeQuantity(quantity - 0.5)} style={styles.counterButton}><Minus color={colors.pine} size={16} /></Pressable>
                <TextInput accessibilityLabel="Order quantity in kilograms" keyboardType="decimal-pad" value={String(quantity)} onChangeText={(value) => { const parsed = Number(value); if (Number.isFinite(parsed) && parsed > 0) setQuantity(Math.min(max, parsed)) }} style={styles.quantityValue} />
                <Pressable accessibilityRole="button" accessibilityLabel="Add half a kilogram" onPress={() => changeQuantity(quantity + 0.5)} style={styles.counterButton}><Plus color={colors.pine} size={16} /></Pressable>
              </View>
            </View>
            <Text style={styles.label}>Preferred delivery window</Text>
            <View style={styles.windows}>
              {DELIVERY_WINDOWS.map((window) => <Pressable key={window} accessibilityRole="button" accessibilityState={{ selected: deliveryWindow === window }} onPress={() => setDeliveryWindow(window)} style={[styles.window, deliveryWindow === window && styles.windowSelected]}><Text style={[styles.windowText, deliveryWindow === window && styles.windowTextSelected]}>{window}</Text></Pressable>)}
            </View>
            <View style={styles.noteField}><Text style={styles.label}>A note for the farmer <Text style={styles.optional}>Optional</Text></Text><TextInput accessibilityLabel="Order note for the farmer" maxLength={240} multiline numberOfLines={3} onChangeText={setNotes} placeholder="Anything helpful for delivery?" placeholderTextColor="#899188" style={styles.noteInput} value={notes} /></View>
            {error ? <MessageBanner>{error}</MessageBanner> : null}
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Estimated total</Text><Text style={styles.total}>{formatNaira(total)}</Text></View>
            <Text style={styles.disclaimer}>The farmer confirms availability before your order is final.</Text>
            <AppButton label={busy ? 'Sending order…' : 'Request this harvest'} onPress={() => void submitOrder()} loading={busy} icon={<ArrowRight color={colors.white} size={17} />} style={styles.cta} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(24,38,29,0.52)', flex: 1, justifyContent: 'flex-end' },
  sheet: { alignSelf: 'center', backgroundColor: colors.cream, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '92%', maxWidth: 520, paddingBottom: 25, paddingHorizontal: 20, paddingTop: 10, width: '100%' },
  grabber: { alignSelf: 'center', backgroundColor: '#C7C9BE', borderRadius: 99, height: 4, marginBottom: 15, width: 38 },
  topline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 24, fontWeight: '700', letterSpacing: -0.7, marginTop: 4 },
  close: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 12, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
  body: { gap: 15, paddingBottom: 12, paddingTop: 6 },
  farm: { color: colors.muted, fontSize: 13 },
  price: { color: colors.pine, fontSize: 18, fontWeight: '800' },
  unit: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  stock: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  quantityRow: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 13 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  helper: { color: colors.muted, fontSize: 10, marginTop: 4 },
  counter: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  counterButton: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  quantityValue: { color: colors.ink, fontSize: 15, fontWeight: '700', minWidth: 38, padding: 3, textAlign: 'center' },
  windows: { gap: 7 },
  window: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11 },
  windowSelected: { backgroundColor: colors.paleGreen, borderColor: '#AFC0A7' },
  windowText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  windowTextSelected: { color: colors.pine },
  noteField: { gap: 7 },
  optional: { color: colors.muted, fontSize: 11, fontWeight: '400' },
  noteInput: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 13, minHeight: 72, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' },
  totalRow: { alignItems: 'center', borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14 },
  totalLabel: { color: colors.muted, fontSize: 13 },
  total: { color: colors.pine, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  disclaimer: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  cta: { alignSelf: 'stretch' },
})
