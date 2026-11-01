import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mountainRows, unlocked, newlyUnlocked, FINDS, TOOLS } from '../src/tasks/mountain.ts'

test('the mountain has one block per task, widest at the base', () => {
  for (const n of [1, 5, 19, 41, 60]) {
    const rows = mountainRows(n)
    assert.equal(rows.reduce((a, b) => a + b, 0), n)
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i] >= rows[i - 1], `${n}: ${rows}`)
  }
  assert.deepEqual(mountainRows(41), [1, 2, 3, 5, 6, 7, 8, 9])
})

test('tools and finds unlock as you dig, all of them at the end', () => {
  const start = unlocked(0, 41)
  assert.equal(start.tool, TOOLS[0])
  assert.equal(start.finds.length, 0)
  assert.equal(start.nextFind?.remaining, 3) // 5% of 41 → block 3
  const end = unlocked(41, 41)
  assert.equal(end.tool, TOOLS[TOOLS.length - 1])
  assert.equal(end.finds.length, FINDS.length)
  assert.equal(end.nextTool, null)
  // every find and tool is announced exactly once on the way
  let finds = 0
  let tools = 0
  for (let s = 1; s <= 41; s++) {
    const n = newlyUnlocked(s, 41)
    finds += n.finds.length
    if (n.tool) tools++
  }
  assert.equal(finds, FINDS.length)
  assert.equal(tools, TOOLS.length - 1)
})
