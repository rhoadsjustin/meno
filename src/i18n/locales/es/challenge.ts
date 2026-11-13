import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/challenge';

export default {
  invitation: 'Invitación a un desafío',
  invalidHeading: 'Este enlace no funcionó',
  joinedHeading: 'Ya estás participando',
  joinedBody: '“{{title}}” ya está en este dispositivo. Sigue adelante: cada recitación cuenta.',
  joinedBodyMemorized: 'Ya memorizaste “{{title}}”.',
  joinedBodyInactive: '“{{title}}” está en este dispositivo, pero ya no está en curso.',
  translationDue: '{{abbrev}} · terminar antes del {{date}}',
  translationAiming: '{{abbrev}} · con la mira en el {{date}}',
  summary: '{{verses}} · {{days}}',
  aboutDays_one: 'alrededor de {{count}} día',
  aboutDays_other: 'alrededor de {{count}} días',
  swapped:
    'Se compartió en {{shared}}, que no está configurada en este dispositivo; memorizarás en {{local}}.',
  joinNote:
    'Al unirte, este pasaje se agrega a tu dispositivo. Tu progreso es privado; por ahora solo tú lo ves.',
  join: 'Unirme al desafío',
  practice: 'Practicar',
  joinFailed: 'No se pudo unir a este desafío. Inténtalo de nuevo.',
  failedHeading: 'No se pudo cargar este pasaje',
  failedBody: 'El enlace está bien. Inténtalo de nuevo en un momento.',
  update: 'Actualizar Meno',
  choosePassage: 'Elige un pasaje',
  errors: {
    malformed: 'Está incompleto o ya no sirve. Pide uno nuevo.',
    newerVersion:
      'Este desafío necesita una versión más reciente de Meno. Actualiza la app y vuelve a abrir el enlace.',
    unknownTranslation: 'Este desafío usa una traducción que esta versión de Meno no conoce.',
    passageNotFound: 'Este desafío apunta a un pasaje que Meno no encuentra.',
    multipleBooks: 'Este desafío abarca varios libros, algo que Meno todavía no admite.',
  },
  share: {
    message: 'Memoriza {{passage}} ({{abbrev}}) conmigo en Meno. Únete a mi desafío: {{url}}',
    messageDue:
      'Memoriza {{passage}} ({{abbrev}}) conmigo antes del {{date}} en Meno. Únete a mi desafío: {{url}}',
    text: 'Memoriza {{passage}} ({{abbrev}}) conmigo en Meno.',
    textDue: 'Memoriza {{passage}} ({{abbrev}}) conmigo antes del {{date}} en Meno.',
    named: '“{{title}}”: {{message}}',
    subject: 'Desafío de Meno: {{title}}',
    failedTitle: 'No se pudo compartir este desafío',
    failed: 'Inténtalo de nuevo en un momento.',
  },
} satisfies Catalog<typeof en>;
