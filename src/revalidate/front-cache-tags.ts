/**
 * Keep Next.js cache tags centralized (React Query keys style).
 * These must match `dewalt-front/lib/cacheTags.ts`.
 */
export const FRONT_MENU_TAGS: string[] = ['menu'];
export const FRONT_SETTINGS_TAGS: string[] = ['settings'];
export const FRONT_TERMS_TAGS: string[] = ['terms'];
export const FRONT_BRAND_CONTENT_TAGS: string[] = ['brand-content'];
export const FRONT_SERVICE_CENTER_TAGS: string[] = ['service-center'];
export const FRONT_BANNER_TAGS: string[] = ['banner-carousel'];
export const FRONT_ADS_TAGS: string[] = ['ads'];
export const FRONT_NEWS_TAGS: string[] = ['news'];
export const FRONT_PRODUCTS_TAGS: string[] = ['products'];

export const FRONT_CACHE_TAGS = {
  /**
   * Single menu tag used for both brands list + menu brands tree.
   * Revalidate rarely, keep invalidation simple.
   */
  menu: {
    all: FRONT_MENU_TAGS,
  },
  settings: {
    all: FRONT_SETTINGS_TAGS,
  },
  terms: {
    all: FRONT_TERMS_TAGS,
  },
  brandContent: {
    all: FRONT_BRAND_CONTENT_TAGS,
  },
  serviceCenter: {
    all: FRONT_SERVICE_CENTER_TAGS,
  },
  bannerCarousel: {
    all: FRONT_BANNER_TAGS,
  },
  ads: {
    all: FRONT_ADS_TAGS,
  },
  news: {
    all: FRONT_NEWS_TAGS,
  },
  products: {
    all: FRONT_PRODUCTS_TAGS,
  },
} as const;
