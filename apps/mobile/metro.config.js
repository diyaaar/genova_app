// Metro must see the repository root so the shared `lib/` contract resolves,
// while native dependencies keep resolving from this workspace only.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repositoryRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(repositoryRoot, 'lib')];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  '@shared': path.resolve(repositoryRoot, 'lib'),
};

module.exports = config;
