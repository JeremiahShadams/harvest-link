import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import 'react-native-reanimated'
import { HarvestLinkProvider, useHarvestLink } from '@/components/harvestlink/context'
import { colors } from '@/components/harvestlink/ui'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  anchor: '(tabs)',
}

void SplashScreen.preventAutoHideAsync().catch(() => {})

function AppNavigator() {
  const { authLoading } = useHarvestLink()

  useEffect(() => {
    if (!authLoading) {
      void SplashScreen.hideAsync().catch(() => {})
    }
  }, [authLoading])

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="listing/new" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="order/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'CabinetGrotesk-Regular': require('../assets/fonts/CabinetGrotesk-Regular.ttf'),
    'CabinetGrotesk-Medium': require('../assets/fonts/CabinetGrotesk-Medium.ttf'),
    'CabinetGrotesk-Bold': require('../assets/fonts/CabinetGrotesk-Bold.ttf'),
    'CabinetGrotesk-ExtraBold': require('../assets/fonts/CabinetGrotesk-ExtraBold.ttf'),
    'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.ttf'),
  })

  useEffect(() => {
    if (fontError) {
      // Fall back cleanly rather than hanging the splash forever on a font failure.
      void SplashScreen.hideAsync().catch(() => {})
    }
  }, [fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      <HarvestLinkProvider>
        <AppNavigator />
      </HarvestLinkProvider>
    </SafeAreaProvider>
  )
}
