import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BROCHURES_MAX, GALLERY_MAX, VIDEOS_MAX, cardsApi } from '@/api/cards.api';
import type { CardBrochure, CardGalleryItem, CardVideo, DigitalCard } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { IconName } from '@/components/ui/IconTile';
import { TextField } from '@/components/ui/TextField';
import { colors, font, radius, spacing, touchTarget } from '@/constants/theme';
import { toApiError } from '@/hooks/useApiQuery';
import { MAX_GALLERY_WIDTH, pickCardPhoto } from '@/services/photos/cardPhoto';

import { fileSize, isVideoLink, move } from './media';

type Props = { card: DigitalCard; onCard: (card: DigitalCard) => void };

/**
 * Card media (Endpoints rows 105–111), shown when card.media_available: gallery (up to 12 photos,
 * reorder, captions), videos (up to 3 YouTube / Vimeo links) and PDF brochures (up to 3).
 */
export function MediaSections({ card, onCard }: Props) {
  if (!card.media_available) return null;
  const gallery = card.gallery ?? [];
  const brochures = card.brochures ?? [];
  return (
    <>
      {/* Remount when the server's list changes (added or removed items). */}
      <GallerySection key={`g-${gallery.map((g) => g.id).join(',')}`} card={card} items={gallery} onCard={onCard} />
      <VideosSection key={`v-${(card.videos ?? []).map((v) => v.id).join(',')}`} card={card} videos={card.videos ?? []} onCard={onCard} />
      <BrochuresSection key={`b-${brochures.map((b) => b.id).join(',')}`} card={card} items={brochures} onCard={onCard} />
    </>
  );
}

function GallerySection({ card, items: initial, onCard }: Props & { items: CardGalleryItem[] }) {
  const [items, setItems] = useState(initial.map((i) => ({ ...i, caption: i.caption ?? '' })));
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = items.some((item, i) => item.id !== initial[i]?.id || item.caption.trim() !== (initial[i]?.caption ?? ''));
  const full = initial.length >= GALLERY_MAX;

  const add = async () => {
    try {
      const picked = await pickCardPhoto({ square: false, maxWidth: MAX_GALLERY_WIDTH });
      if ('cancelled' in picked) return;
      if ('error' in picked) {
        Alert.alert('Photos not allowed', 'Allow access to your photos in Settings to add a photo.');
        return;
      }
      setProgress(0);
      onCard((await cardsApi.addGalleryPhoto(card.id, picked.file, undefined, setProgress)).card);
    } catch (e) {
      Alert.alert('Couldn’t add the photo', toApiError(e).message);
    } finally {
      setProgress(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      onCard(await cardsApi.arrangeGallery(card.id, items.map((i) => ({ id: i.id, caption: i.caption.trim() || null }))));
    } catch (e) {
      Alert.alert('Couldn’t save the photos', toApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: CardGalleryItem) =>
    Alert.alert('Remove this photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            onCard(await cardsApi.removeGalleryPhoto(card.id, item.id));
          } catch (e) {
            Alert.alert('Couldn’t remove the photo', toApiError(e).message);
          }
        },
      },
    ]);

  return (
    <Card title={`Photos (${initial.length} of ${GALLERY_MAX})`}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <Image source={{ uri: item.thumb_url }} style={styles.thumb} accessibilityIgnoresInvertColors />
          <TextInput
            value={item.caption}
            onChangeText={(caption) => setItems((list) => list.map((i) => (i.id === item.id ? { ...i, caption } : i)))}
            placeholder="Caption (optional)"
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel={`Caption for photo ${index + 1}`}
            style={styles.input}
          />
          <Reorder index={index} count={items.length} onMove={(delta) => setItems((list) => move(list, index, delta))} />
          <IconButton icon="trash-outline" label="Remove photo" onPress={() => remove(item)} />
        </View>
      ))}
      {dirty ? <Button title="Save order and captions" onPress={save} loading={saving} /> : null}
      <Button
        title={full ? `${GALLERY_MAX} photos is the most` : 'Add photo'}
        variant="secondary"
        icon="image-outline"
        onPress={add}
        loading={progress !== null}
        disabled={full}
      />
      {progress !== null ? <Text style={font.caption}>Uploading… {Math.round(progress * 100)}%</Text> : null}
    </Card>
  );
}

type VideoRow = { url: string; title: string };

function VideosSection({ card, videos, onCard }: Props & { videos: CardVideo[] }) {
  const initial: VideoRow[] = videos.map((v) => ({ url: v.url, title: v.title ?? '' }));
  const [rows, setRows] = useState<VideoRow[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filled = rows.filter((r) => r.url.trim());
  const dirty = JSON.stringify(filled.map((r) => [r.url.trim(), r.title.trim()])) !== JSON.stringify(initial.map((r) => [r.url, r.title]));
  const bad = filled.find((r) => !isVideoLink(r.url));

  const update = (index: number, change: Partial<VideoRow>) => setRows((list) => list.map((r, i) => (i === index ? { ...r, ...change } : r)));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onCard(await cardsApi.setVideos(card.id, filled.map((r) => ({ url: r.url.trim(), title: r.title.trim() || undefined }))));
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={`Videos (up to ${VIDEOS_MAX})`}>
      <Text style={font.caption}>YouTube or Vimeo links.</Text>
      {rows.map((row, index) => (
        <View key={index} style={styles.video}>
          <TextField
            label={`Video ${index + 1} link`}
            value={row.url}
            onChangeText={(url) => update(index, { url })}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://www.youtube.com/watch?v=…"
            error={row.url.trim() && !isVideoLink(row.url) ? 'Use a YouTube or Vimeo link.' : undefined}
          />
          <TextField label="Title (optional)" value={row.title} onChangeText={(title) => update(index, { title })} />
          <Button title="Remove video" variant="text" onPress={() => setRows((list) => list.filter((_, i) => i !== index))} />
        </View>
      ))}
      {rows.length < VIDEOS_MAX ? (
        <Button title="Add video" variant="secondary" icon="logo-youtube" onPress={() => setRows((list) => [...list, { url: '', title: '' }])} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {dirty ? <Button title="Save videos" onPress={save} loading={saving} disabled={!!bad} /> : null}
    </Card>
  );
}

function BrochuresSection({ card, items: initial, onCard }: Props & { items: CardBrochure[] }) {
  const [items, setItems] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = items.some((item, i) => item.id !== initial[i]?.id || item.name.trim() !== initial[i]?.name);

  const save = async () => {
    setSaving(true);
    try {
      onCard(await cardsApi.arrangeBrochures(card.id, items.map((i) => ({ id: i.id, name: i.name.trim() || undefined }))));
    } catch (e) {
      Alert.alert('Couldn’t save the brochures', toApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: CardBrochure) =>
    Alert.alert('Remove this brochure?', item.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            onCard(await cardsApi.removeBrochure(card.id, item.id));
          } catch (e) {
            Alert.alert('Couldn’t remove the brochure', toApiError(e).message);
          }
        },
      },
    ]);

  return (
    <Card title={`PDF brochures (${initial.length} of ${BROCHURES_MAX})`}>
      {items.length === 0 ? <Text style={font.small}>No brochures yet.</Text> : null}
      {items.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <IconButton icon="document-text-outline" label={`Open ${item.name}`} onPress={() => Linking.openURL(item.url).catch(() => {})} />
          <View style={styles.flex}>
            <TextInput
              value={item.name}
              onChangeText={(name) => setItems((list) => list.map((i) => (i.id === item.id ? { ...i, name } : i)))}
              accessibilityLabel={`Name of brochure ${index + 1}`}
              style={styles.input}
            />
            <Text style={font.caption}>{fileSize(item.size_bytes)}</Text>
          </View>
          <Reorder index={index} count={items.length} onMove={(delta) => setItems((list) => move(list, index, delta))} />
          <IconButton icon="trash-outline" label="Remove brochure" onPress={() => remove(item)} />
        </View>
      ))}
      {dirty ? <Button title="Save order and names" onPress={save} loading={saving} /> : null}
      <Text style={font.caption}>Add new PDF brochures on the web for now.</Text>
    </Card>
  );
}

function Reorder({ index, count, onMove }: { index: number; count: number; onMove: (delta: -1 | 1) => void }) {
  return (
    <View>
      <IconButton icon="chevron-up" label="Move up" onPress={() => onMove(-1)} disabled={index === 0} compact />
      <IconButton icon="chevron-down" label="Move down" onPress={() => onMove(1)} disabled={index === count - 1} compact />
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  disabled,
  compact,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={compact ? 4 : 0}
      style={({ pressed }) => [compact ? styles.iconCompact : styles.icon, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={disabled ? colors.border : colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.background },
  input: {
    flex: 1,
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  video: { gap: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  iconCompact: { width: 32, height: touchTarget / 2 + 4, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
  error: { color: colors.danger, fontSize: 14 },
});
