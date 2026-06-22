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
- **failure memory 出現在不相關的專案?** 沒有專案層 `ai/FAILURE_MEMORY.md` 時，udflow 會退回全域 `~/.claude/FAILURE_MEMORY.md` 並把摘要注入**每個** session——這是預期行為（全域教訓跟著你走）。想限定在單一專案，放一個專案層 `ai/FAILURE_MEMORY.md`；想完全停用，移除全域檔。注入內容包在每次執行的 nonce 圍欄內並中和角色標記，repo 的 memory 檔無法被當成指令執行。

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
- **三個常駐 hook，平常工作時隱形** —— plan mode 寫檔閘門、開場注入失敗記憶、收尾的編排檢查。只要 plugin 裝著就在*每一個* session 跑（非僅 udflow 任務）；沒 Node 就 no-op。細節見 [計劃閘門](#計劃閘門) 與 [失敗記憶](#失敗記憶)。
- **它會寫失敗記憶檔** —— repo 內 `ai/FAILURE_MEMORY.md`、家目錄 `~/.claude/FAILURE_MEMORY.md`（專案那份要 commit 還是加進 `.gitignore` 由你）。
- **外部模型預設關閉，要你開才用** —— Codex 與 MCP 都是 opt-in；否則 udflow standalone 運作並揭露任何缺口。
- **它會自己介入——你也能讓它停。** 遇到非瑣碎工程工作會自動接手；想「只用手動」，平常別用自然語言描述工程任務、要用時才打 `/udflow:run`。修復迴圈有硬上限（同 blocker 連兩輪即 Stuck Summary），升級到更深/opus-heavy 之前會先問你。

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
- `udflow/agents/` — 9 個 subagent：`implementer`（可寫）+ 7 個唯讀審查員 + `gatekeeper`。其中 `security-reviewer` 與 `gatekeeper` 跑 `opus`，其餘沿用當前 session 模型。
- `udflow/hooks/` — 三個 Node hook（Windows、macOS、Linux 行為一致，全部 fail-open）：
  - `plan-gate.js`（PreToolUse）—— plan mode 期間擋結構化編輯，並對*明顯的* Bash 寫入觸發；放行 `~/.claude/plans/` 的 plan 檔。
  - `load-failure-memory.js`（SessionStart）—— 注入失敗記憶摘要。
  - `orchestration-check.js`（Stop）—— 盡力而為、非阻擋：若宣稱 `READY` 但核心審查 panel 沒完整跑就提醒，**或**當 gatekeeper 最後的裁決是 `FIX REQUIRED`/`NOT READY`、session 卻以「已完成」收尾（裁決被無視）時提醒。僅為提示——Stop hook 無法阻擋交付。
- `udflow/.mcp.json` — 預設為空（零 context 成本）。`udflow/mcp.example.json` 是可複製套用的範本。

### Hooks —— 安全聲明

給安全審查者或謹慎使用者，把完整足跡集中講清楚：

- **Opt-in 出貨。** plugin 以 `defaultEnabled: false` 出貨——只安裝**不會做任何事**，要你在 `/plugin` 明確啟用後才生效。
- **純本地、不連網。** 這些 hook **不做任何網路呼叫**、不把任何東西送出你的機器——只用 Node 內建的 `fs` / `os` / `path` / `crypto`，不開子行程、不執行任何下載來的程式碼。
- **Fail-open。** PATH 上沒有 Node、或遇到任何錯誤，每個 hook 都靜默 exit 0、什麼都不做——絕不會弄壞一個 session。
- **各自能做什麼：** `plan-gate` 只在你**處於 plan mode 時**能*擋下* Write/Edit/明顯的 Bash 寫檔（可逐專案用 `"udflow": { "planGate": false }` opt-out）；`load-failure-memory` 只*讀取*你本地的 `FAILURE_MEMORY.md`，把經 nonce 圍欄與 role-marker 中和的摘要注入你自己的 session；`orchestration-check` 只在 session 收尾*發出提示訊息*——絕不能阻擋交付。
- **它們絕不會：** 改系統或安全設定、改檔案權限、刪任何東西，或把你的程式碼或 transcript 傳到任何地方。

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
- **它是全域的——但專案可以選擇關閉。** hook 在每個 session 都跑，所以就算你在一個**跟 udflow 無關的專案**進了 plan mode，那邊的改檔也會被擋（它不知道「這次」是不是 udflow 任務）。要對某個專案關掉計劃閘門，在該專案的 `.claude/settings.json`（或優先的 `.claude/settings.local.json`）設 `"udflow": { "planGate": false }`；其他專案照常生效。設定缺失或壞掉時閘門**維持開啟**（fail-safe），所以壞掉的設定不會悄悄把防護拿掉。
- **Bash 只擋一部分。** hook 會擋結構化編輯工具，以及*明顯的* Bash 寫入（`>`/`>>` 到檔、`tee`、`sed -i`、`perl -i`、`truncate`、`dd of=`、`ln`、`git apply`），但刻意放行唯讀 Bash，也擋不到非明顯寫入——尤其是直譯器一行式（`node -e "fs.writeFileSync(...)"`、`python -c "open(...,'w')"`）與 `xargs` 驅動的寫入。把這個 tripwire 當安全網、而非保證——udflow 規則仍禁止規劃期間用任何 Bash 改工作樹，真正的硬保證是在 settings 設定預設 plan mode。

### 計劃接地（高風險）

在請你核准計劃前，對**高風險或正確性關鍵**的工作，udflow 會多跑一個唯讀步驟（見 [`plan-grounding.md`](udflow/skills/universal-dev-flow/references/plan-grounding.md)）：把計劃**接地**到程式碼現實（一次唯讀探勘——真實的 call sites、既有的邊界處理），並把需求**磨利**成契約級意圖加上這次改動隱含的邊界輸入清單。磨利後的契約灌進 Review Packet（已量測的 recall 槓桿）、邊界清單灌進驗證閘門、任何產品歧義以 AskUserQuestion 浮現——讓你在資訊完整下核准。它**輔助**核准、不取代核准；加的是深度、不是更多審查員；低/中風險會跳過。沒有探勘 subagent 時退回本地接地並揭露缺口。

### 驗證閘門

在任何「就緒」宣稱之前，udflow 先跑最窄而有意義的檢查（build / test / lint / typecheck、UI 的瀏覽器佐證）。對行為改動，它會**要求一個聚焦測試去跑改動的高風險邊界輸入**——空 / 零 / 溢位 / 大、多位元組、null / 空 / 重複 / 多值、畸形、by-value vs receiver、並行——因為一個重現邊界的測試，才抓得到讀程式會被當成「看起來沒事」放過的慣用/編碼/溢位/遺漏型 bug。`gatekeeper` 會把「缺邊界測試」視為驗證缺口、不給 `READY`。

### 失敗記憶

udflow 把「讓原訂做法受阻、中斷或被迫修復的執行異常」記成純文字 Markdown，讓未來 session 一開始就讀過去的教訓。用兩個檔（擇一或並用）：專案 `ai/FAILURE_MEMORY.md`、全域 `~/.claude/FAILURE_MEMORY.md`。

- **開場摘要（自動）。** SessionStart hook 注入一份精煉摘要（每條標題 + prevention rule + tags，最新優先、有上限）——專案優先 → 全域備援。它是索引、不是整檔；注入內容以「不可信參考資料」圍欄包住。沒檔就什麼都不做。
- **精準檢索（planning 階段）。** 工作流依本次受影響的檔案/領域/語言/`Tags` 取出相關完整條目——只浮現相關教訓。
- **寫入**依教訓性質分流（專案專屬寫專案、跨專案寫全域、皆有則兩邊都寫），且寫前一律先重讀全域檔以合併而非重複，並由**單一寫入者**（主線程/`gatekeeper`）執行以避免並發損毀。檔案大小靠整理（consolidation）控管，非靠截斷。範例見 [`udflow/examples/FAILURE_MEMORY.sample.md`](udflow/examples/FAILURE_MEMORY.sample.md)。

### 深度模式

udflow 的 deterministic Workflow 分兩層：

- **Tier 1 —— 強制（可能自動啟用）。** 對**高風險 / 正確性關鍵**的工作，當你的 session 具備 Workflow/ultracode 能力時，udflow 會把**同一組**選定審查員與 gatekeeper 以 deterministic Workflow 執行——讓 panel **真的**跑、gatekeeper 只在其後跑，而非仰賴模型自行編排。同審查員、同 effort，所以成本 ≈ 一般 run。它是 **opt-out**：加 `--no-deep`（或 `--shallow`），或單純在沒有該能力的 session 執行即可。
- **Tier 2 —— 更深驗證（opt-in）。** 在任務前加 `--deep`（例如 `/udflow:run --deep <task>`）以**額外**對 blocker/major 加對抗驗證、並把最高槓桿的 agent 升到最高 effort。這會拉高 token/耗時，所以維持明確 opt-in。

**深度，不是加更多審查員**——兩層的審查員*選擇*完全相同。誠實邊界：deterministic 保證只存在於**具 Workflow 能力的 session**；沒有該能力時 panel 仍會跑，但是模型編排（udflow 會揭露）。絕不硬依賴。

### 每次執行的粗估

我們自己跑出來的經驗值——差異很大，取決於任務規模、風險、repo 大小、修復輪數；請當數量級參考，非保證值。有兩個差很多的數字要分清楚：

- **新 token**：首次被處理的 token（input + cache 建立 + output）。它反映實際工作量，是規劃時該看的穩定數字。
- **計費總量**：`/cost` 加總的數字。它**還會**把 cache-read 算進去——被快取的 context 在**每個 agent 的每一回合**都重複貢獻一次，所以大約是**新 token 的 20–30 倍**（且隨 repo 大小與回合數成長）。但 cache-read 的計價大約只有 input 的十分之一，所以實際花費比這 20–30 倍更貼近「新 token」那個數字。

| 任務（單次 run） | 審查員 | 新 token | 實際耗時 |
|------|--------|----------|----------|
| 輕量 | 只開核心 | 約 50–200 萬 | 數分鐘 |
| 一般 | 3–5 個 + 一輪修復 | 約 200–700 萬 | 約 5–15 分鐘 |
| 深度 | `--deep`、多輪修復 | 破 1000 萬 | 20–40 分鐘 |

這張表是**單次 run**——一次 `/udflow:run` 走完實作 → 審查 → 修復 → 收口。多增量功能會疊好幾次 run：我們自己一個完整 P0–P3 建置，跨約 7 次收口週期、約 94 個 subagent、約一天，總共約 **4,700 萬新 token / 約 10 億計費 token**。

成本主因：**≈ context/repo 大小 × 回合數 × subagent 數量。** `opus` 審查員、`--deep`、多輪修復都會再乘上去；審查員並行能縮短耗時，但不會減少 token 量。

### 選用的外部能力（Detect → Use → Else-Disclose）

MCP 工具、外部 subagent、外部 skill 都是**選用**的。有就用、沒有就在本地完成並如實揭露缺口。

- **ui-ux-pro-max**：若已安裝，udflow 在 UI 設計決策會優先使用它；否則退回內建 baseline 並揭露。
- **每位審查員的 MCP** 與 **Codex**（跨模型第二意見 / 救援）都**預設關閉**、需 opt-in。它們的設定、唯讀的 MCP-對審查員對映、以及 Codex 的資料外送揭露都集中在 **[`docs/advanced/external-capabilities.md`](docs/advanced/external-capabilities.md)**（讀者指南）——udflow 自己遵循的運作規則則在出貨的 [`references/external-capabilities.md`](udflow/skills/universal-dev-flow/references/external-capabilities.md)。

---

## 專案現況與維護

udflow 屬於 **early / experimental**，且為**單人維護**（一位作者、利用業餘時間）。它有在真實工作上 dogfood，但累積的紀錄還短、**巴士因子為一**——在你把它用於上線把關前請把這點納入評估。歡迎開 issue 與 PR，我也會看，但回應時間是盡力而為、非保證。最有價值的貢獻是一份 **[verified run 回報](.github/ISSUE_TEMPLATE/verified-run.yml)**——見 [`CONTRIBUTING.md`](CONTRIBUTING.md) 與 [`EVIDENCE.md`](EVIDENCE.md) 的證據 log。

---

## 授權

[MIT](LICENSE) · 版本歷史見 [CHANGELOG.md](CHANGELOG.md)。
