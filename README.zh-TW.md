# udflow — Universal Dev Flow（Claude Code plugin）

[![Validate](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/simba6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

[English](README.md) · **繁體中文**

風險比例、計劃閘門的多代理工程工作流。
理解 → 計劃 → **核准** → 實作 → 驗證 → 選擇性審查 → gatekeeper 就緒裁決,並附帶失敗記憶與選用的外部能力。

> 一句話:讓 Claude Code 在動手改程式碼**之前**先把計劃攤開給你核准,實作後再由一組合適的審查員把關,最後由 gatekeeper 給出「能不能交付」的裁決——而不是寫完就說「好了」。

---

## 快速開始

前置需求:已安裝 **Claude Code**。

**1. 🪟 在終端機進到專案並啟動 Claude Code**

    cd path/to/your-project
    claude

**2. 🤖 在 Claude Code 裡安裝(依序輸入三行)**

    /plugin marketplace add simba6507/universal-dev-flow-plugin
    /plugin install udflow@kktmarketplace
    /reload-plugins

**3. 🤖 交付任務**

    /udflow:run Fix the login flow so it refreshes when the token expires

也可以直接用自然語言描述任務,udflow 判斷是非瑣碎工程工作時會自動接手。

接著它會:理解需求 → 規劃 → 用 **ExitPlanMode** 請你核准 → 核准後才實作 → 驗證 → 審查 → `gatekeeper` 裁決。**計劃核准前不會動任何檔案。**

> **小事它會自動讓路。** udflow 只在「非瑣碎工程工作」時介入;瑣碎修改與純問答不會被打擾。想對任何任務強制走完整流程?用 `/udflow:run`。

---

## 運作流程

```
理解需求 → 規劃(plan mode) → 你核准 → 實作 → 驗證 → 選擇性審查 → gatekeeper 裁決
                                                          ↑________ 修復迴圈 ________↓
```

- **理解 / 規劃**在 plan mode(唯讀)進行,規劃結果用 ExitPlanMode 呈現給你核准。
- **核准後**才會交給 `implementer` 寫程式。
- **驗證**跑 build / test / lint / typecheck / 瀏覽器佐證等適用檢查。
- **審查**只挑與本次風險相關的審查員(不為儀式硬湊)。
- **gatekeeper** 給出 `READY` / `FIX REQUIRED` / `NOT READY`;若需修復則進入修復迴圈,直到就緒或明確受阻。

---

## 安裝前須知

在你正式依賴 udflow 前,有幾件事值得先知道:

- **它比一般對話更耗 token。** 一次任務可能 spawn `implementer`、數個審查員與 `gatekeeper`,而且 `security-reviewer`、`gatekeeper` 跑 `opus`。請預期用量/成本明顯高於單次修改。(審查員是依風險挑選,所以簡單任務花費較少。)
- **`opus` 存取權:** `security-reviewer` 與 `gatekeeper` 會要求 `opus`;若你的帳號/session 無法使用,這兩步會退回當前可用模型,裁決品質可能因此浮動。
- **安裝後會新增兩個 hook,在*每一個* session 都會跑——不只 udflow 任務:**
  - `plan-gate`(PreToolUse):只要你在 plan mode,就會擋下 `Write`/`Edit`/`MultiEdit`——只要 plugin 還裝著,對你*所有*工作都生效(會放行 Claude Code 自己的 plan 檔)。
  - `load-failure-memory`(SessionStart):每次開啟/恢復/清除 session 都會把 FAILURE_MEMORY 注入 context。
- **它會寫檔。** 工作流可能在你的 repo 建立 `ai/FAILURE_MEMORY.md`(會多一個 `ai/` 資料夾),以及家目錄的 `~/.claude/FAILURE_MEMORY.md`。請自行決定要 commit `ai/FAILURE_MEMORY.md` 還是把它加進 `.gitignore`。
- **它會自己介入。** 遇到非瑣碎工程工作,即使你沒呼叫 `/udflow:run`,udflow 也會自動接手;瑣碎修改與純問答則不介入。想強制走完整流程就用 `/udflow:run`。

---

## 範例:一次大概長怎樣

假設你說:「幫我在登入頁加一個『記住我』的勾選框。」udflow 會這樣陪你走:

```
你> /udflow:run Add a "Remember me" checkbox to the login page

udflow> [理解] 重述需求:在登入表單加一個會被記住的「記住我」選項。
        釐清:session 要記住多久?→ 以 AskUserQuestion 詢問。
你> 30 天。

udflow> [計劃 / plan mode]（唯讀 —— 此時不動任何檔案)
        - 影響:登入表單元件 + auth/session 模組
        - 做法:加勾選框 → 送出時若勾選,改用較長效期的 session
        - 驗證:auth 單元測試 + 開畫面確認勾選框可用
        透過 ExitPlanMode 呈現計劃,等你核准。
你> 核准

udflow> [實作] implementer 依計劃做最小變更。
        [驗證] 跑測試/lint;開畫面確認勾選後 session 真的被記住。
        [審查] 風險在 UI + 認證行為 → spec / test / ui-ux(+ security)。
        [發現] test:缺「未勾選的預設行為」測試(major)。
        [修復迴圈] 補上測試 → 重跑相關審查員 → 全數通過。
        [gatekeeper] READY:需求達成、行為已驗證、兩條路徑都有測試覆蓋。
```

三個你最該記住的重點:
- **核准前不動你的檔案** —— 計劃你說了算。
- **審查員是按需要挑的** —— 不會每次都把全部都叫出來。
- **有問題會自己修再複查** —— 直到判定 `READY` 或明確卡住為止。

---

## 元件

- `skills/universal-dev-flow/` — 自動觸發的編排器(含 `references/`)。
- `skills/run/` — 手動入口:`/udflow:run <task>`。
- `agents/` — 9 個 subagent:`implementer`(可寫)+ 7 個唯讀審查員 + `gatekeeper`。其中 `security-reviewer` 與 `gatekeeper` 跑 `opus`,其餘沿用當前 session 模型。
- `hooks/` — `plan-gate.js`(PreToolUse:plan mode 期間阻擋寫入,但放行 Claude Code 自己的 plan 檔 `~/.claude/plans/`,不干擾原生 plan 工作流)與 `load-failure-memory.js`(SessionStart:注入 FAILURE_MEMORY)。兩者都是 Node 腳本,所以在 Windows PowerShell、macOS、Linux 上行為一致。
- `.mcp.json` — 預設為空(零 context 成本)。`mcp.example.json` 是可複製套用的範本。

### 9 個 subagent 一覽

| Agent | 角色 | 何時加入 | 模型 |
|-------|------|----------|------|
| `implementer` | 實作最小安全變更,不自我認證正確性 | 計劃核准後 | inherit |
| `spec-reviewer` | 需求/業務規則/契約是否真的吻合 | 核心,非瑣碎工作必開 | inherit |
| `test-reviewer` | 缺測試、弱驗證、回歸風險、邊界 | 核心,非瑣碎工作必開 | inherit |
| `code-reviewer` | 本地實作品質、可維護性、框架用法、效率 | 有非瑣碎程式碼變更時 | inherit |
| `security-reviewer` | 驗證/授權、輸入處理、機密、信任邊界 | 有安全風險時 | opus |
| `architecture-reviewer` | 分層、邊界、依賴方向、結構放置 | 有結構/邊界疑慮時 | inherit |
| `operability-reviewer` | 可觀測性、重試/逾時、部署、回滾 | 影響執行期/上線行為時 | inherit |
| `ui-ux-reviewer` | 可用性、互動、版面、狀態、無障礙 | 有 UI 影響時 | inherit |
| `gatekeeper` | 彙整裁決:READY / FIX REQUIRED / NOT READY | 選定審查員跑完後 | opus |

---

## 計劃閘門(動手前先核准)

步驟 1–2 在 plan mode 進行,計劃以 ExitPlanMode 呈現,**核准後才會執行 `implementer`**。PreToolUse hook 會在 plan mode 期間強制唯讀(僅放行 Claude Code 自己的 plan 檔,以免擋到原生 plan 工作流)。

若你希望**每個 session 預設都從 plan mode 開始**,請在自己的 `~/.claude/settings.json` 或專案的 `.claude/settings.json` 設定預設模式(本 plugin 不會強制設定)。

---

## 失敗記憶(Failure Memory)

udflow 會把「讓原訂做法受阻、中斷或被迫修復的執行異常」記成純文字 Markdown,讓未來的 session 一開始就讀過去的教訓。用兩個檔(擇一或並用):

- 專案層級:`ai/FAILURE_MEMORY.md`
- 全域層級:`~/.claude/FAILURE_MEMORY.md`

### 讀(由 hook 自動執行)

`SessionStart` hook(`hooks/load-failure-memory.js`)在每次開啟/恢復/清除 session 時,依「**專案優先 → 全域備援**」順序自動載入:

1. 先找 `ai/FAILURE_MEMORY.md`,存在就注入 context(上限約 12000 字,超過截斷);
2. 專案檔不存在才改用 `~/.claude/FAILURE_MEMORY.md`;
3. 兩者都沒有就靜默跳過,不報錯。

### 寫(由工作流規則驅動,依教訓性質分流)

寫入目標**不是固定順序,而是看這條教訓的性質**:

- **專案專屬**的教訓(只跟這個 repo 有關)→ 寫 `ai/FAILURE_MEMORY.md`。
- **跨專案通用**的教訓(工具、流程、reviewer 協作等換個專案也適用)→ 寫 `~/.claude/FAILURE_MEMORY.md`。
- **兩者皆成立**→ 寫進專案檔,並在預防規則可跨 repo 重用時**同步更新全域檔**。
- `gatekeeper` 在裁決時決定是否需要記錄:優先寫專案檔(存在/適用時),否則寫全域檔。

不論寫哪一邊,**寫入前一律先重讀全域 `~/.claude/FAILURE_MEMORY.md`**,比對是否已有類似條目;有就在同一段落更新或補充(同一錯誤重複發生時標記 recurrence),避免散落的重複條目。填好的範例見 [`examples/FAILURE_MEMORY.sample.md`](examples/FAILURE_MEMORY.sample.md)。

> 一句話:**讀 = 專案優先、全域備援;寫 = 依教訓性質分流(專案專屬寫專案、通用寫全域、皆有則兩邊都寫),且寫前一律先重讀全域。**

---

## 選用的外部能力(Detect → Use → Else-Disclose)

MCP 工具、外部 subagent、外部 skill 都是**選用**的。有就用、沒有就在本地完成並如實揭露缺口。詳見 `skills/universal-dev-flow/references/external-capabilities.md`。

- **每位審查員的 MCP**:預設停用。要啟用時,把 `mcp.example.json` 裡的某個 server 複製進 `.mcp.json`,再把該審查員 `tools:` 中對應的 `mcp__*` 行取消註解。審查員務必保持唯讀。
- **ui-ux-pro-max**:若已安裝 `ui-ux-pro-max` skill,udflow 在 UI 設計決策與 `ui-ux-reviewer` 會優先使用它;若未安裝則退回內建指引並揭露。

---

## 授權

[MIT](LICENSE) · 版本歷史見 [CHANGELOG.md](CHANGELOG.md)。
