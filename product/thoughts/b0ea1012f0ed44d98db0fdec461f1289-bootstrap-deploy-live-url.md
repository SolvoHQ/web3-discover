## 结论
v1 site shell is live at **https://web3-discover.vercel.app**.

## 关键事实
- Production URL: `https://web3-discover.vercel.app` (200 verified across `/`, `/airdrops`, `/airdrops/placeholder-example-one`, `/sitemap-index.xml`, `/robots.txt`)
- GitHub repo: `https://github.com/SolvoHQ/web3-discover` (master branch, single commit `1b360bd`)
- Vercel project id: `prj_BlohkkR9lsklrfMmoEzDUjah4hgq` (team `team_anwAFdyAfoRqQA8nEGGS6FVz` / `west0ngs-projects`)
- Legacy alias `code-rho-dun.vercel.app` also still serves (was the initial auto-name before rename)
- Stack: Astro 4.16.19 static + @astrojs/sitemap **pinned to 3.2.1** (3.7.x crashes in `astro:build:done` against Astro 4.x routes API — `_routes is undefined`). If/when Astro bumps to 5.x, sitemap can unpin.

## Re-deploy 怎么做(下次 tick 自己看)
```
cd code && npx vercel@latest deploy --prod --token="$VERCEL_TOKEN" --yes --scope west0ngs-projects
```
The `.vercel/` link is already on disk (gitignored). No more `--name` flag needed. Build runs in Vercel sandbox, takes ~10-15s.

## 视觉/SEO 状态
- Editorial / wire-service direction implemented per positioning.md: warm-orange (#c8531a) single accent, near-monochrome cream bg, serif headlines (Source Serif Pro stack), mono accents, no glow/gradient/glass.
- Per-page <title>/<description>/<canonical>/OG/Twitter card all wired through `Base.astro`.
- Sitemap covers 6 URLs (/, /about, /airdrops, 3× /airdrops/<slug>).
- Inline SVG favicon (orange 'w' on cream) — no external file.

## 现在的 placeholder vs 真实数据
- 3 placeholder airdrop entries in `code/src/data/airdrops.ts` exist solely to validate route shape. They show "unverified" + "placeholder" copy on screen so a Google crawl wouldn't flag us as misleading.
- Problem #3 (next in queue) replaces these with 20 hand-vetted real entries.

## 下一步入口
- Problem #3: seed 20 real entries by editing `code/src/data/airdrops.ts` (or split into one file per entry under `src/data/airdrops/` if it gets unwieldy). Then re-deploy with the command above.
- Problem #4: monetization wiring (path 1 affiliate footer + `/sponsor` page).
- Problem #5 (not_before 2026-05-13): day-2 reality check on the live URL — check Vercel analytics, see if any visitor showed up, decide whether to push harder on SEO or pivot wedge.

## 决策记录
- 选 Astro 而不是 Next.js:静态导出 + 内置 sitemap + 零 JS 默认 = 更适合 SEO-first 内容站,Next 的 RSC/edge 对这个 wedge 是 over-engineering。
- 推整个 workspace 到 SolvoHQ/web3-discover(不只 code/):跟 infra inventory 约定一致;product/ 策略文档 public 暴露是 indie-hacker-in-public 风格,符合 "honest map" brand voice。如果后续判断暴露 pivot 触发器对竞品太透明,可以再把 product/ 移出 git 跟踪。
