import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

export function triggerSuccessHaptic() {
  if (Platform.OS === 'web') return
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
}

export function triggerErrorHaptic() {
  if (Platform.OS === 'web') return
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
}

export function triggerImpactHaptic() {
  if (Platform.OS === 'web') return
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
}

export function triggerSelectionHaptic() {
  if (Platform.OS === 'web') return
  void Haptics.selectionAsync().catch(() => {})
}
