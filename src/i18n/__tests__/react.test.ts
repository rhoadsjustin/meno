import { getI18n } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/i18n';
import '@/i18n/react';

describe('react bindings', () => {
  it('hooks resolve the initialized instance, not an empty default', () => {
    // Regression: binding after init left useTranslation rendering raw keys.
    expect(getI18n()).toBe(i18n);
    expect(getI18n().t('onboarding:welcome.title')).toBe('Let the Word remain in you.');
  });
});
