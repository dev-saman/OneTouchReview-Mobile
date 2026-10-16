import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { dashboardApi } from '@/api/dashboard.api';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { colors, font, spacing } from '@/constants/theme';
import { NeedsYouTile } from '@/features/dashboard/NeedsYouTile';
import { TileRefreshProvider, useTileRefresh } from '@/features/dashboard/refresh';
import { AttributionTile, CardTile, MonthTile, NearbyTile, RatingTile, RecentTile, SitesTile } from '@/features/dashboard/Tiles';
import { selectSelectedLocation } from '@/features/location/selectors';
import { ProfileBanners } from '@/features/profile/ProfileBanners';
import { SummaryCard } from '@/features/reviews/SummaryCard';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { greeting } from '@/utils/format';

/**
 * Screen 7, the dashboard (Sheet "Dashboard" tab). Every tile loads, fails and hides on its own, so
 * one error never blanks the dashboard; pull to refresh reloads them all. The location switcher and
 * the bell are in the header. Quick actions (row 2) wait for the owner's decision (no quick actions
 * on Home since 2026-10-12).
 */
export default function HomeScreen() {
  const location = useAppSelector(selectSelectedLocation);
  if (location === null) {
    return (
      <EmptyState
        icon="location-outline"
        title="No locations yet"
        message="Add a location on the web to see your numbers here."
      />
    );
  }
  return <TileRefreshProvider>{(refreshAll) => <DashboardScreen location={location} refreshAll={refreshAll} />}</TileRefreshProvider>;
}

function DashboardScreen({ location, refreshAll }: { location: LocationSelection; refreshAll: () => Promise<void> }) {
  const router = useRouter();
  const firstName = useAppSelector((s) => s.auth.user?.name)?.trim().split(/\s+/)[0];
  const fetcher = useCallback((signal: AbortSignal) => dashboardApi.get(location, signal), [location]);
  const q = useApiQuery(`dashboard|${location}`, fetcher);
  useTileRefresh(q.refresh);
  useRefreshOnFocus(refreshAll);

  const [pulling, setPulling] = useState(false);
  const onPull = async () => {
    setPulling(true);
    await refreshAll();
    setPulling(false);
  };
  const dashboard = q.data;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} tintColor={colors.primary} />}
    >
      <View style={styles.hello}>
        <Text style={font.title} accessibilityRole="header">
          {firstName ? `${greeting()}, ${firstName}` : greeting()}
        </Text>
        <Text style={font.small}>{"Here's what's happening with your business."}</Text>
      </View>

      <ProfileBanners />

      <NeedsYouTile location={location} dashboard={dashboard} />

      {dashboard ? (
        <>
          <RatingTile location={location} dashboard={dashboard} />
          <MonthTile location={location} dashboard={dashboard} />
          <SitesTile location={location} dashboard={dashboard} />
        </>
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={q.reload} />
      ) : (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      )}

      <SummaryCard location={location} source="all" compact onOpen={() => router.push('/reviews')} />
      <AttributionTile location={location} />
      <CardTile location={location} />

      {dashboard ? (
        <>
          <NearbyTile location={location} dashboard={dashboard} />
          <RecentTile dashboard={dashboard} />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  hello: { gap: spacing.xs, marginTop: spacing.xs },
  loading: { padding: spacing.xl },
});
