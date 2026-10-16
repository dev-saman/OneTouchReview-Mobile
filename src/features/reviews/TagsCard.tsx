import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { TAGS_PER_REVIEW_MAX, reviewExtrasApi } from '@/api/siteReviews.api';
import type { ApiError, ReviewTag } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, font, spacing } from '@/constants/theme';
import { can } from '@/config/permissions';
import { toApiError } from '@/hooks/useApiQuery';
import { useAppSelector } from '@/store/hooks';

import { useReviewTags } from './hooks';
import { tagTone } from './sites';

/** A review's tags as badges. */
export function TagBadges({ tags }: { tags: Pick<ReviewTag, 'id' | 'name' | 'color'>[] | undefined }) {
  if (!tags?.length) return null;
  return (
    <>
      {tags.map((t) => (
        <Badge key={t.id} label={t.name} tone={tagTone(t.color)} />
      ))}
    </>
  );
}

/**
 * A review's tags (any role sets them: PUT …/tags, up to 10). Owners and managers can also create
 * a tag here; renaming and deleting tags is web only.
 */
export function TagsCard({ tags, onSave }: { tags: ReviewTag[]; onSave: (tagIds: number[]) => Promise<ReviewTag[]> }) {
  const [shown, setShown] = useState(tags);
  const [editing, setEditing] = useState(false);

  return (
    <Card title="Tags">
      {shown.length ? (
        <View style={styles.badges}>
          <TagBadges tags={shown} />
        </View>
      ) : (
        <Text style={font.small}>No tags yet.</Text>
      )}
      <Button title="Edit tags" variant="secondary" icon="pricetags-outline" onPress={() => setEditing(true)} />
      {editing ? (
        <TagPicker
          selected={shown.map((t) => t.id)}
          onClose={() => setEditing(false)}
          onSave={async (ids) => {
            setShown(await onSave(ids));
            setEditing(false);
          }}
        />
      ) : null}
    </Card>
  );
}

function TagPicker({
  selected,
  onClose,
  onSave,
}: {
  selected: number[];
  onClose: () => void;
  onSave: (tagIds: number[]) => Promise<void>;
}) {
  const role = useAppSelector((s) => s.auth.user?.role);
  const { tags, refresh } = useReviewTags();
  const [ids, setIds] = useState(selected);
  const [created, setCreated] = useState<ReviewTag[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'save' | 'create' | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const all = [...tags, ...created.filter((c) => !tags.some((t) => t.id === c.id))];
  const full = ids.length >= TAGS_PER_REVIEW_MAX;

  const toggle = (id: number, on: boolean) => setIds((current) => (on ? [...current, id] : current.filter((x) => x !== id)));

  const create = async () => {
    setBusy('create');
    setError(null);
    try {
      const tag = await reviewExtrasApi.createTag(name.trim());
      setCreated((c) => [...c, tag]);
      if (!full) setIds((current) => [...current, tag.id]);
      setName('');
      refresh();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy('save');
    setError(null);
    try {
      await onSave(ids);
    } catch (e) {
      setError(toApiError(e));
      setBusy(null);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen edges={['top', 'bottom']}>
        <Text style={font.heading}>Tags</Text>
        <Text style={font.small}>Up to {TAGS_PER_REVIEW_MAX} per review. Only your team sees them.</Text>
        {all.length === 0 ? <Text style={font.body}>No tags yet.</Text> : null}
        {all.map((tag) => {
          const checked = ids.includes(tag.id);
          return (
            <Checkbox key={tag.id} label={tag.name} checked={checked} onChange={(on) => (!on || !full ? toggle(tag.id, on) : undefined)} />
          );
        })}
        {can(role, 'manageReviews') ? (
          <View style={styles.create}>
            <TextField label="New tag" value={name} onChangeText={setName} maxLength={50} returnKeyType="done" />
            <Button title="Add tag" variant="secondary" onPress={create} loading={busy === 'create'} disabled={!name.trim() || !!busy} />
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error.message}</Text> : null}
        <Button title="Save" onPress={save} loading={busy === 'save'} disabled={!!busy} />
        <Button title="Cancel" variant="text" onPress={onClose} />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  create: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
});
