export function SetupNotice() {
  return (
    <main className="page py-10">
      <div className="rpg-window mx-auto max-w-2xl">
        <h1 className="font-display text-2xl">さいしょの設定</h1>
        <p className="mt-3">
          まだ Supabase の接続情報がありません。次の手順で環境変数を設定すると、ログイン画面が使えるようになります。
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <li>Supabase でプロジェクトを作り、Project Settings → API から URL と publishable key を控える</li>
          <li>
            ローカルでは <code>.env.example</code> をコピーして <code>.env.local</code> を作り、2つの値を入れる
          </li>
          <li>
            <code>supabase/migrations</code> の SQL を Supabase の SQL Editor で実行する（または <code>supabase db push</code>）
          </li>
          <li>
            GitHub Pages では、リポジトリの Settings → Secrets and variables → Actions に同じ2つを登録して再デプロイする
          </li>
        </ol>
      </div>
    </main>
  );
}
