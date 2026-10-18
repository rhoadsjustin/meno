/**
 * Localizes the expo-widgets extension's own strings — the widget gallery
 * description and the Edit Widget sheet (configuration title/description,
 * "Show verse as" and its options). expo-widgets emits them as Swift
 * LocalizedStringKey / LocalizedStringResource literals, so iOS looks each
 * English string up in the extension bundle's Localizable.strings; it just
 * never ships one. This writes <lang>.lproj/Localizable.strings (English
 * string → translation, from locales/widget/<lang>.json) into the widget
 * target and adds a Resources build phase that copies it.
 *
 * Must be listed BEFORE expo-widgets in app.config: plugins added later run
 * their mods first, and expo-widgets recreates the target folder and target.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const TARGET = 'ExpoWidgetsTarget';
const TABLE = 'Localizable.strings';

function readCatalogs(projectRoot, languages) {
  return languages.map((lang) => ({
    lang,
    strings: JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'locales', 'widget', `${lang}.json`), 'utf8'),
    ),
  }));
}

const quote = (s) => JSON.stringify(s);

function withStringsFiles(config, languages) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const { projectRoot, platformProjectRoot } = cfg.modRequest;
      for (const { lang, strings } of readCatalogs(projectRoot, languages)) {
        const dir = path.join(platformProjectRoot, TARGET, `${lang}.lproj`);
        fs.mkdirSync(dir, { recursive: true });
        const body = Object.entries(strings)
          .map(([key, value]) => `${quote(key)} = ${quote(value)};`)
          .join('\n');
        fs.writeFileSync(path.join(dir, TABLE), `${body}\n`);
      }
      return cfg;
    },
  ]);
}

function withResourcesPhase(config, languages) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const objects = project.hash.project.objects;
    const target = project.pbxTargetByName(TARGET);
    const targetUuid = project.findTargetKey(TARGET);
    const group = project.pbxGroupByName(TARGET);
    if (!target || !targetUuid || !group) {
      throw new Error(`withWidgetLocalizations: ${TARGET} not found — list this plugin before expo-widgets`);
    }
    if (group.children.some((c) => c.comment === TABLE)) return cfg;

    objects.PBXVariantGroup = objects.PBXVariantGroup ?? {};
    const variantUuid = project.generateUuid();
    const children = languages.map((lang) => {
      const refUuid = project.generateUuid();
      objects.PBXFileReference[refUuid] = {
        isa: 'PBXFileReference',
        lastKnownFileType: 'text.plist.strings',
        name: lang,
        path: `${lang}.lproj/${TABLE}`,
        sourceTree: '"<group>"',
      };
      objects.PBXFileReference[`${refUuid}_comment`] = lang;
      return { value: refUuid, comment: lang };
    });
    objects.PBXVariantGroup[variantUuid] = {
      isa: 'PBXVariantGroup',
      children,
      name: TABLE,
      sourceTree: '"<group>"',
    };
    objects.PBXVariantGroup[`${variantUuid}_comment`] = TABLE;
    group.children.push({ value: variantUuid, comment: TABLE });

    const buildFileUuid = project.generateUuid();
    objects.PBXBuildFile[buildFileUuid] = { isa: 'PBXBuildFile', fileRef: variantUuid, fileRef_comment: TABLE };
    objects.PBXBuildFile[`${buildFileUuid}_comment`] = `${TABLE} in Resources`;
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetUuid);
    const phase = project.pbxResourcesBuildPhaseObj(targetUuid);
    phase.files.push({ value: buildFileUuid, comment: `${TABLE} in Resources` });

    for (const lang of languages) project.addKnownRegion(lang);
    return cfg;
  });
}

module.exports = function withWidgetLocalizations(config, { languages }) {
  return withResourcesPhase(withStringsFiles(config, languages), languages);
};
