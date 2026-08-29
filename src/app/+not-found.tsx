/** Any unmatched link lands on Today, never on an error screen. */
import { Redirect } from 'expo-router';

export default function NotFound() {
  return <Redirect href="/" />;
}
