/** Every namespace, keyed by name. Add a namespace here and in es/index.ts. */
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
} as const;
