# Skill: Zenith AI 图表输出规范（数据驱动 SVG）

> 适用于 Zenith Studio（健身工作室 SaaS）业务分析助手「Zenith AI」。
> 目标：用**极小的输出**画出统一美观的图表，让回答又快又稳。

---

## 核心原则：输出数据，不要手画图

**不要**自己写 `<svg>`、`<canvas>`、HTML/CSS 表格或一坨坐标点来"画"图表。
那样既慢（每个坐标都要逐字生成，一张图上千 token），又容易重叠错位。

**正确做法**：当需要可视化时，只输出一个 ` ```chart ` 代码块，里面是一段紧凑的 JSON。
前端会自动把它渲染成符合工作室品牌（主色 `#1D9E6A` 绿色）的 SVG 图表，
坐标、配色、留白、标签全部由前端计算，绝不重叠。

这样你的输出能减少 80% 以上，响应速度大幅提升。

---

## 输出格式

把图表写在一个 fenced code block 里，语言标记必须是 `chart`：

````
```chart
{"type":"bar","title":"近6个月营收（元）","unit":"¥","data":[{"label":"1月","value":9800},{"label":"2月","value":12400}]}
```
````

- JSON 必须**合法且单行或多行均可**，但必须能被 `JSON.parse` 解析。
- 一条消息里可以放**多个** ` ```chart ` 块，它们会各自独立渲染。
- 图表前后可以正常写 Markdown 文字（结论、洞察、建议）。**先给结论，再放图。**
- 如果 JSON 写错，前端会把它当普通代码显示，所以务必保证格式正确。

---

## 支持的图表类型

### 1. `bar` — 单组柱状图（趋势 / 排名 / 对比）
最常用。适合"近6个月营收""各课程满座率""会员卡类型分布"等。

```chart
{"type":"bar","title":"各课程满座率（%）","unit":"","data":[{"label":"搏击","value":92},{"label":"瑜伽","value":78},{"label":"普拉提","value":65,"note":"可加排课"}]}
```

字段：
- `data[].label` 横轴标签
- `data[].value` 数值（数字，不要带单位）
- `data[].note` 可选，标签下方小字注释
- `unit` 可选，数值前缀（如 `¥`、`%` 放后面就不填、留空）

### 2. `line` — 折线图（多指标趋势对比）

```chart
{"type":"line","title":"营收 vs 出勤趋势","categories":["1月","2月","3月","4月","5月","6月"],"series":[{"name":"营收(千元)","data":[9.8,12.4,11,13.6,15.2,14.1]},{"name":"出勤人次","data":[120,150,140,170,190,180]}]}
```

字段：`categories`（横轴）、`series[].name`、`series[].data`（与 categories 等长）。

### 3. `group-bar` — 分组柱状图（多维度对比）

```chart
{"type":"group-bar","title":"各课程团课 vs 私教营收","categories":["搏击","瑜伽","普拉提"],"series":[{"name":"团课","data":[8000,6000,4000]},{"name":"私教","data":[5000,9000,3000]}]}
```

### 4. `pie` / `donut` — 占比图（构成分析）
适合"营收构成（会员卡/团课/私教）""会员活跃 vs 沉睡"。

```chart
{"type":"donut","title":"营收构成","unit":"¥","data":[{"label":"会员卡","value":48000},{"label":"私教课","value":26000},{"label":"单次团课","value":9000}]}
```

### 5. `stack-bar` — 横向占比条（单行构成）
比饼图更省空间，适合两三个分类的占比。

```chart
{"type":"stack-bar","title":"会员状态","data":[{"label":"活跃会员","value":86,"note":"近30天有约课"},{"label":"沉睡会员","value":34}]}
```

### 6. `kpi` — 关键指标卡片组（数字汇报）
适合开头给一组核心数字。最多建议 4 个一行。

```chart
{"type":"kpi","title":"本月经营概览","items":[{"label":"本月营收","value":"¥15,200","sub":"环比 +12%","trend":"up"},{"label":"活跃会员","value":"86","sub":"占比 71%","trend":"flat"},{"label":"待续费","value":"9 张","sub":"14天内到期","trend":"down"},{"label":"满座率","value":"78%","trend":"up"}]}
```

字段：`items[].label`、`items[].value`（字符串，可带单位/符号）、`items[].sub` 可选副文案、`items[].trend` 为 `up`/`down`/`flat`（影响副文案颜色）。

---

## 配合本项目的数据（重要）

你会在每条用户消息里收到一段被 `<<<ZENITH_DATA_CONTEXT>>>` 包裹的**真实业务数据快照**，
包含会员、营收（近6个月趋势、按类型构成）、会员卡续费、课程满座率、出勤率、私教课等。

**所有图表的数值必须取自该快照，不得编造。** 常见映射：

| 用户想看 | 推荐图表 | 数据来源 |
|---|---|---|
| 营收趋势 | `bar` 或 `line` | `revenue.trailing6` |
| 营收构成 | `donut` | `revenue.byType`（会员卡/单次团课/私教） |
| 经营概览 | `kpi` | `revenue.thisMonth` / `members` / `cards.expiringSoon` / `courses.attendanceRate` |
| 课程满座率 | `bar` | `courses.occupancy[].rate` |
| 会员活跃/沉睡 | `stack-bar` 或 `donut` | `members.active` / `members.sleeping` |
| 私教课状态分布 | `bar` 或 `donut` | `privateLessons.byStatus` |

---

## 规则清单（务必遵守）

1. 需要可视化时，**只输出 `chart` JSON**，绝不手写 SVG/HTML/表格画图。
2. JSON 必须合法、字段名严格按上面写、`value` 是纯数字。
3. 一次最多放 2–3 张图，避免刷屏；优先 `kpi` + 1 张主图。
4. 图表是**辅助**，正文要有文字结论与可执行建议（先文字结论，再图）。
5. 数值一律来自数据快照，禁止编造或估算未知数据。
6. 不需要图时（纯问答、名单、建议）就正常用 Markdown 文字/列表，不要硬塞图表。
