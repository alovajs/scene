module.exports = {
	// @alova/scene
	vuehooks: {
		external: ['alova', 'vue'],
		packageName: 'AlovaSceneVue',
		input: 'src/index-vue.js',
		output: suffix => `dist/alova-scene-vue.${suffix}.js`
	},
	reacthooks: {
		external: ['alova', 'react'],
		packageName: 'AlovaSceneHook',
		input: 'src/index-react.js',
		output: suffix => `dist/alova-scene-react.${suffix}.js`
	},
	sveltehooks: {
		external: ['alova', 'svelte', 'svelte/store'],
		packageName: 'AlovaSceneHook',
		input: 'src/index-svelte.js',
		output: suffix => `dist/alova-scene-svelte.${suffix}.js`
	}
};
