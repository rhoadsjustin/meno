import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/help';

export default {
  title: 'Cómo configurar Meno',
  intro:
    'Meno funciona mejor con algunas cosas activadas. Cada una toma más o menos un minuto. Toca cualquier opción para ir directo a sus pasos.',
  sections: {
    quizzes: 'Recordatorios y pruebas sorpresa',
    homeWidget: 'Widget de la pantalla de inicio',
    lockWidget: 'Widget de la pantalla de bloqueo',
    speak: 'Recitar en voz alta',
    lock: 'Recitar para desbloquear',
  },
  status: {
    ready: 'Listo',
    notYet: 'Aún sin configurar',
    openSettings: 'Necesita permiso en Ajustes del iPhone',
    unavailable: 'Requiere un iPhone real',
    manual: 'Agrégalo tú mismo: los pasos están abajo',
  },
  overviewLabel: '{{title}}: {{status}}',
  overviewHint: 'Muestra los pasos',
  stepLabel: 'Paso {{number}}: {{text}}',
  actions: {
    openIphoneSettings: 'Abrir Ajustes del iPhone',
    allowNotifications: 'Permitir notificaciones',
    turnOnReminders: 'Activar recordatorios',
    allowMicrophone: 'Permitir micrófono',
    setUpLock: 'Configurar Recitar para desbloquear',
  },
  steps: {
    tapOpenSettings: 'Toca Abrir Ajustes del iPhone aquí abajo.',
    comeBack: 'Vuelve a Meno: esta página se actualiza sola.',
  },
  quizzes: {
    body: 'Un recordatorio diario para practicar, a la hora que tú elijas, y breves pruebas sorpresa sobre los versículos que ya memorizaste (entre las 9 a. m. y las 9 p. m.). Nunca más de dos notificaciones al día.',
    blocked:
      'Los recordatorios están activados en Meno, pero tu iPhone no los deja pasar, así que todavía no puede llegarte nada.',
    tapNotifications: 'Toca Notificaciones.',
    allowNotifications: 'Activa Permitir notificaciones.',
    readyTip:
      'Cambia la hora o desactiva los recordatorios en Ajustes → Recordatorios. Un modo de Enfoque o el Resumen programado de tu iPhone aún pueden retener notificaciones; Meno no puede ver ninguno de los dos.',
    offTip:
      'Los recordatorios están desactivados en Meno. Si tu iPhone pregunta si Meno puede enviarte notificaciones, toca Permitir.',
    askTip: 'Tu iPhone te preguntará si Meno puede enviarte notificaciones: toca Permitir.',
  },
  homeWidget: {
    body: 'Muestra tu versículo actual en la pantalla de inicio. A medida que lo aprendes, algunas palabras desaparecen: una invitación amable a completarlas de memoria.',
    imageLabel:
      'Ejemplo: el widget de Meno en una pantalla de inicio, mostrando {{ref}} con algunas palabras ocultas',
    steps: {
      goHome:
        'Ve a tu pantalla de inicio. (Desliza hacia arriba desde el borde inferior para salir de Meno).',
      holdEmpty: 'Mantén presionado un espacio vacío hasta que las apps empiecen a moverse.',
      tapEdit: 'Toca Editar en la esquina superior izquierda y luego toca Agregar widget.',
      search: 'Escribe “Meno” en el campo de búsqueda y luego toca Meno.',
      pickSize:
        'Desliza a la izquierda o a la derecha para elegir un tamaño y luego toca Agregar widget.',
      tapDone: 'Toca OK en la esquina superior derecha.',
    },
    tip: 'Consejo: ¿estás aprendiendo más de un pasaje? En Hoy o en Biblioteca, toca “Mostrar en widgets” debajo del que quieras. Para elegir cuánto del versículo se muestra, mantén presionado el widget y toca Editar widget.',
  },
  lockWidget: {
    body: 'Pone tu versículo justo debajo del reloj, para que lo veas cada vez que tomas tu teléfono.',
    imageLabel:
      'Ejemplo: el widget de Meno debajo del reloj en una pantalla de bloqueo, mostrando {{ref}}',
    steps: {
      wake: 'Presiona el botón lateral para bloquear tu iPhone y luego toca la pantalla para activarla. Quédate en la pantalla de bloqueo; no deslices hacia arriba.',
      hold: 'Mantén presionada la pantalla de bloqueo hasta que aparezca Personalizar en la parte inferior.',
      customize: 'Toca Personalizar. Si tu iPhone te lo pregunta, elige Pantalla de bloqueo.',
      widgetArea: 'Toca el área de widgets (puede decir Agregar widgets).',
      addMeno: 'Desplázate hasta Meno, tócalo y luego toca el widget para agregarlo.',
      done: 'Cierra la lista de widgets y luego toca OK.',
    },
    tip: 'Consejo: mientras personalizas, arrastra el widget hacia arriba para dejarlo justo debajo del reloj, o tócalo para cambiar cuánto del versículo se muestra.',
  },
  speak: {
    body: 'En las rondas de Recitar dices el versículo en voz alta y Meno lo revisa. Tu voz se procesa en este iPhone y nunca sale de él. Siempre puedes escribirlo en su lugar.',
    turnOn: 'Activa Micrófono y Reconocimiento de voz.',
    readyTip: 'Todo listo: toca el micrófono en cualquier ronda de Recitar.',
    askTip:
      'Tu iPhone te preguntará por el micrófono y el reconocimiento de voz: toca Permitir en ambos.',
  },
  lock: {
    body: 'Opcional. Elige las apps que te roban el tiempo; antes de que una se abra, Meno te pide recitar tu versículo. Omitir siempre está a un toque, y puedes desactivarlo cuando quieras.',
    unavailable:
      'Esto usa Tiempo en pantalla de Apple, que solo funciona en un iPhone real, no en el simulador.',
    readyTip:
      'Está activado. Para desactivarlo por completo, ve a Ajustes → Desactivar y quitar todos los bloqueos ahora.',
    steps: {
      tapSetUp: 'Toca Configurar Recitar para desbloquear aquí abajo.',
      allowScreenTime:
        'Cuando tu iPhone te pregunte por Tiempo en pantalla, permítelo (puede que necesites Face ID o tu código).',
      pickApps: 'Elige las apps que deben pedirte un versículo primero.',
      chooseWhen: 'Elige cuándo debe preguntarte Meno y termina la configuración.',
    },
  },
  faqHeading: 'Preguntas frecuentes',
  faq: {
    multiple: {
      q: '¿Puedo aprender más de un pasaje a la vez?',
      a: 'Sí. Toca “+ Practicar otro pasaje” en Hoy (o en Biblioteca). Cada pasaje guarda su propio progreso, y Hoy los muestra todos, con el que está en tus widgets hasta arriba.',
    },
    widgetVerse: {
      q: '¿Cómo elijo qué versículo muestran mis widgets?',
      a: 'En Hoy o en Biblioteca, toca “Mostrar en widgets” debajo del pasaje que quieras. Todos los widgets de Meno cambian a ese pasaje en un momento, y Recitar para desbloquear también te pedirá ese versículo.',
    },
    oldVerse: {
      q: 'Mi widget muestra un versículo anterior.',
      a: 'Los widgets se actualizan cuando sales de Meno. Abre Meno y luego vuelve a tu pantalla de inicio. Tu iPhone puede tardar unos minutos en actualizarlo.',
    },
    referenceOnly: {
      q: 'Mi widget solo muestra la cita, no las palabras.',
      a: 'Es a propósito cuando ya conoces bien un versículo: ¡intenta recitarlo de memoria! Para mostrar más, mantén presionado el widget, toca Editar widget y cambia “Mostrar versículo como”.',
    },
    noReminders: {
      q: 'No me llegan recordatorios ni pruebas sorpresa.',
      a: 'Abre Ajustes → Recordatorios. Cada tipo de recordatorio indica cuándo llega el próximo, o por qué todavía no llegará ninguno. El recordatorio diario llega a la hora que elegiste y se salta los días en que ya practicaste. Las pruebas sorpresa empiezan cuando ya memorizaste un versículo, y solo llegan entre las 9 a. m. y las 9 p. m. Si todo ahí se ve bien, revisa tu iPhone: un modo de Enfoque como Sueño o No molestar retiene las notificaciones hasta que termina, y el Resumen programado las guarda para ciertas horas del día. Meno no puede ver ninguno de los dos.',
    },
    shielded: {
      q: 'Una app está bloqueada y la necesito ahora mismo.',
      a: 'Toca Omitir en la app bloqueada: siempre funciona. Para desactivar Recitar para desbloquear por completo, abre Ajustes en Meno y toca “Desactivar y quitar todos los bloqueos ahora”.',
    },
    voice: {
      q: '¿Meno graba mi voz?',
      a: 'No. Cuando recitas un versículo, tu iPhone lo convierte en texto directamente en el dispositivo. El audio nunca se guarda ni se envía a ningún lado.',
    },
    deleteApp: {
      q: '¿Qué pasa si elimino Meno?',
      a: 'Tu iPhone quita cualquier bloqueo que Meno haya puesto. Meno no usa una cuenta (tus versículos y tu progreso viven en este iPhone), así que eliminar la app también los borra.',
    },
  },
} satisfies Catalog<typeof en>;
