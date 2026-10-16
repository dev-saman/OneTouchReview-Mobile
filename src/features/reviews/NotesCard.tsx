import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { reviewExtrasApi } from '@/api/siteReviews.api';
import type { ApiError, ReviewNote } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, font, radius, spacing } from '@/constants/theme';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { formatRelative } from '@/utils/format';

/**
 * Private notes on a review (never shown publicly). Any role adds; the author, owners and managers
 * edit or delete (note.can_edit).
 */
export function NotesCard({
  reviewKey,
  load,
  add,
}: {
  /** Reloads when the review changes, e.g. "google-12" or "site-44". */
  reviewKey: string;
  load: (signal: AbortSignal) => Promise<ReviewNote[]>;
  add: (body: string) => Promise<ReviewNote>;
}) {
  const fetcher = useCallback((signal: AbortSignal) => load(signal), [load]);
  const q = useApiQuery(`notes|${reviewKey}`, fetcher);
  // Local changes on top of the loaded list: added, edited and deleted notes.
  const [added, setAdded] = useState<ReviewNote[]>([]);
  const [edited, setEdited] = useState<Record<number, ReviewNote | null>>({});
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const notes = [...added, ...(q.data ?? [])]
    .map((n) => (n.id in edited ? edited[n.id] : n))
    .filter((n): n is ReviewNote => n !== null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const note = await add(draft.trim());
      setAdded((a) => [note, ...a]);
      setDraft('');
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Private notes">
      <Text style={font.caption}>Only your team sees these.</Text>
      {q.error && !q.data ? <Text style={styles.error}>{q.error.message}</Text> : null}
      {notes.map((note) => (
        <NoteRow key={note.id} note={note} onChanged={(next) => setEdited((e) => ({ ...e, [note.id]: next }))} />
      ))}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Add a note"
        placeholderTextColor={colors.textSubtle}
        multiline
        accessibilityLabel="New note"
        style={styles.input}
        textAlignVertical="top"
      />
      {error ? <Text style={styles.error}>{error.message}</Text> : null}
      <Button title="Add note" variant="secondary" onPress={submit} loading={busy} disabled={!draft.trim() || busy} />
    </Card>
  );
}

function NoteRow({ note, onChanged }: { note: ReviewNote; onChanged: (next: ReviewNote | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.body);
  const [busy, setBusy] = useState(false);
  const meta = [note.user?.name, formatRelative(note.created_at)].filter(Boolean).join(' · ');

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert('Couldn’t save the note', toApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      onChanged(await reviewExtrasApi.editNote(note.id, text.trim()));
      setEditing(false);
    });

  const remove = () =>
    Alert.alert('Delete this note?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await reviewExtrasApi.deleteNote(note.id);
            onChanged(null);
          }),
      },
    ]);

  return (
    <View style={styles.note}>
      {editing ? (
        <TextInput value={text} onChangeText={setText} multiline accessibilityLabel="Edit note" style={styles.input} textAlignVertical="top" />
      ) : (
        <Text style={font.body}>{note.body}</Text>
      )}
      {meta ? <Text style={font.caption}>{meta}</Text> : null}
      {note.can_edit ? (
        <View style={styles.actions}>
          {editing ? (
            <>
              <Button title="Save" variant="text" onPress={save} loading={busy} disabled={!text.trim()} />
              <Button title="Cancel" variant="text" onPress={() => { setEditing(false); setText(note.body); }} />
            </>
          ) : (
            <>
              <Button title="Edit" variant="text" onPress={() => setEditing(true)} />
              <Button title="Delete" variant="text" onPress={remove} loading={busy} />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { gap: 2, paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  actions: { flexDirection: 'row', gap: spacing.sm },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  error: { color: colors.danger, fontSize: 14 },
});
