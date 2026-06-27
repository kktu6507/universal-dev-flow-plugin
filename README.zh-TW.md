# udflow — Universal Dev Flow（Claude Code plugin）

[![Validate](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

[English](README.md) · **繁體中文**

**Claude Code 的「計劃閘門、風險比例」程式審查 + 上線把關工作流。**

> 不是拿來抓錯字的。當「做完」必須等於「可以上線」時，才用 udflow。

```text
任務
  ↓
理解需求
  ↓
Plan mode —— 此時不動任何程式碼
  ↓
（高風險） 把計劃接地到程式碼 + 磨利意圖
  ↓
你核准
  ↓
最小安全實作
  ↓
Build / test / lint / 瀏覽器佐證
  ↓
依風險挑選的審查員
  ↓
Gatekeeper 裁決：READY / FIX REQUIRED / NOT READY
```

用於 Claude Code「不該自己宣稱完成」的非瑣碎工程工作。

> 一句話：讓 Claude 在改程式碼前先把計劃攤開給你核准，實作後由一組合適的審查員**對著你的意圖**把關、把問題自動修掉，最後給出「能不能交付」的裁決——而不是寫完就說「好了」。

> 🎬 **看真實跑一次：** [udflow-public-demo](https://github.com/simba6507/udflow-public-demo) —— 一次完整錄下的 `/udflow:run`，從計劃閘門、依風險挑選審查員到 gatekeeper 裁決，完整走一遍。

**它是什麼、不是什麼。** udflow 是**審查 + 上線把關工作流**，**不是抓蟲掃描器**。它**已被量測**的優勢（見 Evidence）是**近乎零誤報 + 流程紀律 + 上線把關**，**不是**「抓最多 bug」。它確實會抓到真實、程式碼裡看得到的缺陷，但請把它當成「低雜訊的審查員 + ship/no-ship 閘門」，而不是會找出每個 bug 的工具——窮盡式掃描請搭配 linter / 靜態分析 / 專門的深審。

> **狀態：early / experimental（早期/實驗性）。** hook 有測試；多代理編排是 prompt 驅動。跨語言基準（6 種語言、100+ 個真實 bug）顯示清楚的剖面：**全程近乎零誤報**（約 110 次審查只 ~1 個），而 recall **取決於你把改動的意圖講得多具體**——只給程式時約 30%，意圖到契約級時約 84%（真實 udflow 透過 Review Packet 把意圖交給審查員）。見下方 Evidence。請當成有紀律的鷹架，不是保證。

<details>
<summary><b>Evidence（實測筆記）</b> — 有量測、方向性、且對自身侷限誠實</summary>

把 udflow 的審查員**盲測**在 **6 種語言 / 多個外部 repo**（C#、JavaScript、Python、Java、Go、Rust，都與本 plugin 不同棧）真實歷史 bug 的「修復前」程式上。審查員只看到有問題的程式；再由中立 judge 拿已知修法評分。

**頭條數字（兩組控制變數的實驗 + 一次更大的自動化跑）：**

| 條件 | 抓到（hit） | 碰到 | 誤報 |
|---|---|---|---|
| 盲測、**不給意圖**（32 bug） | ~34% | ~50% | **0** |
| 盲測、**給契約級具體意圖**（同 32 bug） | ~84% | — | **0** |
| 自動化、**對 bug 全盲的原生意圖**（77 bug、12 repo） | ~29% | ~39% | **77 個只 1 個** |

- **不分條件、最穩的強項是精準。** 約 110 次盲審只有**約 1 個誤報**。udflow 不亂叫——它說 major/blocker 時幾乎都是真的。
- **recall 取決於你給的「意圖」，以及意圖多具體。** 只給程式時，它抓得到程式碼裡看得到的缺陷（資源洩漏、欄位溢位、形同虛設的驗證器），但漏掉**語言慣用陷阱**（錯誤的 `this`/receiver、char-vs-byte、lifetime、overflow）與**遺漏型**（相對意圖少做了什麼）。加一段**具體**契約級意圖，就把同樣 32 個 bug 從 34% 拉到 84%——但更嚴格的盲測（意圖只來自函式自身 docs）分數低很多，所以 **84% 是樂觀上限**，需要契約級的具體意圖。真實使用落在中間，取決於你 Review Packet 的品質。
- **沒抓到的都去哪了（77-bug 語料）：** 遺漏型 36%（最大缺口）· 抓到**別的**真 bug 18%（現實價值高於 hit 率）· 語言慣用 16% · 抓到卻被低估 15% · 需外部 spec 15%。後兩項催生了 v0.9.2 兩個 gatekeeper 修正（依衝擊重評嚴重度；行為改動要有邊界測試）。細微的慣用/spec 缺陷是任何靜態審查的真天花板。

**侷限：** bug 多取自 `fix` commits；並行/整合型幾乎沒測；許多跑是單一審查員、沒給 plan 脈絡——這些都**低估**完整 udflow 流程（panel + 意圖 + 驗證）。完整方法、逐次結果與所有誠實的「自我修正」全記在 [`EVIDENCE.md`](EVIDENCE.md)（手動 log——udflow **不含任何遙測**）。「experimental」標籤會掛到 log 累積夠多「有標準答案」的 run 為止；覆蓋條件已達標，但 recall 取決於意圖、強主張是精準，所以誠實的標籤是「有定性的 early/beta」——**方向性，非保證。**

</details>

---

## 快速開始

前置需求：已安裝 **Claude Code**，且 `node --version` 要能跑（hook 是 Node 腳本——PATH 上沒 Node 就靜默不做事）。

**1. 🪟 在終端機進到專案並啟動 Claude Code**

    cd path/to/your-project
    claude

**2. 🤖 在 Claude Code 裡安裝 + 啟用**

    /plugin marketplace add simba6507/universal-dev-flow-plugin
    /plugin install udflow@kktmarketplace

udflow 是 **opt-in 出貨（預設停用）**，所以只安裝還不夠——必須啟用。開 `/plugin` → **Installed** 把 `udflow` 切開（或執行 `claude plugin enable udflow@kktmarketplace`），再 reload：

    /reload-plugins

> marketplace 名稱是 `kktmarketplace`（不是 repo 名），所以安裝是 `udflow@kktmarketplace`。
> **安裝 ≠ 啟用。** 因為是 opt-in，外掛在你於 `/plugin` 啟用前，hooks 與 skills 都不會運作。

**3. 🤖 交付任務**

    /udflow:run Fix the login flow so it refreshes when the token expires

也可以直接用自然語言描述任務，udflow 判斷是非瑣碎工程工作時會自動接手。

> **小事它會自動讓路。** udflow 只在「非瑣碎工程工作」時介入；瑣碎修改與純問答不會被打擾。想對任何任務強制走完整流程？用 `/udflow:run`。

### 更新到新版本

已經裝了舊版？刷新 marketplace 再 reload 即可，不必移除重裝：

    /plugin marketplace update kktmarketplace
    /reload-plugins

自訂 marketplace **不會**自動更新，所以要手動跑 `marketplace update`。可在 `/plugin` 確認已安裝的版本。

### 疑難排解

- **安裝失敗 / 找不到 plugin** — marketplace 名稱是 **`kktmarketplace`**、不是 repo 名，所以安裝 id 是 **`udflow@kktmarketplace`**（不是 `udflow@universal-dev-flow-plugin`）。用 `/plugin marketplace list` 確認。Claude Code 自己那句「找不到」訊息是內建的、plugin 無法改，所以這個命名落差就是最常見的原因。
- **計劃閘門真的有在運作嗎？** 進 plan mode 叫 Claude 改一個檔——應該被擋並顯示「udflow plan gate」訊息；若沒擋，代表 hook 未觸發（見下一條）。
- **計劃閘門擋到你不想擋的專案？** 在該專案的 `.claude/settings.json` 設 `"udflow": { "planGate": false }` 即可關閉；其他專案照常生效。
- **好像沒反應 / 閘門從不擋** — 檢查 `node --version`。PATH 上沒有 Node 時 hook 會靜默 no-op。要看細節，設 `UDFLOW_HOOK_DEBUG=1` 讓 hook 寫 trace（stderr / 暫存檔）；未設時保持安靜。
- **opus 不可用** — `security-reviewer` 與 `gatekeeper` 會退回可用模型並在輸出中聲明；裁決信心可能較低。
- **failure memory 出現在不相關的專案?** 沒有專案層 `ai/FAILURE_MEMORY.md` 時，udflow 會退回全域 `~/.claude/FAILURE_MEMORY.md` 並把摘要注入**每個** session——這是預期行為（全域教訓跟著你走）。想限定在單一專案，放一個專案層 `ai/FAILURE_MEMORY.md`；想完全停用，移除全域檔。注入內容包在每次執行的 nonce 圍欄內、中和角色標記、並標記為不可信參考資料，把 repo 的 memory 檔被當成指令的風險壓到很低——縱深防禦，而非絕對保證。

---

## 範例：一次大概長怎樣

假設你說：「幫我在登入頁加一個『記住我』的勾選框。」udflow 會這樣陪你走：

```
你> /udflow:run Add a "Remember me" checkbox to the login page

udflow> [理解] 重述需求：在登入表單加一個會被記住的「記住我」選項。
        釐清：session 要記住多久？→ 以 AskUserQuestion 詢問。
你> 30 天。

udflow> [計劃 / plan mode]（唯讀 —— 此時不動任何檔案）
        - 影響：登入表單元件 + auth/session 模組
        - 做法：加勾選框 → 送出時若勾選，改用較長效期的 session
        - 驗證：auth 單元測試 + 開畫面確認勾選框可用
        透過 ExitPlanMode 呈現計劃，等你核准。
你> 核准

udflow> [實作] implementer 依計劃做最小變更。
        [驗證] 跑測試/lint；對「未勾選 + 勾選」兩條路徑都跑過，確認 session 真的被記住。
        [審查] 風險在 UI + 認證行為 → spec / test / ui-ux（+ security）。
        [發現] test：缺「未勾選的預設行為」測試（major）。
        [修復迴圈] 補上測試 → 重跑相關審查員 → 全數通過。
        [gatekeeper] READY：需求達成、行為已驗證、兩條路徑都有測試覆蓋。
```

三個你最該記住的重點：
- **核准前不動你的檔案** —— 計劃你說了算。
- **審查員是按需要挑的** —— 不會每次都把全部都叫出來。
- **有問題會自己修再複查** —— 直到判定 `READY` 或明確卡住為止。

---

## 你在意什麼（安裝代價）

- **比一般對話更耗 token。** 一次任務會 spawn `implementer`、依風險挑選的審查員與 `gatekeeper`（其中兩個跑 `opus`）。一次任務（實作 → 審查 → 修復 → 收口）通常是數分鐘、數百萬個「實際處理」的 token（首次處理量）；你在 `/cost` 看到的數字會大得多，因為每個 agent 每一回合都會重讀被快取的 context。簡單任務更少；多增量功能會疊好幾次 run。完整說明見 [每次執行的粗估](#每次執行的粗估)。
- **四個常駐 hook，平常工作時隱形** —— plan mode 寫檔閘門、全模式破壞性指令守衛（在 `rm -rf` / `git reset --hard` / force-push 之類前先詢問）、開場注入失敗記憶、收尾的編排檢查。只要 plugin **啟用**著就在*每一個* session 跑（非僅 udflow 任務；只安裝不啟用不會做事）；沒 Node 就 no-op。細節見 [計劃閘門](#計劃閘門) 與 [失敗記憶](#失敗記憶)。
- **它會寫失敗記憶檔** —— repo 內 `ai/FAILURE_MEMORY.md`、家目錄 `~/.claude/FAILURE_MEMORY.md`（專案那份要 commit 還是加進 `.gitignore` 由你）。
- **外部模型預設關閉，要你開才用** —— Codex 與 MCP 都是 opt-in；否則 udflow standalone 運作並揭露任何缺口。
- **它會自己介入——你也能讓它停。** 遇到非瑣碎工程工作會自動接手；想「只用手動」，平常別用自然語言描述工程任務、要用時才打 `/udflow:run`。修復迴圈有硬上限（同 blocker 連兩輪即 Stuck Summary），升級到更深/opus-heavy 之前會先問你。

---

## 選項與 opt-in 總覽

把每個旋鈕集中在一處——它做什麼、衝擊（成本 / 品質 / 行為）、預設值。所有東西**預設關閉 / 依風險比例**，要你才 opt in。詳細章節以連結代替重複。

### 啟用 / 停用

| 選項 | 用途 | 衝擊 | 預設 |
|------|------|------|------|
| 在 `/plugin` 啟用（或 `claude plugin enable udflow@kktmarketplace`） | plugin 以 `defaultEnabled: false` 出貨；只安裝不會做事，要啟用才生效 | 把 hooks + skills 打開 | **停用** |
| 專案 `.claude/settings.json` 設 `"udflow": { "planGate": false }` | 讓此專案 opt-out plan mode 寫檔閘門（見 [計劃閘門](#計劃閘門)） | 行為：僅此專案在 plan mode 的改檔不再被擋 | 閘門**開啟**（缺失/壞掉 → 開啟，fail-safe） |
| 專案 `.claude/settings.json` 設 `"udflow": { "destructiveGuard": false }` | 讓此專案 opt-out 全模式破壞性指令守衛（見 [元件](#元件)） | 行為：`rm -rf` / `git reset --hard` / `git push --force` 等在此專案不再跳出確認 | 守衛**開啟**（會詢問；缺失/壞掉 → 開啟，fail-safe） |
| `~/.copilot/settings.json` 設 `{ "enabledPlugins": { "udflow@kktmarketplace": false } }` | **僅在 GitHub Copilot CLI** 停用 udflow，不影響 Claude Code（見 [相容性](#相容性)） | 行為：udflow 在 Copilot CLI 關閉 | 已安裝即啟用 |
| `~/.copilot/settings.json` 設 `{ "disableAllHooks": true }` | 在 Copilot CLI 關閉**所有** plugin hook | 行為：該處所有 plugin hook 關閉 | hook 開啟 |

### 執行旗標 —— `/udflow:run <flags> <task>`

| 旗標 | 用途 | 衝擊 | 預設 |
|------|------|------|------|
| `--deep`（也可 `deep:` / `ultra:`） | Tier-2 深度模式：對 blocker/major 加對抗式驗證 + 最高 reasoning effort；`--deep` + UI 時還會透過 Claude in Chrome extension 驅動**真實瀏覽器取證**（見 [深度模式](#深度模式)） | ↑ 最難改動的 recall / ↑↑ 成本 + 耗時 | 關閉（具 Workflow 能力時，Tier-1 deterministic 強制仍會在高風險工作自動啟用） |
| `--no-deep` / `--shallow` | Opt out Tier-1 deterministic 強制 | 行為：panel 仍會跑，但改為模型編排而非 graph 強制 | 高風險工作 Tier-1 自動啟用 |
| `--lite` | 最小充分 panel + 跳過深度模式 | ↓ 成本 / 揭露的 recall 取捨；若有高風險訊號保留一個直接相關的 safety reviewer | 關閉（panel 依風險比例） |
| `--report full` | 輸出詳細最終報告（逐 agent 活動、Files Changed、完整成本表 + 占比 bar、Assumptions / Missing-Tests / Risks 表格）；成本表把 token 拆成逐項 **Input / Output / Cache-write / Cache-read**，並內嵌變更畫面的 after 截圖 | 輸出：更多 output token；分析本身不變 | 關閉（預設為精簡報告） |

### 環境變數

| 變數 | 用途 | 衝擊 | 預設 |
|------|------|------|------|
| `UDFLOW_HOOK_DEBUG=1` | 讓 hook 寫 trace（stderr / 暫存檔）以利除錯 | 行為：僅診斷輸出 | 未設（安靜） |
| `UDFLOW_ENFORCE_STOP=1` | 把 Stop hook 的「裁決被無視」提示升級為硬**阻擋**——僅當同時存在真實的 gatekeeper 阻擋裁決**與**明確的 `udflow:delivery=shipped`（永不靠 prose）；模型仍可用 `udflow:delivery=held` 誠實 hold | 行為：阻擋性裁決可閘住 session 結束 | 未設（僅提示） |

### 選用的外部能力（Detect → Use → Else-Disclose）

全部**預設關閉**，有才用；沒有則揭露缺口（見 [選用的外部能力](#選用的外部能力detect--use--else-disclose)）。

| 能力 | 用途 | 衝擊 | 預設 |
|------|------|------|------|
| 每位審查員的 MCP（`udflow/.mcp.json`；範本 `udflow/mcp.example.json`） | 給審查員唯讀 MCP 工具 | 品質：接上處可更深入檢查；啟用時 context 成本高 | 關閉（空的 `.mcp.json`） |
| Codex（跨模型第二意見 / 救援） | 第二個模型的審查或救援 pass | 品質：獨立視角；資料外送到外部模型 | 關閉（opt-in） |
| `ui-ux-pro-max` skill | UI 工作的設計智慧（styles、palettes、font pairings、UX）；**設計系統 / 設計生成範疇時為必要諮詢**（否則揭露回退） | 品質：有它時 UI 設計更好；否則用內建 baseline | 已安裝即使用 |
| Claude in Chrome extension（`mcp__Claude_in_Chrome__*`；替代源 `mcp__Claude_Preview__*` / `mcp__playwright__*`） | UI 驗證的真實瀏覽器取證——`--deep` + UI 時為必要（Detect → Use → Else-Disclose） | 品質：有它時可真實導覽 + 變更狀態截圖；否則為揭露的缺口。**會驅動你的真實已登入瀏覽器——讀取/截圖可能曝露 secrets/PII；請用非正式環境目標，勿把含敏感畫面的 `--report full` 貼到公開 PR** | 已接上即使用 |
| `output/udflow/evidence/`（消費端專案） | `--deep` / `--report full` 存放報告引用的變更畫面截圖之處 | 行為：保留的證據檔；建議你 `.gitignore` 它 | 無（按需建立） |

### udflow 會讀的檔（建立檔案即 opt-in）

| 檔案 | 用途 | 衝擊 | 預設 |
|------|------|------|------|
| `ai/FAILURE_MEMORY.md`（專案）/ `~/.claude/FAILURE_MEMORY.md`（全域） | 開場與 planning 階段讀過去的失敗教訓（見 [失敗記憶](#失敗記憶)） | 品質：相關教訓浮現；沒檔就什麼都不做 | 無（按需建立） |
| `~/.claude/settings.json` 或 `.claude/settings.json` 的預設 plan mode | 每個 session 都有的硬性計劃閘門保證（見 [計劃閘門](#計劃閘門)） | 行為：plan gate 永遠強制 | 未設（udflow 自行驅動 plan mode，不強制） |

---

## 運作流程

```
理解需求 → 規劃（plan mode） → 你核准 → 實作 → 驗證 → 選擇性審查 → gatekeeper 裁決
                                                          ↑________ 修復迴圈 ________↓
```

- **理解 / 規劃**在 plan mode（唯讀）進行，規劃結果用 ExitPlanMode 呈現給你核准。對**高風險 / 正確性關鍵**的工作，在核准前 udflow 會先把計劃接地到程式碼現實、把需求磨利成契約級意圖加上邊界輸入清單（見 [計劃接地](#計劃接地高風險)）——用來輔助你的核准，而非取代它。
- **核准後**才會交給 `implementer` 寫程式。
- **驗證**跑 build / test / lint / typecheck / 瀏覽器佐證等適用檢查——並且要**實際跑過改動的高風險邊界輸入**（空 / 溢位 / 多位元組 / 重複 / 畸形 / by-value / 並行），因為「真的跑過的邊界」是讀程式所缺的那把對照尺。
- **審查**只挑與本次風險相關的審查員（不為儀式硬湊），並**對著改動的意圖**審（意圖越具體、抓得越多）。
- **gatekeeper** 彙整 findings、**依真實衝擊重評每一個**（被證明會出錯/crash/違反契約的不會留在「minor」）、把行為改動「缺邊界測試」視為驗證缺口，然後給出 `READY` / `FIX REQUIRED` / `NOT READY`；若需修復則進入修復迴圈，直到就緒或明確受阻。

---

## 元件

plugin 本體位於 [`udflow/`](udflow/) 子目錄（只有這個子目錄會被安裝；`test/`、`.github/`、`package.json` 留在 repo 根、不隨包出貨）。

- `udflow/skills/universal-dev-flow/` — 自動觸發的編排器（含 `references/`）。
- `udflow/skills/run/` — 手動入口：`/udflow:run <task>`。
- `udflow/agents/` — 9 個 subagent：`implementer`（可寫）+ 7 個檢查型審查員 + `gatekeeper`。審查員與 gatekeeper 拿 `Read`/`Grep`/`Glob`/`Bash`（Bash 僅供檢查——`git diff`、`rg`、跑檢查），但**沒有** editor 工具（`Write`/`Edit`/`MultiEdit`）；它們以角色與指示約束為非改動，而非 sandbox 強制。其中 `security-reviewer` 與 `gatekeeper` 跑 `opus`，其餘沿用當前 session 模型。
- `udflow/hooks/` — 四個 Node hook（Windows、macOS、Linux 行為一致，全部 fail-open）：
  - `plan-gate.js`（PreToolUse）—— plan mode 期間擋結構化編輯，並對*明顯的* Bash 寫入觸發；放行 `~/.claude/plans/` 的 plan 檔。
  - `destructive-guard.js`（PreToolUse）—— 在**所有**模式下，對一組窄而高信心的不可復原 Bash 指令（`git reset --hard`、`git push --force`、`rm -rf`、`find -delete`、`dd of=`、`mkfs`、`shred`）要求確認（永不硬擋）；可逐專案用 `"udflow": { "destructiveGuard": false }` opt-out。
  - `load-failure-memory.js`（SessionStart）—— 注入失敗記憶摘要。
  - `orchestration-check.js`（Stop）—— 盡力而為、預設僅提示：若宣稱 `READY` 但核心審查 panel 沒完整跑就提醒，**或**當 gatekeeper 最後的裁決是 `FIX REQUIRED`/`NOT READY`、session 卻以「已完成」收尾（裁決被無視）時提醒，**或**當 verification 哨符 `udflow:verify=` 顯示某個 required check 失敗/未跑、session 卻仍在交付時提醒。預設僅為提示——Stop hook 無法阻擋交付，除非你用 `UDFLOW_ENFORCE_STOP` opt-in（此時僅最高信心、基於 sentinel 的「裁決被無視」訊號會升級為阻擋）。
- `udflow/.mcp.json` — 預設為空（零 context 成本）。`udflow/mcp.example.json` 是可複製套用的範本。

### Hooks —— 安全聲明

給安全審查者或謹慎使用者，把完整足跡集中講清楚：

- **Opt-in 出貨。** plugin 以 `defaultEnabled: false` 出貨——只安裝**不會做任何事**，要你在 `/plugin` 明確啟用後才生效。
- **純本地、不連網。** 這些 hook **不做任何網路呼叫**、不把任何東西送出你的機器——只用 Node 內建的 `fs` / `os` / `path` / `crypto`，不開子行程、不執行任何下載來的程式碼。
- **Fail-open。** 遇到任何錯誤時，hook 會自己捕捉並 exit 0、什麼都不做。而 PATH 上若沒有 Node，hook 程序根本不會啟動；Claude Code 會把 hook 啟動失敗視為非致命、繼續執行 session。兩種情況都不會擋下任何事，session 也弄不壞。
- **各自能做什麼：** `plan-gate` 只在你**處於 plan mode 時**能*擋下* Write/Edit/明顯的 Bash 寫檔（可逐專案用 `"udflow": { "planGate": false }` opt-out）；`destructive-guard` 可在**任何**模式下對一組窄的不可復原 Bash 指令（`rm -rf`、`git reset --hard`、force-push、`mkfs`…）*請你確認*（永不硬擋；可逐專案用 `"udflow": { "destructiveGuard": false }` opt-out）——盡力而為，混淆形式（interpreter 一行式、字內單引號）可能漏接；`load-failure-memory` 只*讀取*你本地的 `FAILURE_MEMORY.md`，把經 nonce 圍欄與 role-marker 中和的摘要注入你自己的 session；`orchestration-check` 只在 session 收尾*發出提示訊息*（且**僅當你設了 `UDFLOW_ENFORCE_STOP`**，才會對最高信心的「裁決被無視」訊號*阻擋* session 結束）。
- **它們絕不會：** 改系統或安全設定、改檔案權限、刪任何東西（`destructive-guard` 只會在你自己的刪除/抹除指令前*先詢問*——它本身不刪任何東西），或把你的程式碼或 transcript 傳到任何地方。

### 9 個 subagent

| Agent | 角色 | 何時加入 | 模型 |
|-------|------|----------|------|
| `implementer` | 實作最小安全變更，不自我認證 | 計劃核准後 | inherit |
| `spec-reviewer` | 需求/業務規則/契約是否吻合 | 核心，非瑣碎工作必開 | inherit |
| `test-reviewer` | 缺測試、弱驗證、回歸風險、邊界 | 核心，非瑣碎工作必開 | inherit |
| `code-reviewer` | 本地實作品質、可維護性、框架用法、效率 | 有非瑣碎程式碼變更時 | inherit |
| `security-reviewer` | 驗證/授權、輸入處理、機密、信任邊界 | 有安全風險時 | opus |
| `architecture-reviewer` | 分層、邊界、依賴方向、結構放置 | 有結構/邊界疑慮時 | inherit |
| `operability-reviewer` | 可觀測性、重試/逾時、部署、回滾 | 影響執行期/上線行為時 | inherit |
| `ui-ux-reviewer` | 可用性、互動、版面、狀態、無障礙 | 有 UI 影響時 | inherit |
| `gatekeeper` | 彙整、依衝擊重評嚴重度、裁決：READY / FIX REQUIRED / NOT READY | 選定審查員跑完後 | opus |

對「正確性關鍵」的路徑（parsing、數值/編碼/溢位、並行、安全、資料完整性），udflow 會**用至少兩個獨立審查視角**而非單一審查員——基準顯示第二個視角能救回第一個合理化掉的缺陷。

---

## 進階

### 計劃閘門

唯讀強制來自一個 hook，**只有在 plan mode 時才觸發**。udflow 會自行為其規劃階段進入 Claude Code 原生 plan mode，所以即使你預設模式非 plan，閘門仍生效。若 runtime 無法程式化切換，udflow 以自律唯讀進行並**揭露**本次 hook 未強制；要每個 session 都有硬保證，請在 `~/.claude/settings.json` 或專案的 `.claude/settings.json` 設預設 plan mode（本 plugin 不會強制設定）。

```
你> 幫我在結帳頁加一個優惠碼欄位
udflow> [進入 plan mode] 嘗試改 checkout.tsx → ✗ 被擋（「udflow plan gate」）
        → 改成只規劃，透過 ExitPlanMode 把計劃給你看
你> 核准
udflow> [離開 plan mode] 現在才真的改 checkout.tsx ✓
```

兩個誠實的邊界：
- **它是全域的——但專案可以選擇關閉。** plugin 啟用時，hook 在每個 session 都跑，所以就算你在一個**跟 udflow 無關的專案**進了 plan mode，那邊的改檔也會被擋（它不知道「這次」是不是 udflow 任務）。要對某個專案關掉計劃閘門，在該專案的 `.claude/settings.json`（或優先的 `.claude/settings.local.json`）設 `"udflow": { "planGate": false }`；其他專案照常生效。設定缺失或壞掉時閘門**維持開啟**（fail-safe），所以壞掉的設定不會悄悄把防護拿掉。
- **Bash 只擋一部分。** hook 會擋結構化編輯工具，以及*明顯的* Bash 寫入（`>`/`>>` 到檔、`tee`、`sed -i`、`perl -i`、`truncate`、`dd of=`、`ln`、`git apply`），但刻意放行唯讀 Bash，也擋不到非明顯寫入——尤其是直譯器一行式（`node -e "fs.writeFileSync(...)"`、`python -c "open(...,'w')"`）與 `xargs` 驅動的寫入。把這個 tripwire 當安全網、而非保證——udflow 規則仍禁止規劃期間用任何 Bash 改工作樹，真正的硬保證是在 settings 設定預設 plan mode。

### 計劃接地（高風險）

在請你核准計劃前，對**高風險或正確性關鍵**的工作，udflow 會多跑一個唯讀步驟（見 [`plan-grounding.md`](udflow/skills/universal-dev-flow/references/plan-grounding.md)）：把計劃**接地**到程式碼現實（一次唯讀探勘——真實的 call sites、既有的邊界處理），並把需求**磨利**成契約級意圖加上這次改動隱含的邊界輸入清單。磨利後的契約灌進 Review Packet（已量測的 recall 槓桿）、邊界清單灌進驗證閘門、任何產品歧義以 AskUserQuestion 浮現——讓你在資訊完整下核准。它**輔助**核准、不取代核准；加的是深度、不是更多審查員；低/中風險會跳過。沒有探勘 subagent 時退回本地接地並揭露缺口。

### 驗證閘門

在任何「就緒」宣稱之前，udflow 先跑最窄而有意義的檢查（build / test / lint / typecheck、UI 的瀏覽器佐證）。對行為改動，它會**要求一個聚焦測試去跑改動的高風險邊界輸入**——空 / 零 / 溢位 / 大、多位元組、null / 空 / 重複 / 多值、畸形、by-value vs receiver、並行——因為一個重現邊界的測試，才抓得到讀程式會被當成「看起來沒事」放過的慣用/編碼/溢位/遺漏型 bug。`gatekeeper` 會把「缺邊界測試」視為驗證缺口、不給 `READY`。它也會輸出結構化的逐項 rollup——`udflow:verify=pass|fail|unrun|na`——並以**真實命令 exit status 為權威、凌駕審查員觀感**（紅燈或未跑的 required check，不論審查多乾淨都擋 `READY`），並在實質任務收尾時給一份使用者可見的**最終報告**——verdict、checks、acceptance、reviewers、findings、剩餘項與近似成本——最後收在機器可讀的 `udflow:verify=`／`udflow:delivery=` footer。非瑣碎工作還會把需求轉成一份簡短的 **acceptance criteria** 清單、由你在 plan gate 核可，`gatekeeper` 再逐條檢查——任一未達成且未 deferred 的條目就擋 `READY`（最深的 release 訊號不是「沒 bug」，而是*做到了你要的、且被確認*）。對瀏覽器可見的 UI 改動，閘門會擷取真實瀏覽器佐證；在 `--deep` + UI 在 scope 時，透過 Claude in Chrome extension 驅動真實瀏覽器是**必要**驗證步驟（Detect → Use → Else-Disclose——瀏覽器不可用是揭露的缺口，絕不 error），且只取有變更的 after 截圖、保留在 `output/udflow/evidence/`（建議你 `.gitignore` 它）。這份報告**預設精簡**（summary、checks、acceptance、findings、一行成本摘要、verdict）；`--report full` 才展開成——用表格列出每個 agent 做了什麼／發現什麼／修了什麼、需求→改動→效果的對照、逐 agent 的 **token 與成本分項**（拆成 **Input / Output / Cache-write / Cache-read**）加總計與粗略金額（無 telemetry：subagent 為實測、orchestrator 與金額為估算），以及每個變更 UI 狀態的最終 after 截圖，並用狀態 glyph 與 inline token 占比 bar。

### 失敗記憶

udflow 把「讓原訂做法受阻、中斷或被迫修復的執行異常」記成純文字 Markdown，讓未來 session 一開始就讀過去的教訓。用兩個檔（擇一或並用）：專案 `ai/FAILURE_MEMORY.md`、全域 `~/.claude/FAILURE_MEMORY.md`。

- **開場摘要（自動）。** SessionStart hook 注入一份精煉摘要（每條**標題 + tags**，最新優先、有上限——prevention rule 改在 planning 階段按需讀取，不注入）——專案優先 → 全域備援。它是索引、不是整檔；注入內容以「不可信參考資料」圍欄包住。（沒有 `###` 條目的非結構化檔則退回注入其原始內容，經 role-marker 中和並圍欄包住——盡力而為的界線。）沒檔就什麼都不做。
- **精準檢索（planning 階段）。** 工作流依本次受影響的檔案/領域/語言/`Tags` 取出相關完整條目——只浮現相關教訓。
- **寫入**依教訓性質分流（專案專屬寫專案、跨專案寫全域、皆有則兩邊都寫），且寫前一律先重讀全域檔以合併而非重複，並由**單一寫入者**（主線程/`gatekeeper`）執行以避免並發損毀。檔案大小靠整理（consolidation）控管，非靠截斷。範例見 [`udflow/examples/FAILURE_MEMORY.sample.md`](udflow/examples/FAILURE_MEMORY.sample.md)。

### 深度模式

udflow 的 deterministic Workflow 分兩層：

- **Tier 1 —— 強制（可能自動啟用）。** 對**高風險 / 正確性關鍵**的工作，當你的 session 具備 Workflow/ultracode 能力時，udflow 會把**同一組**選定審查員與 gatekeeper 以 deterministic Workflow 執行——讓 panel **真的**跑、gatekeeper 只在其後跑，而非仰賴模型自行編排。同審查員、同 effort，所以成本 ≈ 一般 run。它是 **opt-out**：加 `--no-deep`（或 `--shallow`），或單純在沒有該能力的 session 執行即可。
- **Tier 2 —— 更深驗證（opt-in）。** 在任務前加 `--deep`（例如 `/udflow:run --deep <task>`）以**額外**對 blocker/major 加對抗驗證、並把最高槓桿的 agent 升到最高 effort。當 UI 在 scope 時，它也讓**真實瀏覽器取證**成為必要驗證步驟——主線程驅動真實瀏覽器（Claude in Chrome）並對每個變更 UI 狀態截圖；瀏覽器不可用是揭露的缺口，絕不 error。這會拉高 token/耗時，所以維持明確 opt-in。

**深度，不是加更多審查員**——兩層的審查員*選擇*完全相同。誠實邊界：deterministic 保證只存在於**具 Workflow 能力的 session**；沒有該能力時 panel 仍會跑，但是模型編排（udflow 會揭露）。絕不硬依賴。

### 每次執行的粗估

我們自己跑出來的經驗值——差異很大，取決於任務規模、風險、repo 大小、修復輪數；請當數量級參考，非保證值。有兩個差很多的數字要分清楚：

- **新 token**：首次被處理的 token（input + cache 建立 + output）。它反映實際工作量，是規劃時該看的穩定數字。
- **計費總量**：`/cost` 加總的數字。它**還會**把 cache-read 算進去——被快取的 context 在**每個 agent 的每一回合**都重複貢獻一次，所以大約是**新 token 的 20–30 倍**（且隨 repo 大小與回合數成長）。但 cache-read 的計價大約只有 input 的十分之一，所以實際花費比這 20–30 倍更貼近「新 token」那個數字。

`--report full` 會把成本表依計費元件拆成——**Input / Output / Cache-write / Cache-read**——因為它們計價不同，讓你看清花費實際落在哪。

| 任務（單次 run） | 審查員 | 新 token | 實際耗時 |
|------|--------|----------|----------|
| 輕量 | `--lite`——只開核心 | 約 50–200 萬 | 數分鐘 |
| 一般 | 3–5 個 + 一輪修復 | 約 200–700 萬 | 約 5–15 分鐘 |
| 深度 | `--deep`、多輪修復 | 破 1000 萬 | 20–40 分鐘 |

這張表是**單次 run**——一次 `/udflow:run` 走完實作 → 審查 → 修復 → 收口。多增量功能會疊好幾次 run：我們自己一個完整 P0–P3 建置，跨約 7 次收口週期、約 94 個 subagent、約一天，總共約 **4,700 萬新 token / 約 10 億計費 token**。

成本主因：**≈ context/repo 大小 × 回合數 × subagent 數量。** `opus` 審查員、`--deep`、多輪修復都會再乘上去；審查員並行能縮短耗時，但不會減少 token 量。

**可調。** 成本預設依風險比例；可用 `--lite`（強制最小 panel + 跳過昂貴的 deep tier，主要給低風險小改動——若有高風險訊號仍保留並揭露那個直接相關的 safety reviewer）、`--deep`（對抗式驗證 + 最大 effort）、`--no-deep`（退出 deterministic Workflow）調整。選定的 panel + 成本 tier 會在 plan gate 事先攤開、並於最終報告重述，讓你在核可前看清這次大概花多少、並能調整。

### 選用的外部能力（Detect → Use → Else-Disclose）

MCP 工具、外部 subagent、外部 skill 都是**選用**的。有就用、沒有就在本地完成並如實揭露缺口。

- **ui-ux-pro-max**：若已安裝，udflow 在 UI 設計決策會優先使用它；否則退回內建 baseline 並揭露。對**設計系統 / 設計生成範疇**（新畫面或全新元件族、視覺改版、design tokens、theming、品牌——沿用既有 tokens 的單一一次性元件維持小改），此諮詢在 planning 階段為**必要**——把它的 style / palette / font / UX 決策記入 plan，否則揭露回退（小 UI 改維持原軟 consult）。
- **Claude in Chrome**（真實瀏覽器取證）：有它時，udflow 會驅動真實瀏覽器做 UI 驗證（Detect → Use → Else-Disclose；`mcp__Claude_in_Chrome__*`，或 `mcp__Claude_Preview__*` / `mcp__playwright__*`）。由主線程驅動；審查員維持唯讀、只評估擷取到的證據。`--deep` + UI 時為必要；瀏覽器不可用是揭露的缺口，絕不 error。它驅動你的**真實已登入**瀏覽器並存截圖——讀取/截圖可能曝露 cookies/tokens/PII，請用非正式環境目標，且勿把含敏感畫面的 `--report full` 貼到公開 PR/issue。
- **每位審查員的 MCP** 與 **Codex**（跨模型第二意見 / 救援）都**預設關閉**、需 opt-in。它們的設定、唯讀的 MCP-對審查員對映、以及 Codex 的資料外送揭露都集中在 **[`docs/advanced/external-capabilities.md`](docs/advanced/external-capabilities.md)**（讀者指南）——udflow 自己遵循的運作規則則在出貨的 [`references/external-capabilities.md`](udflow/skills/universal-dev-flow/references/external-capabilities.md)。

---

## 相容性

udflow 以 **Claude Code** 為主要目標。自 0.20.0 起，它的 **subagents**（reviewer／`gatekeeper` 審查小組）也能在 **GitHub Copilot CLI** 下載入：agent 檔案改採 `*.agent.md` 命名慣例，並透過 `plugin.json` 的 `agents` 陣列明確接上——這是兩個 harness 都會讀取的 manifest 欄位。它的 **skills** 本來就採用 Copilot 同樣會探索的 `skills/<name>/SKILL.md` 結構，因此無需改動也應能在那裡載入。這項跨 harness 載入是依據兩個工具各自**有文件記載**的 plugin 格式推得，現已在 **GitHub Copilot CLI 1.0.65 實機 live 驗證**（2026-06-26）：`copilot plugin list` 顯示 `udflow@kktmarketplace (v0.23.0)`、`copilot skill list` 列出兩個 skill，且一次實機 `copilot -p` session 列舉出全部九個 subagent（`implementer` + 七個 reviewer + `gatekeeper`）；SessionStart 與 Stop 兩個 hook 經 hook-debug log 觀察到有觸發。（README 先前的 hook 可攜性宣稱*另有*單元測試——見 portability 測試套件。）

維持 **Claude Code 專屬**的是 **plan-gate 強制**與 **deep-mode Workflow**：Copilot 沒有 `plan` permission mode，因此 plan gate 沒有東西可強制，在那裡就單純 **no-op**。四個 hook（`plan-gate`、`destructive-guard`、`load-failure-memory`、`orchestration-check`）在執行時從環境解析 plugin root，並在任何以不同方式執行它們的 host 上**fail open**（放行、絕不報錯）——所以在 Copilot 下它們優雅降級，絕不會弄壞 session。一個已驗證的行為差異：Copilot CLI **會執行** hook，但**不會把 hook 注入的輸出交給模型**——`load-failure-memory` 的 SessionStart `additionalContext`（與 `orchestration-check` 的 Stop 諮詢）不會送達，所以**自動失敗記憶 digest 在 Copilot 下是 no-op**（hook 仍會執行、fail-open）；又因為 Stop 輸出同樣不會送達，opt-in 的 `UDFLOW_ENFORCE_STOP` 硬阻擋在那裡也是 no-op——**Stop 強制為 Claude Code 專屬**。（`destructive-guard` 是 PreToolUse 決策、非注入輸出，所以只要 harness 認得 PreToolUse `ask`，它的確認提示就會生效。）它降級為 workflow 既有的**手動**失敗記憶讀取（planning 時模型自己讀 `ai/FAILURE_MEMORY.md`），且就緒判定本就由 skill／模型驅動、不依賴 hook。

若只想在 GitHub Copilot CLI 停用 udflow（不影響 Claude Code），在 `~/.copilot/settings.json` 加入：

```json
{ "enabledPlugins": { "udflow@kktmarketplace": false } }
```

或用 `{ "disableAllHooks": true }` 關閉該處所有 plugin hook。

---

## 專案現況與維護

udflow 屬於 **early / experimental**，且為**單人維護**（一位作者、利用業餘時間）。它有在真實工作上 dogfood，但累積的紀錄還短、**巴士因子為一**——在你把它用於上線把關前請把這點納入評估。歡迎開 issue 與 PR，我也會看，但回應時間是盡力而為、非保證。最有價值的貢獻是一份 **[verified run 回報](.github/ISSUE_TEMPLATE/verified-run.yml)**——見 [`CONTRIBUTING.md`](CONTRIBUTING.md) 與 [`EVIDENCE.md`](EVIDENCE.md) 的證據 log。

### 貢獻一筆 verified run

udflow **不送任何 telemetry**，所以一次真實 run 只有「寫下來」才算數、才能推動拿掉 experimental 標籤。如果你拿它跑過真實工作，請加一筆：

**→ [開一個「Verified udflow run」issue](https://github.com/simba6507/universal-dev-flow-plugin/issues/new?template=verified-run.yml)** —— 表單對應證據範本；maintainer 會把採用的 run curate 進 [`EVIDENCE.md`](EVIDENCE.md)。

- **漏抓與誤報也要**，不是只收成功案例——誠實資料才是重點，也更可信。
- 先把私有程式碼與密鑰 sanitize；私有 repo 用「sanitized stack + outcome」即可。
- udflow 跑完真實任務會吐一段 paste-ready 的「Live run」區塊——貼進 `EVIDENCE.md`，或 issue 表單的 **Run details** 欄(表單另外只要選 run type、verdict、勾 reviewers)。

升版門檻寫在 [`EVIDENCE.md`](EVIDENCE.md)：**≥10 verified runs、跨 ≥3 專案、其中 ≥1 不是 maintainer 跑的。**

---

## 授權

[MIT](LICENSE) · 版本歷史見 [CHANGELOG.md](CHANGELOG.md)。
