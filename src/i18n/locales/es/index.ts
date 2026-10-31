import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en';

import common from './common';
import books from './books';
import today from './today';
import library from './library';
import stats from './stats';
import settings from './settings';
import reader from './reader';
import practice from './practice';
import review from './review';
import stitch from './stitch';
import goals from './goals';
import onboarding from './onboarding';
import help from './help';
import challenge from './challenge';
import lock from './lock';
import notifications from './notifications';
import widgets from './widgets';
import app from './app';
import wrapped from './wrapped';

export default {
  common,
  books,
  today,
  library,
  stats,
  settings,
  reader,
  practice,
  review,
  stitch,
  goals,
  onboarding,
  help,
  challenge,
  lock,
  notifications,
  widgets,
  app,
  wrapped,
} satisfies Catalog<typeof en>;
