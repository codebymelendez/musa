const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.extraNodeModules = {
  '@musa/types': path.resolve(workspaceRoot, 'packages/types'),
  '@musa/validators': path.resolve(workspaceRoot, 'packages/validators'),
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
