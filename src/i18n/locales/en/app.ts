/** App shell: tab bar, root error and recovery screens. */
export default {
  // Offered when a critical over-the-air fix has downloaded.
  updateAlert: {
    title: 'Meno has a fix ready',
    body: 'Restart now to get it. Your verses and progress stay right where they are.',
    later: 'Later',
    restart: 'Restart',
  },
  tabs: {
    today: 'Today',
    library: 'Library',
    stats: 'Stats',
    settings: 'Settings',
  },
  // A failed database migration at launch. The exception goes to diagnostics.
  migrationError: {
    title: 'Meno couldn’t open your data',
    body: 'Your verses and progress are still on this device. Try again, or close Meno and reopen it.',
  },
  recovery: {
    title: 'Something went wrong.',
    body: 'Your verses and progress are safe on this device.',
  },
} as const;
