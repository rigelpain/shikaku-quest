// IPA 共通キャリア・スキルフレームワークに基づく出題分野（大分類・中分類）
export type Major = "テクノロジ系" | "マネジメント系" | "ストラテジ系";

export interface MiddleCategory {
  major: Major;
  middle: string;
  /** 一言説明（分野一覧やテキスト見出しの補足） */
  hint: string;
}

export const CATEGORIES: MiddleCategory[] = [
  { major: "テクノロジ系", middle: "基礎理論", hint: "2進数・論理演算・確率・情報理論" },
  { major: "テクノロジ系", middle: "アルゴリズムとプログラミング", hint: "データ構造・探索・整列・擬似言語" },
  { major: "テクノロジ系", middle: "コンピュータ構成要素", hint: "CPU・メモリ・入出力・性能" },
  { major: "テクノロジ系", middle: "システム構成要素", hint: "冗長構成・稼働率・クラウド" },
  { major: "テクノロジ系", middle: "ソフトウェア", hint: "OS・ファイル・OSS" },
  { major: "テクノロジ系", middle: "ハードウェア", hint: "論理回路・組込み・電子部品" },
  { major: "テクノロジ系", middle: "ユーザーインタフェース", hint: "UI設計・アクセシビリティ" },
  { major: "テクノロジ系", middle: "情報メディア", hint: "画像・音声・圧縮" },
  { major: "テクノロジ系", middle: "データベース", hint: "正規化・SQL・トランザクション" },
  { major: "テクノロジ系", middle: "ネットワーク", hint: "TCP/IP・LAN・プロトコル" },
  { major: "テクノロジ系", middle: "セキュリティ", hint: "暗号・認証・攻撃手法・対策" },
  { major: "テクノロジ系", middle: "システム開発技術", hint: "要件定義・設計・テスト" },
  { major: "テクノロジ系", middle: "ソフトウェア開発管理技術", hint: "開発プロセス・アジャイル・構成管理" },
  { major: "マネジメント系", middle: "プロジェクトマネジメント", hint: "WBS・EVM・リスク管理" },
  { major: "マネジメント系", middle: "サービスマネジメント", hint: "ITIL・SLA・インシデント" },
  { major: "マネジメント系", middle: "システム監査", hint: "監査手続・内部統制" },
  { major: "ストラテジ系", middle: "システム戦略", hint: "業務分析・BPR・SoR/SoE" },
  { major: "ストラテジ系", middle: "システム企画", hint: "調達・RFP・投資効果" },
  { major: "ストラテジ系", middle: "経営戦略マネジメント", hint: "SWOT・PPM・マーケティング" },
  { major: "ストラテジ系", middle: "技術戦略マネジメント", hint: "イノベーション・ロードマップ" },
  { major: "ストラテジ系", middle: "ビジネスインダストリ", hint: "e-ビジネス・IoT・業種別システム" },
  { major: "ストラテジ系", middle: "企業活動", hint: "会計・損益分岐点・組織" },
  { major: "ストラテジ系", middle: "法務", hint: "知的財産・労働法・セキュリティ関連法" },
];

export const MAJORS: Major[] = ["テクノロジ系", "マネジメント系", "ストラテジ系"];

export function middlesOf(major: Major): MiddleCategory[] {
  return CATEGORIES.filter((c) => c.major === major);
}

export function findCategory(middle: string): MiddleCategory | undefined {
  return CATEGORIES.find((c) => c.middle === middle);
}
