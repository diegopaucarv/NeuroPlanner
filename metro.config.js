const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.assetExts = [...config.resolver.assetExts, "sql"];

module.exports = config;
