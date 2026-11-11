/**
 * Compiles the Siri / Shortcuts App Intents (native/siri/*.swift) into the
 * app target. They have to live in the app itself, not a pod: iOS finds an
 * app's intents and App Shortcut phrases in metadata Xcode extracts from the
 * app target at build time.
 *
 * Also copies the ESV API key into Info.plist (MenoEsvApiKey) so the intent
 * can read an ESV verse without JavaScript running. It is the same
 * EXPO_PUBLIC_ key the JS bundle already carries, so nothing new is exposed.
 */
const fs = require('fs');
const path = require('path');
const { IOSConfig, withInfoPlist } = require('expo/config-plugins');

const SOURCE_DIR = path.join(__dirname, '..', 'native', 'siri');

/** Each Swift file goes beside AppDelegate.swift, in the app target's sources. */
function withSources(config) {
  const sources = fs
    .readdirSync(SOURCE_DIR)
    .filter((name) => name.endsWith('.swift'))
    .sort();
  return sources.reduce(
    (cfg, name) =>
      IOSConfig.XcodeProjectFile.withBuildSourceFile(cfg, {
        filePath: name,
        contents: fs.readFileSync(path.join(SOURCE_DIR, name), 'utf8'),
        // native/siri is the source of truth; ios/ is generated.
        overwrite: true,
      }),
    config,
  );
}

function withEsvKey(config) {
  return withInfoPlist(config, (cfg) => {
    const key = process.env.EXPO_PUBLIC_ESV_API_KEY;
    if (key) cfg.modResults.MenoEsvApiKey = key;
    else delete cfg.modResults.MenoEsvApiKey;
    return cfg;
  });
}

module.exports = function withSiriIntents(config) {
  return withEsvKey(withSources(config));
};
