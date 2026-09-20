import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createCast, YARROW_MODEL } from './core.mjs';

const WORD_RANGE = 65_536;
const POOL_SIZE = 128;
const SOURCES = ['random-org', 'random-org-api', 'web-crypto'];
const DISCLAIMER = '此结果只核对文件内的演算一致性，不证明随机来源、时间或问事内容真实，也不验证第三方签名。';

function mismatch(message) {
  return { ok: false, message: `复核不一致：${message}`, disclaimer: DISCLAIMER };
}

/**
 * Recompute an exported reading without any network request.
 * Unused pool entries cannot be authenticated: changing them may leave the
 * computation unchanged. Neither a valid cast nor provider labels are a
 * digital signature or proof of where the random words originated.
 */
export function verifyReading(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return mismatch('记录必须是 JSON 对象。');
  }
  if (record.version !== 1) return mismatch('不支持此记录版本。');
  if (!isDeepStrictEqual(record.model, YARROW_MODEL)) {
    return mismatch('蓍草算法模型与当前版本不符。');
  }

  const entropy = record.entropy;
  if (!entropy || !SOURCES.includes(entropy.source) || entropy.sampling !== 'uint16-rejection-v1' ||
      entropy.wordBits !== 16 || entropy.poolSize !== POOL_SIZE || entropy.signed !== false) {
    return mismatch('随机数元数据缺失或格式不符。');
  }
  if (!Array.isArray(entropy.raw) || entropy.raw.length !== POOL_SIZE ||
      !Array.from(entropy.raw).every(word => Number.isInteger(word) && word >= 0 && word < WORD_RANGE)) {
    return mismatch('原始随机数必须为 128 个 0 至 65535 之间的整数。');
  }
  if (!Number.isInteger(entropy.consumed) || entropy.consumed < 36 || entropy.consumed > POOL_SIZE ||
      !Number.isInteger(entropy.rejected) || entropy.rejected < 0 || entropy.rejected > entropy.consumed) {
    return mismatch('随机数消耗或拒绝计数无效。');
  }
  if (!Array.isArray(record.lines) || record.lines.length !== 6) {
    return mismatch('记录必须包含自下而上的完整六爻。');
  }

  let consumed = 0;
  let rejected = 0;
  const drawInt = bound => {
    const limit = WORD_RANGE - (WORD_RANGE % bound);
    while (consumed < entropy.raw.length) {
      const word = entropy.raw[consumed++];
      if (word < limit) return word % bound;
      rejected += 1;
    }
    throw new RangeError('原始随机数不足以完成十八变。');
  };

  let cast;
  try { cast = createCast(drawInt); }
  catch (error) { return mismatch(error.message); }

  for (let i = 0; i < 6; i += 1) {
    if (!isDeepStrictEqual(cast.lines[i], record.lines[i])) {
      return mismatch(`自下而上第 ${i + 1} 爻的爻值或三变过程与原始随机数不符。`);
    }
  }
  if (consumed !== entropy.consumed || rejected !== entropy.rejected) {
    return mismatch(`消耗/拒绝计数不符；复算得到 ${consumed}/${rejected}。`);
  }
  return {
    ok: true,
    message: `复核一致：六爻十八变完全匹配，消耗 ${consumed} 个随机整数，拒绝 ${rejected} 个。`,
    disclaimer: DISCLAIMER,
    consumed,
    rejected,
  };
}

async function main() {
  if (process.argv.length !== 3) {
    console.error('用法：node iching/verify.mjs <导出的 JSON 文件路径>');
    process.exitCode = 2;
    return;
  }
  try {
    const filename = path.resolve(process.argv[2]);
    const info = await stat(filename);
    if (!info.isFile() || info.size > 1024 * 1024) {
      throw new Error('请选择不超过 1 MiB 的 JSON 文件。');
    }
    const record = JSON.parse(await readFile(filename, 'utf8'));
    const result = verifyReading(record);
    console.log(result.message);
    console.log(result.disclaimer);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`无法复核：${error instanceof SyntaxError ? '文件不是有效的 JSON。' : error.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
