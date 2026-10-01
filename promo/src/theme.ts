import { continueRender, delayRender, staticFile } from 'remotion';

// src/theme/palette.ts ("Lapis & vellum"). Gold is reserved for the Memorized
// state in the app, so it never appears here as decoration.
export const C = {
  vellum: '#FBFAF7',
  lapisWash: '#E9EEFA',
  lapis: '#2244AA',
  lapisDeep: '#132A6E',
  ink: '#1A1D26',
  inkFaint: '#6E7280',
  onLapisFaint: '#C9D3F2',
  white: '#FFFFFF',
};

export const SERIF = '"Meno Serif", "New York", Georgia, serif';
export const SANS = '"Meno Sans", -apple-system, "SF Pro", system-ui, sans-serif';

// New York and SF Pro are copied from /System/Library/Fonts into public/fonts
// for local renders (gitignored — see README).
const fonts: [string, string, string][] = [
  ['Meno Serif', 'fonts/NewYork.ttf', '400 1000'],
  ['Meno Sans', 'fonts/SFNS.ttf', '1 1000'],
];
const handle = delayRender('Loading fonts');
Promise.all(
  fonts.map(([family, file, weight]) => {
    const face = new FontFace(family, `url(${staticFile(file)})`, { weight });
    document.fonts.add(face);
    return face.load();
  })
)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
