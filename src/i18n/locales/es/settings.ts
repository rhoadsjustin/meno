import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/settings';

export default {
  guide: {
    title: 'Cómo configurar Meno',
    body: 'Paso a paso: pruebas, widgets, recitar en voz alta y Recitar para desbloquear, además de preguntas frecuentes.',
    hintWide: 'Muestra la guía junto a esta lista',
    hint: 'Abre una guía paso a paso',
  },
  reminders: {
    title: 'Recordatorios',
    body: 'Un empujoncito diario para practicar, y pruebas sorpresa sobre los versículos que ya memorizaste. Nunca más de dos al día.',
    hintWide: 'Muestra cómo funcionan las pruebas junto a esta lista',
    off: 'Desactivados. Meno no te enviará nada hasta que los actives.',
    remindAt: 'Recordarme a las',
    timeLabel: 'Hora del recordatorio diario',
    focusNote:
      'Un modo de concentración o el resumen programado de tu iPhone aún pueden retenerlos. Meno no puede ver ninguno de los dos.',
    askNote: 'Tu iPhone te preguntará si Meno puede enviarte notificaciones. Toca Permitir.',
    allow: 'Permitir notificaciones',
    blockedNote: 'Activa Permitir notificaciones para Meno y empezarán por sí solas.',
    openSettings: 'Abrir Ajustes del iPhone',
  },
  lock: {
    title: 'Recitar para desbloquear',
    hintWide: 'Muestra los pasos de configuración junto a esta lista',
    onSummary: 'Activado · esta semana: {{recitations}}, {{overrides}}',
    offBody: 'Pide un versículo antes de que se abran tus apps que más te distraen.',
    unavailable: 'Disponible en tu iPhone (no en el simulador).',
    killSwitch: 'Desactivar y quitar todos los bloqueos ahora',
  },
  update: {
    title: 'Actualización lista',
    body: 'Se instala la próxima vez que abras Meno. Tus versículos y tu progreso se quedan tal como están.',
    restart: 'Reiniciar Meno ahora',
    hint: 'Reinicia Meno con la nueva versión',
  },
  updatedVersion: '{{version}}, actualizada el {{date}}',
  catalogCredit:
    'Las demás traducciones se muestran con licencia de sus editoriales, cada una con su propia línea de derechos de autor, y no se guardan en este dispositivo.',
  footer:
    'Meno {{version}} · Escrituras: {{translations}}, de dominio público. El audio de tus recitaciones nunca sale de este dispositivo.',
} satisfies Catalog<typeof en>;
