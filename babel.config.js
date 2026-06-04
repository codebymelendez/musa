module.exports = function (api) {
  api.cache.never()

  const isMetro = api.caller((caller) => caller && (caller.name === 'metro' || caller.bundler === 'metro'))

  if (!isMetro) {
    return {
      presets: ['next/babel'],
    }
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  }
}
