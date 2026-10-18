/** React bindings: `useTranslation` re-exported against the app's instance. */
import { initReactI18next } from 'react-i18next';

import { i18n } from '@/i18n';

i18n.use(initReactI18next);

export { useTranslation, Trans } from 'react-i18next';
