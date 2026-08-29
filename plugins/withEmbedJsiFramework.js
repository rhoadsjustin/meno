/**
 * Guarantees ExpoModulesJSI.framework is embedded in the app bundle.
 *
 * Root cause (2026-08-29): in a fresh checkout (EAS builds), CocoaPods
 * classifies the vendored ExpoModulesJSI.xcframework at pod-install time
 * while only stub slices exist, and generates Pods-Meno-frameworks.sh
 * WITHOUT the install_framework entry for it. The app then links against
 * @rpath/ExpoModulesJSI.framework but nothing embeds it → instant
 * "Library not loaded" dyld crash on TestFlight builds (worked locally
 * only because our long-lived node_modules had real slices at install
 * time). This phase copies + signs the framework when the CocoaPods embed
 * step didn't; it no-ops when it did.
 */
const { withXcodeProject } = require('expo/config-plugins');

const PHASE_NAME = '[Meno] Ensure ExpoModulesJSI embedded';

const SCRIPT = `
set -e
FW="\${PODS_XCFRAMEWORKS_BUILD_DIR}/ExpoModulesJSI/ExpoModulesJSI.framework"
DEST="\${TARGET_BUILD_DIR}/\${FRAMEWORKS_FOLDER_PATH}"
if [ -d "$FW" ] && [ ! -e "\${DEST}/ExpoModulesJSI.framework/ExpoModulesJSI" ]; then
  echo "ExpoModulesJSI missing from app bundle - embedding manually"
  mkdir -p "$DEST"
  rsync -a --delete --exclude "Headers" --exclude "PrivateHeaders" --exclude "Modules" "$FW" "$DEST/"
  if [ "\${CODE_SIGNING_REQUIRED:-YES}" != "NO" ] && [ -n "\${EXPANDED_CODE_SIGN_IDENTITY:-}" ]; then
    /usr/bin/codesign --force --sign "\${EXPANDED_CODE_SIGN_IDENTITY}" \${OTHER_CODE_SIGN_FLAGS:-} --preserve-metadata=identifier,entitlements "\${DEST}/ExpoModulesJSI.framework"
  fi
else
  echo "ExpoModulesJSI already embedded - nothing to do"
fi
`;

module.exports = function withEmbedJsiFramework(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const existing = Object.values(project.hash.project.objects.PBXShellScriptBuildPhase ?? {}).find(
      (phase) => phase && typeof phase === 'object' && phase.name?.includes('Ensure ExpoModulesJSI')
    );
    if (!existing) {
      project.addBuildPhase(
        [],
        'PBXShellScriptBuildPhase',
        PHASE_NAME,
        project.getFirstTarget().uuid,
        { shellPath: '/bin/sh', shellScript: SCRIPT }
      );
    }
    return cfg;
  });
};
