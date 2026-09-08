// Metro must see the repository's shared `lib/` folder, because the 005 active-choir
// contract is imported from there through the `@shared/*` alias that the TypeScript and
// Jest configurations already use. Nothing else about the default resolution is changed:
// the native workspace keeps its own hoisted node_modules, including nested packages.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../../lib');
const SHARED_PREFIX = '@shared/';

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
if (!config.resolver.assetExts.includes('pdf')) config.resolver.assetExts.push('pdf');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(SHARED_PREFIX)) {
    const sharedPath = path.join(sharedRoot, moduleName.slice(SHARED_PREFIX.length));
    return context.resolveRequest(context, sharedPath, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
