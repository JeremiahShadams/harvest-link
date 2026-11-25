import { useState } from 'react'
import { router } from 'expo-router'
import { ArrowRight, Minus, Plus, X } from 'lucide-react-native'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { Listing } from '@/lib/harvestlink/types'
import {
  DELIVERY_WINDOWS,
  formatNaira,
  formatUnitCount,
  formatUnitSingular,
  isDiscreteUnit,
} from '@/lib/harvestlink/utils'
import { usePlaceOrder } from '@/lib/harvestlink/use-mutations'
import { triggerSelectionHaptic } from '@/lib/harvestlink/haptics'
import { useHarvestLink } from './context'
import { AppButton, colors, Eyebrow, fonts, MessageBanner } from './ui'

export function OrderSheet({ listing, onClose }: { listing: Listing | null; onClose: () => void }) {
  if (!listing) return null
  return <OrderSheetContent key={listing.id} listing={listing} onClose={onClose} />
}

function OrderSheetContent({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { user, profile } = useHarvestLink()
  const { placeOrder, busy, error, setError } = usePlaceOrder()
  const [quantity, setQuantity] = useState(1)
  const [deliveryWindow, setDeliveryWindow] = useState<string>(DELIVERY_WINDOWS[0])
  const [notes, setNotes] = useState('')

  const price = Number(listing.price_per_kg) || 0
  const max = Number(listing.available_kg) || 0
  const discrete = isDiscreteUnit(listing.unit)
  const step = discrete ? 1 : 0.5
  const minQty = discrete ? 1 : 0.5
  const unitSingular = formatUnitSingular(listing.unit)
  const total = price * quantity

  const changeQuantity = (next: number) => {
    triggerSelectionHaptic()
    const clamped = Math.max(minQty, Math.min(max || minQty, next))
    setQuantity(discrete ? Math.round(clamped) : Number(clamped.toFixed(1)))
    setError(null)
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
    const result = await placeOrder({
      listingId: listing.id,
      farmerId: listing.farmer_id,
      quantityKg: quantity,
      deliveryWindow,
      deliveryArea: profile.default_area,
      notes,
    })
    if (!result.success) return
    onClose()
    Alert.alert('Order sent to the farm', 'The farmer will confirm your harvest soon. You can follow every step in Orders.')
  }

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Close order details" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.topline}>
            <View style={styles.headerCopy}>
              <Eyebrow>FROM {listing.area.toUpperCase()}</Eyebrow>
              <Text style={styles.title} numberOfLines={1}>{listing.crop}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <X color={colors.ink} size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.farm}>{listing.farm_name} · {listing.farmer_name}</Text>
            <Text style={styles.price}>
              {formatNaira(price)} <Text style={styles.unit}>per {unitSingular}</Text>
              <Text style={styles.stock}>  ·  {formatUnitCount(max, listing.unit)} available</Text>
            </Text>

            <View style={styles.quantityRow}>
              <View style={styles.quantityLabelCopy}>
                <Text style={styles.label}>How many {discrete ? `${unitSingular}s` : 'kilograms'}?</Text>
                <Text style={styles.helper}>Sold by {unitSingular}.</Text>
              </View>
              <View style={styles.counter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reduce quantity by ${step}`}
                  onPress={() => changeQuantity(quantity - step)}
                  style={styles.counterButton}
                >
                  <Minus color={colors.pine} size={18} />
                </Pressable>
                <TextInput
                  accessibilityLabel={`Order quantity in ${unitSingular}`}
                  keyboardType={discrete ? 'number-pad' : 'decimal-pad'}
                  value={String(quantity)}
                  onChangeText={(value) => {
                    const parsed = Number(value)
                    if (Number.isFinite(parsed) && parsed > 0) {
                      setQuantity(discrete ? Math.min(max, Math.round(parsed)) : Math.min(max, parsed))
                    }
                  }}
                  style={styles.quantityValue}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Increase quantity by ${step}`}
                  onPress={() => changeQuantity(quantity + step)}
                  style={styles.counterButton}
                >
                  <Plus color={colors.pine} size={18} />
                </Pressable>
              </View>
            </View>

            <Text style={styles.label}>Preferred delivery window</Text>
            <View style={styles.windows}>
              {DELIVERY_WINDOWS.map((window) => {
                const selected = deliveryWindow === window
                return (
                  <Pressable
                    key={window}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      triggerSelectionHaptic()
                      setDeliveryWindow(window)
                    }}
                    style={[styles.window, selected && styles.windowSelected]}
                  >
                    <Text style={[styles.windowText, selected && styles.windowTextSelected]}>{window}</Text>
                  </Pressable>
                )
              })}
            </View>

            <View style={styles.noteField}>
              <Text style={styles.label}>
                A note for the farmer <Text style={styles.optional}>Optional</Text>
              </Text>
              <TextInput
                accessibilityLabel="Order note for the farmer"
                maxLength={240}
                multiline
                numberOfLines={3}
                onChangeText={setNotes}
                placeholder="Anything helpful for delivery?"
                placeholderTextColor="#7A847D"
                style={styles.noteInput}
                value={notes}
              />
            </View>

            {error ? <MessageBanner>{error}</MessageBanner> : null}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimated total ({formatUnitCount(quantity, listing.unit)})</Text>
              <Text style={styles.total}>{formatNaira(total)}</Text>
            </View>

            <Text style={styles.disclaimer}>The farmer confirms availability before your order is final.</Text>
            <AppButton
              label={busy ? 'Sending order…' : 'Request this harvest'}
              onPress={() => void submitOrder()}
              loading={busy}
              icon={<ArrowRight color={colors.white} size={18} />}
              style={styles.cta}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(24,38,29,0.52)', flex: 1, justifyContent: 'flex-end' },
  sheet: { alignSelf: 'center', backgroundColor: colors.cream, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '92%', maxWidth: 520, paddingBottom: 28, paddingHorizontal: 20, paddingTop: 10, width: '100%' },
  grabber: { alignSelf: 'center', backgroundColor: '#C7C9BE', borderRadius: 99, height: 4, marginBottom: 14, width: 38 },
  topline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.heading, color: colors.ink, fontSize: 24, letterSpacing: -0.6, marginTop: 4 },
  close: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 14, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  body: { gap: 15, paddingBottom: 16, paddingTop: 6 },
  farm: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
  price: { fontFamily: fonts.headingExtra, color: colors.pine, fontSize: 19 },
  unit: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
  stock: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 12 },
  quantityRow: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 13, gap: 10 },
  quantityLabelCopy: { flex: 1 },
  label: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 },
  helper: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginTop: 3 },
  counter: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  counterButton: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 12, height: 44, justifyContent: 'center', width: 44 },
  quantityValue: { fontFamily: fonts.heading, color: colors.ink, fontSize: 16, minWidth: 42, padding: 4, textAlign: 'center' },
  windows: { gap: 8 },
  window: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: 14, paddingVertical: 10 },
  windowSelected: { backgroundColor: colors.paleGreen, borderColor: '#AFC0A7' },
  windowText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13 },
  windowTextSelected: { fontFamily: fonts.bodyBold, color: colors.pine },
  noteField: { gap: 7 },
  optional: { fontFamily: fonts.body, color: colors.muted, fontSize: 12 },
  noteInput: { fontFamily: fonts.body, backgroundColor: colors.white, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 14, minHeight: 76, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' },
  totalRow: { alignItems: 'center', borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, gap: 8 },
  totalLabel: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13, flex: 1 },
  total: { fontFamily: fonts.headingExtra, color: colors.pine, fontSize: 22, letterSpacing: -0.4 },
  disclaimer: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 17 },
  cta: { alignSelf: 'stretch' },
})
