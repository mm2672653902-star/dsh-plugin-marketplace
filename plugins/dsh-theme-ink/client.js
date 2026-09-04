window.__ModuleLoader__.load({
	id: "dsh-theme-ink",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var React = require("react");
		var e = React.createElement;

		// Service keys for the client context.
		exports.inject = ['theme', 'slots'];

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

		function InkToggle() {
			var st = React.useState(false);
			var on = st[0]; var setOn = st[1];

			function toggle() {
				try {
					var next = !on;
					// setTheme accepts a concrete registered theme id, or a built-in preference.
					ctxRef.theme.setTheme(next ? 'ink' : 'system');
					setOn(next);
				} catch (err) { /* theme service unavailable */ }
			}

			return e('button', {
				type: 'button',
				onClick: toggle,
				title: on ? '切换回系统主题' : '启用 ink 墨绿主题',
				style: {
					position: 'fixed', right: 16, bottom: 56, zIndex: 60,
					width: 40, height: 40, borderRadius: '50%',
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					background: on ? 'var(--dsw-alias-brand-primary, #3ecf8e)' : 'var(--dsw-alias-bg-overlay, rgba(16,32,27,0.9))',
					color: on ? '#06130d' : 'var(--dsw-alias-label-primary, #e6f4ec)',
					border: '1px solid var(--dsw-alias-border-l1, #24463c)',
					fontSize: 18, cursor: 'pointer',
					boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
				},
			}, '🎨');
		}

		// Late-bound reference to the client ctx for the toggle button.
		var ctxRef = { theme: null };

		exports.apply = function apply(ctx) {
			ctxRef.theme = ctx.theme;
			var disposeTheme = ctx.theme.register({ id: 'ink', colorScheme: 'dark', tokens: INK_TOKENS });
			var disposeBtn = ctx.slots.register({ name: 'shell.overlay', id: 'dsh-theme-ink-toggle' }, InkToggle);
			return function () { disposeBtn(); disposeTheme(); };
		};

		return module.exports;
	}
});
