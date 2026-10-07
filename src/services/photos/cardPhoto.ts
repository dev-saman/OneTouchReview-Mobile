import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { UploadFile } from '@/api/network';

/** Endpoints: JPG/PNG/WebP up to 10 MB. Card photos never need more than this. */
export const MAX_PHOTO_WIDTH = 1200;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Only shrink: never upscale small photos. */
export function targetWidth(width: number | undefined): number | null {
  return width && width > MAX_PHOTO_WIDTH ? MAX_PHOTO_WIDTH : null;
}

export type PickResult = { file: UploadFile } | { cancelled: true } | { error: 'permission' | 'too_large' };

/**
 * Picks a photo from the library and converts it to JPEG (HEIC → JPEG, as the Endpoints tab
 * asks), shrunk to at most 1200 px wide so it stays far below the 10 MB limit.
 */
export async function pickCardPhoto(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { error: 'permission' };

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.[0]) return { cancelled: true };
  const asset = picked.assets[0];

  const context = ImageManipulator.manipulate(asset.uri);
  const width = targetWidth(asset.width);
  if (width) context.resize({ width });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });

  return { file: { uri: result.uri, name: 'photo.jpg', type: 'image/jpeg' } };
}
