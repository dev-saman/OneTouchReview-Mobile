import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { customersApi } from '@/api/customers.api';
import type { ApiError, Customer, ReviewRequest } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card, InfoRow } from '@/components/ui/Card';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing } from '@/constants/theme';
import { RequestRow } from '@/features/clients/RequestRow';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { formatDate, formatPhone, formatRating, humanize, isFuture } from '@/utils/format';

/** Screen 9 detail: contact, consent, "Can be asked again on …", Not sent reasons, request history. */
export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Number(id);

  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const [customer, attempts, history] = await Promise.all([
        customersApi.get(clientId, signal),
        customersApi.sendAttempts(clientId, signal),
        customersApi.history(clientId, null, signal),
      ]);
      return { customer, attempts, history };
    },
    [clientId],
  );
  const { data, error, loading, refreshing, reload, refresh } = useApiQuery(clientId, fetcher);
  useRefreshOnFocus(refresh);

  // Later history pages, appended below the first page.
  const [more, setMore] = useState<{ items: ReviewRequest[]; cursor: string | null; hasMore: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<ApiError | null>(null);

  const [shownFor, setShownFor] = useState(data);
  if (shownFor !== data) {
    // New first page (refresh): drop the appended pages.
    setShownFor(data);
    setMore(null);
    setMoreError(null);
  }

  if (loading) return <LoadingView />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;

  const { customer, attempts } = data;
  const history = [...data.history.review_requests, ...(more?.items ?? [])];
  const cursor = more ? more.cursor : data.history.next_cursor;
  const hasMore = more ? more.hasMore : data.history.has_more;

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await customersApi.history(clientId, cursor);
      setMore((m) => ({
        items: [...(m?.items ?? []), ...page.review_requests],
        cursor: page.next_cursor,
        hasMore: page.has_more && !!page.next_cursor,
      }));
    } catch (e) {
      setMoreError(toApiError(e));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: customer.name }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <ContactCard customer={customer} />

        {customer.latest_response ? (
          <Card title="Latest response">
            <InfoRow label="Rating" value={`${formatRating(customer.latest_response.rating)} of 5`} />
            {customer.latest_response.responded_at ? (
              <InfoRow label="Answered" value={formatDate(customer.latest_response.responded_at)} />
            ) : null}
            {customer.latest_response.private_feedback ? (
              <Text style={font.body}>“{customer.latest_response.private_feedback}”</Text>
            ) : null}
          </Card>
        ) : null}

        {attempts.length ? (
          <Card title="Not sent">
            {attempts.map((attempt, index) => (
              <View key={index} style={styles.attempt}>
                <Text style={font.body}>{attempt.message}</Text>
                {attempt.source_label ? <Text style={font.caption}>{attempt.source_label}</Text> : null}
              </View>
            ))}
          </Card>
        ) : null}

        <Card title="Requests">
          {history.length === 0 ? (
            <Text style={font.small}>No review requests yet.</Text>
          ) : (
            history.map((request) => <RequestRow key={request.id} request={request} />)
          )}
          {moreError ? <Text style={font.small}>{moreError.message}</Text> : null}
          {hasMore ? <Button title="Load more" variant="text" loading={loadingMore} onPress={loadMore} /> : null}
        </Card>
      </ScrollView>
    </>
  );
}

function ContactCard({ customer }: { customer: Customer }) {
  const consent = customer.sms_consent?.status;
  const canAskAgainOn = isFuture(customer.next_request_allowed_at) ? formatDate(customer.next_request_allowed_at) : '';

  return (
    <Card>
      <View style={styles.badges}>
        {customer.location ? <Badge label={customer.location.name} /> : null}
        {customer.last_not_sent ? <Badge label="Not sent" tone="warning" /> : null}
      </View>
      {customer.phone ? (
        <ContactLine label="Phone" value={formatPhone(customer.phone)} onPress={() => Linking.openURL(`tel:${customer.phone}`)} />
      ) : null}
      {customer.email ? (
        <ContactLine label="Email" value={customer.email} onPress={() => Linking.openURL(`mailto:${customer.email}`)} />
      ) : null}
      {customer.phone && consent ? (
        <InfoRow label="Texts" value={consent === 'opted_out' ? 'Opted out (replied STOP)' : humanize(consent)} />
      ) : null}
      {customer.email && customer.email_status && customer.email_status.status !== 'ok' ? (
        <InfoRow label="Email status" value={humanize(customer.email_status.status)} />
      ) : null}
      {canAskAgainOn ? (
        <Text style={[font.small, styles.askAgain]}>Can be asked again on {canAskAgainOn}</Text>
      ) : null}
    </Card>
  );
}

function ContactLine({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={styles.contactLine}>
      <Text style={font.small}>{label}</Text>
      <Text
        style={styles.link}
        onPress={onPress}
        accessibilityRole="link"
        accessibilityHint={label === 'Phone' ? 'Calls this client' : 'Emails this client'}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  contactLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  link: { fontSize: 16, color: colors.primary, flexShrink: 1, textAlign: 'right' },
  askAgain: { color: colors.warning, fontWeight: '600' },
  attempt: { gap: 2 },
});
