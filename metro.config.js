// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Native build output Metro never needs. An Android build writes thousands of files under
 * node_modules/<package>/android/build and android/; without Watchman (Windows), Metro kept
 * reprocessing them and stopped answering the app (blank screen after `expo run:android`).
 */
const nativeBuildOutput = [
  /[\\/]android[\\/](build|\.cxx|\.gradle)[\\/].*/,
  /[\\/]android[\\/]app[\\/](build|\.cxx)[\\/].*/,
  /[\\/]ios[\\/](build|Pods)[\\/].*/,
];

const existing = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(existing) ? existing : existing ? [existing] : []), ...nativeBuildOutput];

module.exports = config;
