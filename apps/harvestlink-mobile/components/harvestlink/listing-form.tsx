import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react-native'
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSWRConfig } from 'swr'
import { useHarvestLink } from './context'
import { AppButton, colors, Eyebrow, MessageBanner, TextField } from './ui'
import { CROPS, AREAS } from '@/lib/harvestlink/utils'
import { supabase } from '@/lib/supabase'
import type { ShelfLifeResult } from '@/lib/harvestlink/types'

const imageForCrop = (crop: string) => {
  const value = crop.toLowerCase()
  if (value.includes('tomato')) return '/images/tomatoes.png'
  if (value.includes('pepper')) return '/images/peppers.png'
  if (value.includes('plantain') || value.includes('fruit') || value.includes('maize')) return '/images/plantain.png'
  return '/images/greens.png'
}

function categoryForCrop(crop: string) {
  if (crop === 'Tomatoes') return 'Tomatoes'
  if (crop === 'Peppers') return 'Peppers'
  if (crop === 'Leafy greens') return 'Leafy greens'
  if (crop === 'Maize') return 'Other'
  if (crop === 'Plantain') return 'Fruits'
  return 'Other'
}

export function ListingForm({ visible, latestScan, onClose }: { visible: boolean; latestScan: ShelfLifeResult | null; onClose: () => void }) {
  const { user, profile } = useHarvestLink()
  const { mutate } = useSWRConfig()
  const [crop, setCrop] = useState('Tomatoes')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [shelfDays, setShelfDays] = useState('4')
  const [area, setArea] = useState(profile?.default_area ?? 'Lekki')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const matchingScan = latestScan?.crop.toLowerCase().includes(crop.toLowerCase()) || crop.toLowerCase().includes(latestScan?.crop.toLowerCase() ?? '') ? latestScan : null

  const publish = async () => {
    if (!user || !profile) {
      setError('Sign in and finish your farmer profile before publishing a harvest.')
      return
    }
    const numericPrice = Number(price)
    const numericQuantity = Number(quantity)
    const numericDays = Number(shelfDays)
    if (!crop.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0 || !Number.isFinite(numericQuantity) || numericQuantity <= 0 || !Number.isInteger(numericDays) || numericDays < 0 || numericDays > 30) {
      setError('Add a crop, a price, a quantity, and a shelf-life estimate to continue.')
      return
    }
    setBusy(true)
    setError('')
    const { error: insertError } = await supabase.from('listings').insert({
      farmer_id: user.id,
      farmer_name: profile.display_name,
      farm_name: profile.farm_name || 'Independent farm',
      crop: crop.trim(),
      category: categoryForCrop(crop),
      price_per_kg: numericPrice,
      available_kg: numericQuantity,
      harvested_on: new Date().toISOString().slice(0, 10),
      estimated_shelf_life_days: numericDays,
      scan_confidence: matchingScan?.confidence ?? null,
      image_url: imageForCrop(crop),
      area,
      is_demo: false,
    })
    setBusy(false)
    if (insertError) {
      setError('This harvest could not be published. Check the details and try again.')
      return
    }
    await Promise.all([mutate('harvestlink-listings'), mutate(['harvestlink-farmer-listings', user.id])])
    onClose()
    Alert.alert('Your harvest is listed', 'Buyers nearby can now discover it in the market.')
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close listing form" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}><View><Eyebrow>SHARE WHAT YOU’VE GROWN</Eyebrow><Text style={styles.title}>List a harvest.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}><X color={colors.ink} size={20} /></Pressable></View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>What are you bringing to market?</Text>
            <View style={styles.cropGrid}>{CROPS.map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: crop === option }} onPress={() => setCrop(option)} style={[styles.cropChip, crop === option && styles.cropSelected]}><Text style={[styles.cropText, crop === option && styles.cropTextSelected]}>{option}</Text></Pressable>)}</View>
            <View style={styles.inputRow}>
              <TextField label="Price per kg (₦)" value={price} onChangeText={setPrice} placeholder="1,200" keyboardType="decimal-pad" style={styles.halfField} />
              <TextField label="Available (kg)" value={quantity} onChangeText={setQuantity} placeholder="20" keyboardType="decimal-pad" style={styles.halfField} />
            </View>
            <View style={styles.inputRow}>
              <TextField label="Estimated shelf life (days)" value={shelfDays} onChangeText={setShelfDays} placeholder="4" keyboardType="number-pad" style={styles.halfField} />
              <View style={styles.areaField}><Text style={styles.label}>Farm area</Text><View style={styles.areaPicker}>{AREAS.slice(0, 4).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: area === option }} onPress={() => setArea(option)} style={[styles.areaChip, area === option && styles.areaSelected]}><Text style={[styles.areaText, area === option && styles.areaTextSelected]}>{option}</Text></Pressable>)}</View></View>
            </View>
            {matchingScan ? <View style={styles.scanMatch}><Check size={15} color={colors.leaf} /><Text style={styles.scanMatchText}>Freshness scan attached · {Math.round(matchingScan.confidence * 100)}% visual confidence</Text></View> : <Text style={styles.helper}>A recent freshness scan for this crop can be attached to your listing.</Text>}
            {error ? <MessageBanner>{error}</MessageBanner> : null}
            <View style={styles.note}><Text style={styles.noteTitle}>Good to know</Text><Text style={styles.helper}>Price and stock are checked again when a buyer places an order. Shelf-life is a visual guide, not a food-safety promise.</Text></View>
            <AppButton label={busy ? 'Publishing…' : 'Publish harvest'} onPress={() => void publish()} loading={busy} icon={<ArrowRight color={colors.white} size={16} />} style={styles.cta} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(24,38,29,0.52)', flex: 1, justifyContent: 'flex-end' },
  sheet: { alignSelf: 'center', backgroundColor: colors.cream, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '94%', maxWidth: 520, paddingBottom: 25, paddingHorizontal: 19, paddingTop: 10, width: '100%' },
  grabber: { alignSelf: 'center', backgroundColor: '#C7C9BE', borderRadius: 99, height: 4, marginBottom: 14, width: 38 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 24, fontWeight: '700', letterSpacing: -0.7, marginTop: 4 },
  close: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 12, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
  form: { gap: 14, paddingBottom: 14, paddingTop: 12 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  cropGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  cropChip: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  cropSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  cropText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  cropTextSelected: { color: colors.white },
  inputRow: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  areaField: { flex: 1, gap: 7 },
  areaPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  areaChip: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 7 },
  areaSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  areaText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
  areaTextSelected: { color: colors.white },
  scanMatch: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 11, flexDirection: 'row', gap: 7, padding: 10 },
  scanMatchText: { color: colors.pine, fontSize: 10, fontWeight: '600' },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  note: { backgroundColor: '#F8F6EE', borderRadius: 12, gap: 4, padding: 11 },
  noteTitle: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  cta: { alignSelf: 'stretch' },
})
