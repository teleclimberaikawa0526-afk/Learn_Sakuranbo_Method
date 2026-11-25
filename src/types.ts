export type GameState = 'title' | 'playing' | 'result' | 'encyclopedia' | 'gacha';

export type CourseType = 'addition' | 'subtraction' | 'mixed';

export type OperationType = 'addition' | 'subtraction';

export type StepIndex = 0 | 1 | 2;

export interface PlayerData {
  miles: number;
  unlockedTrainIds: string[];
}

export interface StepGuide {
  /** 画面に表示するひらがなガイド */
  displayText: string;
  /** 音声で読み上げる自然な日本語テキスト */
  speechText: string;
  /** このステップの正解数値 */
  correctValue: number;
  /** 正解時のほめ音声 */
  praiseSpeech: string;
  /** 不正解時のヒント音声 */
  hintSpeech: string;
}

export interface SakuranboQuestion {
  id: string;
  type: OperationType;
  /** 左の数（足し算: 2..9 / 引き算: 11..18） */
  a: number;
  /** 右の数（足し算: 2..9 / 引き算: 2..9） */
  b: number;
  /** 最終的な答え */
  answer: number;
  /**
   * さくらんぼの左の実
   * - 足し算(8+5): 10をつくる相棒 (2)
   * - 引き算(13-5): 10のまとまり (10)
   */
  cherryLeft: number;
  /**
   * さくらんぼの右の実
   * - 足し算(8+5): 残り (3)
   * - 引き算(13-5): 1のくらいの数 (3)
   */
  cherryRight: number;
  /**
   * 引き算ステップ2の途中結果 (10 - b)
   * 足し算では 10
   */
  intermediateResult: number;
  /** 3つのステップのガイドと正解 */
  steps: [StepGuide, StepGuide, StepGuide];
}
