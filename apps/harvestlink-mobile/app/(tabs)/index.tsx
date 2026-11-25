import { Redirect } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { AppHeader } from '@/components/harvestlink/app-header'
import { useHarvestLink } from '@/components/harvestlink/context'
import { MarketplaceScreen } from '@/components/harvestlink/marketplace-screen'
import { ProductCardSkeleton, ScreenScroll, SkeletonBox } from '@/components/harvestlink/ui'

export default function MarketplaceRoute() {
  const { authLoading, activeSpace } = useHarvestLink()

  if (authLoading) {
    return (
      <ScreenScroll>
        <AppHeader />
        <View style={styles.skeletonWrap}>
          <SkeletonBox height={190} radius={22} />
          <SkeletonBox height={48} radius={14} />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </View>
      </ScreenScroll>
    )
  }

  if (activeSpace === 'farmer') return <Redirect href="/farmer" />

  return <MarketplaceScreen />
}

const styles = StyleSheet.create({
  skeletonWrap: { gap: 14, paddingHorizontal: 18, paddingTop: 4 },
})
