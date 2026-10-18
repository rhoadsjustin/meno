import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/goals';

export default {
  wizard: {
    choosePassage: 'Elige un pasaje',
    yourPlan: 'Tu plan',
    stepOf: 'Paso {{step}} de {{total}}',
    passageName: 'Nombre del pasaje',
    planNote: 'Más o menos un fragmento nuevo al día, con repasos para conservar lo que ya guardaste.',
    startMemorizing: 'Empezar a memorizar',
  },
  stats: {
    verses: 'Versículos',
    words: 'Palabras',
    chunks: 'Fragmentos',
    estDays: 'Días aprox.',
    a11y: '{{value}} {{label}}',
  },
  passage: {
    translation: 'Traducción',
    chapter: 'Capítulo {{chapter}}',
    bookChapter: '{{book}} {{chapter}}',
    selectWholeChapter: 'Seleccionar todo {{chapter}}',
    wholeChapter: 'Capítulo completo',
    extendThrough: 'Extender hasta',
    useInstead: 'Usar la {{abbrev}}',
    loadingChapter: 'Cargando {{chapter}}',
    noSelection: 'Ningún versículo seleccionado',
    selected: '{{passage}} seleccionado',
    selectionCleared: 'Selección borrada',
    clear: 'Borrar',
    clearSelection: 'Borrar selección',
    chapterFailed: 'Este capítulo no se cargó.',
    tapToBegin: 'Toca un versículo para empezar.',
    tapToEnd: 'Toca otro versículo para cerrar el rango, o continúa con este.',
    tapToChooseAgain: 'Toca un versículo para elegir de nuevo.',
    verse: 'Versículo {{verse}}. {{text}}',
    verseHintStart: 'Empieza el pasaje aquí. Luego elige el último versículo.',
    verseHintEnd: 'Termina el pasaje aquí.',
    startHere: 'Empezar el pasaje aquí',
    endHere: 'Terminar el pasaje aquí',
    loadFailed: 'No se pudo cargar {{what}}.',
    loadFailedRemote:
      'No se pudo cargar {{what}} en la {{abbrev}}. La primera vez necesita conexión.',
  },
  starter: {
    practiceReference: 'Practicar {{reference}}',
    practiceThisVerse: 'Practicar este versículo',
    starting: 'Empezando…',
  },
} satisfies Catalog<typeof en>;
