import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { feedbackApi } from '@/api/feedback.api';
import type { ApiError, PrivateFeedback } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card, InfoRow } from '@/components/ui/Card';
import { Stars } from '@/components/ui/Stars';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing } from '@/constants/theme';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { formatDateTime, formatPhone } from '@/utils/format';

/** Screen 5 detail (also the push / bell deep link): read it, call or text back, suggested reply. */
export default function FeedbackDetailScreen() {
  const params = useLocalSearchParams<{ id: string; source?: string }>();
  const id = Number(params.id);
  const source = params.source === 'card' ? 'card' : 'request';

  const fetcher = useCallback((signal: AbortSignal) => feedbackApi.get(id, source, signal), [id, source]);
  const { data, error, loading, refreshing, reload, refresh } = useApiQuery(`${source}-${id}`, fetcher);

  if (loading) return <LoadingView />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <FeedbackCard feedback={data} />
      <ContactCard feedback={data} />
      {/* The suggested reply is per review response; card feedback has none yet (docs/API-GAPS.md #20). */}
      {data.source !== 'card' ? <SuggestedReply feedbackId={data.id} phone={data.client?.phone ?? null} /> : null}
    </ScrollView>
  );
}

function FeedbackCard({ feedback }: { feedback: PrivateFeedback }) {
  const points = feedback.points?.filter((p) => p.name) ?? [];
  return (
    <Card>
      <View style={styles.headerRow}>
        <Stars rating={feedback.rating} size={20} />
        {feedback.source === 'card' ? <Badge label="From your card" /> : null}
      </View>
      {feedback.text ? <Text style={styles.text}>{feedback.text}</Text> : <Text style={font.small}>No comment, rating only.</Text>}
      {points.length ? (
        <View style={styles.points}>
          {points.map((p) => (
            <Badge key={p.id} label={p.name} tone={p.kind === 'like' ? 'success' : 'neutral'} />
          ))}
        </View>
      ) : null}
      <Text style={font.caption}>
        {[feedback.location?.name, formatDateTime(feedback.created_at)].filter(Boolean).join(' · ')}
      </Text>
    </Card>
  );
}

/** Call or text back with the phone's own Phone and Messages apps. */
function ContactCard({ feedback }: { feedback: PrivateFeedback }) {
  const router = useRouter();
  const client = feedback.client;
  if (!client || (!client.name && !client.phone && !client.email)) return null;

  return (
    <Card title={client.name ?? 'Client'}>
      {client.phone ? <InfoRow label="Phone" value={formatPhone(client.phone)} /> : null}
      {client.email ? <InfoRow label="Email" value={client.email} /> : null}
      <View style={styles.actions}>
        {client.phone ? (
          <>
            <Button title="Call" onPress={() => Linking.openURL(`tel:${client.phone}`)} style={styles.action} />
            <Button title="Text" variant="secondary" onPress={() => Linking.openURL(`sms:${client.phone}`)} style={styles.action} />
          </>
        ) : null}
        {client.email ? (
          <Button title="Email" variant="secondary" onPress={() => Linking.openURL(`mailto:${client.email}`)} style={styles.action} />
        ) : null}
      </View>
      {client.customer_id ? (
        <Button
          title="Open client"
          variant="text"
          onPress={() => router.push({ pathname: '/client/[id]', params: { id: String(client.customer_id) } })}
        />
      ) : null}
    </Card>
  );
}

/** POST /review-responses/{id}/ai-reply: a reply the user sends themselves (copy, then text). */
function SuggestedReply({ feedbackId, phone }: { feedbackId: number; phone: string | null }) {
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const suggest = async () => {
    setLoading(true);
    setError(null);
    try {
      setReply(await feedbackApi.suggestReply(feedbackId));
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!reply) return;
    await Clipboard.setStringAsync(reply);
    Alert.alert('Copied', phone ? 'Paste it into your text to the client.' : 'Paste it into your message to the client.');
  };

  return (
    <Card title="Suggested reply">
      {reply ? (
        <>
          <Text style={styles.text} selectable>
            {reply}
          </Text>
          <View style={styles.actions}>
            <Button title="Copy" onPress={copy} style={styles.action} />
            {phone ? (
              <Button title="Open Messages" variant="secondary" onPress={() => Linking.openURL(`sms:${phone}`)} style={styles.action} />
            ) : null}
          </View>
          <Button title="Suggest another" variant="text" onPress={suggest} loading={loading} />
        </>
      ) : (
        <>
          <Text style={font.small}>Get a suggested reply to copy and send from your own phone.</Text>
          {error ? <Text style={styles.error}>{error.message}</Text> : null}
          <Button title="Suggest a reply" variant="secondary" onPress={suggest} loading={loading} />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { fontSize: 17, lineHeight: 24, color: colors.text },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
  error: { color: colors.danger, fontSize: 14 },
});
