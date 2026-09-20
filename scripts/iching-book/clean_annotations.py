"""Conservative OCR typography repair, restricted to notes and explanations.

Never run this function on manually transcribed translations or overviews.
The source scan confuses printed label-box borders with brackets and Roman J.
No Latin-letter deletion is used, so phonetic transcriptions remain present.
"""
import re

TRIGRAMS = dict(zip('乾兑离震巽坎艮坤','☰☱☲☳☴☵☶☷'))

def clean_annotation(text):
    text = re.sub(r'^[］\]）】]+', '', text)
    text = text.replace('弓I','引').replace('训I','训')
    text = re.sub(r'([乾兑离震巽坎艮坤])（(?:三|松|瑟|公|四|他|时|这|EE|ES|w|W)）', lambda m:m[1]+'（'+TRIGRAMS[m[1]]+'）', text)
    text = text.replace('坤（三9','坤（☷）')
    text = re.sub(r'[UK]([^《》〈〉：，。；]{1,10})[》〉]', r'《\1》', text)
    text = re.sub(r'[《〈＜]([^《》〈〉：，。；]{1,25})[〉》＞]', r'《\1》', text)
    text = re.sub(r'(?<=。)J', '”', text)
    text = re.sub(r"(?<=[\u3400-\u9fff'’])J(?=$|[\u3400-\u9fff《（])", '。”', text)
    text = text.translate(str.maketrans({',':'，',';':'；',':':'：','•':'·'}))
    # Two OCR apostrophes are a single printed double quotation mark.
    text = re.sub(r"['‘’]{2}", '"', text)
    # Replace ASCII quotation glyphs without deleting text or inserting missing
    # quotations; explicit Chinese quotes are retained for later visual review.
    result=[]; double_open=False; single_open=False
    for char in text:
        if char in '“”':
            double_open = char=='“'
        elif char=='"':
            char='”' if double_open else '“'; double_open=not double_open
        elif char in '‘’':
            single_open=char=='‘'
        elif char=="'":
            char='’' if single_open else '‘'; single_open=not single_open
        result.append(char)
    return ''.join(result)
