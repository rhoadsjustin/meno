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
  migrationError: 'Something went wrong preparing your data: {{message}}',
  recovery: {
    title: 'Something went wrong.',
    body: 'Your verses and progress are safe on this device.',
  },
} as const;
