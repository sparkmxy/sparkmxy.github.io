import json
from pathlib import Path
import pdfplumber
import sys

source = Path(sys.argv[1]) if len(sys.argv)>1 else Path(r'C:/Users/xinyu/Documents/周易译注.pdf')
out = Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).parent
out.mkdir(parents=True,exist_ok=True)
pages = []
with pdfplumber.open(source) as pdf:
    for i, page in enumerate(pdf.pages):
        chars = [{
            't': c['text'], 'x': round(c['x0'], 2), 'y': round(c['top'], 2),
            'r': round(c['x1'], 2), 'b': round(c['bottom'], 2),
            'size': round(c['size'], 2), 'font': c['fontname'],
        } for c in page.chars]
        pages.append({'page': i + 1, 'width': page.width, 'height': page.height, 'chars': chars})
        if (i + 1) % 25 == 0:
            print(f'Geometry {i + 1}/{len(pdf.pages)}', flush=True)
        page.close()
(out / 'pages.geometry.json').write_text(json.dumps(pages, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('Saved geometry', flush=True)
