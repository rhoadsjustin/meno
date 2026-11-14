import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/lock';

export default {
  setup: {
    unavailableTitle: 'Recitar para desbloquear no está disponible en este dispositivo',
    unavailableBody:
      'Depende de Tiempo en pantalla de Apple, que este dispositivo no ofrece. Todo lo demás en Meno funciona aquí como siempre.',
    explainerTitle: 'Recitar para desbloquear',
    explainerBody:
      'Elige las apps que suelen distraerte. Cuando abras una, Meno te pedirá que recites tu versículo actual primero, y luego te dejará seguir.',
    explainerPrivacy:
      'A continuación, iOS te pedirá permiso para Tiempo en pantalla. Apple nunca le dice a Meno qué apps eliges, y puedes omitirlo o desactivarlo cuando quieras.',
    authTitle: 'Permiso de Tiempo en pantalla',
    authBody: 'Meno usa Tiempo en pantalla de Apple para bloquear las apps que elijas.',
    authDenied:
      'Se rechazó el permiso. Inténtalo de nuevo, o permite el acceso a Tiempo en pantalla para Meno en Ajustes del iPhone.',
    openSettings: 'Abrir Ajustes del iPhone',
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
    relockLabel: 'Los bloqueos vuelven después de',
    relockOption: '{{count}} min',
    notificationNote:
      'En un bloqueo, “Recitar para desbloquear” envía una notificación que te lleva a tu versículo, así que tu iPhone puede pedirte permiso para las notificaciones.',
    turnOn: 'Activar',
    turnOnFailed: 'No se pudo activar Recitar para desbloquear. Inténtalo de nuevo.',
    doneTitle: 'Todo listo',
    doneFirstPickup:
      'Tus apps bloqueadas te piden tu versículo la primera vez que abres una cada día.',
    doneEveryPickup_one:
      'Tus apps bloqueadas te piden tu versículo ahora, y otra vez {{count}} minuto después de cada desbloqueo.',
    doneEveryPickup_other:
      'Tus apps bloqueadas te piden tu versículo ahora, y otra vez {{count}} minutos después de cada desbloqueo.',
    doneSchedule: 'Tus apps bloqueadas te piden tu versículo entre las 9 y las 11 p. m.',
    doneNotification:
      'En el bloqueo, toca “Recitar para desbloquear” y luego toca la notificación de Meno.',
    doneNoNotification:
      'Las notificaciones de Meno están desactivadas, así que el bloqueo no puede traerte aquí. Cuando veas un bloqueo, abre Meno para recitar, o permite las notificaciones en Ajustes del iPhone.',
    doneEscape:
      'Omitir siempre está a un toque, y “Desactivar y quitar todos los bloqueos ahora” en Ajustes lo quita todo.',
    cancelSetup: 'Cancelar configuración',
  },
  unlock: {
    errorNoGoal: 'Ahora mismo no hay ningún pasaje en curso que recitar.',
    errorNothingToRecite: 'Todavía no hay nada que recitar',
    errorClear:
      'Meno no pudo quitar los bloqueos. Toca Omitir, o usa “Desactivar y quitar todos los bloqueos ahora” en Ajustes.',
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
    notificationTitle: 'Recitar para desbloquear',
    notificationBody: 'Toca aquí para recitar y continuar.',
  },
} satisfies Catalog<typeof en>;
