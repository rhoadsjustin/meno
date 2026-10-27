import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/challenge';

export default {
  invitation: 'Invitación a un desafío',
  invalidHeading: 'Este enlace no funcionó',
  joinedHeading: 'Ya estás participando',
  joinedBody: '“{{title}}” ya está en este dispositivo. Sigue adelante: cada recitación cuenta.',
  translationDue: '{{abbrev}} · terminar antes del {{date}}',
  swapped:
    'Se compartió en {{shared}}, que no está configurada en este dispositivo; memorizarás en {{local}}.',
  joinNote:
    'Al unirte, se crea esta meta en tu dispositivo. Tu progreso es privado; por ahora solo tú lo ves.',
  join: 'Unirme al desafío',
  practice: 'Practicar',
  joinFailed: 'Algo salió mal al unirte a este desafío. Vuelve a abrir el enlace.',
  errors: {
    malformed: 'Este enlace de desafío está incompleto o dañado.',
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
    named: '“{{title}}”: {{message}}',
    subject: 'Desafío de Meno: {{title}}',
  },
} satisfies Catalog<typeof en>;
