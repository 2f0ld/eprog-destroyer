/**
 * Pure helpers that format JDWP values the way IntelliJ's Variables view does
 * (unit-tested in tests/jdwp.test.ts).
 */

/** Java's Double.toString: "1.0", "0.1", "1.0E7", "1.5E-4", "NaN", "Infinity". */
export function javaDouble(d: number): string {
  if (Number.isNaN(d)) return 'NaN'
  if (d === Infinity) return 'Infinity'
  if (d === -Infinity) return '-Infinity'
  if (d === 0) return Object.is(d, -0) ? '-0.0' : '0.0'
  const a = Math.abs(d)
  if (a >= 1e-3 && a < 1e7) {
    const s = String(d)
    return s.includes('.') ? s : s + '.0'
  }
  const [mant, exp] = d.toExponential().split('e')
  return `${mant.includes('.') ? mant : mant + '.0'}E${Number(exp)}`
}

/** Java's Float.toString for a value read as float32 (shortest digits that round-trip as a float). */
export function javaFloat(f: number): string {
  if (!Number.isFinite(f) || f === 0) return javaDouble(f)
  for (let p = 1; p <= 9; p++) {
    const n = Number(f.toPrecision(p))
    if (Math.fround(n) === f) return javaDouble(n)
  }
  return javaDouble(f)
}

const ESCAPES: Record<string, string> = { '\n': '\\n', '\t': '\\t', '\r': '\\r', '\b': '\\b', '\f': '\\f', '\\': '\\\\' }

/** Java string literal as IntelliJ renders String values. */
export function javaString(s: string, max = 1000): string {
  const body = [...(s.length > max ? s.slice(0, max) : s)].map((c) => ESCAPES[c] ?? (c === '"' ? '\\"' : c)).join('')
  return `"${body}${s.length > max ? '...' : ''}"`
}

/** IntelliJ shows chars as `'a' 97`. */
export function javaChar(code: number): string {
  const c = String.fromCharCode(code)
  const shown = ESCAPES[c] ?? (c === "'" ? "\\'" : code < 32 ? `\\u${code.toString(16).padStart(4, '0')}` : c)
  return `'${shown}' ${code}`
}

/** "java.util.ArrayList" -> "ArrayList", "Outer$Inner" -> "Outer$Inner" (IntelliJ keeps the $). */
export function simpleName(binaryName: string): string {
  return binaryName.slice(binaryName.lastIndexOf('.') + 1)
}

/** "int[]" with length 3 -> "int[3]"; "int[][]" -> "int[3][]" */
export function arrayTypeWithLength(typeName: string, length: number): string {
  const i = typeName.indexOf('[]')
  return i < 0 ? typeName : `${typeName.slice(0, i)}[${length}]${typeName.slice(i + 2)}`
}

export const BOXED = new Set(['java.lang.Integer', 'java.lang.Long', 'java.lang.Short', 'java.lang.Byte', 'java.lang.Double', 'java.lang.Float', 'java.lang.Character', 'java.lang.Boolean'])

/** Path of the source file for a class: binary name "pkg.Main$1" + SourceFile "Main.java" -> "pkg/Main.java". */
export function sourcePathOf(binaryName: string, sourceFile: string): string {
  const pkg = binaryName.includes('.') ? binaryName.slice(0, binaryName.lastIndexOf('.')).replace(/\./g, '/') + '/' : ''
  return pkg + sourceFile
}

/** Match a source path ("pkg/Main.java") to a project file ("src/pkg/Main.java"). */
export function projectFileFor(sourcePath: string, projectFiles: string[]): string | null {
  return projectFiles.find((p) => p === sourcePath) ?? projectFiles.find((p) => p.endsWith('/' + sourcePath)) ?? null
}
