/**
 * dsh-tool-calculator — safe math expression evaluator + unit conversion.
 *
 * No eval(), no Function(): a hand-written tokenizer + shunting-yard
 * evaluator supports + - * / % ^, parentheses, unary minus, functions
 * and constants, which keeps the tool safe to expose to the model.
 */

export const name = 'dsh-tool-calculator'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested)
// ---------------------------------------------------------------------------
const FUNCTIONS = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  log: Math.log10,
  ln: Math.log,
  log2: Math.log2,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
}

const CONSTANTS = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI }

function tokenize(expr) {
  const tokens = []
  let i = 0
  const src = expr.replace(/\s+/g, '')
  while (i < src.length) {
    const ch = src[i]
    if (/[0-9.]/.test(ch)) {
      const m = src.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/)
      if (!m) throw new Error(`Bad number at position ${i}`)
      tokens.push({ kind: 'num', value: Number(m[0]) })
      i += m[0].length
    } else if (/[a-zA-Z_]/.test(ch)) {
      const m = src.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/)
      tokens.push({ kind: 'ident', value: m[0] })
      i += m[0].length
    } else if ('+-*/%^(),'.includes(ch)) {
      tokens.push({ kind: 'op', value: ch })
      i += 1
    } else {
      throw new Error(`Unexpected character "${ch}"`)
    }
  }
  return tokens
}

const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, 'u-': 5, '^': 6 }

export function evaluate(expr) {
  const tokens = tokenize(expr)
  const output = []
  const ops = []
  const argCounts = [] // argument counter per open parenthesis frame
  let prev = null

  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx]
    if (tok.kind === 'num') {
      output.push(tok)
    } else if (tok.kind === 'ident') {
      const isCall = tokens[idx + 1]?.value === '('
      if (isCall) {
        if (!(tok.value in FUNCTIONS)) {
          throw new Error(
            `Unknown function "${tok.value}". Available: ${Object.keys(FUNCTIONS).join(', ')}`,
          )
        }
        ops.push({ kind: 'fn', value: tok.value })
      } else if (tok.value in CONSTANTS) {
        output.push({ kind: 'num', value: CONSTANTS[tok.value] })
      } else {
        throw new Error(
          `Unknown identifier "${tok.value}". Functions: ${Object.keys(FUNCTIONS).join(', ')}; constants: pi, e, tau`,
        )
      }
    } else if (tok.value === '(') {
      ops.push(tok)
      // Empty call like f() counts zero arguments; otherwise at least one.
      argCounts.push(tokens[idx + 1]?.value === ')' ? 0 : 1)
    } else if (tok.value === ')') {
      while (ops.length && ops[ops.length - 1].value !== '(') output.push(ops.pop())
      if (!ops.length) throw new Error('Mismatched parentheses')
      ops.pop()
      const argc = argCounts.pop() ?? 1
      // A function token sits on the op stack right below this parenthesis.
      if (ops.length && ops[ops.length - 1].kind === 'fn') {
        const fn = ops.pop()
        output.push({ kind: 'fn', value: fn.value, argc })
      }
    } else if (tok.value === ',') {
      while (ops.length && ops[ops.length - 1].value !== '(') output.push(ops.pop())
      if (!argCounts.length) throw new Error('Comma outside of a function call')
      argCounts[argCounts.length - 1] += 1
    } else {
      let op = tok.value
      const unary =
        (op === '-' || op === '+') &&
        (prev === null || (prev.kind === 'op' && prev.value !== ')'))
      if (unary) {
        if (op === '+') {
          prev = tok
          continue
        }
        op = 'u-'
      }
      while (ops.length) {
        const top = ops[ops.length - 1]
        if (top.value === '(') break
        const topPrec = PRECEDENCE[top.value] ?? 0
        const rightAssoc = op === '^' || op === 'u-'
        if (topPrec > PRECEDENCE[op] || (topPrec === PRECEDENCE[op] && !rightAssoc)) {
          output.push(ops.pop())
        } else break
      }
      ops.push({ kind: 'op', value: op })
    }
    prev = tok
  }
  while (ops.length) {
    const top = ops.pop()
    if (top.value === '(') throw new Error('Mismatched parentheses')
    output.push(top)
  }

  const stack = []
  for (const tok of output) {
    if (tok.kind === 'num') {
      stack.push(tok.value)
      continue
    }
    if (tok.kind === 'fn') {
      const fn = FUNCTIONS[tok.value]
      const argc = tok.argc ?? 1
      if (stack.length < argc) throw new Error(`Not enough arguments for ${tok.value}()`)
      const args = stack.splice(stack.length - argc, argc)
      stack.push(fn(...args))
      continue
    }
    if (tok.value === 'u-') {
      if (stack.length < 1) throw new Error('Malformed expression')
      stack.push(-stack.pop())
      continue
    }
    if (stack.length < 2) throw new Error('Malformed expression')
    const b = stack.pop()
    const a = stack.pop()
    switch (tok.value) {
      case '+': stack.push(a + b); break
      case '-': stack.push(a - b); break
      case '*': stack.push(a * b); break
      case '/': stack.push(a / b); break
      case '%': stack.push(a % b); break
      case '^': stack.push(a ** b); break
      default: throw new Error(`Unknown operator "${tok.value}"`)
    }
  }
  if (stack.length !== 1) throw new Error('Malformed expression')
  const result = stack[0]
  if (!Number.isFinite(result)) throw new Error('Result is not finite')
  return result
}

// Unit conversion: factor tables to a base unit.
const CONVERSIONS = {
  length: { base: 'm', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 } },
  mass: { base: 'kg', units: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, lb: 0.45359237, oz: 0.028349523125 } },
  data: { base: 'B', units: { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 } },
  time: { base: 's', units: { ms: 0.001, s: 1, min: 60, h: 3600, day: 86400 } },
  temperature: { base: 'C', units: ['C', 'F', 'K'] },
}

export function convertUnit(value, from, to) {
  // Temperature handled specially.
  const tUnits = CONVERSIONS.temperature.units
  if (tUnits.includes(from) && tUnits.includes(to)) {
    let celsius
    if (from === 'C') celsius = value
    else if (from === 'F') celsius = (value - 32) / 1.8
    else celsius = value - 273.15
    if (to === 'C') return celsius
    if (to === 'F') return celsius * 1.8 + 32
    return celsius + 273.15
  }
  for (const { units } of Object.values(CONVERSIONS)) {
    if (Array.isArray(units)) continue
    if (from in units && to in units) {
      return (value * units[from]) / units[to]
    }
  }
  throw new Error(`Cannot convert between "${from}" and "${to}" (unknown or incompatible units)`)
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
export function apply(ctx) {
  const disposers = []

  disposers.push(
    ctx.tools.register({
      name: 'calculate',
      description:
        'Evaluate a math expression safely: + - * / % ^, parentheses, ' +
        'functions (sqrt, sin, cos, log, ln, exp, min, max, ...) and constants (pi, e). ' +
        'Example: "sqrt(3^2 + 4^2) * pi".',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'The math expression.' },
        },
        required: ['expression'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            expression: { type: 'string' },
            result: { type: 'number' },
          },
          required: ['expression', 'result'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: 'text', text: `${value.expression} = ${value.result}` },
        ],
      },
      async execute(args) {
        return { expression: args.expression, result: evaluate(args.expression) }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'convert_unit',
      description:
        'Convert between units: length (mm cm m km in ft yd mi), mass (mg g kg t lb oz), ' +
        'data (B KB MB GB TB KiB MiB GiB TiB), time (ms s min h day), temperature (C F K).',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number' },
          from: { type: 'string' },
          to: { type: 'string' },
        },
        required: ['value', 'from', 'to'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            result: { type: 'number' },
            text: { type: 'string' },
          },
          required: ['result', 'text'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: value.text }],
      },
      async execute(args) {
        const result = convertUnit(args.value, args.from, args.to)
        return { result, text: `${args.value} ${args.from} = ${result} ${args.to}` }
      },
    }),
  )

  return () => disposers.forEach((dispose) => dispose())
}
