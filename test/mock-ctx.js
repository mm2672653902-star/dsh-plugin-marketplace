/**
 * Mock Cordis context for integration tests.
 *
 * Captures every tool registration and event listener a plugin installs via
 * apply(ctx, config), so tests can assert the plugin mounted cleanly and
 * exposed the right surface — without booting the full harness.
 */
export function createMockCtx() {
  const tools = new Map()
  const listeners = new Map()

  const ctx = {
    tools: {
      register(definition) {
        if (!definition?.name) throw new Error('tool definition needs a name')
        if (tools.has(definition.name)) {
          throw new Error(`duplicate tool registration: ${definition.name}`)
        }
        tools.set(definition.name, definition)
        return () => tools.delete(definition.name)
      },
    },
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, [])
      listeners.get(event).push(handler)
      return () => {
        const arr = listeners.get(event)
        const i = arr.indexOf(handler)
        if (i >= 0) arr.splice(i, 1)
      }
    },
  }

  return {
    ctx,
    tools,
    listeners,
    toolNames: () => [...tools.keys()].sort(),
    events: () => [...listeners.keys()].sort(),
    /** Run a registered tool's execute() with fake exec context. */
    async call(name, args = {}, exec = {}) {
      const def = tools.get(name)
      if (!def) throw new Error(`tool not registered: ${name}`)
      const signal = exec.signal ?? { aborted: false }
      return def.execute(args, { ...exec, signal, name, arguments: args })
    },
    /** Dispatch an event through registered listeners. */
    async emit(event, ...args) {
      for (const handler of listeners.get(event) ?? []) {
        await handler(...args)
      }
    },
    /** Run a waterfall listener chain with a terminal next(). */
    async waterfall(event, terminal, ...args) {
      const handlers = [...(listeners.get(event) ?? [])]
      const run = (i) => {
        if (i >= handlers.length) return terminal()
        return handlers[i](...args, () => run(i + 1))
      }
      return run(0)
    },
  }
}
