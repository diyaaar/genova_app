const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// .pdf dosyalarini varlik olarak paketle (expo-asset ile yerel dosya URI'sine cevirecegiz)
config.resolver.assetExts.push('pdf');
module.exports = config;
