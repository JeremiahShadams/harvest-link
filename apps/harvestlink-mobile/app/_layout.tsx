import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
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
  const [fontsLoaded, fontError] = useFonts([
    {
      fontFamily: 'Cabinet Grotesk',
      fontDefinitions: [
        { path: require('../assets/fonts/CabinetGrotesk-Regular.ttf'), weight: '400' },
        { path: require('../assets/fonts/CabinetGrotesk-Medium.ttf'), weight: '500' },
        { path: require('../assets/fonts/CabinetGrotesk-Bold.ttf'), weight: '700' },
        { path: require('../assets/fonts/CabinetGrotesk-ExtraBold.ttf'), weight: '800' },
      ],
    },
    {
      fontFamily: 'Satoshi',
      fontDefinitions: [
        { path: require('../assets/fonts/Satoshi-Regular.ttf'), weight: '400' },
        { path: require('../assets/fonts/Satoshi-Medium.ttf'), weight: '500' },
        { path: require('../assets/fonts/Satoshi-Bold.ttf'), weight: '700' },
      ],
    },
  ])

  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      <HarvestLinkProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="listing/new" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="order/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </HarvestLinkProvider>
    </SafeAreaProvider>
  )
}
