/**
 * dsh-theme-ink — host half.
 *
 * The host row exists so the Loader entry is enabled; the client half
 * (client.js) registers the actual theme via ctx.theme.
 */
export const name = 'dsh-theme-ink'

export function apply() {
  // No host-side behaviour; the theme lives in the browser.
}
