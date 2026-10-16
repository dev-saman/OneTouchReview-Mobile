import type { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { AI_DRAFT_STATUS } from '@/api/reviews.api';
import { openWebApp } from '@/services/web/openWebApp';

import type { NotificationTarget } from './target';

const WEB_MESSAGE = 'Open OneTouchReview on the web to fix this.';

type Text = { title: string | null; body: string | null };

const message = (text: Text, extra?: string) => [text.body, extra].filter(Boolean).join('\n\n') || undefined;

function notInAppYet(text: Text, feature: string) {
  Alert.alert(text.title ?? feature, message(text, `${feature} isn’t in this version of the app yet.`));
}

/** Opens a bell item or a tapped push. The text is the item's title and body, shown where there is no screen. */
export function openTarget(router: ReturnType<typeof useRouter>, target: NotificationTarget, text: Text) {
  switch (target.type) {
    case 'feedback':
      router.push({ pathname: '/feedback/[id]', params: { id: String(target.id), source: target.source } });
      return;
    case 'feedbackList':
      router.push('/feedback');
      return;
    case 'review':
      router.push({ pathname: '/reviews/[id]', params: { id: String(target.id) } });
      return;
    case 'reviewsAiDrafts':
      router.push({ pathname: '/reviews', params: { status: AI_DRAFT_STATUS } });
      return;
    case 'reviewsChanged':
      router.push({ pathname: '/reviews', params: { status: 'changed' } });
      return;
    case 'reviewsList':
      router.push('/reviews');
      return;
    case 'siteReviews':
      // Google's own first import opens the Google reviews.
      if (target.platform === null || target.platform === 'google') router.push('/reviews');
      else notInAppYet(text, 'Reviews from other sites');
      return;
    case 'siteReview':
      notInAppYet(text, 'Reviews from other sites');
      return;
    case 'shieldFlag':
      notInAppYet(text, 'Review Shield');
      return;
    case 'assistant':
      notInAppYet(text, 'Card assistant');
      return;
    case 'googleProfile':
      notInAppYet(text, 'Google profile approvals');
      return;
    case 'reports':
      router.push({ pathname: '/reports', params: target.pointId ? { point: String(target.pointId) } : {} });
      return;
    case 'clientsNotSent':
      router.navigate({ pathname: '/clients', params: { filter: 'not_sent' } });
      return;
    case 'chat':
      router.push({ pathname: '/chats/[id]', params: { id: String(target.id) } });
      return;
    case 'chatsList':
      router.navigate('/chats');
      return;
    case 'profile':
      router.push('/profile');
      return;
    case 'webOnly':
      Alert.alert(text.title ?? 'OneTouchReview', message(text, WEB_MESSAGE), [
        { text: 'Close', style: 'cancel' },
        { text: 'Open on the web', onPress: () => openWebApp() },
      ]);
      return;
    case 'messageOnly':
      // Never a link to billing or plans.
      Alert.alert(text.title ?? 'OneTouchReview', message(text));
      return;
    default:
      Alert.alert(text.title ?? 'OneTouchReview', message(text));
  }
}
