import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/onboarding';

export default {
  welcome: {
    title: 'Que la Palabra permanezca en ti.',
    body: 'Meno te ayuda a guardar la Escritura en tu corazón. Elige un pasaje, avanza de leerlo a recitarlo y mantenlo fresco para siempre, con solo unos minutos al día.',
    dissolve:
      'A medida que un versículo se afianza en tu memoria, su texto se va desvaneciendo de la pantalla. De eso se trata: que viva en ti, no en la app.',
  },
  notifications: {
    title: '¿Podemos ponerte a prueba cuando menos lo esperes?',
    body: 'Ese es el ingrediente secreto. Un recordatorio diario para practicar y, de vez en cuando, pruebas sorpresa sobre los versículos que ya memorizaste: nunca más de dos al día, y cada uno toma unos 30 segundos.',
    optIn: 'Sí, ponme a prueba',
    later: 'Más tarde',
  },
  notificationsBlocked: {
    title: 'Los recordatorios aún no pueden llegarte',
    body: 'Tu iPhone no está permitiendo notificaciones de Meno, así que no te llegarán recordatorios ni pruebas sorpresa. Para recibirlos, abre Ajustes del iPhone, toca Notificaciones y activa Permitir notificaciones.',
    hint: 'También está bien dejarlo para después. En Meno, Ajustes → Recordatorios siempre te muestra si están llegando.',
    openSettings: 'Abrir Ajustes del iPhone',
  },
  widget: {
    title: 'Tenlo siempre a la vista',
    previewLabel:
      'Vista previa: el widget de Meno en la pantalla de inicio mostrando {{ref}} con la mitad de sus palabras ocultas, y su widget de la pantalla de bloqueo debajo del reloj',
    body: 'Los widgets de Meno ponen tu versículo actual en la pantalla de inicio y debajo del reloj en la pantalla de bloqueo. Te acompaña todo el día y se va desvaneciendo a medida que lo aprendes.',
    howTo:
      'Pantalla de inicio: mantén presionado → Editar → Agregar widget → Meno.\nPantalla de bloqueo: mantén presionado el reloj → Personalizar → agrega Meno.',
  },
  lock: {
    title: 'Abre tus apps de memoria',
    previewLabel:
      'Vista previa: una app bloqueada que te pide recitar tu versículo antes de abrirse, con un botón Omitir que siempre funciona',
    body: 'Opcional, y un poco atrevido: bloquea las apps que te roban el tiempo. Para abrir una, recita de memoria tu versículo actual. Omitir siempre está disponible: nunca te quedarás sin acceso a tu propio teléfono.',
    simulatorHint:
      'Funciona en tu iPhone (no en el simulador). Encuéntralo cuando quieras en Ajustes → Recitar para desbloquear.',
    tryStarter: 'Pruébalo con {{passage}}',
    chooseOwn: 'Elegir mi propio pasaje',
    setUpLock: 'Configurar Recitar para desbloquear',
    exploreFirst: 'Explorar primero',
  },
  shieldMock: {
    app: 'Esta app está bloqueada',
    verse: '{{ref}}, de memoria',
    recite: 'Recitar para desbloquear',
    override: 'Omitir',
  },
} satisfies Catalog<typeof en>;
