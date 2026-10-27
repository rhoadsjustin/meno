import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/lock';

export default {
  setup: {
    unavailableTitle: 'Recitar para desbloquear necesita tu iPhone',
    unavailableBody:
      'Las funciones de Tiempo en pantalla de Apple solo funcionan en un dispositivo físico: el simulador no puede bloquear apps. Todo lo demás en Meno funciona aquí como siempre.',
    explainerTitle: 'Recitar para desbloquear',
    explainerBody:
      'Elige las apps que suelen distraerte. Cuando abras una, Meno te pedirá que recites tu versículo actual primero, y luego te dejará seguir.',
    explainerPrivacy:
      'A continuación, iOS te pedirá permiso para Tiempo en pantalla. Apple nunca le dice a Meno qué apps eliges, y puedes omitirlo o desactivarlo cuando quieras.',
    authTitle: 'Permiso de Tiempo en pantalla',
    authBody: 'Meno usa Tiempo en pantalla de Apple para bloquear las apps que elijas.',
    authDenied:
      'Se rechazó el permiso. Puedes otorgarlo en Ajustes → Tiempo en pantalla, o intentarlo de nuevo.',
    grantPermission: 'Dar permiso',
    pickTitle: 'Elige qué apps bloquear',
    pickBody: 'Elige las apps o categorías que deben pedirte un versículo primero.',
    pickApps: 'Elegir apps',
    changeApps: 'Cambiar apps',
    configureTitle: '¿Cuándo debe preguntarte Meno?',
    modeFirstPickup: 'La primera vez del día',
    modeFirstPickupDetail: 'Una sola recitación quita los bloqueos hasta mañana.',
    modeEveryPickup: 'Cada vez que uses el iPhone',
    modeEveryPickupDetail_one: 'Los bloqueos vuelven {{count}} minuto después de cada desbloqueo.',
    modeEveryPickupDetail_other: 'Los bloqueos vuelven {{count}} minutos después de cada desbloqueo.',
    modeSchedule: 'Por la noche (9–11 p. m.)',
    modeScheduleDetail: 'Los bloqueos están activos durante el horario nocturno.',
    turnOn: 'Activar',
    doneTitle: 'Todo listo',
    doneBody:
      'La próxima vez que abras una app bloqueada, Meno te pedirá tu versículo. Omitirlo siempre está a un toque, y el interruptor de emergencia en Ajustes lo quita todo al instante.',
    cancelSetup: 'Cancelar configuración',
  },
  unlock: {
    errorNoGoal: 'Ahora mismo no hay ningún pasaje en curso que recitar.',
    errorNothingToRecite: 'Todavía no hay nada que recitar',
    unlockAnyway: 'Desbloquear de todos modos',
    missedRetry: 'Casi: se te escaparon algunas palabras. ¿Otro intento?',
    missedFinal: 'Casi: se te escaparon algunas palabras.',
    keepTrying: 'Seguir intentando',
    success: 'La Palabra permanece en ti. Adelante.',
    override: 'Omitir',
  },
  shield: {
    subtitleFallback: 'Recita tu versículo para continuar.',
    primaryButton: 'Recitar para desbloquear',
    secondaryButton: 'Omitir',
    notificationTitle: 'Recita para desbloquear',
    notificationBody: 'Toca aquí para recitar y continuar.',
  },
} satisfies Catalog<typeof en>;
