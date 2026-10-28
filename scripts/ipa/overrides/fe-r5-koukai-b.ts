/**
 * 令和5年度 FE 公開問題 科目B の人手補正。
 * - 組合せ表の選択肢（問1・問5）は "a: …／b: …" に手で分割
 * - 問5 はコサイン類似度の数式（分数・平方根）がテキスト化で崩れるため本文を書き直した
 * - explanation は擬似言語を具体的にトレースして自分の言葉で記述
 */
import type { SetOverride } from "../lib/overrides.ts";

const o: SetOverride = {
  notes: "問1・問5 は組合せ表の選択肢を手で分割。問5 は数式を本文で再現。空欄マーカーは parse.ts の自動挿入をそのまま利用。",
  questions: {
    1: {
      choices: [
        "a: maxNum／b: i ÷ j の余り が 0 と等しい",
        "a: maxNum／b: i ÷ j の商 が 1 と等しくない",
        "a: maxNum ＋ 1／b: i ÷ j の余り が 0 と等しい",
        "a: maxNum ＋ 1／b: i ÷ j の商 が 1 と等しくない",
      ],
      middle: "アルゴリズムとプログラミング",
      tags: ["素数判定", "繰返し処理", "剰余"],
      explanation:
        "関数は「引数で与えられた整数以下」の素数を全て集めるので，外側のループは i を 2 から maxNum まで（maxNum を含めて）回す必要があり，a は maxNum です。maxNum ＋ 1 にすると引数より大きい数まで調べてしまいます。内側のループでは，i が 2 から √i までのいずれかの j で割り切れれば素数ではないと分かるので，b は「i ÷ j の余り が 0 と等しい」です。「商が 1 と等しくない」は割り切れるかどうかの判定になっておらず，例えば i＝5，j＝2 でも商 2 は 1 と異なるため素数 5 を誤って除外してしまいます。したがってアが正解です。",
    },
    2: {
      middle: "アルゴリズムとプログラミング",
      tags: ["手続の呼出し", "実行順序"],
      explanation:
        "proc2 を呼ぶと，最初に proc3 が呼ばれて \"C\" を出力し，戻ってから \"B\" を出力します。次に proc1 が呼ばれ，proc1 は \"A\" を出力した後に proc3 を呼ぶので \"C\" が出力されます。よって出力は \"C\"，\"B\"，\"A\"，\"C\" の順になり，クが正解です。キは最後の proc3 の呼出しを見落とした場合，アやウは proc2 内の呼出し順（proc3 が先，proc1 が後）を取り違えた場合の並びです。",
    },
    3: {
      middle: "アルゴリズムとプログラミング",
      tags: ["クイックソート", "再帰", "トレース"],
      explanation:
        "sort(1, 5) では pivot が data[(1＋5)÷2 の商]＝data[3]＝3 になります。i は data[1]＝2，data[2]＝1 が 3 より小さいので進み，data[3]＝3 で止まって i＝3 になります。j は data[5]＝4，data[4]＝5 が 3 より大きいので戻り，data[3]＝3 で止まって j＝3 になります。i ≧ j が成り立つので一度も入替えをせずに繰返しを抜け，α の行で配列の初期状態 2 1 3 5 4 がそのまま出力されます。したがってエが正解で，アのように整列が終わった状態が出力されるわけではありません。",
    },
    4: {
      middle: "アルゴリズムとプログラミング",
      tags: ["ハッシュ法", "衝突", "オープンアドレス"],
      explanation:
        "hashArray の要素数は 5 なので，calcHash1 は (value mod 5)＋1，calcHash2 は ((value＋3) mod 5)＋1 です。add(3) は calcHash1 が 4 なので hashArray[4]＝3 になります。add(18) は calcHash1 が (18 mod 5)＋1＝4 で既に使われているため，calcHash2 の (21 mod 5)＋1＝2 で hashArray[2]＝18 になります。add(11) は calcHash1 が (11 mod 5)＋1＝2 で使用済みなので，calcHash2 の (14 mod 5)＋1＝5 で hashArray[5]＝11 になります。結果は {－1, 18, －1, 3, 11} となり，エが正解です。アやウは衝突時に 2 つ目のハッシュ関数を使うことを考慮していない並びです。",
    },
    5: {
      text: `次のプログラム中の ［ a ］ と ［ b ］ に入れる正しい答えの組合せを，解答群の中から選べ。ここで，配列の要素番号は 1 から始まる。

コサイン類似度は，二つのベクトルの向きの類似性を測る尺度である。関数 calcCosineSimilarity は，いずれも要素数が n(n≧1) である実数型の配列 vector1 と vector2 を受け取り，二つの配列のコサイン類似度を返す。配列 vector1 が {a1, a2, …, an}，配列 vector2 が {b1, b2, …, bn} のとき，コサイン類似度は次の数式で計算される。ここで，配列 vector1 と配列 vector2 のいずれも，全ての要素に 0 が格納されていることはないものとする。

（a1b1 ＋ a2b2 ＋ … ＋ anbn）÷（√(a1² ＋ a2² ＋ … ＋ an²) × √(b1² ＋ b2² ＋ … ＋ bn²)）

〔プログラム〕

\`\`\`text
○実数型: calcCosineSimilarity(実数型の配列: vector1, 実数型の配列: vector2)
  実数型: similarity, numerator, denominator, temp ← 0
  整数型: i
  numerator ← 0
  for (i を 1 から vector1の要素数 まで 1 ずつ増やす)
    numerator ← numerator ＋ ［ a ］
  endfor
  for (i を 1 から vector1の要素数 まで 1 ずつ増やす)
    temp ← temp ＋ vector1[i]の2乗
  endfor
  denominator ← tempの正の平方根
  temp ← 0
  for (i を 1 から vector2の要素数 まで 1 ずつ増やす)
    temp ← temp ＋ vector2[i]の2乗
  endfor
  denominator ← ［ b ］
  similarity ← numerator ÷ denominator
  return similarity
\`\`\``,
      choices: [
        "a: (vector1[i] × vector2[i])の正の平方根／b: denominator × (tempの正の平方根)",
        "a: (vector1[i] × vector2[i])の正の平方根／b: denominator ＋ (tempの正の平方根)",
        "a: (vector1[i] × vector2[i])の正の平方根／b: tempの正の平方根",
        "a: vector1[i] × vector2[i]／b: denominator × (tempの正の平方根)",
        "a: vector1[i] × vector2[i]／b: denominator ＋ (tempの正の平方根)",
        "a: vector1[i] × vector2[i]／b: tempの正の平方根",
        "a: vector1[i]の2乗／b: denominator × (tempの正の平方根)",
        "a: vector1[i]の2乗／b: denominator ＋ (tempの正の平方根)",
        "a: vector1[i]の2乗／b: tempの正の平方根",
      ],
      middle: "アルゴリズムとプログラミング",
      tags: ["コサイン類似度", "ベクトル", "内積"],
      explanation:
        "数式の分子は各要素の積の和 a1b1＋…＋anbn なので，最初のループで numerator に加えるのは vector1[i] × vector2[i] であり，a は平方根を取らない積です。分母は vector1 の要素の 2 乗和の平方根と vector2 の要素の 2 乗和の平方根の積です。プログラムでは 2 番目のループの後で denominator に vector1 側の平方根が入り，3 番目のループで temp に vector2 側の 2 乗和が入るので，b は denominator × (tempの正の平方根) です。したがってエが正解です。オやクのように ＋ でつなぐと分母が積にならず，カやケのように temp の平方根だけにすると vector1 側の大きさが無視されてしまいます。",
    },
    6: {
      middle: "セキュリティ",
      tags: ["業務委託", "フィッシング", "初期設定", "リスク評価"],
      explanation:
        "複合機からの通知メールの差出人アドレス，件名，本文，添付ファイル名が初期設定のままで，その初期設定がベンダーの Web サイトで公開されていると，攻撃者は複合機からのメールと見分けがつかないメールを簡単に作れます。B 業務の従業員がそれを本物と信じて本文中の URL をクリックすれば，フィッシングサイトに誘導されて採用予定者の個人情報が漏えいするおそれがあるので，アが A 社の評価したリスクです。イは業務の遅延であって情報セキュリティリスクではありません。ウは添付ファイルを盗聴して暗号化するという想定自体が現実的でなく，エは B サーバへのアクセスに従業員ごとの利用者 ID とパスワードが必要なので URL だけでは個人情報にたどり着けません。",
    },
  },
};

export default o;
