# IPA 試験問題 → 問題データ JSON パイプライン

IPA（情報処理推進機構）が公開している試験問題 PDF から、shikaku-quest 用の問題データ
`public/data/questions/**` を生成するスクリプト群です。

## 一次ソース（すべて IPA 公式）

| セット | 掲載ページ |
|---|---|
| FE 公開問題（令和5〜8年度 科目A・科目B と解答例） | https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/index.html （年度別: `.../koukai/2023r05.html` 〜 `2026r08.html`） |
| FE 科目A サンプル問題（60問）セット / 科目B サンプル問題（20問）セット / 科目B サンプル問題（2022年4月25日公開） | https://www.ipa.go.jp/shiken/syllabus/henkou/2022/20220425.html |
| AP 午前 令和7年度 春期・秋期（問題冊子・解答例） | https://www.ipa.go.jp/shiken/mondai-kaiotu/2025r07.html |
| AP 午前 令和6年度 春期・秋期（問題冊子・解答例） | https://www.ipa.go.jp/shiken/mondai-kaiotu/2024r06.html |

IPA のファイル名規則: `2025r07h` = 令和7年度 **春期**（h）、`2025r07a` = 令和7年度 **秋期**（a）。

### 利用条件・出典表記

IPA「試験の過去問題の使用方法」により、**出典を明記すれば許諾・使用料は不要**です。
各問の `citation` に `出典：令和8年度 基本情報技術者試験 公開問題 科目A 問1` のように出典を必ず入れています。
`license` フィールドは常に `"IPA: 出典明記で許諾不要"` です。解説（`explanation`）は IPA の著作物ではなく、
このパイプラインで AI が自分の言葉で書いたもの（`explanationSource: "ai"`, `explanationVerified: false`）です。

## 使い方

基本は `pnpm tsx scripts/ipa/<script>.ts` です。`pnpm tsx` が esbuild のビルドスクリプト承認チェック
（`ERR_PNPM_IGNORED_BUILDS`）で止まる場合は、次のいずれかで実行できます（依存の追加・`pnpm approve-builds` は不要）。

```sh
# 依存チェックを抑止して tsx を使う
pnpm --config.verify-deps-before-run=false tsx scripts/ipa/parse.ts
# もしくは
./node_modules/.bin/tsx scripts/ipa/parse.ts
# Node 26 は TypeScript の型を剥がして直接実行できる（警告が出るが動く）
node scripts/ipa/parse.ts
```

1. `fetch.ts` — `sources.ts` の一覧を `.cache/ipa/<cert>/<file>.pdf` にダウンロード（既存はスキップ、1 秒間隔、User-Agent 付き、curl 使用）。
2. `python/ocr.py` — **AP 午前の問題冊子は画像のみ**（テキストレイヤなし）のため、macOS Vision フレームワークで OCR し
   `.cache/ipa/ocr/<pdf basename>.pages.json`（ページ毎の文字列配列）を作ります。
   ```sh
   python3 -m venv /path/to/venv
   /path/to/venv/bin/pip install -r scripts/ipa/python/requirements.txt
   /path/to/venv/bin/python3 -I scripts/ipa/python/ocr.py .cache/ipa/ap/*_ap_am_qs.pdf --out .cache/ipa/ocr
   ```
   FE の PDF はテキストレイヤがあるので OCR 不要です。`parse.ts` はテキストレイヤが空のときだけ OCR 結果を使います。
3. `parse.ts [setId ...]` — PDF → テキスト → 「問 N」で分割 → 選択肢ア〜コを分離 → 解答 PDF の正答を結合 →
   キーワード辞書で中分類を推定 → `overrides/<setId>.ts` の人手補正を適用 → JSON 出力。引数なしで全セット。
4. `figures.ts` — `hasFigure: true` の問について、問題 PDF の該当ページを `public/data/figures/<questionId>.png` に
   書き出します（横幅 1200px・16 階調グレースケールの 4bit PNG、1 枚 20〜90KB）。ページは `figureNote` の
   「PDF N ページ」を優先し、無ければ `pdfPage` を使います（`src/lib/questions/figure.ts` の `figurePageOf`。
   科目B のように問が複数ページにまたがる場合に備えて）。描画は `python/render-page.py`（macOS Quartz）なので、
   OCR と同じ venv を `IPA_PYTHON` で渡します。既存の PNG は作り直しません（`--force`）。
   **`parse.ts` はこの PNG の有無を見て `figureImage` を埋めるので、figures.ts → parse.ts の順に実行します。**
   ```sh
   IPA_PYTHON=/path/to/venv/bin/python3 pnpm --config.verify-deps-before-run=false tsx scripts/ipa/figures.ts
   ```
5. `validate.ts` — zod で全セットを検証（終了コード 0/1）。`hasFigure` の問に `figureImage` があり、その PNG が
   存在することも確認します。
6. デバッグ: `dump-text.ts <pdf> [outDir]`（ページ毎テキスト）, `debug-question.ts <setId> <n>`（分割結果）,
   `python/render-page.py <pdf> <page> [out.png] [--width 1200] [--gray] [--levels 16]`（ページを PNG 化）。

```sh
pnpm --config.verify-deps-before-run=false tsx scripts/ipa/fetch.ts
IPA_PYTHON=/path/to/venv/bin/python3 pnpm --config.verify-deps-before-run=false tsx scripts/ipa/figures.ts
pnpm --config.verify-deps-before-run=false tsx scripts/ipa/parse.ts
pnpm --config.verify-deps-before-run=false tsx scripts/ipa/validate.ts
```

## 出力

- `public/data/questions/index.json` — `QuestionIndex`（セット一覧、問数、解説つき問数、ファイルパス）
- `public/data/questions/<cert>/<setId>.json` — `QuestionSet`
- `public/data/figures/<questionId>.png` — 図が必要な問の PDF ページ画像（`figures.ts` が生成。演習画面で表示）

スキーマは `src/lib/questions/schema.ts`（zod v4）で定義し、型も export しています。

| フィールド | 内容 |
|---|---|
| `id` | `${setId}-q${2桁}`（例 `fe-r8-koukai-a-q01`） |
| `text` | 問題文（Markdown）。擬似言語・コードは ```` ```text ```` フェンス、表は Markdown 表。空欄は `［　］` / `［ a ］` |
| `choices` | 「ア」「イ」… を除いた本文。科目A/午前は 4 つ、科目B は 2〜10 個。組合せ問題は `"a: …／b: …"` |
| `answer` | 正答の index（ア=0, イ=1, …） |
| `major` / `middle` | 大分類 / 中分類（`MIDDLES_BY_MAJOR` 参照。`validate.ts` が対応関係を検証） |
| `hasFigure` / `figureNote` | 図がないと解けない問は `true` と「PDF N ページの図を参照」。本文末尾に「（図はPDF参照）」 |
| `figureImage` | 図のページ画像。`public/data/` からの相対パス（例 `figures/fe-r8-koukai-a-q06.png`）。`figures.ts` が作った PNG があるときだけ `parse.ts` が埋める |
| `explanation` | 2〜5 文の解説（AI 生成、未検証） |
| `citation` | `出典：<セット名> 問N` |
| `pdfPage` | 問題 PDF 内のページ番号 |

## 処理の仕組みと人手補正

- `lib/text.ts` — 抽出テキストの正規化（ページ番号・著作権表示の除去、ルビ 3 行の結合、
  ジャスティファイで 1 文字ずつ空いた行の修復、折返し行の結合、段落化）。
- `lib/split.ts` — 「問N」（連番）で分割し、ア→イ→ウ→… が順に現れる最初の連鎖で選択肢を分離。
  OCR でラベルがくっついた「アオブジェクト」も候補に含める（空白つきラベルを優先）。
- `lib/pseudo.ts` — 擬似言語のインデント復元。`lib/ocr.ts` — OCR 特有の崩れ（「間27」「= 5=」など）の補正。
- `lib/classify.ts` — キーワード辞書によるルールベースの中分類推定。AP は解答 PDF の分野（T/M/S）で大分類を制約。
- `overrides/<setId>.ts`（`<setId>-2.ts` … に分割可） — 人手補正。`text` / `textReplace` / `choices` / `choiceFix` /
  `middle` / `tags` / `hasFigure` / `figureNote` / `explanation` / `drop` を問番号ごとに指定。
  すべてのセットで全問を目視確認し、表の Markdown 化、図の扱い、分類、解説をここで与えています。

## 生成済みセットの状態（2026-10-28）

| setId | 問数 | 解説 | 備考 |
|---|---|---|---|
| fe-r8 / r7 / r6 / r5-koukai-a | 20 × 4 | 全問 | 公開問題 科目A |
| fe-r8 / r7 / r6 / r5-koukai-b | 6 × 4 | 全問 | 公開問題 科目B |
| fe-sample-a | 60 | 全問 | 科目A サンプル問題セット |
| fe-sample-b | 20 | 全問 | 科目B サンプル問題セット |
| fe-sample-b-202204 | 6 | 全問 | 科目B サンプル問題（2022-04-25） |
| ap-r7-spring-am | 80 | 全問 | OCR + 全問目視補正 |
| ap-r7-autumn-am / ap-r6-spring-am / ap-r6-autumn-am | 80 × 3 | なし | OCR + 全問目視補正、分類のみ |

## 次にやるべきこと

- AP 午前 令和7年度秋期・令和6年度春期・秋期（240 問）の解説（`explanation`）を `overrides/` に追加する。
- `explanation` は AI 生成・未検証（`explanationVerified: false`）なので、人による確認とフラグの更新。
- 図のページ画像（`figureImage`）はページ全体なので、問の部分だけに切り抜くとスマホで読みやすくなる
  （FE はテキストレイヤの座標、AP は OCR の矩形から「問N」〜「問N+1」の範囲を求められる）。
- 中分類はシラバスの境界が曖昧な問（例: クラウドの形態、AI 利活用、OSS ツール）で判断が割れるため、
  `overrides/*.ts` の `middle` をレビューする。各 override ファイルの `notes` と各問の `tags` が手掛かりになる。
- 他の年度・区分（SG、SC、AP 午後など）を追加する場合は `sources.ts` に追記し、新しいレイアウトなら `parse.ts` の
  `layout` 分岐を増やす。
- `pnpm tsx …` が esbuild のビルド承認チェックで止まる問題は、`pnpm approve-builds` か `pnpm-workspace.yaml` の
  `allowBuilds.esbuild` を正しく設定すれば解消する（このパイプラインの範囲外なので未対応）。

## 既知の制限

- **図が本体の問題**（回路図、木構造、グラフなど）はテキストで再現できないため `hasFigure: true` とし、
  選択肢が図そのものの場合は `"図ア"` のような参照に置き換えています。図は PDF の該当ページを画像にして
  （`figureImage`、FE 14 問・AP 14 問）演習画面に表示します。ページ全体の画像なので、同じページの他の問も写ります。
- **AP 午前は OCR 由来**です。本文・選択肢はページ画像と突き合わせて補正していますが、数式・添字・特殊記号は
  読みやすい文字列に書き直しており、原文と表記が異なる場合があります。
- PDF の上付き文字（2^n など）はテキスト抽出で失われるため、該当箇所は overrides で復元しています。
- FE 科目B の空欄（PDF では箱）はテキストに残らないため、ヒューリスティックで `［　］` を挿入し、
  取りこぼしは overrides で補っています。
- `explanation` は AI が書いた未検証の解説です（`explanationVerified: false`）。公開前に人の確認を推奨します。
- `.cache/` は gitignore 済みです。PDF と OCR 結果は再生成できます。
