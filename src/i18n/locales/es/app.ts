import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/app';

export default {
  updateAlert: {
    title: 'Meno tiene una corrección lista',
    body: 'Reinicia ahora para obtenerla. Tus versículos y tu progreso se quedan tal como están.',
    later: 'Más tarde',
    restart: 'Reiniciar',
  },
  tabs: {
    today: 'Hoy',
    library: 'Biblioteca',
    stats: 'Progreso',
    settings: 'Ajustes',
  },
  migrationError: 'Algo salió mal al preparar tus datos: {{message}}',
  recovery: {
    title: 'Algo salió mal.',
    body: 'Tus versículos y tu progreso están a salvo en este dispositivo.',
  },
} satisfies Catalog<typeof en>;
