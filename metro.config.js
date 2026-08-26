const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations are imported as .sql source files (inlined by Babel).
config.resolver.sourceExts.push('sql');
// Bundled Scripture database ships as an asset (assets/bibles/web.db).
config.resolver.assetExts.push('db');

module.exports = config;
