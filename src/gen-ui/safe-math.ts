

/**
 * @description Options for compiling a sandboxed math expression
 * @summary Controls variable binding and whether plot-mode identifiers are
 * permitted. Expressions are parsed, never evaluated as JavaScript.
 * @typedef {Object} SafeMathOptions
 * @property {Record<string, number>} [vars] Named numeric variables.
 * @property {boolean} [allowImplicitVariables] Plot mode: allow `x`, constants,
 * and single lowercase letters (defaults to `true`).
 * @property {boolean} [allowUnboundVariables] Allow unknown identifiers to
 * evaluate to `NaN` instead of failing compilation.
 * @memberOf module:gen-ui
 */
export interface SafeMathOptions {
  
  vars?: Record<string, number>
  
  allowImplicitVariables?: boolean
  
  allowUnboundVariables?: boolean
}

/**
 * @description A compiled, reusable math expression
 * @typedef {Object} SafeMathProgram
 * @property {function(number): number} evaluate Evaluates the expression for
 * the given plot sample `x`.
 * @property {string[]} variables Names of variables referenced by the program.
 * @memberOf module:gen-ui
 */
export interface SafeMathProgram {
  
  evaluate: (x: number) => number
  
  variables: string[]
}

/**
 * @description Hard limits enforced by the sandboxed math parser
 * @summary Rejects overly long expressions and deeply nested input before
 * evaluation to keep parsing bounded.
 * @constant
 * @type {{maxExpressionLength: number, maxDepth: number}}
 * @memberOf module:gen-ui
 */
export const SAFE_MATH_LIMITS = {
  maxExpressionLength: 512,
  maxDepth: 32,
} as const

/**
 * @description Parse a strict decimal string into a finite number
 * @summary Accepts an optional sign, decimal point, and exponent, with no
 * whitespace inside the token. Returns `undefined` for anything else (empty,
 * grouped digits, `NaN`, `Infinity`), which keeps user input predictable.
 * @param {string} value The candidate numeric string.
 * @returns {number|undefined} The finite number, or `undefined` when invalid.
 * @function
 * @memberOf module:gen-ui
 */
export function parseDecimalNumber(value: string): number | undefined {
  const normalized = value.trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
}

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, cbrt: Math.cbrt,
  exp: Math.exp, log: Math.log10, ln: Math.log,
  abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: Math.min, max: Math.max,
  pow: (a, b) => Math.pow(a, b),
}

class ParseError extends Error {
  constructor(message: string, readonly pos: number) {
    super(`SafeMath parse error at ${pos}: ${message}`)
  }
}

/**
 * @internal
 * Recursive-descent parser for the GenUI math grammar. Whitelists constants
 * (`pi`, `e`, `tau`) and functions; rejects prototype names by using own
 * property checks. Throws `ParseError`; callers convert that to `null`.
 */
class SafeMathParser {
  private i = 0
  private depth = 0
  private readonly variables = new Set<string>()
  constructor(
    private readonly src: string,
    private readonly vars: Record<string, number>,
    private readonly allowImplicitVariables: boolean,
    private readonly allowUnboundVariables: boolean,
  ) {}

  parse(): SafeMathProgram {
    const node = this.parseExpr()
    this.skipWs()
    if (this.i < this.src.length) throw new ParseError('unexpected trailing input', this.i)
    return { evaluate: this.evalNode(node), variables: [...this.variables] }
  }

  private evalNode(node: number | ((x: number) => number)): (x: number) => number {
    if (typeof node === 'number') return () => node
    return node
  }

  private parseExpr(): number | ((x: number) => number) {
    let left = this.parseTerm()
    for (;;) {
      this.skipWs()
      const c = this.peek()
      if (c === '+' || c === '-') {
        this.i++
        const right = this.parseTerm()
        const op = c
        const prev = left
        left = op === '+'
          ? (x) => this.asNum(prev, x) + this.asNum(right, x)
          : (x) => this.asNum(prev, x) - this.asNum(right, x)
      } else return left
    }
  }

  private parseTerm(): number | ((x: number) => number) {
    let left = this.parseUnary()
    for (;;) {
      this.skipWs()
      const c = this.peek()
      if (c === '*' || c === '/' || c === '%') {
        this.i++
        const right = this.parseUnary()
        const op = c
        const prev = left
        left = op === '*'
          ? (x) => this.asNum(prev, x) * this.asNum(right, x)
          : op === '/'
            ? (x) => this.asNum(prev, x) / this.asNum(right, x)
            : (x) => this.asNum(prev, x) % this.asNum(right, x)
      } else return left
    }
  }

  private parseUnary(): number | ((x: number) => number) {
    this.skipWs()
    const c = this.char()
    if (c === '-' || c === '+') {
      this.i++
      const operand = this.withDepth(() => this.parseUnary())
      return c === '-' ? (x) => -this.asNum(operand, x) : (x) => this.asNum(operand, x)
    }
    return this.parsePower()
  }

  private parsePower(): number | ((x: number) => number) {
    const base = this.parseAtom()
    this.skipWs()
    if (this.peek() === '^') {
      this.i++
      const exp = this.withDepth(() => this.parsePower())
      const prev = base
      return (x) => Math.pow(this.asNum(prev, x), this.asNum(exp, x))
    }
    return base
  }

  private parseAtom(): number | ((x: number) => number) {
    this.skipWs()
    const c = this.char()
    if (c === '(') {
      this.i++
      const inner = this.withDepth(() => this.parseExpr())
      this.skipWs()
      if (this.peek() !== ')') throw new ParseError('expected )', this.i)
      this.i++
      return inner
    }
    if (c >= '0' && c <= '9' || c === '.') return this.parseNumber()
    if (this.isIdentStart(c)) return this.parseIdent()
    throw new ParseError(`unexpected character '${c}'`, this.i)
  }

  private parseNumber(): number {
    const start = this.i
    let sawDigit = false

    while (this.i < this.src.length && /[0-9]/.test(this.src[this.i]!)) {
      sawDigit = true
      this.i++
    }

    if (this.peek() === '.') {
      this.i++
      while (this.i < this.src.length && /[0-9]/.test(this.src[this.i]!)) {
        sawDigit = true
        this.i++
      }
    }

    if (!sawDigit) {
      throw new ParseError(`invalid number '${this.src.slice(start, this.i)}'`, start)
    }

    if (this.peek() === 'e' || this.peek() === 'E') {
      this.i++
      if (this.peek() === '+' || this.peek() === '-') this.i++
      const exponentStart = this.i
      while (this.i < this.src.length && /[0-9]/.test(this.src[this.i]!)) this.i++
      if (this.i === exponentStart) {
        throw new ParseError(`invalid number '${this.src.slice(start, this.i)}'`, start)
      }
    }

    const text = this.src.slice(start, this.i)
    const value = Number(text)
    if (!Number.isFinite(value)) throw new ParseError(`invalid number '${text}'`, start)
    return value
  }

  private parseIdent(): number | ((x: number) => number) {
    const start = this.i
    while (this.i < this.src.length && this.isIdentChar(this.src[this.i]!)) this.i++
    const name = this.src.slice(start, this.i)
    this.skipWs()
    if (this.peek() === '(') {
      // 解析白名单函数调用。
      if (!Object.hasOwn(FUNCTIONS, name)) throw new ParseError(`unknown function '${name}'`, start)
      const fn = FUNCTIONS[name]!
      this.i++
      const args: (number | ((x: number) => number))[] = []
      this.skipWs()
      if (this.peek() === ')') {
        this.i++
      } else {
        for (;;) {
          args.push(this.withDepth(() => this.parseExpr()))
          this.skipWs()
          const sep = this.peek()
          if (sep === ',') { this.i++; continue }
          if (sep === ')') { this.i++; break }
          throw new ParseError('expected , or ) in call', this.i)
        }
      }
      return (x) => fn(...args.map(a => this.asNum(a, x)))
    }
    // 使用自有属性检查，避免 `constructor` 和 `toString` 等原型名称被当作字段。
    if (!this.allowImplicitVariables && Object.hasOwn(this.vars, name)) {
      this.variables.add(name)
      const captured = this.vars[name]!
      return () => captured
    }
    if (Object.hasOwn(CONSTANTS, name) && this.allowImplicitVariables) return CONSTANTS[name]!
    if (this.allowImplicitVariables && name === 'x') {
      // plot 的采样变量从计算参数读取。
      return (value: number) => value
    }
    if (Object.hasOwn(this.vars, name)) {
      this.variables.add(name)
      // 声明参数使用编译时的值；更新参数时会以新值重新编译。
      const captured = this.vars[name]!
      return () => captured
    }
    // plot 中未声明的单个小写字母参数默认取 1；该规则不接受全局对象名称。
    if (Object.hasOwn(CONSTANTS, name)) return CONSTANTS[name]!
    if (this.allowImplicitVariables && /^[a-z]$/.test(name)) return () => 1
    if (this.allowUnboundVariables) {
      this.variables.add(name)
      return () => NaN
    }
    throw new ParseError(`unknown identifier '${name}'`, start)
  }

  private asNum(node: number | ((x: number) => number), x: number): number {
    return typeof node === 'number' ? node : node(x)
  }

  
  private withDepth<T>(read: () => T): T {
    this.depth += 1
    if (this.depth > SAFE_MATH_LIMITS.maxDepth) {
      this.depth -= 1
      throw new ParseError('expression nesting exceeds limit', this.i)
    }
    try {
      return read()
    } finally {
      this.depth -= 1
    }
  }

  private skipWs(): void {
    while (this.i < this.src.length && /\s/.test(this.src[this.i]!)) this.i++
  }

  private peek(): string | undefined {
    return this.src[this.i]
  }

  private char(): string {
    const c = this.peek()
    if (c === undefined) throw new ParseError('unexpected end of input', this.i)
    return c
  }

  private isIdentStart(c: string | undefined): boolean {
    return c !== undefined && /[a-zA-Z_]/.test(c)
  }

  private isIdentChar(c: string): boolean {
    return /[a-zA-Z0-9_]/.test(c)
  }
}

/**
 * @description Compile a math expression into an evaluator
 * @summary Convenience wrapper over {@link compileMathExprProgram} returning
 * only the evaluator. Returns `null` for invalid, oversized, or unbindable
 * expressions instead of throwing.
 * @param {string} expr The expression source.
 * @param {SafeMathOptions} [options] Variable bindings and mode flags.
 * @returns {function(number): number|null} The evaluator, or `null` on failure.
 * @function
 * @memberOf module:gen-ui
 */
export function compileMathExpr(expr: string, options: SafeMathOptions = {}): ((x: number) => number) | null {
  return compileMathExprProgram(expr, options)?.evaluate ?? null
}

/**
 * @description Compile a math expression into a reusable program
 * @summary Validates length and finite variable values, then parses with the
 * sandboxed {@link SafeMathParser}. In plot mode (`allowImplicitVariables`
 * not `false`) the sample variable `x` is reserved for sampling.
 * @param {string} expr The expression source.
 * @param {SafeMathOptions} [options] Variable bindings and mode flags.
 * @returns {SafeMathProgram|null} The compiled program, or `null` on failure.
 * @function
 * @memberOf module:gen-ui
 */
export function compileMathExprProgram(expr: string, options: SafeMathOptions = {}): SafeMathProgram | null {
  try {
    // plot 模式保留 `x` 采样变量；strict 模式允许字段使用该名称。
    const vars: Record<string, number> = { ...options.vars }
    if (options.allowImplicitVariables !== false) delete vars["x"]
    if (expr.length > SAFE_MATH_LIMITS.maxExpressionLength
      || Object.values(vars).some(value => !Number.isFinite(value))) return null
    return new SafeMathParser(expr, vars, options.allowImplicitVariables !== false, options.allowUnboundVariables === true).parse()
  } catch {
    return null
  }
}

/**
 * @description Sample an expression over an inclusive x range
 * @summary Produces `samples` evenly spaced `[x, y]` pairs for the plot
 * renderer. Returns an empty array when the expression cannot compile, the
 * range is invalid, or fewer than two samples were requested. Non-finite `y`
 * values are dropped.
 * @param {string} expr The expression source.
 * @param {number} xMin Lower x bound.
 * @param {number} xMax Upper x bound, exclusive of degenerate equality.
 * @param {number} [samples=200] Number of sample points.
 * @param {Record<string, number>} [params] Bound parameter values.
 * @returns {Array<Array<number>>} Sampled points in plot space.
 * @function
 * @memberOf module:gen-ui
 */
export function sampleExpr(
  expr: string,
  xMin: number,
  xMax: number,
  samples = 200,
  params: Record<string, number> = {},
): [number, number][] {
  const fn = compileMathExpr(expr, { vars: params })
  if (fn === null) return []
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin || samples < 2) return []
  const points: [number, number][] = []
  const step = (xMax - xMin) / (samples - 1)
  for (let i = 0; i < samples; i++) {
    const x = xMin + step * i
    const y = fn(x)
    if (Number.isFinite(y)) points.push([x, y])
  }
  return points
}
