"""Validate or reapply saved editorial corrections to an existing book module.

This is a correction replay tool, not an OCR reconstruction of the source PDFs.
Use --check to verify the manually transcribed translations and overviews, or
--output FILE to write a corrected copy without modifying the input module.
"""
import argparse
import json
from pathlib import Path
from clean_annotations import clean_annotation

ROOT = Path(__file__).resolve().parent
CORRECTIONS = ROOT / 'corrections'

def read(name):
    return json.loads((CORRECTIONS / name).read_text(encoding='utf-8'))

def passage(data, item):
    target = data[str(item['number'])]
    for part in item['key'].split('.'):
        target = target[int(part)] if isinstance(target, list) else target[part]
    return target

def passages(record):
    for key in ['judgment', 'tuan', 'image', 'useAll', 'useAllImage']:
        if key in record:
            yield record[key]
    yield from record['lines']
    yield from record['lineImages']

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT.parents[1] / 'iching' / 'book-notes.mjs')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    source = args.input.read_text(encoding='utf-8')
    header, rest = source.split('export const BOOK_SOURCE = ', 1)
    metadata, rest = rest.split(';\n\nexport const BOOK_NOTES = ', 1)
    metadata = json.loads(metadata)
    data = json.loads(rest.strip().removesuffix(';'))

    translations = [item for name in [
        'upper-translations.json', 'upper-translations-26-38.json',
        'lower-translations-39-56.manual.json', 'translations-57-64.json',
    ] for item in read(name)]
    overviews = read('overviews.json')
    shared = read('audit-notes.json')['qianCombinedLineImages']
    mismatches = []
    for item in translations:
        target = passage(data, item)
        for field in ['translation', 'translationNote']:
            if field in item and target.get(field) != item[field]:
                mismatches.append(f"{item['number']}/{item['key']}/{field}")
    for item in overviews:
        if data[str(item['number'])]['overview'] != item['overview']:
            mismatches.append(f"{item['number']}/overview")
    for i, translation in enumerate(shared['translation']):
        target = data['1']['lineImages'][i] if i < 6 else data['1']['useAllImage']
        if target['translation'] != [translation]:
            mismatches.append(f'1/shared-image/{i}')
    if args.check:
        print(f'Checked {len(translations) + 7} translations and {len(overviews)} overviews.')
        if mismatches:
            raise SystemExit('Mismatch: ' + ', '.join(mismatches))
        print('All manually transcribed fields match their saved sources.')
    if not args.output:
        if not args.check:
            parser.error('Specify --check or --output FILE; the input is never overwritten implicitly.')
        return

    for item in read('notes-overrides.json'):
        target = passage(data, item)
        for field in ['notes', 'explanation']:
            if field in item:
                target[field] = item[field]
    for name in ['note-text-patches-1-21.json', 'note-text-patches-22-44.json']:
        for item in read(name):
            target = passage(data, item)[item['field']]
            index = item['index']
            if index < len(target) and item['new'] not in target[index]:
                target[index] = target[index].replace(item['old'], item['new'])
    for record in data.values():
        for target in passages(record):
            for field in ['notes', 'explanation']:
                target[field] = [clean_annotation(t) for t in target[field]]

    # Authoritative manual fields are restored last and never passed to cleanup.
    for item in translations:
        target = passage(data, item)
        for field in ['translation', 'translationNote']:
            if field in item:
                target[field] = item[field]
    for item in overviews:
        data[str(item['number'])]['overview'] = item['overview']
        data[str(item['number'])]['overviewPages'] = item['overviewPages']
    for i, translation in enumerate(shared['translation']):
        target = data['1']['lineImages'][i] if i < 6 else data['1']['useAllImage']
        for field in ['notes', 'explanation', 'pages', 'noteScope']:
            target[field] = shared[field]
        target['translation'] = [translation]
    result = header + 'export const BOOK_SOURCE = ' + json.dumps(metadata, ensure_ascii=False, indent=2)
    result += ';\n\nexport const BOOK_NOTES = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result, encoding='utf-8')
    print('Wrote', args.output)

if __name__ == '__main__':
    main()
