import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import type { ConfigContext, ExpoConfig } from 'expo/config'

loadEnv({ path: resolve(__dirname, '../../.env.development.local'), override: false })

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'HarvestLink',
  slug: 'harvestlink-mobile',
  extra: {
    ...config.extra,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      '',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://harvestlink-product-specification.v0.build',
  },
})
