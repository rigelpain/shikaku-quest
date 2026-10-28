# 資格クエスト（shikaku-quest）

情報系・ものづくり系の資格を体系的に取るための、自分用の勉強・記録アプリです。
PC・タブレット・スマホのどれでも読みやすいリキッドデザインで、記録は Supabase に保存して端末間で同期します。

公開ページ: https://rigelpain.github.io/shikaku-quest/

## できること

- **ホーム**: 次の試験・申込締切・免除期限までのカウントダウン、今日の学習時間、連続日数、復習待ちの数
- **資格**: 基本情報・応用情報・支援士・セキュマネ・Security+ などのカタログ。制度変更の状況、日程、免除条件、自分の状態（勉強中／申込済み／合格…）と受験予定日・免除番号の記録
- **演習**: IPA 公開問題を解く。間隔反復（FSRS）で復習期限が来た問題を優先。分野しぼり込み、キーボード操作、AI 生成の解説と出典表示
- **テキスト**: 分野ごとの要点まとめ（科目A 23分野、科目B、勉強法など）
- **記録**: タイマーまたは手入力で学習時間を残し、日別・資格別に集計
- **設定**: 目標時間、テーマ、JSON バックアップの書き出し／取り込み

## 技術

- Next.js 16（App Router、静的書き出し `output: "export"`）/ React 19 / TypeScript
- Tailwind CSS v4 + shadcn/ui（Base UI）
- Supabase（Auth + Postgres、RLS で本人の行だけ読み書き）
- ts-fsrs（間隔反復）、recharts、react-markdown
- GitHub Pages（GitHub Actions でデプロイ）

## セットアップ

### 1. Supabase プロジェクトを作る

1. https://supabase.com/dashboard で新しいプロジェクトを作る
2. Project Settings → API から **Project URL** と **publishable key**（`sb_publishable_...`。旧 anon key でも可）を控える
3. SQL Editor で `supabase/migrations/20261028000000_init.sql` を実行する（または Supabase CLI で `supabase link` → `supabase db push`）
4. Authentication → Providers → Email で、必要なら「Confirm email」を切る（自分用なら確認なしの方が楽です）。最初の1回だけアプリの「アカウントを作る」で登録し、その後は Authentication → Settings で **Allow new users to sign up** を切っておくと他人が登録できません

### 2. ローカルで動かす

```bash
pnpm install
cp .env.example .env.local   # URL と key を入れる
pnpm dev
```

Docker があれば `supabase start` でローカルの Supabase も使えます（`supabase/config.toml` のポートは 563xx）。

### 3. GitHub Pages に公開する

1. リポジトリの Settings → Pages → Source を **GitHub Actions** にする
2. Settings → Secrets and variables → Actions に次の2つを登録する
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. `main` に push すると `.github/workflows/deploy-pages.yml` がビルドして公開します

環境変数が未設定のままでも公開はされ、画面には設定手順が表示されます。

### メールのリンクでログインする場合

Supabase の Authentication → Email Templates → Magic Link の本文を次のように変えると、PC で送ってスマホで開いてもログインできます。

```
<a href="{{ .SiteURL }}/auth/callback/?token_hash={{ .TokenHash }}&type=magiclink">ログインする</a>
```

Site URL（Authentication → URL Configuration）は `https://rigelpain.github.io/shikaku-quest` にし、Redirect URLs にも同じものと `http://localhost:3000/**` を足します。

## 問題データ

`public/data/questions/` に、IPA が公開している試験問題を JSON 化したものを置いています。
作り方は `scripts/ipa/README.md` を参照してください。

- 出典: 独立行政法人情報処理推進機構（IPA）。IPA の方針に従い、各問に「出典：年度 期 試験区分 時間区分 問番号」を付けています。IPA は過去問題の利用について許諾・使用料を不要としていますが、著作権は放棄していません
- 解説・要点テキストは AI が生成したもので、未検証の箇所があります。画面でもその旨を表示しています。疑わしいときは出典の PDF で確かめてください
- 過去問道場などの他サイトの解説は使っていません

## ディレクトリ

```
src/app/            画面（(app) 配下はログイン必須）
src/components/     UI 部品（ui/ は shadcn）
src/content/        資格カタログ・分野マスタ・テキスト(Markdown)
src/lib/            Supabase クライアント、データ層、FSRS、日付
scripts/ipa/        IPA PDF → JSON のパイプライン
public/data/        問題データ（JSON）
supabase/           ローカル設定とマイグレーション
```

## ライセンス

MIT（`LICENSE`）。問題データは IPA の利用条件に従います。
