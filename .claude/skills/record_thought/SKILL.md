---
name: record_thought
description: Persist a non-obvious conclusion to product/thoughts/ + log.md so the next tick can build on it. Call when you reasoned to a result that isn't already obvious from the code or git history.
---

# Record Thought

You have session amnesia. Your only memory across ticks is what lands on
disk. `record_thought` is the skill that captures one conclusion plus
its derivation in a way the next tick can find and build on.

## When to call

- 推出非显然结论 (e.g. "竞品都用月付,我们也应该" / "这个 wedge 不对,因为 X" /
  "Y 路径不可行,因为 Z")
- 改了 `product/*.md` —— 必带一条 thought 解释 *为什么* 改
- pivot 决定 —— pivot 那一刻就是一条 thought,然后立刻在同一 tick 执行新方向

## When NOT to call

- 纯机械工作:typo / rename / queue 整理 / 跑测试
- 已经显然的结论(任何读了 code/ + git log 五分钟就能推出来的)

## API

```python
from solvo.skills.record_thought.record import record_thought

rel = record_thought(
    slug="wedge-pivot",                                  # kebab-case
    summary="users want monthly billing not annual",     # one line
    body="""<free-form markdown — you organize the structure>""",
    # workspace_path defaults to cwd
)
```

Three fields. That's it. **No internal template** — `body` is markdown,
you decide the shape.

## Body — three principles, no template

1. **写小、少写** —— 能不写就不写,能一句不要三段。target = 下次的 agent 读
   你这条 thought 用不超过 30 秒就能 grok。
2. **写明确** —— 结论用陈述句,不要"可能/也许";推导给到 *下次不重推就够*。
3. **信噪比 > 完整性** —— 不要复述 sub-agent 全文 / 不要粘整个 webpage,留指针。

## Examples (参考,不是模板)

**短例**(常见 case,大部分 thought 长这样):

```markdown
3 个 /pricing 来访的用户里 2 个 message asked "is there a monthly?".
当前 product/wedge.md 写的是 annual-only。提案:切到月付为默认,annual 加
20% off 兜住价格锚点。已改 product/wedge.md。
```

**长例**(碰上方向判断,需要把推导链留全):

```markdown
## 结论
本周内不要再投 SEO 入口,转去做 1:1 outbound。

## 推导
- 本周 GA 数据:organic 70 visits / signup conversion 0.5%
- 同期 outbound:发 12 封冷邮件,3 个回复,1 个签了
- outbound 单位时间产出 ~10x SEO,SEO 还需要 4-6 周才能放量
- 目标是 first paying customer,不是 traffic

## Sources
- analytics/2026-w19.csv
- problems/#42 完成笔记
```

## Tie-in

- 你的 thought 文件路径会 append 到 `product/log.md`(skill 自动处理)。下个
  tick 默认读 log.md 末 50 行就能看到。
- 如果某主题在 thoughts/ 里出现到一定密度(自己判断),把稳定结论抽进
  `product/<topic>.md`(综合层),并在 topic 文件里留 source 指针指回原 thoughts。
- heartbeat 在 tick 末检查:如果你这一 tick 改了 product/* 但没新增
  thoughts/* → emit `missing_capture` warning(soft,不阻塞,但会进 trace)。
