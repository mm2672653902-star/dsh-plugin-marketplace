window.__ModuleLoader__.load({
	id: "dsh-theme-ink",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		exports.inject = ['theme'];

		// An ink-green dark palette layered over the base dark tokens.
		const INK_TOKENS = {
			'--dsw-alias-bg-base': '#0b1512',
			'--dsw-alias-bg-layer-1': '#10201b',
			'--dsw-alias-bg-layer-2': '#152a24',
			'--dsw-alias-bg-overlay': '#10201b',
			'--dsw-alias-border-l1': '#24463c',
			'--dsw-alias-border-l2': '#31604f',
			'--dsw-alias-brand-primary': '#3ecf8e',
			'--dsw-alias-label-primary': '#e6f4ec',
			'--dsw-alias-label-secondary': '#9db8ab',
			'--dsw-alias-state-success-primary': '#3ecf8e',
			'--dsw-alias-state-warn-primary': '#e0b458',
			'--dsw-alias-state-error-primary': '#e5766a',
			'--dsw-specific-sidebar-fill': '#0d1a16',
		};

		exports.apply = function apply(ctx) {
			return ctx.theme.register({
				id: 'ink',
				colorScheme: 'dark',
				tokens: INK_TOKENS,
			});
		};

		return module.exports;
	}
});
