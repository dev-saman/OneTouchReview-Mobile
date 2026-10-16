import { network, type UploadFile } from './network';
import { Paths } from './paths';
import type { CardBrochure, CardChanges, CardGalleryItem, CardInsight, CardInsights, CardStats, DigitalCard } from './types';

/** Media limits (Errors tab: GALLERY_FULL, BROCHURES_FULL). */
export const GALLERY_MAX = 12;
export const VIDEOS_MAX = 3;
export const BROCHURES_MAX = 3;

/** Endpoints tab, rows "8 My card" and "11 Edit card". */
export const cardsApi = {
  /** The business card and team members' cards, each with url and short_url. */
  list: async (signal?: AbortSignal) =>
    (await network.get<{ cards: DigitalCard[] }>(Paths.digitalCards, { signal })).cards ?? [],

  /** Fields: name, title, bio, phone, email, website, booking_url, address, enabled. Send only what changed. */
  update: async (id: number, changes: CardChanges) =>
    (await network.patch<{ card: DigitalCard }>(Paths.digitalCard(id), changes)).card,

  /** Multipart "photo", JPG/PNG/WebP up to 10 MB (HEIC converted to JPEG first). */
  uploadPhoto: async (id: number, file: UploadFile, onProgress?: (fraction: number) => void) =>
    (await network.upload<{ card: DigitalCard }>(Paths.digitalCardPhoto(id), { file, fileField: 'photo' }, { onProgress }))
      .card,

  /** Views, scans and taps for the last 30 days. */
  stats: (id: number, signal?: AbortSignal) => network.get<CardStats>(Paths.digitalCardStats(id), { signal }),

  /** Is a card address free. */
  slugAvailable: (slug: string, signal?: AbortSignal) =>
    network.get<{ available: boolean; reason: string | null; suggestion: string | null }>(Paths.digitalCardSlugAvailable, {
      signal,
      params: { slug },
    }),

  /** The business card's address; owners and managers. Check slugAvailable first. */
  setBusinessSlug: (slug: string) => network.put<unknown>(Paths.digitalCardBusinessSlug, { slug }),

  /** Weekly summary and suggestions. available false (plan): hide. */
  insights: (id: number, signal?: AbortSignal) => network.get<CardInsights>(Paths.digitalCardInsights(id), { signal }),

  /** Who can edit the card. 409 ALREADY_APPLIED / OUT_OF_DATE: refresh insights. */
  applySuggestion: (id: number, insightId: number, key: string) =>
    network.post<{ card: DigitalCard; insight: CardInsight }>(Paths.digitalCardSuggestionApply(id, insightId, key)),

  dismissSuggestion: async (id: number, insightId: number, key: string) =>
    (await network.post<{ insight: CardInsight }>(Paths.digitalCardSuggestionDismiss(id, insightId, key))).insight,

  /** card.media_available. JPEG after HEIC conversion. 422 GALLERY_FULL. */
  addGalleryPhoto: (id: number, file: UploadFile, caption?: string, onProgress?: (fraction: number) => void) =>
    network.upload<{ item: CardGalleryItem; card: DigitalCard }>(
      Paths.digitalCardGallery(id),
      { file, fileField: 'photo', fields: caption ? { caption } : undefined },
      { onProgress },
    ),

  /** Every item id in the new order, with its caption. */
  arrangeGallery: async (id: number, items: { id: number; caption?: string | null }[]) =>
    (await network.patch<{ card: DigitalCard }>(Paths.digitalCardGallery(id), { items })).card,

  removeGalleryPhoto: async (id: number, itemId: number) =>
    (await network.delete<{ card: DigitalCard }>(Paths.digitalCardGalleryItem(id, itemId))).card,

  /** YouTube or Vimeo links, up to 3, replaces the list. */
  setVideos: async (id: number, videos: { url: string; title?: string }[]) =>
    (await network.put<{ card: DigitalCard }>(Paths.digitalCardVideos(id), { videos })).card,

  /** A PDF from the document picker. 422 BROCHURES_FULL, NOT_A_PDF. */
  addBrochure: (id: number, file: UploadFile, name?: string, onProgress?: (fraction: number) => void) =>
    network.upload<{ item: CardBrochure; card: DigitalCard }>(
      Paths.digitalCardBrochures(id),
      { file, fileField: 'file', fields: name ? { name } : undefined },
      { onProgress },
    ),

  arrangeBrochures: async (id: number, items: { id: number; name?: string }[]) =>
    (await network.patch<{ card: DigitalCard }>(Paths.digitalCardBrochures(id), { items })).card,

  removeBrochure: async (id: number, itemId: number) =>
    (await network.delete<{ card: DigitalCard }>(Paths.digitalCardBrochure(id, itemId))).card,
};
