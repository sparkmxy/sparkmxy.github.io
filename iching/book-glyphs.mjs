// Rare historical forms are small crops from the user's source scans.
// PDF pages identify the supplied volume, not the printed page number.
export const BOOK_GLYPHS = Object.freeze({
  '〔屯甲骨字形〕': { file: 'tun-oracle.png', volume: 'upper', page: 58 },
  '〔屯颂壶字形〕': { file: 'tun-song-hu.png', volume: 'upper', page: 58 },
  '〔屯颂鼎字形〕': { file: 'tun-song-ding.png', volume: 'upper', page: 58 },
  '〔颐横视字形〕': { file: 'yi-horizontal.png', volume: 'upper', page: 158 },
  '〔颐金文字形〕': { file: 'yi-bronze.png', volume: 'upper', page: 158 },
  '〔腾古文字形〕': { file: 'teng-ancient.png', volume: 'upper', page: 216 },
  '〔遯异体字形〕': { file: 'dun-variant.png', volume: 'upper', page: 223 },
  '〔肥古文字形〕': { file: 'fei-ancient.png', volume: 'upper', page: 226 },
  '〔天古文字形〕': { file: 'tian-ancient.png', volume: 'upper', page: 253 },
  '〔允异体字形〕': { file: 'yun-variant.png', volume: 'lower', page: 53 },
  '〔鼎史兽鼎字形〕': { file: 'ding-shishou.png', volume: 'lower', page: 74 },
  '〔鼎召鼎字形〕': { file: 'ding-zhao.png', volume: 'lower', page: 74 },
  '〔虩阮刻字形〕': { file: 'xi-variant.png', volume: 'lower', page: 81 },
});

export function appendBookText(parent, text) {
  // Never treat source text as HTML; only explicitly registered markers become images.
  for (const part of text.split(/(〔[^〕]+字形〕)/u)) {
    const glyph = BOOK_GLYPHS[part];
    if (!glyph) {
      parent.append(document.createTextNode(part));
      continue;
    }
    const image = document.createElement('img');
    image.className = 'book-source-glyph';
    image.src = new URL(`./assets/book/${glyph.file}`, import.meta.url).href;
    image.alt = part.slice(1, -1);
    image.title = `${image.alt} · 原书${glyph.volume === 'upper' ? '上' : '下'}册 PDF 第 ${glyph.page} 页`;
    parent.append(image);
  }
}
