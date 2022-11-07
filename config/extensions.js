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
		input: 'src/index-vue.js',
		output: suffix => `dist/alova-vue-hooks.${suffix}.js`
	},
	reacthooks: {
		external: ['alova', 'react'],
		packageName: 'AlovaReactHook',
		input: 'src/index-react.js',
		output: suffix => `dist/alova-react-hooks.${suffix}.js`
	},
	sveltehooks: {
		external: ['alova', 'svelte', 'svelte/store'],
		packageName: 'AlovaSvelteHook',
		input: 'src/index-svelte.js',
		output: suffix => `dist/alova-svelte-hooks.${suffix}.js`
	}
};
