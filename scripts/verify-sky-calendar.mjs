// 页脚星带的纯函数（apps/web/lib/sky-calendar.ts）：解析力扣、GitHub 的每日提交，排成“周 × 星期”的格子。用固定数据，不联网。
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const module = { exports: {} }
const source = readFileSync(new URL('../apps/web/lib/sky-calendar.ts', import.meta.url), 'utf8')
// 在独立上下文里运行，返回的数组属于那个上下文，比较前先展开成本地数组
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports, Map, JSON, Date, Math, Number })
const { parseLeetCode, parseGitHub, buildSky } = module.exports

// 力扣：键是那天 0 点（UTC）的秒级时间戳；0 次的日子不算
assert.deepEqual([...parseLeetCode('{"1735862400":4,"1736035200":0,"1736121600":19}')], [['2025-01-03', 4], ['2025-01-06', 19]])

// GitHub：格子带 data-date 和 id，次数在 for 指向它的 <tool-tip> 里（复数、单数、没有）
const html = `
<td tabindex="0" data-ix="0" aria-selected="false" data-date="2026-10-20" id="contribution-day-component-2-50" data-level="2" class="ContributionCalendar-day"></td>
<td data-date="2026-10-21" id="contribution-day-component-3-50" data-level="1" class="ContributionCalendar-day"></td>
<td data-date="2026-10-22" id="contribution-day-component-4-50" data-level="0" class="ContributionCalendar-day"></td>
<tool-tip id="tooltip-1" for="contribution-day-component-2-50" popover="manual" data-direction="n" class="sr-only position-absolute">12 contributions on October 20th.</tool-tip>
<tool-tip id="tooltip-2" for="contribution-day-component-3-50" popover="manual">1 contribution on October 21st.</tool-tip>
<tool-tip id="tooltip-3" for="contribution-day-component-4-50" popover="manual">No contributions on October 22nd.</tool-tip>`
assert.deepEqual([...parseGitHub(html)], [['2026-10-20', 12], ['2026-10-21', 1]])

// 排格子：从最早那天所在的周一开始，到今天所在的那一周结束；今天之后是 null
const leetcode = new Map([['2026-10-05', 10], ['2026-10-07', 1], ['2026-10-20', 2]])
const github = new Map([['2026-10-20', 3], ['2026-10-21', 9]])
const sky = buildSky(leetcode, github, '2026-10-22')
assert.equal(sky.weeks, 3)
assert.equal(sky.days.length, 21)
assert.equal(sky.days[0].date, '2026-10-05', '第一格是最早那天所在周的周一')
assert.deepEqual([...sky.days.slice(-3)], [null, null, null], '今天（周四）之后的三天留空')
const day = (date) => sky.days.find((item) => item?.date === date)
assert.deepEqual(JSON.parse(JSON.stringify(day('2026-10-05'))), { date: '2026-10-05', leetcode: 10, github: 0, levels: { leetcode: 5, github: 0 }, level: 5, kind: 'leetcode' })
assert.equal(day('2026-10-07').level, 1, '同一来源里次数少的日子暗')
assert.equal(day('2026-10-20').kind, 'both', '两样都有的日子')
assert.deepEqual({ ...day('2026-10-20').levels }, { leetcode: 2, github: 1 }, '两边各自的亮度档（图例关掉一边时用）')
assert.equal(day('2026-10-21').kind, 'github')
assert.equal(day('2026-10-21').level, 5, '两边各按自己的分布分档，GitHub 次数多的日子不会被力扣压暗')
assert.deepEqual(JSON.parse(JSON.stringify(day('2026-10-06'))), { date: '2026-10-06', leetcode: 0, github: 0, levels: { leetcode: 0, github: 0 }, level: 0, kind: null })
assert.deepEqual([...sky.years].map((year) => ({ ...year })), [{ year: '2026', week: 0 }])

// 第 5 档只给每类最亮的约 8%：100 天里次数 1..100，只有最高的 9 天（第 92 百分位及以上）是第 5 档、次高的一段是第 4 档
const spread = buildSky(new Map(Array.from({ length: 100 }, (_, i) => [new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10), i + 1])), new Map(), '2026-04-30')
const counts = [0, 1, 2, 3, 4, 5].map((level) => spread.days.filter((item) => item?.level === level && item.kind).length)
assert.deepEqual(counts, [0, 25, 25, 25, 16, 9])
// 年份刻度：跨年时在 1 月 1 日所在的那一列；第一年离下一个 1 月 1 日不到 8 周时只留后面那个
const across = buildSky(new Map([['2025-06-02', 1]]), new Map(), '2026-02-10')
assert.deepEqual([...across.years].map((year) => year.year), ['2025', '2026'])
assert.equal(across.days[across.years[1].week * 7 + 3].date, '2026-01-01')
const late = buildSky(new Map([['2025-12-01', 1]]), new Map(), '2026-02-10')
assert.deepEqual([...late.years].map((year) => year.year), ['2026'])

// 最多 maxWeeks 周（只留最近的），没有任何记录时返回 null
assert.equal(buildSky(new Map([['2020-01-01', 1]]), new Map(), '2026-10-22', 10).weeks, 10)
assert.equal(buildSky(new Map(), new Map(), '2026-10-22'), null)
assert.equal(buildSky(new Map([['2026-12-01', 1]]), new Map(), '2026-10-22'), null, '今天之后的记录不算')
console.log('PASS sky calendar: LeetCode and GitHub parsing, week grid, per-source levels, year ticks, week cap')
