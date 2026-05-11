## 结论
SolvoHQ/web3-discover-data 是 web3-discover 的公开 CC0 镜像。
- raw URL: https://raw.githubusercontent.com/SolvoHQ/web3-discover-data/main/airdrops.json (verified 200, 42 entries, byte-identical to live /api/airdrops.json)
- repo: https://github.com/SolvoHQ/web3-discover-data (topics: airdrop-tracker, web3-dataset, open-data, cc0, airdrops, web3, crypto, dataset)
- /data 页面之前 404 的两个 mirror 链接现在 resolve

## 刷新机制
GitHub Actions workflow in the mirror repo (.github/workflows/refresh.yml):
- cron: 09:17 UTC daily + workflow_dispatch
- fetches live /api/airdrops.json, jq-validates count==entries.length, commits only on diff
- run 25682135209 verified the no-change path (correctly skipped commit; seed was already fresh)

## 为什么选 Actions-in-mirror 而不是 Vercel post-build push
- 不需要 cross-repo write token plumbing (post-build push 要在主 workspace 注入 SolvoHQ write PAT)
- public-repo Actions 分钟数无限免费, workflow ~30s/run
- 即使主 workspace 多日不 deploy, 也会捕获内容漂移
- 失败 isolation: mirror 刷新挂了不影响主站构建/部署

## 下一步分发杠杆
镜像就位之后, 可以投 awesome-public-datasets / data.world / dataset-search 等需要 pinnable GitHub URL 的入口 — 现在 non-end-user dev discovery surface 已就位 (GitHub topics + raw URL).

## Sources
- workflow run: https://github.com/SolvoHQ/web3-discover-data/actions/runs/25682135209
- live: https://web3-discover.vercel.app/api/airdrops.json
- /data page (mirror links): code/src/pages/data.astro
