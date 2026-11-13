import { router } from 'expo-router';

/**
 * Leaves a modal route or a session (Done, Cancel, Not now, Close): every
 * exit in practice, review, stitch, lock setup and the unlock quiz goes
 * through here, so the fallback lives in one place. The root layout's
 * `initialRouteName` keeps the tabs underneath a modal that a link opened on
 * a cold start, so there is normally a screen to go back to. If there ever
 * isn't, go to Today rather than leave a button that does nothing.
 */
export function closeModal() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
