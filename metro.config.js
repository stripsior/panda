// Monorepo Metro config for apps/mobile. Expo's workspace detection makes
// the CLI treat the repo root as the project root, which breaks expo-router
// route discovery and relative entry resolution in release bundles — pin the
// project root to apps/mobile. The '@/' alias is handled via the root
// tsconfig.json (the CLI reads tsconfig paths from its detected project
// root, i.e. the repo root).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = path.resolve(__dirname, 'apps/mobile');
const workspaceRoot = __dirname;

const config = getDefaultConfig(projectRoot);
config.projectRoot = projectRoot;
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;

