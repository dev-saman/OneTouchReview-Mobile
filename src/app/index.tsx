import { Redirect } from 'expo-router';

import { useAppSelector } from '@/store/hooks';

/** Anchor route: sends each session phase to its screen. */
export default function Index() {
  const phase = useAppSelector((s) => s.session.phase);
  switch (phase) {
    case 'signedIn':
      return <Redirect href="/home" />;
    case 'updateRequired':
      return <Redirect href="/update-required" />;
    case 'startupError':
      return <Redirect href="/startup-error" />;
    case 'suspended':
      return <Redirect href="/suspended" />;
    case 'signedOut':
      return <Redirect href="/sign-in" />;
    default:
      return null;
  }
}
