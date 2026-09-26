const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Expo 55의 virtual/env도 dotenv 비활성화를 지키도록 한다.
if (process.env.EXPO_NO_DOTENV === "1") {
  config.resolver.blockList = [
    config.resolver.blockList ?? [],
    /\/\.env(?:\.[^/]*)?$/,
  ].flat();
}

module.exports = config;
