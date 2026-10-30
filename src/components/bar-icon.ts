import { unstable_getMaterialSymbolSourceAsync, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { PixelRatio, Platform, type ImageSourcePropType } from 'react-native';

/** Rendered Material icons, shared by every screen that asks for one. */
const cache = new Map<AndroidSymbol, ImageSourcePropType>();

/**
 * The icon for a `Stack.Toolbar.Button`: the SF Symbol on iOS, and on Android
 * the matching Material Symbol rendered to an image, since Android's toolbar
 * only draws image sources and silently drops a button given a symbol name.
 *
 * Android renders the image on first use, so the button appears a frame
 * later the first time; after that it comes from the cache.
 */
export function useBarIcon(sf: SFSymbol, md: AndroidSymbol): SFSymbol | ImageSourcePropType | undefined {
  const [source, setSource] = useState(() => cache.get(md));

  useEffect(() => {
    if (Platform.OS !== 'android' || source) return;
    let live = true;
    // The bar tints the image, so its own color does not matter.
    unstable_getMaterialSymbolSourceAsync(md, PixelRatio.getPixelSizeForLayoutSize(24), '#000000')
      .then((rendered) => {
        if (!rendered) return;
        cache.set(md, rendered);
        if (live) setSource(rendered);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [md, source]);

  return Platform.OS === 'android' ? source : sf;
}
