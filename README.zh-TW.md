# udflow — Universal Dev Flow（Claude Code 外掛）

[![Validate](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

[English](README.md) · **繁體中文**

**Claude Code 的計劃閘門、風險比例式程式碼審查與就緒判定工作流。** 不是給打錯字用的——當「完成」必須等於「可發佈」時才用它。

```text
任務 → 理解需求 → Plan mode（還沒改任何程式）→ [高風險] 接地到程式碼 + 磨利意圖
     → 你核准 → 最小安全變更 → build / test / lint / 瀏覽器佐證
     → 依風險挑選 reviewer → Gatekeeper：READY / FIX REQUIRED / NOT READY
                                  ⟲ 自動修復迴圈（有硬上限）
```

> 一句話：Claude 會先擬計劃、**動程式碼前先取得你核准**，由對的專業 reviewer **對著你的意圖**檢查，findings 自動修復並重審，最後給出**出貨/不出貨裁決**——而不是只說一句「完成」。

> 🎬 **實機示範：** [udflow-public-demo](https://github.com/simba6507/udflow-public-demo) —— 一次完整錄下的 `/udflow:run`。

---

## 它是什麼

- **一套審查 + 就緒判定工作流** —— 低噪音的 reviewer **加上**一道出貨/不出貨閘門。**不是** bug 掃描器；要窮舉請搭配 linter／靜態分析。
- **可量測的強項 = 精度 + 流程紀律 + 就緒閘門** —— 近乎零誤報，*而非*最大召回。
- **狀態：早期／實驗性** —— hook 有測試；多代理編排是 prompt 驅動。把它當有紀律的鷹架,不是保證。

| 盲測 · 6 種語言、100+ 真實 bug | 抓到 | 誤報 |
|---|---|---|
| 不給意圖（32 bug） | ~34% | **0** |
| 給契約級意圖（同 32 bug） | ~84% | **0** |
| 自動化、bug-blind 意圖（77 bug／12 repo） | ~29% | **77 中 1** |

- **精度是穩健的強項** —— ~110 次盲審約 1 個誤報。它升 `major`/`blocker` 時幾乎都是真的。
- **召回隨你把意圖講得多具體而變** —— 只看程式碼約 30%；契約級意圖可達 ~84%。真實 udflow 透過 **Review Packet** 把意圖交給 reviewer,所以召回跟著你需求的品質走。

<details>
<summary><b>證據 —— 方法與限制</b></summary>

reviewer 對真實歷史 bug 的**修復前**程式碼**盲跑**（6 種語言／多個外部 repo）,由獨立評審對照已知修復計分。主要漏判類別（77-bug 語料）：omission 36% · 抓到*另一個*真實 bug 18% · 語言慣用 16% · 評級過低 15% · 需外部 spec 15%。限制：bug 多取自 `fix` commit；並行／整合幾乎沒測；許多次只用單一 reviewer、無計劃脈絡——這些都*低估*了完整一次 run。完整方法與逐次紀錄見 [`EVIDENCE.md`](EVIDENCE.md)（手動紀錄——udflow **無遙測**）。誠實標籤：一個*已被刻畫的*早期／beta——是方向性指標,不是保證。

</details>

---

## 快速開始

前置需求：**Claude Code** + PATH 上有 `node`（hook 是 Node 腳本；沒 Node 就靜默 no-op）。

```text
# 在你的專案目錄、Claude Code 內：
/plugin marketplace add simba6507/universal-dev-flow-plugin
/plugin install udflow@kktmarketplace
# udflow 出貨時為停用 —— 啟用它：/plugin → Installed → 把 udflow 打開
#   （或：claude plugin enable udflow@kktmarketplace），然後：
/reload-plugins
# 交給它一個任務：
/udflow:run 修好登入流程,讓 token 過期時會自動 refresh
```

- **安裝 ≠ 啟用。** 它以 **opt-in（停用）** 出貨；啟用前 hook 與 skill 都不做事。啟用後會**對非瑣碎工作自動接手**；瑣碎編輯與純 Q&A 不碰（要強制完整流程就用 `/udflow:run`）。
- **marketplace 名稱是 `kktmarketplace`**（非 repo 名）→ 安裝 id 是 `udflow@kktmarketplace`。
- **更新：** `/plugin marketplace update kktmarketplace` 再 `/reload-plugins`（自訂 marketplace 不會自動更新）。

**疑難排解**

| 症狀 | 處理 |
|---|---|
| 安裝「找不到」 | 用 `udflow@kktmarketplace`（marketplace 名,非 repo）；以 `/plugin marketplace list` 確認 |
| 閘門從不擋／沒反應 | 檢查 `node --version`；設 `UDFLOW_HOOK_DEBUG=1` 看 hook trace |
| 計劃閘門擋到別的專案 | 在該專案 `.claude/settings.json` 設 `"udflow": { "planGate": false }` |
| `opus` 不可用 | `security-reviewer` / `gatekeeper` 退回 session 模型並說明（裁決信心較低） |
| 失敗記憶出現在無關專案 | 全域 `~/.claude/FAILURE_MEMORY.md` 預設到處注入；加專案 `ai/FAILURE_MEMORY.md`,或移除全域檔 |

---

## 運作流程

| 階段 | 發生什麼 |
|---|---|
| **理解** | 重述需求；真有歧義時 `AskUserQuestion`（業務行為、契約、破壞性操作、UX） |
| **規劃**（plan mode,唯讀） | 高風險工作：把計劃接地到程式碼現實 + 把需求磨成**契約級意圖** + 邊界輸入清單；以 `ExitPlanMode` 呈現 |
| **你核准** | 在此之前不寫任何東西——你同時核准**驗收條件** |
| **實作** | `implementer` 做**最小安全變更** |
| **驗證** | build / test / lint / typecheck + 瀏覽器佐證；**實際跑過高風險邊界輸入**；指令**退出碼為權威** |
| **審查** | 只跑**與風險相關**的 reviewer,對著你陳述的意圖審 |
| **Gatekeeper** | 彙整 findings、**依真實衝擊重評**、逐條檢查驗收條件 → `READY` / `FIX REQUIRED` / `NOT READY` → **修復迴圈**直到就緒或明確受阻（硬上限：同 blocker 連兩輪 → Stuck Summary） |

關鍵紀律：

- **計劃閘門** —— hook 在 plan mode 期間擋下編輯,讓你核准前程式不會變（全域；可逐專案 opt-out；見 [Hooks](#hooks)）。
- **驗收條件** —— 最深的訊號不是「沒 bug」,而是*做了你要的、且已確認*；未達成且未延後的條件會擋下 `READY`。
- **驗證哨符** —— 大型 run 以單一最終報告收尾,附機器可讀的 `udflow:verify=pass|fail|unrun|na` 與 `udflow:delivery=held|shipped`（Stop hook 會讀）。
- **失敗記憶** —— 過往教訓存在 `ai/FAILURE_MEMORY.md`（專案）／`~/.claude/FAILURE_MEMORY.md`（全域）；開場注入**標題+tags 摘要**（在 `###` 標題結尾加 `(expired)` / `(superseded …)` 即退役該條）。prevention rule 內文按需讀取、不注入。
- **設計契約** —— UI 工作時,專案設計語言寫進 committed `design.md`,`ui-ux-reviewer` 對它審一致性（引用違反的 token/段落）,而非每次重推；`planner-creator` 偵測並可從既有 UI 立基。無障礙安全底線凌駕它；`ui-ux-pro-max` 把全新 pattern 回灌其中。
- **深度模式** —— **Tier 1**（高風險 + 具 Workflow 能力時自動）：把*同一組*面板 + gatekeeper 以確定性 graph 跑,讓它真的依序執行（成本 ≈ 一般；`--no-deep` 退出）。**Tier 2**（`--deep`）：對 blocker/major 加對抗驗證 + 最高 effort + UI 需真實瀏覽器佐證。當驗證需要的活程序（網頁 App 或後端/API）還沒在跑時,Tier 2 還會**把 App 啟動起來**——委派給內建 `/run` 技能,事後只收掉自己起的程序（自動 + 揭露;標準模式不會啟動）。是加深度,不是加 reviewer。

---

## 10 個 subagent

| Agent | 角色 | 何時加入 | 模型 |
|---|---|---|---|
| `planner-creator` | 用真實程式碼紮根計畫、草擬方法、預選面板、偵測/建議 `design.md`（可從既有 UI 立基）（唯讀；輔助計畫核准，絕不取代） | 規劃 | inherit |
| `implementer` | 最小安全變更；絕不自我認證 | 計劃核准後 | inherit |
| `spec-reviewer` | 需求／業務規則／契約符合度 | 核心（非瑣碎） | inherit |
| `test-reviewer` | 缺測試、薄弱驗證、邊界、回歸 | 核心（非瑣碎） | inherit |
| `code-reviewer` | 本地品質、可維護、框架用法、效率 | 非瑣碎程式變更 | inherit |
| `security-reviewer` | auth/authz、輸入處理、secret、信任邊界 | 安全相關風險 | **opus** |
| `architecture-reviewer` | 分層、邊界、相依方向、放置 | 結構性疑慮 | inherit |
| `operability-reviewer` | 可觀測性、retry/timeout、部署、rollback | runtime/正式環境影響 | inherit |
| `ui-ux-reviewer` | 易用性、互動、版面、狀態、無障礙；存在時對 `design.md` 一致性 | UI 影響 | inherit |
| `gatekeeper` | 彙整、依衝擊重評、判定就緒 | reviewer 跑完後 | **opus** |

- **reviewer 依角色為唯讀** —— `Read` / `Grep` / `Glob` / `Bash`（僅供檢查）,**沒有** editor 工具。
- **正確性關鍵路徑**（parsing、數值/編碼/溢位、並行、安全、資料完整性）至少**兩個獨立視角**——benchmark 顯示第二個視角能救回第一個合理化掉的缺陷。

---

## Hooks

五個 Node hook —— **全部 fail-open**（任何錯誤、或 PATH 上沒 Node → 什麼都不做,絕不弄壞 session）、**純本地**（不連網、不開子行程、不跑下載程式碼；只用內建 `fs`/`os`/`path`/`crypto`）。只要 plugin 啟用,它們在*每一個* session 跑,非僅 udflow 任務。

| Hook（事件） | 它能做什麼 | 預設 · opt-out |
|---|---|---|
| `plan-gate.js`（PreToolUse） | **擋下**編輯 + *明顯的* Bash 寫檔,**只在 plan mode**；放行 `~/.claude/plans/` | 開 · `"udflow":{"planGate":false}` |
| `destructive-guard.js`（PreToolUse） | 在**任何**模式對不可復原 Bash **詢問**（永不硬擋）：`rm -rf`（含分開的 `rm -r -f`）、`git reset --hard`、`git push --force`、`find -delete`、`dd of=`、`mkfs`、`shred` —— 以及 PowerShell 形式 `Remove-Item -Recurse` / `Format-Volume` / `Clear-Disk`（Windows / Copilot） | 開 · `"udflow":{"destructiveGuard":false}` |
| `load-failure-memory.js`（SessionStart） | **讀取**你的 `FAILURE_MEMORY.md`,把經 nonce 圍欄、role-marker 中和的摘要注入你自己的 session | 開 · 沒檔 → no-op |
| `compact-fidelity.js`（SessionStart · `compact`） | 在 context 壓縮**之後**立刻**注入**一段精簡指示,讓壓縮後的新 context 重新立起 udflow 自己的構件（reviewer 裁決、acceptance-criteria 狀態、`[unverified]` 標記、Run Card 數字、subagent 發現、未回答的需求）—— 只注入指示、不讀檔。0.27.3 由 `PreCompact` 搬遷而來（Claude Code 會拒絕 `PreCompact` hook 的注入輸出） | 開 · `"udflow":{"preserveOnCompact":false}` |
| `orchestration-check.js`（Stop） | 收尾**提示**：宣稱 `READY` 卻沒跑面板、阻擋裁決被無視、或 required check 紅燈/未跑卻仍交付時警告 | 提示 · 僅 `UDFLOW_ENFORCE_STOP` 時硬擋 |

- **它們絕不會：** 改系統/安全設定、改檔案權限、刪任何東西（`destructive-guard` 只會在你自己的刪除/抹除指令前*先詢問*——本身不刪）、或把你的程式碼或 transcript 傳到任何地方。
- **盡力而為、非 sandbox。** `destructive-guard` 與 plan-gate 的 Bash tripwire 是窄而高信心的 deny-list；混淆形式（`node -e`/`python -c` 一行式、`bash -c`、管線刪除 `… | Remove-Item`、cmd.exe `rd /s`/`del /s`、字內單引號）可能漏接——它們只 `ask`/`deny`,從不是唯一防線。要每個 session 都有硬保證,請在 settings 設預設 plan mode。

---

## 選項與 opt-in

一切**預設關閉／依風險比例**——要你才 opt in。

**啟用 / 停用**

| 選項 | 效果 | 預設 |
|---|---|---|
| 在 `/plugin` 啟用（或 `claude plugin enable udflow@kktmarketplace`） | 把 hook + skill 打開 | **停用** |
| `.claude/settings.json` 設 `"udflow": { "planGate": false }` | 關閉此專案 plan-mode 寫檔閘門 | 閘門**開**（缺失/壞掉 → 開） |
| `.claude/settings.json` 設 `"udflow": { "destructiveGuard": false }` | 關閉此專案破壞性指令確認 | 守衛**開**（缺失/壞掉 → 開） |
| `.claude/settings.json` 設 `"udflow": { "preserveOnCompact": false }` | 關閉此專案壓縮保真提示 | 提示**開**（缺失/壞掉 → 開） |
| `~/.copilot/settings.json` 設 `{ "enabledPlugins": { "udflow@kktmarketplace": false } }` | **僅在 Copilot CLI** 停用 | 已安裝即啟用 |
| `~/.copilot/settings.json` 設 `{ "disableAllHooks": true }` | Copilot 下關閉所有 plugin hook | hook 開 |

**執行旗標** —— `/udflow:run <flags> <task>`

| 旗標 | 效果 | 預設 |
|---|---|---|
| `--deep`（也可 `deep:` / `ultra:`） | Tier-2：對 blocker/major 對抗驗證 + 最高 effort；有 UI 時驅動真實瀏覽器佐證；當 App（網頁或後端/API）還沒在跑時**透過 `/run` 自動啟動 App**,事後收掉自己起的程序 | 關（高風險時 Tier-1 仍自動） |
| `--no-deep` / `--shallow` | 退出 Tier-1 確定性強制（面板照跑,改模型編排） | 高風險時 Tier-1 自動 |
| `--lite` | 最小充分面板 + 跳過深度（高風險訊號時保留一個 safety reviewer） | 關（面板依風險比例） |
| `--report full` | 詳細報告：逐 agent 活動、Files Changed、完整成本表（Input/Output/Cache-write/Cache-read）、after 截圖 | 關（精簡報告） |

**環境變數**

| 變數 | 效果 | 預設 |
|---|---|---|
| `UDFLOW_HOOK_DEBUG=1` | hook 寫 trace（stderr / 暫存檔）以利除錯 | 未設（安靜） |
| `UDFLOW_ENFORCE_STOP=1` | 把 Stop 提示升級為硬**阻擋**——僅當有真實 gatekeeper 阻擋裁決**且** `udflow:delivery=shipped`（永不靠 prose）；以 `udflow:delivery=held` 逃生。Claude-Code 專屬（見 [相容性](#相容性)） | 未設（僅提示） |

**選用的外部能力**（Detect → Use → Else-Disclose —— 有就用,沒有就揭露缺口）

| 能力 | 效果 | 預設 |
|---|---|---|
| 每位 reviewer 的 MCP（`udflow/.mcp.json`；範本 `mcp.example.json`） | 給 reviewer 唯讀 MCP 工具 | 關（空 `.mcp.json`） |
| Codex | 跨模型第二意見／救援（資料外送到外部模型） | 關（opt-in） |
| `ui-ux-pro-max` skill | UI 設計智慧；設計系統／設計生成範疇為**必要諮詢**（否則揭露回退） | 已安裝即用 |
| `design.md`（專案設計契約） | 專案設計語言的 committed 契約；`ui-ux-reviewer` 對它審 UI 一致性；`planner-creator` 偵測/建議,並可從既有 UI 立基 | 存在則用（否則走 baseline） |
| Claude in Chrome（`mcp__Claude_in_Chrome__*`；替代 `mcp__Claude_Preview__*` / `mcp__playwright__*`） | 真實瀏覽器佐證；`--deep` + UI 時必要。**會驅動你的真實已登入瀏覽器**——可能曝露 secret/PII；請用非正式環境目標 | 已接上即用 |
| `/run` 技能（姊妹技能） | `--deep` 時,App（網頁或後端/API）還沒在跑就把它啟動起來供驗證;udflow 委派到這裡而非硬寫啟動指令,且只收掉自己起的程序 | 有就用 |
| `output/udflow/`（消費端專案） | 保留的 run 產物：`evidence/` 截圖、`review/diff.patch`、`progress.md` ledger —— 建議 `.gitignore` | 按需建立 |
| `ai/FAILURE_MEMORY.md` / `~/.claude/FAILURE_MEMORY.md` | 開場 + planning 讀過往失敗教訓 | 按需建立 |

---

## 每次執行的成本

兩個很不同的數字 —— 來自我們自己的 run 的粗估（數量級,非保證）：

- **New tokens** —— 首次處理（input + cache 建立 + output）。反映真實工作量;以此為規劃基準。
- **Billable total**（`/cost`）—— *還*計入每代理每回合重讀的 cache-read → **約 new-token 的 20–30×**。但 cache-read 費率約為 input 的 ⅒,所以**金額其實貼近 new-token**,沒那個倍數嚇人。

| 任務（一次 run） | reviewer | New tokens | 牆鐘 |
|---|---|---|---|
| 輕 | `--lite` —— 僅核心 | ~0.5–2M | 幾分鐘 |
| 典型 | 3–5 個 + 一輪修復 | ~2–7M | ~5–15 分 |
| 深 | `--deep`、數輪修復 | >10M | 20–40 分 |

- **每次 run** = 一個 implement → review → fix → gate 週期。多增量功能會疊好幾次（我們自用一次完整 P0–P3：**~47M new / ~1B billable**,約 7 個週期 / ~94 個 subagent / 一天）。
- **驅動 ≈ context/repo 大小 × 回合數 × subagent 數。** `opus`、`--deep`、額外修復迴圈會放大；平行 reviewer 縮短牆鐘但不減 token。
- **可調** —— `--lite`（最省）、`--deep`（最深）、`--no-deep`；面板 + 成本層級會在 plan gate 講明、最終報告複述。`--report full` 把花費依計費元件拆開。

---

## 相容性

udflow 以 **Claude Code** 為目標;其 **subagents** 與 **skills** 也能在 **GitHub Copilot CLI** 載入（1.0.65 實機驗證 —— `plugin list`、`skill list`、列舉全部 subagent、hook 觀察到觸發）。**0.27.x** 的 hook 組已實機驗證可在 Copilot 1.0.65 **安裝並載入**：`copilot plugin update` 升到 v0.27.1 成功（「Updated 2 skills」）、兩個 skill 都列舉得到、壓縮保真 hook（`compact-fidelity.js`,自 0.27.3 改掛在 `SessionStart`·`compact` —— 由 `PreCompact` 搬遷而來,後者的注入輸出會被 Claude Code 拒絕）與已驗證的失敗記憶 `SessionStart` hook 同類載入；其注入輸出在 Copilot 下為 no-op（見下表）。跨 harness 載入依各工具有文件記載的 plugin 格式推得。

**Claude-Code 專屬**（在他處優雅降級——絕不報錯）：

| 功能 | 在 Copilot CLI 下 |
|---|---|
| 計劃閘門強制 | no-op（Copilot 無 `plan` permission mode） |
| 深度模式 Workflow | no-op（無 Workflow 能力） |
| 失敗記憶自動 digest | no-op —— Copilot 會跑 hook 但**不交付注入輸出**；降級為 planning 時手動讀取 |
| 壓縮保真（`SessionStart`·`compact`）hook | no-op —— 與 digest 同類：hook 會**載入**,但 Copilot 不送達 `SessionStart` 注入輸出;它 fail-open、絕不報錯。（在 Claude Code 上現在可運作 —— 0.27.3 由 `PreCompact` 搬遷而來,後者的注入輸出曾被 Claude Code 以驗證錯誤拒絕。）`output/udflow/progress.md` ledger 是連續性後備 |
| `UDFLOW_ENFORCE_STOP` 阻擋 | no-op（Stop 輸出不送達） |
| `destructive-guard` 確認 | **生效** —— PreToolUse 決策、非注入輸出（實機驗證：在 1.0.65 下擋下了 `git reset --hard`）。Windows 上 deny-list 也涵蓋模型會用的 PowerShell 形式 |

僅在 Copilot 停用：`~/.copilot/settings.json` 設 `{ "enabledPlugins": { "udflow@kktmarketplace": false } }`（或 `{ "disableAllHooks": true }`）。

---

## 專案狀態與貢獻

- **早期／實驗性、單人維護**（bus factor = 1）—— 有在真實工作 dogfood,但依賴它做發佈把關前請斟酌。Issue/PR 歡迎,回應盡力而為。
- **最有價值的貢獻：一次 verified run。** udflow **無遙測**,真實 run 要寫下來才算數——udflow 在真實 run 結尾會印出可貼上的 `Live run` 區塊。**→ [開一個「Verified udflow run」issue](https://github.com/simba6507/universal-dev-flow-plugin/issues/new?template=verified-run.yml)**（漏判與誤報也歡迎；先去敏感資訊）。見 [`CONTRIBUTING.md`](CONTRIBUTING.md) 與 [`EVIDENCE.md`](EVIDENCE.md)。
- **摘掉「實驗性」的門檻：** ≥10 次 verified run、跨 ≥3 個專案、其中 ≥1 次非維護者所為。

---

## 授權

[MIT](LICENSE) · 版本歷史見 [CHANGELOG.md](CHANGELOG.md)。
