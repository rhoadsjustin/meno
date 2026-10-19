/** App shell: tab bar, root error and recovery screens. */
export default {
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
