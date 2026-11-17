import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import 'react-native-reanimated'
import { HarvestLinkProvider } from '@/components/harvestlink/context'
import { colors } from '@/components/harvestlink/ui'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <HarvestLinkProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </HarvestLinkProvider>
    </SafeAreaProvider>
  )
}
