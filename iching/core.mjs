/**
 * The yarrow-stalk procedure in Zhu Xi's 筮仪, 原本周易本义, 卷末下.
 * Source: https://zh.wikisource.org/wiki/原本周易本義_(四庫全書本)/卷末下
 *
 * This is an explicit mathematical model of the text's remainder classes.
 * For each change, the four possible LEFT remainders are equally likely.
 * A second draw chooses uniformly among valid splits in that class. This
 * produces a real, inspectable split while preserving the text's 3:1 first
 * change and 1:1 later changes. Uniformly selecting all possible pile sizes
 * would give slightly different probabilities, so we do not claim to do so.
 * drawInt(bound) must return an unbiased integer in [0, bound).
 */

export const YARROW_MODEL = Object.freeze({
  id: 'equiprobable-remainders-v1',
  description: '依《筮仪》的四种余数等可能建模，再在对应余数的合法分堆中等概率选取一次；并非所有分堆大小等概率。',
  probabilities: Object.freeze({ 6: 1 / 16, 7: 5 / 16, 8: 7 / 16, 9: 3 / 16 }),
});

function drawChecked(drawInt, bound) {
  const value = drawInt(bound);
  if (!Number.isInteger(value) || value < 0 || value >= bound) {
    throw new RangeError(`随机源必须返回 0 至 ${bound - 1} 之间的整数。`);
  }
  return value;
}

// A pile divisible by four leaves FOUR stalks, never zero.
function remainder(pile) {
  return ((pile - 1) % 4) + 1;
}

/** Create one line: three changes starting from 49 stalks. */
export function createLine(drawInt) {
  if (typeof drawInt !== 'function') {
    throw new TypeError('请提供 drawInt(maxExclusive) 随机整数函数。');
  }
  let before = 49;
  const steps = [];

  for (let change = 0; change < 3; change += 1) {
    const leftRemainder = drawChecked(drawInt, 4) + 1;
    // Both piles must be nonempty after hanging one from the right.
    const splitCount = Math.floor((before - 2 - leftRemainder) / 4) + 1;
    const left = leftRemainder + 4 * drawChecked(drawInt, splitCount);
    const right = before - left;
    const hanging = 1;
    const rightRemainder = remainder(right - hanging);
    const removed = hanging + leftRemainder + rightRemainder;
    const remaining = before - removed;

    steps.push({
      before,
      left,
      right,
      hanging,
      leftRemainder,
      rightRemainder,
      removed,
      remaining,
    });
    before = remaining;
  }

  return { value: before / 4, steps };
}

/** Six lines in construction order: bottom (初爻) to top (上爻). */
export function createCast(drawInt) {
  return { lines: Array.from({ length: 6 }, () => createLine(drawInt)) };
}
