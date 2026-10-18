/** Challenge links: the join screen, link errors, and the share message. */
export default {
  invitation: 'Challenge invitation',
  invalidHeading: 'This link didn’t work',
  joinedHeading: 'You’re already in',
  joinedBody: '“{{title}}” is on this device. Keep going — every recitation counts.',
  /** Translation and target date under the passage, e.g. "WEB · finish by December 25, 2026". */
  translationDue: '{{abbrev}} · finish by {{date}}',
  swapped:
    'Shared in {{shared}}, which isn’t set up on this device — you’ll memorize in {{local}} instead.',
  joinNote:
    'Joining creates this goal on your device. Your progress stays private; only you see it for now.',
  join: 'Join challenge',
  practice: 'Practice',
  joinFailed: 'Something went wrong joining this challenge. Try the link again.',
  errors: {
    malformed: 'This challenge link is missing or malformed.',
    newerVersion: 'This challenge needs a newer version of Meno. Update the app and try the link again.',
    unknownTranslation: 'This challenge uses a translation this version of Meno doesn’t know.',
    passageNotFound: 'This challenge points at a passage Meno can’t find.',
    multipleBooks: 'This challenge spans multiple books, which Meno doesn’t support yet.',
  },
  share: {
    message: 'Memorize {{passage}} ({{abbrev}}) with me in Meno. Join my challenge: {{url}}',
    messageDue:
      'Memorize {{passage}} ({{abbrev}}) with me by {{date}} in Meno. Join my challenge: {{url}}',
    /** A named goal leads the message with its name. */
    named: '“{{title}}” — {{message}}',
    subject: 'Meno challenge: {{title}}',
  },
} as const;
