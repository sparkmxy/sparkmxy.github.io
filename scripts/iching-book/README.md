# 《周易译注》数据与修订记录

网站使用 `iching/book-notes.mjs`。本目录保存人工转录、校订记录和小型校验工具，不包含用户的 PDF、完整页面图片或大体积 OCR 缓存。

`corrections/` 包含 957 段逐图转录的译文，另 7 段乾卦小象及合注保存在 `audit-notes.json`；总论共 64 篇。下册 4 段扫描褪色处采用明确标记的编者补译，提示保存在 `translationNote`。注释、说明以原 PDF OCR 为底本，保留来源页码，并收录整段修订和定点替换记录；没有声称对全部注释逐字校勘。

上册 PDF 第 32 页对应书页 1，下册 PDF 第 8 页对应书页 225。每段 `pages` 是所属册 PDF 页码，所属册由卦的 `volume` 确定。总论、人工译文不经过通用 OCR 清理，以免误改人名、日/曰等字。

## 检查与重新应用

需要 Python 3.9+，下面的校验和修订应用只使用标准库：

```powershell
python scripts/iching-book/apply_corrections.py --check
python scripts/iching-book/apply_corrections.py --output tmp/book-notes.review.mjs
```

默认以当前网站模块为底本，也可以使用 `--input 路径` 指定已有模块。写出前依次应用整段注释修订、精确替换、安全排版修正，恢复人工译文和总论，最后应用 `proofread-20260922.json` 的整段校订，防止旧 OCR 清理覆盖已核对文字。`--check` 核对全部人工译文、总论和本次校订字段；不写文件。此工具用于复核、继续校订，不从空白重建数据。

## 2026-09-22 专项校读

按用户指定的三类风险检查六十四卦文本：异常英文字母、误识别的卦符号、突然中断的句子。首轮审查 369 处候选，随后补查段内引文、引号配对与 187 处候选，修订 560 个注释或说明字段；这些是字段数，并非错字数。每条修订保存原文、修订后全文和 PDF 页码。

除修复误字、漏句和标点外，移除了 OCR 拼接产生的重复残段，恢复了缺失的注释开头。964 段译文、64 篇总论保持原样；扫描不清处的编者补译提示也保留。

最终扫描 2,919 个段落，仅留下 125 段含有合法拼音的提示，无异常句尾、未配对引号、书名号、括号或损坏字符提示。六十四卦的上下卦名称及符号另与六爻编码逐卦校验。扫描工具只找候选，不自动替换文字；这些检查不能代替逐字校勘，也不表示原 OCR 的所有潜在误字均已发现。

```powershell
node scripts/iching-book/audit_text.mjs tmp/iching-audit.json
```

13 个难以用通用字体准确表示的古文字形，采用原扫描页的单字裁图，位于 `iching/assets/book/`。标记与册次、PDF 页码的映射见 `iching/book-glyphs.mjs`，页面以带替代文字的行内图片呈现。其余正文始终作为纯文本渲染。

## 从原 PDF 检查文字和坐标

`extract_raw.py` 使用 `pypdf`，`extract_geometry.py` 使用 `pdfplumber`。它们接受 PDF 路径及输出文件夹：

```powershell
python scripts/iching-book/extract_raw.py "C:\path\周易译注.pdf" tmp/iching-review/upper
python scripts/iching-book/extract_geometry.py "C:\path\周易译注.pdf" tmp/iching-review/upper
python scripts/iching-book/extract_geometry.py "C:\path\周易译注-2007下.pdf" tmp/iching-review/lower
```

原书的经文和译文交替分栏，注释与说明通栏，而且旧 OCR 有错序和漏字。因此这些提取结果只是审校材料，不能直接替代网站数据。原开发时的版面分段、Windows OCR 与人工页面核对缓存未归档；仅用以上命令不能逐字重建当前全部注释。最终模块、人工修订和来源页码是后续校订的基准。

验收：在仓库根目录运行 `node --test iching/tests/*.test.mjs`。
