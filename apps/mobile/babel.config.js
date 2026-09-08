module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 uses Worklets. The plugin must remain last.
    plugins: ['react-native-worklets/plugin'],
  };
};
