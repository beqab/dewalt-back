/**
 * Keep Next.js cache tags centralized (React Query keys style).
 * These must match `dewalt-front/lib/cacheTags.ts`.
 */
export const FRONT_MENU_TAGS: string[] = ['menu'];
export const FRONT_BANNER_TAGS: string[] = ['banner-carousel'];
export const FRONT_ADS_TAGS: string[] = ['ads'];
export const FRONT_NEWS_TAGS: string[] = ['news'];

export const FRONT_CACHE_TAGS = {
  /**
   * Single menu tag used for both brands list + menu brands tree.
   * Revalidate rarely, keep invalidation simple.
   */
  menu: {
    all: FRONT_MENU_TAGS,
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
} as const;
