import json
from pathlib import Path
import pypdf
import sys

source = Path(sys.argv[1]) if len(sys.argv)>1 else Path(r'C:/Users/xinyu/Documents/周易译注.pdf')
out = Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).parent
out.mkdir(parents=True,exist_ok=True)
reader = pypdf.PdfReader(source)
pages = []
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ''
    pages.append({'page': i + 1, 'text': text})
    if (i + 1) % 25 == 0:
        print(f'Extracted {i + 1}/{len(reader.pages)}', flush=True)
(out / 'pages.raw.json').write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding='utf-8')
(out / 'pages.raw.txt').write_text('\n\n'.join(f'=== PDF PAGE {p["page"]} ===\n{p["text"]}' for p in pages), encoding='utf-8')
print('Saved raw extraction', flush=True)
