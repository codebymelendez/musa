const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

// Force Expo Router app root path for the Babel compiler in this monorepo
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, 'app')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [...config.watchFolders, workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.extraNodeModules = {
  '@musa/types': path.resolve(workspaceRoot, 'packages/types'),
  '@musa/validators': path.resolve(workspaceRoot, 'packages/validators'),
  '@musa/availability': path.resolve(workspaceRoot, 'packages/availability'),
}

// VirtualViewNativeComponent uses Flow event types that expo@54's
// @react-native/codegen@0.81.5 can't parse. Redirect to a null stub
// so the babel-plugin-codegen never processes it.
const _resolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.includes('VirtualViewNativeComponent')) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(projectRoot, 'mocks/VirtualViewNativeComponent.js'),
    }
  }
  if (_resolveRequest) return _resolveRequest(context, moduleName, platform)
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
