/**
 * "EProg Destroyer": the course is a mountain, every solved task digs one block away from the top.
 * Tools get better as you dig, and some blocks hide finds. Pure module (unit-tested).
 */

export interface Tool {
  at: number // solved tasks needed
  icon: string
  name: { en: string; de: string }
}

export interface Find {
  /** fraction of the mountain (0..1] after which this find is dug up */
  at: number
  icon: string
  name: { en: string; de: string }
  note: { en: string; de: string }
}

export const TOOLS: Tool[] = [
  { at: 0, icon: '🥄', name: { en: 'Teaspoon', de: 'Teelöffel' } },
  { at: 0.1, icon: '🪏', name: { en: 'Shovel', de: 'Schaufel' } },
  { at: 0.25, icon: '⛏️', name: { en: 'Pickaxe', de: 'Spitzhacke' } },
  { at: 0.5, icon: '🛠️', name: { en: 'Jackhammer', de: 'Presslufthammer' } },
  { at: 0.75, icon: '🚜', name: { en: 'Excavator', de: 'Bagger' } },
  { at: 1, icon: '🧨', name: { en: 'Dynamite', de: 'Dynamit' } },
]

export const FINDS: Find[] = [
  { at: 0.05, icon: '🫘', name: { en: 'Java bean', de: 'Java-Bohne' }, note: { en: 'Where it all began.', de: 'Hier hat alles angefangen.' } },
  { at: 0.15, icon: '🦴', name: { en: 'Fossilized semicolon', de: 'Versteinertes Semikolon' }, note: { en: "Some student's missing ';' from 1996.", de: "Das fehlende ';' eines Studenten von 1996." } },
  { at: 0.3, icon: '🦆', name: { en: 'Rubber duck', de: 'Gummiente' }, note: { en: 'Explain your code to it. It helps. Really.', de: 'Erkläre ihr deinen Code. Das hilft. Wirklich.' } },
  { at: 0.45, icon: '💎', name: { en: 'Recursive crystal', de: 'Rekursiver Kristall' }, note: { en: 'Inside it: a smaller crystal. Inside that: …', de: 'Darin: ein kleinerer Kristall. Darin: …' } },
  { at: 0.6, icon: '🗝️', name: { en: 'Private key', de: 'Privater Schlüssel' }, note: { en: 'Encapsulation, but make it shiny.', de: 'Kapselung, aber glänzend.' } },
  { at: 0.75, icon: '🔗', name: { en: 'Lost linked list node', de: 'Verlorener Listenknoten' }, note: { en: 'Its next pointer was null all along.', de: 'Sein next war die ganze Zeit null.' } },
  { at: 0.9, icon: '🥇', name: { en: 'Gold nugget', de: 'Goldnugget' }, note: { en: 'You are now officially exam-hard.', de: 'Du bist jetzt offiziell prüfungsfest.' } },
  { at: 1, icon: '🏆', name: { en: 'EProg Destroyer trophy', de: 'EProg-Destroyer-Pokal' }, note: { en: 'The mountain is gone. You did that.', de: 'Der Berg ist weg. Das warst du.' } },
]

/** Row widths of a mountain with `total` blocks: 1, 2, 3, … from the peak; leftover blocks widen the lowest rows. */
export function mountainRows(total: number): number[] {
  const rows: number[] = []
  let used = 0
  while (used + rows.length + 1 <= total) {
    rows.push(rows.length + 1)
    used += rows.length
  }
  // fewer than (rows + 1) blocks are left: add one to each of the lowest rows
  for (let k = 0; k < total - used; k++) rows[rows.length - 1 - k]++
  return rows
}

/** Number of finds dug up / tool in hand after `solved` of `total` tasks. */
export function unlocked(solved: number, total: number) {
  const f = total ? solved / total : 0
  const finds = FINDS.filter((x) => f >= x.at - 1e-9)
  const tool = [...TOOLS].reverse().find((t) => f >= t.at - 1e-9)!
  const nextTool = TOOLS.find((t) => f < t.at - 1e-9) ?? null
  const nextFind = FINDS.find((x) => f < x.at - 1e-9) ?? null
  const needed = (at: number) => Math.max(0, Math.ceil(at * total - 1e-9) - solved)
  return {
    finds,
    tool,
    nextTool: nextTool && { tool: nextTool, remaining: needed(nextTool.at) },
    nextFind: nextFind && { find: nextFind, remaining: needed(nextFind.at) },
    percent: Math.round(f * 100),
  }
}

/** What a single solve (solved - 1 → solved) unlocked, for the success message. */
export function newlyUnlocked(solved: number, total: number) {
  const before = unlocked(solved - 1, total)
  const after = unlocked(solved, total)
  return {
    finds: after.finds.filter((f) => !before.finds.includes(f)),
    tool: after.tool !== before.tool ? after.tool : null,
  }
}
