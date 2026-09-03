window.__ModuleLoader__.load({
	id: "dsh-ui-session-badge",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var React = require("react");
		var e = React.createElement;

		exports.inject = ['slots'];

		function Badge() {
			var nowState = React.useState(() => new Date());
			var now = nowState[0];
			var setNow = nowState[1];

			React.useEffect(function () {
				var timer = setInterval(function () { setNow(new Date()); }, 1000);
				return function () { clearInterval(timer); };
			}, []);

			var pad = function (n) { return String(n).padStart(2, '0'); };
			var hh = pad(now.getHours());
			var mm = pad(now.getMinutes());
			var ss = pad(now.getSeconds());

			return e('div', {
				style: {
					position: 'fixed',
					right: 16,
					bottom: 16,
					zIndex: 60,
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					padding: '6px 12px',
					borderRadius: 999,
					background: 'var(--dsw-alias-bg-overlay, rgba(16,32,27,0.9))',
					border: '1px solid var(--dsw-alias-border-l1, #24463c)',
					color: 'var(--dsw-alias-label-primary, #e6f4ec)',
					font: '12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace',
					pointerEvents: 'auto',
					boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
					userSelect: 'none',
				},
				title: 'dsh-ui-session-badge',
			},
				e('span', {
					style: {
						width: 8, height: 8, borderRadius: '50%',
						background: 'var(--dsw-alias-brand-primary, #3ecf8e)',
						boxShadow: '0 0 6px var(--dsw-alias-brand-primary, #3ecf8e)',
					},
				}),
				e('span', null, 'dsh'),
				e('span', { style: { opacity: 0.85 } }, hh + ':' + mm + ':' + ss),
			);
		}

		exports.apply = function apply(ctx) {
			return ctx.slots.register({ name: 'shell.overlay' }, Badge);
		};

		return module.exports;
	}
});
