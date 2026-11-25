import type { Listing } from './types'
import { getListingCategory, getListingImageUrl } from './utils'

// Metro resolves require() to a numeric asset id. Keeping this type narrow avoids
// react-native's readonly ImageSourcePropType clashing with expo-image's ImageSource.
type LocalImage = number

const images: Record<string, LocalImage> = {
  Tomatoes: require('../../assets/images/tomatoes.jpg'),
  'Leafy greens': require('../../assets/images/greens.jpg'),
  Peppers: require('../../assets/images/peppers.jpg'),
  Maize: require('../../assets/images/plantain.jpg'),
  Fruits: require('../../assets/images/plantain.jpg'),
  Other: require('../../assets/images/greens.jpg'),
}

export function listingImage(listing: Pick<Listing, 'category' | 'crop' | 'image_url'>): LocalImage | { uri: string } {
  const remote = getListingImageUrl(listing)
  return remote ? { uri: remote } : images[getListingCategory(listing)] ?? images.Other
}
