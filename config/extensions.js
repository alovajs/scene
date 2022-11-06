module.exports = {
  // @alova/mock
  mock: {
    external: ['alova'],
    packageName: 'AlovaMock',
    input: 'src/index.ts',
    output: suffix => `dist/alova-mock.${suffix}.js`
  },

  // @alova/hooks
  vuehooks: {
    external: ['alova', 'vue'],
    packageName: 'AlovaVueHooks',
    input: 'src/vue/index.ts',
    output: suffix => `dist/alova-vue-hooks.${suffix}.js`
  },
  reacthooks: {
    external: ['alova', 'react'],
    packageName: 'AlovaReactHook',
    input: 'src/react/index.ts',
    output: suffix => `dist/alova-react-hooks.${suffix}.js`
  },
  sveltehooks: {
    external: ['alova', 'svelte', 'svelte/store'],
    packageName: 'AlovaSvelteHook',
    input: 'src/svelte/index.ts',
    output: suffix => `dist/alova-svelte-hooks.${suffix}.js`
  }
};