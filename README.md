# udflow — Universal Dev Flow（Claude Code plugin）

風險比例、計劃閘門的多代理工程工作流。
理解 → 計劃 → **核准** → 實作 → 驗證 → 選擇性審查 → gatekeeper 就緒裁決,並附帶失敗記憶與選用的外部能力。

> 一句話:讓 Claude Code 在動手改程式碼**之前**先把計劃攤開給你核准,實作後再由一組合適的審查員把關,最後由 gatekeeper 給出「能不能交付」的裁決——而不是寫完就說「好了」。

---

## 快速開始

前置需求:已安裝 **Claude Code**。

**1. 🪟 在 PowerShell 進到專案並啟動 Claude Code**

    cd D:\github\你的專案
    claude

**2. 🤖 在 Claude Code 裡安裝(依序輸入三行)**

    /plugin marketplace add simba6507/universal-dev-flow-plugin
    /plugin install udflow@kktmarketplace
    /reload-plugins

**3. 🤖 交付任務**

    /udflow:run 幫我修正登入流程在 token 過期時不會重整的 bug

也可以直接用自然語言描述任務,udflow 判斷是非瑣碎工程工作時會自動接手。

接著它會:理解需求 → 規劃 → 用 **ExitPlanMode** 請你核准 → 核准後才實作 → 驗證 → 審查 → `gatekeeper` 裁決。**計劃核准前不會動任何檔案。**

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

## 元件

- `skills/universal-dev-flow/` — 自動觸發的編排器(含 `references/`)。
- `skills/run/` — 手動入口:`/udflow:run <task>`。
- `agents/` — 9 個 subagent:`implementer`(可寫)+ 7 個唯讀審查員 + `gatekeeper`。其中 `security-reviewer` 與 `gatekeeper` 跑 `opus`,其餘沿用當前 session 模型。
- `hooks/` — `plan-gate.js`(PreToolUse:plan mode 期間阻擋寫入)與 `load-failure-memory.js`(SessionStart:注入 FAILURE_MEMORY)。兩者都是 Node 腳本,所以在 Windows PowerShell、macOS、Linux 上行為一致。
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

步驟 1–2 在 plan mode 進行,計劃以 ExitPlanMode 呈現,**核准後才會執行 `implementer`**。PreToolUse hook 會在 plan mode 期間強制唯讀。

若你希望**每個 session 預設都從 plan mode 開始**,請在自己的 `~/.claude/settings.json` 或專案的 `.claude/settings.json` 設定預設模式(本 plugin 不會強制設定)。

---

## 選用的外部能力(Detect → Use → Else-Disclose)

MCP 工具、外部 subagent、外部 skill 都是**選用**的。有就用、沒有就在本地完成並如實揭露缺口。詳見 `skills/universal-dev-flow/references/external-capabilities.md`。

- **每位審查員的 MCP**:預設停用。要啟用時,把 `mcp.example.json` 裡的某個 server 複製進 `.mcp.json`,再把該審查員 `tools:` 中對應的 `mcp__*` 行取消註解。審查員務必保持唯讀。
- **ui-ux-pro-max**:若已安裝 `ui-ux-pro-max` skill,udflow 在 UI 設計決策與 `ui-ux-reviewer` 會優先使用它;若未安裝則退回內建指引並揭露。
