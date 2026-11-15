import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/stitch';

export default {
  title: 'Unir',
  closeLabel: 'Cerrar (la recitación en curso no se guarda)',
  nothingYet: 'Todavía no hay nada que unir',
  nothingYetBody: 'Podrás unir cuando tengas en marcha dos fragmentos de este pasaje.',
  intro: 'Únelo todo — recita como un solo pasaje todo lo que has aprendido hasta ahora.',
  goalCompleted: 'Todo el pasaje está guardado en tu corazón.',
  passed: 'Unido — se sostiene completo.',
  failed: 'Se te escaparon algunas palabras — están marcadas abajo.',
  later: 'Más tarde',
} satisfies Catalog<typeof en>;
