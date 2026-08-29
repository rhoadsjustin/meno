const {
  createConfig,
} = require("react-native-device-activity/config-plugin/createExpoTargetConfig");

// Extension notifications (e.g. the shield's "Recite to unlock" bounce)
// attribute to the extension, not the host app — without an icon here iOS
// shows a generic glyph on those notifications.
const base = createConfig("shield-action");
module.exports = (config) => ({
  ...base(config),
  icon: "../../assets/images/icon.png",
});
