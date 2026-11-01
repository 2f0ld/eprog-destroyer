import { useEffect, useState } from 'react'
import { TASKS } from './catalog'
import { useTasks } from './progress'
import { FINDS, mountainRows, unlocked } from './mountain'

const TILE = 24
const GAP = 3

/** Rock colour by depth: snowy peak, grey rock, brown earth, dark bedrock. */
function rockColor(row: number, rows: number) {
  const f = row / Math.max(1, rows - 1)
  if (f < 0.15) return 'var(--rock-snow)'
  if (f < 0.45) return 'var(--rock-grey)'
  if (f < 0.75) return 'var(--rock-brown)'
  return 'var(--rock-dark)'
}

/** The course as a mountain: every solved task digs one block away from the top. */
export function MountainView() {
  const progress = useTasks((s) => s.progress)
  const lang = useTasks((s) => s.lang)
  const seen = useTasks((s) => s.mountainSeen)
  const total = TASKS.length
  const solved = TASKS.filter((t) => progress[t.id]?.status === 'solved').length
  const rows = mountainRows(total)
  const u = unlocked(solved, total)
  const [animateFrom] = useState(Math.min(seen, solved))
  useEffect(() => {
    if (seen !== solved) useTasks.getState().setMountainSeen(solved)
  }, [seen, solved])

  const findAt = new Map(FINDS.map((f) => [Math.max(0, Math.ceil(f.at * total) - 1), f]))
  const width = rows[rows.length - 1] * (TILE + GAP)
  let k = 0
  const t = (en: string, de: string) => (lang === 'de' ? de : en)
  return (
    <div className="ij-mountain">
      <div className="ij-mountain-title">
        <span>{solved === total ? t('The mountain is gone!', 'Der Berg ist weg!') : t('Dig through EProg', 'Grab dich durch EProg')}</span>
        <span className="ij-muted">{t(`${u.percent}% dug away`, `${u.percent}% abgetragen`)}</span>
      </div>
      <svg className="ij-mountain-svg" viewBox={`-4 -4 ${width + 8} ${rows.length * (TILE + GAP) + 8}`} role="img" aria-label={t(`${solved} of ${total} blocks dug`, `${solved} von ${total} Blöcken abgetragen`)}>
        {rows.map((n, r) =>
          Array.from({ length: n }, (_, c) => {
            const i = k++
            const x = (width - n * (TILE + GAP)) / 2 + c * (TILE + GAP)
            const y = r * (TILE + GAP)
            const dug = i < solved
            const next = i === solved
            const find = findAt.get(i)
            return (
              <g key={i} className={`ij-block${dug ? ' dug' : ''}${next ? ' next' : ''}${dug && i >= animateFrom ? ' crumble' : ''}`}>
                <rect x={x} y={y} width={TILE} height={TILE} rx={4} fill={dug ? 'transparent' : rockColor(r, rows.length)} />
                {next && <path d={`M${x + 6} ${y + 5} l5 6 -3 4 6 5`} className="ij-crack" />}
                {find && (dug ? (
                  <text x={x + TILE / 2} y={y + TILE / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={15}>
                    {find.icon}
                  </text>
                ) : (
                  <text x={x + TILE / 2} y={y + TILE / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} className="ij-sparkle">
                    ✦
                  </text>
                ))}
              </g>
            )
          }),
        )}
      </svg>
      <div className="ij-mountain-tool">
        <span className="ij-mountain-tool-icon">{u.tool.icon}</span>
        <div>
          <div>
            {t('Your tool', 'Dein Werkzeug')}: <b>{u.tool.name[lang]}</b>
          </div>
          {u.nextTool && (
            <div className="ij-muted">
              {t(`Next: ${u.nextTool.tool.icon} ${u.nextTool.tool.name.en} in ${u.nextTool.remaining} task${u.nextTool.remaining === 1 ? '' : 's'}`, `Nächstes: ${u.nextTool.tool.icon} ${u.nextTool.tool.name.de} in ${u.nextTool.remaining} ${u.nextTool.remaining === 1 ? 'Aufgabe' : 'Aufgaben'}`)}
            </div>
          )}
        </div>
      </div>
      <div className="ij-task-section-title">{t('Finds', 'Fundstücke')}</div>
      <div className="ij-finds">
        {FINDS.map((f) => {
          const got = u.finds.includes(f)
          return (
            <div key={f.icon} className={`ij-find${got ? '' : ' locked'}`} title={got ? `${f.name[lang]} — ${f.note[lang]}` : t('Keep digging…', 'Weitergraben…')}>
              <span className="ij-find-icon">{got ? f.icon : '?'}</span>
              <span className="ij-find-name">{got ? f.name[lang] : '???'}</span>
            </div>
          )
        })}
      </div>
      {u.nextFind && (
        <div className="ij-muted ij-mountain-hint">
          {t(`Something glitters ${u.nextFind.remaining} block${u.nextFind.remaining === 1 ? '' : 's'} deeper…`, `In ${u.nextFind.remaining} ${u.nextFind.remaining === 1 ? 'Block' : 'Blöcken'} Tiefe glitzert etwas…`)}
        </div>
      )}
    </div>
  )
}
