# udflow — Universal Dev Flow（Claude Code 外掛）

[![Validate](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

[English](README.md) · **繁體中文**

**udflow 讓 Claude Code 像謹慎的 release engineer 一樣工作：** 先規劃、經你核准後才改 code、用證據驗證，最後給出 `READY` / `FIX REQUIRED` / `NOT READY`。

udflow 是 Claude Code 的計劃閘門式程式碼審查與 release-readiness workflow。它不是 bug scanner、linter、static analysis、CI 替代品，也不是零 bug 保證。它的工作是讓 AI-made change 可追溯：明確意圖、acceptance criteria、最小安全實作、真實驗證證據、依風險挑選 reviewer，以及 gatekeeper verdict。

```text
任務 -> 理解需求 -> Plan（尚未改動程式）-> 你核准 plan + acceptance criteria
     -> 最小安全變更 -> build / test / lint / browser evidence
     -> 依風險挑選 reviewer -> Gatekeeper verdict
            READY / FIX REQUIRED / NOT READY -> 必要時進入 repair loop
```

## 30 秒理解

udflow 做三件事：

| 時機 | udflow 補上的紀律 |
|---|---|
| **寫程式前** | Claude 重述需求，整理 plan 與 acceptance criteria，並等待你核准。 |
| **寫程式時** | `implementer` 只做最小安全變更，且不能自我認證。 |
| **交付前** | 依風險挑選 reviewer 對著你的意圖審查，最後由 `gatekeeper` 判定 `READY` / `FIX REQUIRED` / `NOT READY`。 |

當「done」必須等於「可發佈」時使用 udflow：合併到 `main`、上線、或動到 authentication、data、contracts、migrations、production behavior、高風險 UI flow。

打錯字、純格式化、低風險小改、或只是 quick look 時通常不用 udflow。能用更便宜且確定性的工具時，先用那些工具。

> 實機示範：[udflow-public-demo](https://github.com/kktu6507/udflow-public-demo) 記錄了一次完整 `/udflow:run`。

## 快速開始

前置需求：**Claude Code** + `PATH` 上有 `node`。hook 是 Node 腳本；沒有 Node 時會靜默 no-op。

```text
# 在你的專案目錄、Claude Code 內：
/plugin marketplace add kktu6507/universal-dev-flow-plugin
/plugin install udflow@kktu
# udflow 出貨時預設停用 - 請在 /plugin 裡把 udflow 切為啟用
#   或：claude plugin enable udflow@kktu
/reload-plugins

# 交給它一個任務：
/udflow:run 修好登入流程，讓 expired access token 在重試失敗 request 前只 refresh 一次。
```

- **安裝不等於啟用。** 啟用前，udflow 的 hooks 與 skills 都不做事。
- **Marketplace 名稱是 `kktu`。** 安裝 id 是 `udflow@kktu`。
- **更新：** `/plugin marketplace update kktu` 後跑 `/reload-plugins`。
- **健康檢查：** gate 沒擋、hook 沒反應、或 Node 可能不存在時，跑 `/udflow:doctor`。

## 好任務長什麼樣子

udflow 最吃任務品質。好的任務會交代 intent、acceptance criteria、不能改什麼、預期驗證，以及風險區域。

```text
/udflow:run <change request>

需求：
- ...

驗收條件：
- ...

不可變更：
- ...

預期驗證：
- ...

風險區域：
- auth / data / contract / UI / performance / rollback
```

請看 [`docs/task-writing-guide.md`](docs/task-writing-guide.md)（英文），裡面有 bad / better / best 範例，以及 auth、API contract、UI state、migration 任務模板。

## 何時使用

| 適合使用 udflow | 通常不必使用 udflow |
|---|---|
| auth / authz 改動 | typo |
| API 或 schema contract 改動 | 純格式化 |
| DB migration / data integrity | 瑣碎 local copy edits |
| UI flow、accessibility、browser-visible states | 快速非 release review |
| release 前需要較高信心的變更 | CI/linter 已覆蓋的機械檢查 |

## 非目標

udflow 不是：

- CI 的替代品
- linter 或 static analysis 的替代品
- 零 bug 保證
- 窮舉式 mechanical scanner
- 每個小改都必須使用的工具

udflow 應搭配：

- unit / integration tests
- linters / formatters
- static analysis / dependency scanners
- high-risk release 的 human review
- 外部系統相關變更的 controlled live-environment evidence

Linters 抓機械問題。Tests 驗證已知預期行為。Static analysis 抓已知 vulnerability patterns。udflow 判斷 AI-made change 是否滿足陳述意圖、是否 ready to ship。

## 運作方式

| 階段 | 發生什麼 |
|---|---|
| **Understand** | 重述需求；只有當歧義會改變 behavior、contracts、destructive operations、security 或 UX 時才問。 |
| **Plan** | 保持唯讀，把做法紮根到 repo，整理 acceptance criteria。 |
| **Approval** | 你核准 plan 與 criteria 前不改 code。 |
| **Implement** | `implementer` 套用最小安全變更,並寫出本次執行的 task contract(`output/udflow/contract.md`)。 |
| **Verify** | 依需要跑 build / test / lint / typecheck / browser evidence；command exit status 是權威。 |
| **Review** | 只跑與風險相關的 reviewer，且使用聚焦的 Review Packet，不靠整段 thread history。 |
| **Gatekeeper** | 彙整 findings、依 impact 重評、逐條檢查 acceptance criteria，判定 `READY` / `FIX REQUIRED` / `NOT READY`。 |

Verdicts 是 release-readiness decisions，不是絕對真理。請看 [`docs/how-to-read-verdicts.md`](docs/how-to-read-verdicts.md)（英文）。

## 範例與證據

- [`examples/ready-run.md`](examples/ready-run.md)（英文）- 從 `EVIDENCE.md` 抽取的真實 `READY` 範例。
- [`examples/fix-required-run.md`](examples/fix-required-run.md)（英文）- 從 `EVIDENCE.md` 抽取的真實 `FIX REQUIRED -> READY` repair-loop 範例。
- [`examples/not-ready-run.md`](examples/not-ready-run.md)（英文）- illustrative `NOT READY` 範例，明確標示不算 evidence。
- [`examples/review-packet.md`](examples/review-packet.md)、[`examples/final-report-compact.md`](examples/final-report-compact.md)、[`examples/final-report-full.md`](examples/final-report-full.md)（英文）展示 reviewer input 與 delivery output 的 contract-field examples；它們是 illustrative，不是逐字 transcripts。

因為 udflow **沒有 telemetry**，real-world validation 以人工記錄為準。`EVIDENCE.md` 是唯一真實來源：

| Track-2 指標 | 目前狀態 |
|---|---|
| Type-B verified live runs | 6 / 10 |
| Distinct real projects | 2 / 3 |
| Non-maintainer runs | 0 / 1 |

最有價值的貢獻：在真實工作上跑 udflow，然後開一個 [Verified udflow run issue](https://github.com/kktu6507/universal-dev-flow-plugin/issues/new?template=verified-run.yml)。請貼上 udflow 在結尾印出的 `### Live run` block，並保留 misses、false alarms、cost、follow-up outcome；誠實的負面資訊才是 evidence 的重點。

## Hooks 與安全模型

只要 plugin 被啟用，五個零依賴 Node hooks 會在每個 session 執行。它們 local-only、fail-open，只使用 Node built-ins（`fs`、`os`、`path`、`crypto`）。

| Hook 腳本 | 觸發事件 | 用途 |
|---|---|---|
| `plan-gate.js` | `PreToolUse` | 在 plan mode 中擋下 edit tools 與明顯 Bash writes。 |
| `destructive-guard.js` | `PreToolUse` | 對 `rm -rf`、`git reset --hard`、`git push --force`、PowerShell `Remove-Item -Recurse` 等狹義不可復原 destructive commands 先詢問。 |
| `load-failure-memory.js` | `SessionStart` | 讀取專案 `ai/FAILURE_MEMORY.md` 或全域 `~/.claude/FAILURE_MEMORY.md`，並注入 nonce-fenced、untrusted digest。 |
| `compact-fidelity.js` | `SessionStart` · `compact` | context compaction 後重新注入精簡 workflow-continuity reminder。 |
| `orchestration-check.js` | `Stop` | delivery claim 與 missing panel、blocking verdict、failed/unrun verification、missing live-run evidence 矛盾時提示。 |

這些 hooks 不會刪檔、不會改系統設定、不會改權限、不會開 subprocess、不會下載 code，也不會傳送 code/transcript。它們是 guardrails，不是 sandbox。詳見 [`SECURITY.md`](SECURITY.md) 與 [`ARCHITECTURE.md`](ARCHITECTURE.md)。

## 相容性

udflow 以 Claude Code 為主要 runtime。它也能在 GitHub Copilot CLI 下部分降級運作：plugin format 可載入，但部分 Claude-Code-only hook output 不會被送達。

Compatibility 與 conformance smoke 詳情請看 [`docs/compatibility.md`](docs/compatibility.md)（英文）。短版如下：

- Claude Code 是主要 runtime。
- GitHub Copilot CLI 會載入 skills、subagents、部分 PreToolUse decisions，但 injected `SessionStart` 與 `Stop` output 可能 no-op。
- `destructive-guard.js` 已在 Copilot CLI 1.0.65 live-verified。
- Claude Code hook/agent contracts 是 moving target；release smoke 記錄在 [`RELEASING.md`](RELEASING.md)。

## 信任與發佈

udflow 啟用後 hooks 會 auto-execute，所以 install integrity 很重要。

建議安全安裝：

1. 從 tagged release 或 pinned commit 安裝。
2. 啟用前先 review shipped plugin 的 `hooks/` 目錄（repo path：`udflow/hooks/`）。
3. 安裝後跑 `/udflow:doctor`。
4. signed tag 存在時，用 `git verify-tag vX.Y.Z` 驗證。
5. release assets 有 SHA-256 checksum 時，優先使用並驗證。

Trust model 請看 [`SECURITY.md`](SECURITY.md)（英文）；release checklist、live smoke、signed tag setup、checksum verification 請看 [`RELEASING.md`](RELEASING.md)（英文）。

快速開始的 marketplace command 是便利路徑，會跟著 marketplace / repo state 走。Release checksum 只能做完整性比對：確認下載的 archive 符合 published release asset；來源真實性仍依賴 signed tag 或 pinned SHA。它不驗證預設 clone path；需要 pinning 時，請使用 tagged/SHA checkout，或把已驗證 archive 與安裝後的 `udflow/` tree 做比對。

## 成本

典型 real-app run 會比一次性 AI review 貴，因為 udflow 會 plan、verify、review，也可能 repair。數量級如下：

| 任務等級 | 審查者 | 新增 tokens | 經過時間 |
|---|---|---|---|
| 輕量 | `--lite`，core only | ~0.5-2M | 幾分鐘 |
| 典型 | 3-5 reviewers + one repair pass | ~2-7M | ~5-15 分鐘 |
| 深入 | `--deep`，多輪 repair | >10M | ~20-40 分鐘 |

需要省成本時用 `/udflow:run --lite`；需要最大審查深度時用 `--deep`；需要詳細 per-agent activity 與 cost 時用 `--report full`。

## 文件

- [`docs/task-writing-guide.md`](docs/task-writing-guide.md)（英文）- 如何寫出 udflow 能驗收的任務。
- [`docs/how-to-read-verdicts.md`](docs/how-to-read-verdicts.md)（英文）- `READY` / `FIX REQUIRED` / `NOT READY` 的意義。
- [`docs/compatibility.md`](docs/compatibility.md)（英文）- tested runtimes 與 conformance smoke checklist。
- [`docs/advanced/external-capabilities.md`](docs/advanced/external-capabilities.md)（英文）- optional MCP、Codex、browser、design capabilities。
- [`EVIDENCE.md`](EVIDENCE.md)（英文）- real-world 與 benchmark evidence log。
- [`ARCHITECTURE.md`](ARCHITECTURE.md)（英文）- component map、stable contracts、limits。
- [`SECURITY.md`](SECURITY.md)（英文）- trust model、安全安裝、vulnerability reporting。
- [`RELEASING.md`](RELEASING.md)（英文）- release automation、live smoke、signed tags、checksums。

## 授權

[MIT](LICENSE)；版本紀錄見 [CHANGELOG.md](CHANGELOG.md)。
