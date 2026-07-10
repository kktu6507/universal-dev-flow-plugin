# udflow — Universal Dev Flow（Claude Code プラグイン）

[![Validate](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml/badge.svg)](https://github.com/kktu6507/universal-dev-flow-plugin/actions/workflows/validate.yml)

[English](README.md) · [繁體中文](README.zh-TW.md) · **日本語**

**udflow は Claude Code を慎重なリリースエンジニアのように振る舞わせます：** まず計画し、承認を得てから変更し、証拠で検証し、最後に `READY` / `FIX REQUIRED` / `NOT READY` を判定します。

udflow は Claude Code 向けの、plan-gate 方式によるコードレビュー & リリース可否判定ワークフローです。bug scanner でも、linter でも、static analyzer でも、CI の代替でも、zero-bug の保証でもありません。その役割は、AI が行った変更を追跡可能にすることです：明示された意図、acceptance criteria、最小限の安全な実装、実際の検証証拠、リスクに応じたレビュー、そして gatekeeper の verdict。

```text
タスク -> 要件理解 -> Plan（まだコード変更なし）-> あなたが plan + acceptance criteria を承認
     -> 最小限の安全な変更 -> build / test / lint / browser evidence
     -> リスクに応じた reviewer -> Gatekeeper verdict
            READY / FIX REQUIRED / NOT READY -> 必要なら repair loop へ
```

## 30秒で理解する

udflow がすることは3つです：

| タイミング | udflow が加えるもの |
|---|---|
| **コーディング前** | Claude が要件を re-state し、plan と acceptance criteria にまとめ、あなたの承認を待ちます。 |
| **コーディング中** | `implementer` は最小限の安全な変更のみを行い、自己承認はしません。 |
| **納品前** | リスクに応じて選ばれた reviewer があなたの意図に照らして変更を検査し、最後に `gatekeeper` が `READY` / `FIX REQUIRED` / `NOT READY` を判定します。 |

「完了」が「リリース可能」を意味しなければならないときに udflow を使ってください：`main` へのマージ、ユーザー向け変更のリリース、あるいは authentication、data、contracts、migrations、production behavior、高リスクな UI flow に触れる場合など。

typo 修正、純粋なフォーマット、低リスクの小さな変更、単なる quick look には udflow は基本的に不要です。より安価で確定的なツールが使える場面では、まずそちらを使ってください。

> ライブデモ：[udflow-public-demo](https://github.com/kktu6507/udflow-public-demo) に、`/udflow:run` を最初から最後まで記録した一例があります。

## クイックスタート

前提条件：**Claude Code** と、`PATH` 上に `node` があること。hooks は Node スクリプトなので、Node がない場合は静かに no-op になります。

```text
# プロジェクトディレクトリで、Claude Code 内から：
/plugin marketplace add kktu6507/universal-dev-flow-plugin
/plugin install udflow@kktu
# udflow は初期状態では無効です - /plugin -> Installed -> udflow を有効化
#   または：claude plugin enable udflow@kktu
/reload-plugins

# タスクを渡す：
/udflow:run ログインフローを修正し、期限切れの access token を、失敗した request をリトライする前に一度だけ refresh するようにして。
```

> udflow は初めてですか？[最初の実行を最初から最後まで](docs/tutorial-first-run.md)たどってみましょう。

- **インストールしただけでは有効になりません。** 有効化するまで、udflow の hooks と skills は何もしません。
- **Marketplace 名は `kktu` です。** インストール id は `udflow@kktu`。
- **更新：** `/plugin marketplace update kktu` の後に `/reload-plugins`。
- **ヘルスチェック：** gate が一度も block しない、hooks が無反応、あるいは Node が入っていない可能性があるときは `/udflow:doctor` を実行してください。

## 良いタスクの書き方

udflow はタスクの質に最も左右されます。良いタスクには、intent、acceptance criteria、変更してはいけない範囲、期待する検証方法、リスク領域が書かれています。

```text
/udflow:run <change request>

要件：
- ...

Acceptance criteria：
- ...

変更禁止範囲：
- ...

期待する検証：
- ...

リスク領域：
- auth / data / contract / UI / performance / rollback
```

[`docs/task-writing-guide.md`](docs/task-writing-guide.md)（英語）に、bad / better / best の例、および auth、API contract、UI state、migration 向けのタスクテンプレートがあります。

## 使いどころ

| udflow を使うべき場面 | 通常 udflow を省いてよい場面 |
|---|---|
| auth / authz の変更 | typo |
| API や schema contract の変更 | 純粋なフォーマット |
| DB migration / data-integrity 作業 | 些細な文言修正 |
| UI flow、accessibility、画面上の状態変化 | リリースに関係ない簡易レビュー |
| より強い証拠が必要な release 前の作業 | すでに CI/linter でカバーされている機械的チェック |

## 非ゴール

udflow は次のものではありません：

- CI の代替
- linter や static analysis の代替
- zero bug の保証
- 網羅的な mechanical scanner
- あらゆる些細な変更に使うべきツール

udflow は次と組み合わせて使ってください：

- unit / integration tests
- linters / formatters
- static analysis / dependency scanners
- high-risk な release の human review
- 外部システムが関わる場合の controlled live-environment evidence

Linters は機械的な問題を捕まえます。Tests は既知の期待される挙動を検証します。Static analysis は既知の vulnerability パターンを検出します。udflow は、AI が行った変更が明示された意図を満たし、ready to ship かどうかを判断します。

## 仕組み

| フェーズ | 何が起きるか |
|---|---|
| **Understand** | 要件を re-state する；曖昧さが behavior、contracts、destructive operations、security、UX を左右する場合のみ質問する。 |
| **Plan** | 読み取り専用のまま、repo の実態にアプローチを紮根させ、acceptance criteria をまとめる。 |
| **Approval** | あなたが plan と criteria を承認するまで、コードは変更しない。 |
| **Implement** | `implementer` が最小限の安全な変更を適用し、今回の実行分の task contract（`output/udflow/contract.md`）を書き出す。 |
| **Verify** | 必要に応じて build / test / lint / typecheck / browser evidence を実行する；command の exit status が権威となる。 |
| **Review** | リスクに関係する reviewer だけが実行され、thread 全体の履歴ではなく、焦点を絞った Review Packet を使う。 |
| **Gatekeeper** | findings を集約し、impact に応じて再評価し、acceptance criteria を1つずつ確認し、`READY` / `FIX REQUIRED` / `NOT READY` を判定する。 |

Verdicts は release-readiness の判断であり、絶対的な真実ではありません。詳しくは [`docs/how-to-read-verdicts.md`](docs/how-to-read-verdicts.md)（英語）を参照してください。

## 10個の subagent

reviewer を手動で選ぶ必要はありません。udflow は**リスク**に応じてパネルを組み立てます——typo なら reviewer は誰も動かず、認証まわりの変更なら security reviewer が加わります。全メンバーは以下の通りです：

| Agent | 役割 | いつ加わるか | モデル |
|---|---|---|---|
| `planner-creator` | 実際のコードに plan を紮根させ、方針を草案し、パネルを事前選定し、`design.md` を検出/提案する（既存 UI からの bootstrap も可能）（読み取り専用；plan 承認の材料であり、承認そのものを代替しない） | 高リスク／正確性が重要な場面の planning | inherit |
| `implementer` | 最小限の安全な変更；自己承認は絶対にしない | plan 承認後 | inherit |
| `spec-reviewer` | 要件／ビジネスルール／contract との整合性 | core（非瑣末） | inherit |
| `test-reviewer` | テスト漏れ、弱い検証、エッジケース、regression | core（非瑣末）；低/中リスクではエビデンス代替可（fast lane） | inherit |
| `code-reviewer` | ローカルな品質、保守性、フレームワークの使い方、効率性 | 非瑣末なコード変更 | inherit |
| `security-reviewer` | auth/authz、入力処理、secret、trust boundary | セキュリティに関わるリスク | **opus** |
| `architecture-reviewer` | 層構造、境界、依存方向、配置 | 構造上の懸念 | inherit |
| `operability-reviewer` | observability、retry/timeout、deploy、rollback | runtime/本番環境への影響 | inherit |
| `ui-ux-reviewer` | usability、interaction、layout、states、accessibility；`design.md` が存在する場合はそれとの整合性も | UI への影響 | inherit |
| `gatekeeper` | 集約し、impact で再評価し、readiness を判定する | reviewer 終了後 | **opus** |

- **reviewer は editor 系ツールを持ちません** —— 検査用に `Read` / `Grep` / `Glob` / `Bash` のみ；review-only という振る舞いは政策とコンテキスト分離によって強制されているのであり、厳密な read-only の権限境界ではありません（詳細は [`ARCHITECTURE.md`](ARCHITECTURE.md)）。修正案を提案するのは reviewer で、実際に適用するのは `implementer` です。
- **正確性が重要な経路には、独立した視点を2つ以上割り当てます** —— parsing、数値／エンコーディング／overflow、並行処理、セキュリティ、データ整合性など。benchmark によれば、2人目の reviewer が、1人目が「まあ大丈夫」と合理化してしまった欠陥を確実に拾い直すことが分かっているためです。

## サンプルとエビデンス

- [`examples/ready-run.md`](examples/ready-run.md)（英語）- `EVIDENCE.md` から抽出した実際の `READY` の例。
- [`examples/fix-required-run.md`](examples/fix-required-run.md)（英語）- `EVIDENCE.md` から抽出した実際の `FIX REQUIRED -> READY` repair-loop の例。
- [`examples/not-ready-run.md`](examples/not-ready-run.md)（英語）- illustrative な `NOT READY` の例。evidence ではないと明記されています。
- [`examples/review-packet.md`](examples/review-packet.md)、[`examples/final-report-compact.md`](examples/final-report-compact.md)、[`examples/final-report-full.md`](examples/final-report-full.md)（英語）は、reviewer への入力と delivery output の contract-field の例を示しています。いずれも illustrative であり、逐語的な transcript ではありません。

udflow には **telemetry がない**ため、real-world での検証は手動記録によって追跡されています。`EVIDENCE.md` が唯一の正となる記録です：

| Track-2 指標 | 現在の状況 |
|---|---|
| Type-B verified live runs | 6 / 10 |
| Distinct real projects | 2 / 3 |
| Non-maintainer runs | 0 / 1 |

最も価値のある貢献：実際の作業で udflow を動かし、[Verified udflow run issue](https://github.com/kktu6507/universal-dev-flow-plugin/issues/new?template=verified-run.yml) を開いてください。udflow が最後に出力する `### Live run` block を貼り付け、misses、false alarms、cost、follow-up outcome をそのまま記録してください。正直なネガティブ情報こそが evidence の要点です。

## Hooks と安全性モデル

plugin が有効な間は、依存関係ゼロの Node hooks が6つ、すべての session で実行されます。これらは local-only、fail-open で、Node の built-in（`fs`、`os`、`path`、`crypto`）のみを使用します。

| Hook スクリプト | 発火イベント | 用途 |
|---|---|---|
| `plan-gate.js` | `PreToolUse` | plan mode 中に edit tools と明らかな Bash write を拒否する。 |
| `destructive-guard.js` | `PreToolUse` | `rm -rf`、`git reset --hard`、`git push --force`、PowerShell の `Remove-Item -Recurse` など、狭く絞った復元不能な destructive command の前に確認を挟む。 |
| `contract-guard.js` | `PreToolUse` | Write/Edit/MultiEdit が既存の `output/udflow/contract.md` の acceptance criterion、`mustNotChange` 項目、scope path を削除・緩和する、`risk` を格下げする、または `design.md` の section をまるごと削除する前に確認を挟む。 |
| `load-failure-memory.js` | `SessionStart` | プロジェクトの `ai/FAILURE_MEMORY.md` またはグローバルの `~/.claude/FAILURE_MEMORY.md` を読み込み、nonce で囲んだ untrusted な digest を注入する。 |
| `compact-fidelity.js` | `SessionStart` · `compact` | context compaction の直後に、簡潔な workflow-continuity のリマインダーを再注入する。 |
| `orchestration-check.js` | `Stop` | delivery の主張が、missing panel、blocking verdict、failed/unrun verification、missing live-run evidence と矛盾している場合に警告する。 |

確認や制限を行う各 hook は、プロジェクト単位に opt-out できます——完全なリストは下記の「設定リファレンス」を参照してください。

これらの hooks は、ファイルの削除、システム設定の変更、権限の変更、subprocess の実行、コードのダウンロード、コードや transcript の送信を一切行いません。あくまで guardrail であり、sandbox ではありません。詳細は [`SECURITY.md`](SECURITY.md) と [`ARCHITECTURE.md`](ARCHITECTURE.md) を参照してください。

## 設定リファレンス

以下はすべてオプションです。udflow のデフォルト動作には設定は一切不要です。

**永続的な設定**——`.claude/settings.json` または `.claude/settings.local.json`（local が優先）、すべて `"udflow": { ... }` の下に置きます。それぞれ**デフォルトで有効**で、`false` に設定するとそのプロジェクトで opt-out できます：

| Key | 無効化される対象 |
|---|---|
| `planGate` | `plan-gate.js` —— plan mode 中に強制される編集ブロック |
| `destructiveGuard` | `destructive-guard.js` —— 狭く絞った復元不能な destructive command 実行前の確認 |
| `contractGuard` | `contract-guard.js` —— Write/Edit/MultiEdit が `output/udflow/contract.md` を弱める、または `design.md` の section を削除する前の確認 |
| `preserveOnCompact` | `compact-fidelity.js` —— context compaction 後の workflow-continuity リマインダー |

設定ファイルが壊れている、または読み込めない場合は「無効化されていない」として扱われます（fail-safe：guard はそのまま動作し続けます）。例——特定のプロジェクトで `contract-guard.js` を無効化する：

```json
// .claude/settings.json
{
  "udflow": { "contractGuard": false }
}
```

**環境変数**——デフォルトは未設定（空）：

| 変数 | 設定した場合の効果 |
|---|---|
| `UDFLOW_ENFORCE_STOP` | 空でない値を設定すると、`orchestration-check.js` の Stop hook が verdict/evidence の矛盾時に警告するだけでなく、delivery を強制的にブロックするようになります |
| `UDFLOW_HOOK_DEBUG` | `1` に設定すると、各 hook が debug trace を1行追加出力します（`/udflow:doctor` や手動のトラブルシューティングで使用） |

```bash
# bash/zsh
UDFLOW_ENFORCE_STOP=1 claude
```

```powershell
# PowerShell
$env:UDFLOW_ENFORCE_STOP = "1"; claude
```

**タスク単位の機能**——そのタスクで明示的に有効化しない限りオフで、決してハード依存にはなりません：

| 機能 | 有効化する方法 |
|---|---|
| Codex によるクロスモデルのセカンドオピニオン | タスク内でそう伝える（例：「repair loop が詰まったら Codex を使ってよい」）—— [`references/external-capabilities.md`](udflow/skills/universal-dev-flow/references/external-capabilities.md) 参照 |
| レビュアーごとの MCP ツール | デフォルトでは `.mcp.json` は空です。サーバーを追加し（[`mcp.example.json`](udflow/mcp.example.json) 参照）、該当レビュアーの frontmatter 内の対応する `mcp__*` 行のコメントを解除してください |

```text
/udflow:run ログインのバグを直して。repair loop が詰まったら Codex を使ってよい。
```

**実行単位のフラグ**——`/udflow:run` への引数として渡します：

| フラグ | 効果 |
|---|---|
| `--deep`（または `deep:` / `ultra:` プレフィックス） | deep-mode Tier 2 を有効化：発見事項の adversarial verification と `gatekeeper`/`security-reviewer` の最大推論強度——コストは上がり、自動的には有効化されません |
| `--no-deep` / `--shallow` | deep-mode Tier 1 の決定論的パネル実行（高リスク/correctness-critical な作業で本来自動的に有効化される）を無効化します |
| `--lite` | 必要最小限のレビューパネルを強制し、Tier 2 をスキップしますが、高リスクのシグナルがある場合は関連する safety reviewer は維持し、その旨を開示します |
| `--report full` | コンパクトなデフォルトの代わりに詳細な最終レポート（エージェントごとの活動、完全な token/cost 表）を出力します |

```text
/udflow:run --deep ネットワークタイムアウト時に一度だけバックオフ付きで再試行するよう、決済のリトライロジックをリファクタリングして。
/udflow:run --lite エラーメッセージの文言にある typo を直して。
/udflow:run --report full 公開 API に rate limiting を追加して。
```

## 互換性

udflow は Claude Code を主対象としています。GitHub Copilot CLI 上でも動作しますが、その場合は degrade します：plugin format はロードされますが、一部の Claude-Code 専用 hook output は届きません。

Compatibility と conformance smoke の詳細は [`docs/compatibility.md`](docs/compatibility.md)（英語）にあります。要点は以下の通りです：

- Claude Code が主要な runtime です。
- GitHub Copilot CLI は skills、subagents、一部の PreToolUse decision をロードしますが、injected された `SessionStart` と `Stop` の output は no-op になることがあります。
- `destructive-guard.js` は Copilot CLI 1.0.65 で live-verified 済みです。
- Claude Code の hook/agent contract は moving target です；release smoke の記録は [`RELEASING.md`](RELEASING.md) にあります。

## 信頼性とリリース

udflow は有効化されると hooks が auto-execute されるため、install の integrity が重要になります。

推奨される安全なインストール手順：

1. tagged release または pinned commit からインストールする。
2. 有効化する前に、配布される plugin の `hooks/` ディレクトリを確認する（repo path：`udflow/hooks/`）。
3. インストール後に `/udflow:doctor` を実行する。
4. signed tag がある場合は `git verify-tag vX.Y.Z` で検証する。
5. release アセットに SHA-256 checksum がある場合は、公開されている `.sha256` ファイルと突き合わせて検証する。

trust model については [`SECURITY.md`](SECURITY.md)（英語）を、release checklist、live smoke、signed tag のセットアップ、checksum 検証については [`RELEASING.md`](RELEASING.md)（英語）を参照してください。

クイックスタートの marketplace command は便宜的な経路であり、marketplace / repo の状態に追随します。Release checksum はあくまで整合性チェックです：ダウンロードした archive が公開された release asset と一致するかを確認するだけで、真正性は signed tag や pinned SHA に依存したままです。デフォルトの clone path 自体は認証しないため、pinning が必要な場合は tagged/SHA checkout を使うか、検証済み archive とインストール後の `udflow/` tree を比較してください。

## コスト

典型的な real-app での run は、udflow が plan、verify、review を行い、場合によっては repair も行うため、一回きりの AI review より高くつきます。おおよその目安は以下の通りです：

| タスク規模 | Reviewer | 新規トークン | 所要時間 |
|---|---|---|---|
| 軽量 | `--lite`、core のみ | ~0.5-2M | 数分 |
| 典型 | 3-5 reviewers + repair 1回 | ~2-7M | ~5-15分 |
| 深掘り | `--deep`、repair 複数回 | >10M | ~20-40分 |

コストを抑えたいときは `/udflow:run --lite`、最大限の精査が必要なときは `--deep`、per-agent の詳細な activity と cost が必要なときは `--report full` を使ってください。小さな低/中リスクの変更では、自動の **fast lane** がさらに一歩進みます：実行エビデンスがすでに reviewer の問いに答えている場合（behavior-changing な基準すべてに red→green テストがあり、full required suite がグリーン）、`test-reviewer` はエビデンスで代替され、`udflow:panel=substituted:test-reviewer` として開示されます — 同じエビデンスでより少ない agents。高リスク / deep run には適用されません。

## ドキュメント

- [`docs/tutorial-first-run.md`](docs/tutorial-first-run.md)（英語）- udflow の最初の実行を、最初から最後まで。
- [`docs/task-writing-guide.md`](docs/task-writing-guide.md)（英語）- udflow が検証できるタスクの書き方。
- [`docs/how-to-read-verdicts.md`](docs/how-to-read-verdicts.md)（英語）- `READY` / `FIX REQUIRED` / `NOT READY` の意味。
- [`docs/compatibility.md`](docs/compatibility.md)（英語）- tested runtime と conformance smoke checklist。
- [`docs/advanced/external-capabilities.md`](docs/advanced/external-capabilities.md)（英語）- optional な MCP、Codex、browser、design capabilities。
- [`EVIDENCE.md`](EVIDENCE.md)（英語）- real-world と benchmark の evidence log。
- [`ARCHITECTURE.md`](ARCHITECTURE.md)（英語）- component map、stable contract、limits。
- [`SECURITY.md`](SECURITY.md)（英語）- trust model、安全なインストール、vulnerability reporting。
- [`RELEASING.md`](RELEASING.md)（英語）- release automation、live smoke、signed tag、checksum。

## ライセンス

[MIT](LICENSE) · バージョン履歴は [CHANGELOG.md](CHANGELOG.md)。
