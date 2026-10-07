import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, Switch, Text, View } from 'react-native';

import { cardsApi } from '@/api/cards.api';
import { fieldError } from '@/api/errors';
import type { ApiError, DigitalCard } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { colors, font, radius, spacing } from '@/constants/theme';
import { cardChanges, formFromCard, type CardForm } from '@/features/card/cardForm';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { pickCardPhoto } from '@/services/photos/cardPhoto';

/** Screen 11: edit a card's text, links, address, on/off and photo (business or team card). */
export default function EditCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = Number(id);
  // There is no single-card GET in the Sheet: load the list and pick this card.
  const fetcher = useCallback(async (signal: AbortSignal) => {
    const cards = await cardsApi.list(signal);
    return cards.find((c) => c.id === cardId) ?? null;
  }, [cardId]);
  const { data, error, loading, reload } = useApiQuery(cardId, fetcher);

  if (loading) return <LoadingView />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Card not found" />;
  if (!data.can_edit) {
    return <EmptyState title="You can’t edit this card" message="Ask the owner to change it, or to let team members edit their cards." />;
  }
  return <EditForm key={data.id} card={data} />;
}

function EditForm({ card: initial }: { card: DigitalCard }) {
  const router = useRouter();
  const [card, setCard] = useState(initial);
  const [form, setForm] = useState<CardForm>(() => formFromCard(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const set = <K extends keyof CardForm>(field: K) => (value: CardForm[K]) => setForm((f) => ({ ...f, [field]: value }));
  const setAddress = (field: keyof CardForm['address']) => (value: string) =>
    setForm((f) => ({ ...f, address: { ...f.address, [field]: value } }));

  const changes = cardChanges(card, form);
  const dirty = Object.keys(changes).length > 0;

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await cardsApi.update(card.id, changes);
      setCard(updated);
      setForm(formFromCard(updated));
      Alert.alert('Card saved', 'Your card is updated.');
      router.back();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const fe = (field: string) => fieldError(error, field);
  const shownFieldErrors = [
    'name', 'title', 'bio', 'phone', 'email', 'website', 'booking_url', 'enabled',
    'address', 'address.line1', 'address.line2', 'address.city', 'address.state', 'address.zip',
  ].some((f) => fe(f));

  return (
    <Screen>
      <PhotoSection card={card} onUploaded={(updated) => setCard((c) => ({ ...c, photo_url: updated.photo_url, has_photo: updated.has_photo }))} />

      <Card title="About">
        <TextField label="Name" value={form.name} onChangeText={set('name')} autoCapitalize="words" error={fe('name')} />
        <TextField label="Title" value={form.title} onChangeText={set('title')} placeholder="e.g. Family law attorney" error={fe('title')} />
        <TextField
          label="Bio"
          value={form.bio}
          onChangeText={set('bio')}
          multiline
          style={styles.multiline}
          textAlignVertical="top"
          error={fe('bio')}
        />
      </Card>

      <Card title="Contact and links">
        <TextField label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={fe('phone')} />
        <TextField
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={fe('email')}
        />
        <TextField
          label="Website"
          value={form.website}
          onChangeText={set('website')}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://"
          error={fe('website')}
        />
        <TextField
          label="Booking link"
          value={form.booking_url}
          onChangeText={set('booking_url')}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://"
          error={fe('booking_url')}
        />
      </Card>

      <Card title="Address">
        <TextField label="Street" value={form.address.line1} onChangeText={setAddress('line1')} error={fe('address.line1') ?? fe('address')} />
        <TextField label="Suite, unit (optional)" value={form.address.line2} onChangeText={setAddress('line2')} error={fe('address.line2')} />
        <TextField label="City" value={form.address.city} onChangeText={setAddress('city')} error={fe('address.city')} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="State" value={form.address.state} onChangeText={setAddress('state')} autoCapitalize="characters" error={fe('address.state')} />
          </View>
          <View style={styles.flex}>
            <TextField label="ZIP" value={form.address.zip} onChangeText={setAddress('zip')} keyboardType="number-pad" error={fe('address.zip')} />
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={font.body}>Card is on</Text>
          </View>
          <Switch
            value={form.enabled}
            onValueChange={set('enabled')}
            accessibilityLabel="Card is on"
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </Card>

      {error && !shownFieldErrors ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error.message}
        </Text>
      ) : null}
      <Button title="Save changes" onPress={save} loading={saving} disabled={!dirty} />
    </Screen>
  );
}

function PhotoSection({ card, onUploaded }: { card: DigitalCard; onUploaded: (card: DigitalCard) => void }) {
  const [progress, setProgress] = useState<number | null>(null);

  const change = async () => {
    try {
      const picked = await pickCardPhoto();
      if ('cancelled' in picked) return;
      if ('error' in picked) {
        Alert.alert('Photos not allowed', 'Allow access to your photos in Settings to choose a card photo.');
        return;
      }
      setProgress(0);
      const updated = await cardsApi.uploadPhoto(card.id, picked.file, setProgress);
      onUploaded(updated);
    } catch (e) {
      Alert.alert('Couldn’t upload the photo', toApiError(e).message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <Card title="Photo">
      <View style={styles.photoRow}>
        {card.photo_url ? (
          <Image source={{ uri: card.photo_url }} style={styles.photo} accessibilityLabel="Card photo" />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Text style={font.caption}>No photo</Text>
          </View>
        )}
        <View style={styles.flex}>
          <Button
            title={card.photo_url ? 'Change photo' : 'Add photo'}
            variant="secondary"
            onPress={change}
            loading={progress !== null}
          />
          {progress !== null ? <Text style={font.caption}>Uploading… {Math.round(progress * 100)}%</Text> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  multiline: { minHeight: 100, paddingTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  error: { color: colors.danger, fontSize: 14 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  photo: { width: 88, height: 88, borderRadius: radius.lg, backgroundColor: colors.background },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
});
