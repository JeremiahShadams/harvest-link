import type { ImageSourcePropType } from 'react-native'
import type { Listing } from './types'
import { getListingCategory, getListingImageUrl } from './utils'

const images: Record<string, ImageSourcePropType> = {
  Tomatoes: require('../../assets/images/tomatoes.png'),
  'Leafy greens': require('../../assets/images/greens.png'),
  Peppers: require('../../assets/images/peppers.png'),
  Maize: require('../../assets/images/plantain.png'),
  Fruits: require('../../assets/images/plantain.png'),
  Other: require('../../assets/images/greens.png'),
}

export function listingImage(listing: Pick<Listing, 'category' | 'crop' | 'image_url'>): ImageSourcePropType {
  const remote = getListingImageUrl(listing)
  return remote ? { uri: remote } : images[getListingCategory(listing)] ?? images.Other
}
