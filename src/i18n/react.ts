/** React bindings: `useTranslation` bound to the app's instance. */
import { setI18n } from 'react-i18next';

import { i18n } from '@/i18n';

// The instance is already initialized (src/i18n), so register it directly —
// `i18n.use(initReactI18next)` after init would leave hooks on react-i18next's
// empty default instance and render raw keys.
setI18n(i18n);

export { useTranslation, Trans } from 'react-i18next';
