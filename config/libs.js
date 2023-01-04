module.exports = {
  // @alova/scene
  vuehooks: {
    external: ['alova', 'vue'],
    packageName: 'AlovaScene',
    input: 'index.js',
    output: suffix => `dist/alova-scene.${suffix}.js`
  },
  reacthooks: {
    external: ['alova', 'react'],
    packageName: 'AlovaScene',
    input: 'index.js',
    output: suffix => `dist/alova-scene.${suffix}.js`
  },
  sveltehooks: {
    external: ['alova', 'svelte', 'svelte/store'],
    packageName: 'AlovaScene',
    input: 'index.js',
    output: suffix => `dist/alova-scene.${suffix}.js`
  }
};
