import { network, type UploadFile } from './network';
import { Paths } from './paths';
import type { CardChanges, DigitalCard } from './types';

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
};
