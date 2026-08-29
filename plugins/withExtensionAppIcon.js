/**
 * Points the Screen Time extension targets at the AppIcon in their synced
 * Assets.xcassets. Without ASSETCATALOG_COMPILER_APPICON_NAME the catalog
 * compiles but iOS treats the extension as icon-less — notifications posted
 * by the ShieldAction extension then show a generic glyph.
 */
const { withXcodeProject } = require('expo/config-plugins');

const EXTENSION_MARKERS = [
  'targets/ShieldAction/',
  'targets/ShieldConfiguration/',
  'targets/ActivityMonitorExtension/',
];

module.exports = function withExtensionAppIcon(config) {
  return withXcodeProject(config, (cfg) => {
    const configurations = cfg.modResults.hash.project.objects.XCBuildConfiguration ?? {};
    for (const entry of Object.values(configurations)) {
      const settings = entry?.buildSettings;
      if (!settings) continue;
      const plist = String(settings.INFOPLIST_FILE ?? '');
      if (EXTENSION_MARKERS.some((m) => plist.includes(m))) {
        settings.ASSETCATALOG_COMPILER_APPICON_NAME = 'AppIcon';
      }
    }
    return cfg;
  });
};
