import type { CourseType, SakuranboQuestion } from '../types';

const NUMBER_READINGS: Record<number, string> = {
  0: 'れい',
  1: 'いち',
  2: 'に',
  3: 'さん',
  4: 'よん',
  5: 'ご',
  6: 'ろく',
  7: 'なな',
  8: 'はち',
  9: 'きゅう',
  10: 'じゅう',
  11: 'じゅういち',
  12: 'じゅうに',
  13: 'じゅうさん',
  14: 'じゅうよん',
  15: 'じゅうご',
  16: 'じゅうろく',
  17: 'じゅうなな',
  18: 'じゅうはち',
};

const readNum = (n: number): string => NUMBER_READINGS[n] ?? String(n);

const buildAdditionQuestion = (a: number, b: number, index: number): SakuranboQuestion => {
  const cherryLeft = 10 - a;
  const cherryRight = b - cherryLeft;
  const answer = a + b;

  return {
    id: `add-${a}-${b}-${index}`,
    type: 'addition',
    a,
    b,
    answer,
    cherryLeft,
    cherryRight,
    intermediateResult: 10,
    steps: [
      {
        displayText: `${a} は あと いくつで 10 に なるかな？`,
        speechText: `${readNum(a)} たす ${readNum(b)}。${readNum(a)} は、あと いくつで じゅう に なるかな？`,
        correctValue: cherryLeft,
        praiseSpeech: `せいかい！${readNum(a)} と ${readNum(cherryLeft)} で じゅう だね！`,
        hintSpeech: `おしい！うえの わくの あいている ところを かぞえてみてね。`,
      },
      {
        displayText: `${b} を ${cherryLeft} と いくつ に わけるかな？`,
        speechText: `つぎは、${readNum(b)} を、${readNum(cherryLeft)} と いくつ に わけるかな？`,
        correctValue: cherryRight,
        praiseSpeech: `すごい！${readNum(b)} を ${readNum(cherryLeft)} と ${readNum(cherryRight)} に わけられたね！`,
        hintSpeech: `おしい！${readNum(b)} から ${readNum(cherryLeft)} を わけると、のこりは いくつかな？`,
      },
      {
        displayText: `10 と ${cherryRight} で いくつに なるかな？`,
        speechText: `${readNum(a)} と ${readNum(cherryLeft)} で じゅう！じゅう と ${readNum(cherryRight)} で いくつかな？`,
        correctValue: answer,
        praiseSpeech: `やったー！こたえは ${readNum(answer)}！だいせいかい！`,
        hintSpeech: `おしい！じゅう の まとまり と、のこりの ${readNum(cherryRight)} を あわせてみよう。`,
      },
    ],
  };
};

const buildSubtractionQuestion = (a: number, b: number, index: number): SakuranboQuestion => {
  const cherryLeft = 10;
  const cherryRight = a - 10;
  const intermediateResult = 10 - b;
  const answer = a - b;

  return {
    id: `sub-${a}-${b}-${index}`,
    type: 'subtraction',
    a,
    b,
    answer,
    cherryLeft,
    cherryRight,
    intermediateResult,
    steps: [
      {
        displayText: `${a} を 10 と いくつ に わけるかな？`,
        speechText: `${readNum(a)} ひく ${readNum(b)}。${readNum(a)} を、じゅう と いくつ に わけるかな？`,
        correctValue: cherryRight,
        praiseSpeech: `せいかい！${readNum(a)} は じゅう と ${readNum(cherryRight)} だね！`,
        hintSpeech: `おしい！じゅう の まとまり の ほかに、ばらの ブロックが いくつ あるかな？`,
      },
      {
        displayText: `10 から ${b} を ひくと いくつかな？`,
        speechText: `つぎは、じゅう から ${readNum(b)} を ひくと いくつかな？`,
        correctValue: intermediateResult,
        praiseSpeech: `よくできたね！じゅう ひく ${readNum(b)} は ${readNum(intermediateResult)} だね！`,
        hintSpeech: `おしい！じゅう から ${readNum(b)} こ けした のこりを かぞえてみよう。`,
      },
      {
        displayText: `のこった ${intermediateResult} と ${cherryRight} を あわせると いくつかな？`,
        speechText: `さいごだよ！のこった ${readNum(intermediateResult)} と ${readNum(cherryRight)} を あわせると いくつかな？`,
        correctValue: answer,
        praiseSpeech: `やったー！こたえは ${readNum(answer)}！だいせいかい！`,
        hintSpeech: `おしい！のこった ${readNum(intermediateResult)} こ と、${readNum(cherryRight)} こ を ぜんぶ かぞえてみよう。`,
      },
    ],
  };
};

/** 繰り上がりのある足し算の全候補 (a + b >= 11, a in 2..9, b in 2..9) */
const getAllAdditionPairs = (): Array<[number, number]> => {
  const pairs: Array<[number, number]> = [];
  for (let a = 5; a <= 9; a++) {
    for (let b = 2; b <= 9; b++) {
      if (a + b >= 11 && a + b <= 18) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
};

/** 繰り下がりのある引き算の全候補 (a in 11..18, b in 2..9, a - b in 2..9) */
const getAllSubtractionPairs = (): Array<[number, number]> => {
  const pairs: Array<[number, number]> = [];
  for (let a = 11; a <= 18; a++) {
    for (let b = 2; b <= 9; b++) {
      const ans = a - b;
      // 1の位より引く数が大きい（繰り下がりが必須）
      if (b > a - 10 && ans >= 2 && ans <= 9) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const generateQuestions = (course: CourseType, count = 5): SakuranboQuestion[] => {
  const addPool = shuffle(getAllAdditionPairs());
  const subPool = shuffle(getAllSubtractionPairs());

  const result: SakuranboQuestion[] = [];

  if (course === 'addition') {
    for (let i = 0; i < count; i++) {
      const [a, b] = addPool[i % addPool.length];
      result.push(buildAdditionQuestion(a, b, i));
    }
  } else if (course === 'subtraction') {
    for (let i = 0; i < count; i++) {
      const [a, b] = subPool[i % subPool.length];
      result.push(buildSubtractionQuestion(a, b, i));
    }
  } else {
    // Mixed: alternate/shuffle addition and subtraction evenly
    const types = shuffle(
      Array.from({ length: count }, (_, idx) => (idx % 2 === 0 ? 'addition' : 'subtraction'))
    );
    let addIdx = 0;
    let subIdx = 0;
    types.forEach((t, i) => {
      if (t === 'addition') {
        const [a, b] = addPool[addIdx++ % addPool.length];
        result.push(buildAdditionQuestion(a, b, i));
      } else {
        const [a, b] = subPool[subIdx++ % subPool.length];
        result.push(buildSubtractionQuestion(a, b, i));
      }
    });
  }

  return result;
};
