import { router, Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { AppButton, colors, fonts } from '@/components/harvestlink/ui'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Screen not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen isn’t here.</Text>
        <Text style={styles.subtitle}>Let’s take you back to the HarvestLink market.</Text>
        <AppButton label="Back to HarvestLink" onPress={() => router.replace('/' as never)} />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: 22,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
})
