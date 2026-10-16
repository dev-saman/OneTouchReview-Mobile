import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { leadsApi } from '@/api/leads.api';
import type { Lead, LeadSource } from '@/api/types';
import { Badge } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { ListFooter } from '@/components/ui/ListFooter';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { LeadSheet } from '@/features/leads/LeadSheet';
import { phoneNote, sourceChips, sourceLabel } from '@/features/leads/sources';
import { selectSelectedLocation } from '@/features/location/selectors';
import { listStyles, SearchBox } from '@/features/reviews/ListControls';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagedList } from '@/hooks/usePagedList';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { formatPhone, formatRelative } from '@/utils/format';

/**
 * Screen 16, Leads: everyone who left their details through a card, the website assistant, a card
 * form or a booking. Newest first, source chips from counts.by_source, the chosen location, search.
 */
export default function LeadsScreen() {
  const location = useAppSelector(selectSelectedLocation);
  if (location === null) return <EmptyState title="No leads yet" />;
  return <LeadsList location={location} />;
}

function LeadsList({ location }: { location: LocationSelection }) {
  const [source, setSource] = useState<string>('all');
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim(), 350);
  const [open, setOpen] = useState<Lead | null>(null);

  const load = useCallback(
    async (cursor: string | null, signal?: AbortSignal) => {
      const answer = await leadsApi.list(
        { location, source: source === 'all' ? undefined : (source as LeadSource), search, cursor },
        signal,
      );
      return { items: answer.leads, next: answer.has_more ? answer.next_cursor : null, meta: answer.counts };
    },
    [location, source, search],
  );
  const list = usePagedList(`${location}|${source}|${search}`, load, leadKey);
  useRefreshOnFocus(list.refresh);
  const chips = sourceChips(list.meta?.by_source);

  return (
    <View style={listStyles.screen}>
      <View style={listStyles.controls}>
        <SearchBox value={query} onChange={setQuery} placeholder="Search name, phone or email" />
        {chips.length ? (
          <Chips options={[{ value: 'all', label: `All${list.meta ? ` (${list.meta.total})` : ''}` }, ...chips]} value={source} onChange={setSource} />
        ) : null}
      </View>
      {list.loading ? (
        <LoadingView />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={leadKey}
          renderItem={({ item }) => <Row lead={item} onPress={() => setOpen(item)} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={list.items.length ? undefined : listStyles.empty}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={search || source !== 'all' ? 'No matches' : 'No leads yet'}
              message={search || source !== 'all' ? undefined : 'People who leave their details on your card or website show here.'}
            />
          }
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          keyboardDismissMode="on-drag"
          ListFooterComponent={<ListFooter loadingMore={list.loadingMore} moreError={list.moreError} onRetry={list.loadMore} />}
        />
      )}
      {open ? <LeadSheet lead={open} location={location} onClose={() => setOpen(null)} /> : null}
    </View>
  );
}

/** Lead ids are strings (c5, a7). */
const leadKey = (lead: Lead) => lead.id;

function Row({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const contact = [lead.phone ? formatPhone(lead.phone) : null, lead.email].filter(Boolean).join(' · ');
  const note = phoneNote(lead);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Text style={[styles.name, styles.flex]} numberOfLines={1}>
          {lead.name || 'Visitor'}
        </Text>
        <Text style={font.caption}>{formatRelative(lead.last_activity_at ?? lead.created_at)}</Text>
      </View>
      {contact ? <Text style={font.small}>{contact}</Text> : null}
      {note ? <Text style={styles.warning}>{note}</Text> : null}
      {lead.first_question || lead.topic ? (
        <Text style={font.body} numberOfLines={2}>
          {lead.first_question || lead.topic}
        </Text>
      ) : null}
      <View style={styles.badges}>
        <Badge label={sourceLabel(lead.source)} />
        {lead.customer_id ? <Badge label="Client" tone="success" /> : null}
        {lead.location ? <Text style={font.caption}>{lead.location.name}</Text> : null}
      </View>
    </Pressable>
  );
}

function Separator() {
  return <View style={listStyles.separator} />;
}

const styles = StyleSheet.create({
  row: { minHeight: touchTarget + 16, padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  warning: { fontSize: 13, color: colors.warning },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
});
