/**
 * Debug protocol shared by the IDE and the runner (DEV-ONLY web/dev/debugSession.ts now, the M3 sandbox
 * later). See the header of web/dev/devRunner.ts and docs/DECISIONS.md (D19) for the wire format.
 */

export interface DebugBreakpoint {
  /** project-relative path, e.g. "src/Main.java" */
  file: string
  /** 1-based */
  line: number
}

export interface DebugFrame {
  method: string
  /** binary class name, e.g. "Main" or "java.io.PrintStream" */
  className: string
  /** project path for user classes, null for library frames */
  file: string | null
  /** 1-based, -1 if unknown (native methods) */
  line: number
  /** first line of the method (used for inline values) */
  startLine: number
}

/** One node of IntelliJ's Variables tree: `name = {type} value`. */
export interface DebugVariable {
  name: string
  /** grey part in braces, e.g. "int[3]@812" (absent for primitives and strings) */
  type?: string
  /** the value text after the type, e.g. "5", "\"hi\"", "[1, 2, 3]", "size = 3" */
  value: string
  /** colour of `value`: numbers, strings and keywords (true/false/null) use the editor scheme colours */
  style: 'number' | 'string' | 'keyword' | 'plain'
  /** icon, mirrors DebuggerTreeRenderer.getValueIcon */
  icon: 'primitive' | 'array' | 'value' | 'field' | 'parameter' | 'enum' | 'static'
  /** handle for POST /api/run/:id/debug {cmd:'children', ref}; absent = leaf */
  ref?: string
  /** short form shown as an inline value at the end of editor lines */
  inline: string
}

export type DebugCommand =
  | { cmd: 'resume' | 'pause' | 'stepOver' | 'stepInto' | 'stepOut' | 'stop' }
  | { cmd: 'frame'; frame: number }
  | { cmd: 'children'; ref: string }
  | { cmd: 'breakpoints'; breakpoints: DebugBreakpoint[] }

export type DebugEvent =
  | { type: 'attached'; address: string }
  /** `variables` belong to frames[frame]: the top frame, or the first user frame after a Pause */
  | { type: 'paused'; reason: 'breakpoint' | 'step' | 'pause'; thread: string; frames: DebugFrame[]; frame: number; variables: DebugVariable[] }
  | { type: 'resumed' }
  | { type: 'breakpoint'; file: string; line: number; status: 'verified' | 'invalid' }
