---
name: commit
description: Create a git commit with the Solvo V4 message format (product-impact + note + tick_id). Use this for ALL workspace mutations, both product/ and code/.
---

# Commit

Every workspace mutation goes through this skill so the message carries
your reading of what changed and how it shifts the product. In V4.1 the
commit also records the `tick_id` so completions and commits can be
correlated after the fact.

## commit(title, body, product_impact, note, workspace_path)

- `title` — one-line conventional commit title (e.g., `feat: add signup flow`)
- `body` — what you changed and why (free text)
- `product_impact` — exactly one of:
  - `none` — does not affect product definition (color tweak, typo)
  - `refines-shape` — fills in product shape (new field, flow detail)
  - `shifts-direction` — changes monetization, target user, or core form
- `note` — your short reading of what the product is/does after this change
- `workspace_path` — the workspace root

The skill reads `SOLVO_TICK_ID` from the environment (set by heartbeat) and
appends it to the commit message trailer for audit.

Use it for `product/` AND `code/` changes alike. Solvo treats them the same.

The message body produced is:

```
<title>

<body>

---
product-impact: <none | refines-shape | shifts-direction>
note: <note>
tick-id: <SOLVO_TICK_ID or "n/a">
```

Future readers (you, in another spawn) reconstruct product evolution from
`git log` over these notes. Be honest and specific.

## Do not shell out to `git commit -m`

Workspaces install a `commit-msg` hook (at `.git/hooks/commit-msg`,
sourced from `solvo/skills/commit/hook/commit-msg` on every `solvo init`
and `solvo run`) that rejects any commit message lacking the
`Co-authored-by: solvo-<ws> <agent@west0n.top>` trailer or any commit
whose `user.email` isn't `westonguo@outlook.com`. Calling this skill is
the only way to land a commit; raw `git commit` will fail with a
pointer back here.
