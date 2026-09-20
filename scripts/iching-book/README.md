# 《周易译注》数据与修订记录

网站使用 `iching/book-notes.mjs`。本目录保存人工转录、校订记录和小型校验工具，合计约 450 KB，不包含用户的 PDF、页面图片或大体积 OCR 缓存。

`corrections/` 包含 957 段逐图转录的译文，另 7 段乾卦小象及合注保存在 `audit-notes.json`；总论共 64 篇。下册 4 段扫描褪色处采用明确标记的编者补译，提示保存在 `translationNote`。注释、说明以原 PDF OCR 为底本，保留来源页码，并收录整段修订和定点替换记录；没有声称对全部注释逐字校勘。

上册 PDF 第 32 页对应书页 1，下册 PDF 第 8 页对应书页 225。每段 `pages` 是所属册 PDF 页码，所属册由卦的 `volume` 确定。总论、人工译文不经过通用 OCR 清理，以免误改人名、日/曰等字。

## 检查与重新应用

需要 Python 3.9+，下面的校验和修订应用只使用标准库：

```powershell
python scripts/iching-book/apply_corrections.py --check
python scripts/iching-book/apply_corrections.py --output tmp/book-notes.review.mjs
```

默认以当前网站模块为底本，也可以使用 `--input 路径` 指定已有模块。写出前依次应用整段注释修订、精确替换、安全排版修正，最后原样恢复人工译文和总论。`--check` 核对全部人工译文和总论；不写文件。此工具用于复核、继续校订，不从空白重建数据。

## 从原 PDF 检查文字和坐标

`extract_raw.py` 使用 `pypdf`，`extract_geometry.py` 使用 `pdfplumber`。它们接受 PDF 路径及输出文件夹：

```powershell
python scripts/iching-book/extract_raw.py "C:\path\周易译注.pdf" tmp/iching-review/upper
python scripts/iching-book/extract_geometry.py "C:\path\周易译注.pdf" tmp/iching-review/upper
python scripts/iching-book/extract_geometry.py "C:\path\周易译注-2007下.pdf" tmp/iching-review/lower
```

原书的经文和译文交替分栏，注释与说明通栏，而且旧 OCR 有错序和漏字。因此这些提取结果只是审校材料，不能直接替代网站数据。原开发时的版面分段、Windows OCR 与人工页面核对缓存未归档；仅用以上命令不能逐字重建当前全部注释。最终模块、人工修订和来源页码是后续校订的基准。

验收：在仓库根目录运行 `node --test iching/tests/*.test.mjs`。
