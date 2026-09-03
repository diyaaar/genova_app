module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4.x'te eklentinin adı 'react-native-worklets/plugin'
    // (3.x'te 'react-native-reanimated/plugin' idi). HER ZAMAN EN SONDA olmalı.
    // Bu eklenti olmadan Skia native tarafta "runOnUI can only be used with
    // worklets" hatası verir ve hiçbir şey çizilmez.
    plugins: ['react-native-worklets/plugin'],
  };
};
