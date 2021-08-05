module.exports = {
	'extends': [
		'pro',
	],
	env: {
		node: true,
		es6 : true,
	},
	rules: {
		'no-var-requires'                   : 'off',
		'@typescript-eslint/no-var-requires': 'off',
	},

	parser       : '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion                : '2020',
		sourceType                 : 'module',
		allowImportExportEverywhere: false,
		codeFrame                  : true,
		project                    : 'tsconfig.eslint.json',
	},

	plugins: [
		'@typescript-eslint',
		'sonarjs',
	],
}
