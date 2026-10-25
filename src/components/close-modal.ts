import { router } from 'expo-router';

/**
 * Closes a modal route (Done, Cancel, Not now). The root layout's
 * `initialRouteName` keeps the tabs underneath a modal that a link opened on
 * a cold start, so there is normally a screen to go back to. If there ever
 * isn't, go to Today rather than leave a button that does nothing.
 */
export function closeModal() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
