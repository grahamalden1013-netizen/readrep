import sys, zipfile, re
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
path = sys.argv[1]
z = zipfile.ZipFile(path)

# numbering: map numId -> fmt per level (bullet vs decimal)
numfmt = {}
try:
    num = ET.fromstring(z.read('word/numbering.xml'))
    abs_fmt = {}
    for an in num.iter(W+'abstractNum'):
        aid = an.get(W+'abstractNumId')
        lv = {}
        for l in an.iter(W+'lvl'):
            ilvl = l.get(W+'ilvl')
            f = l.find(W+'numFmt')
            lv[ilvl] = f.get(W+'val') if f is not None else 'bullet'
        abs_fmt[aid] = lv
    for n in num.iter(W+'num'):
        nid = n.get(W+'numId')
        a = n.find(W+'abstractNumId')
        if a is not None:
            numfmt[nid] = abs_fmt.get(a.get(W+'val'), {})
except KeyError:
    pass

doc = ET.fromstring(z.read('word/document.xml'))
body = doc.find(W+'body')

def runs_text(p):
    out = []
    for node in p.iter():
        t = node.tag
        if t == W+'t':
            out.append(node.text or '')
        elif t == W+'tab':
            out.append('\t')
        elif t == W+'br':
            out.append('\n')
    return ''.join(out)

def para_md(p):
    txt = runs_text(p).strip()
    ppr = p.find(W+'pPr')
    style = ''
    ilvl = '0'; numid = None
    if ppr is not None:
        s = ppr.find(W+'pStyle')
        if s is not None: style = s.get(W+'val') or ''
        npr = ppr.find(W+'numPr')
        if npr is not None:
            il = npr.find(W+'ilvl'); ni = npr.find(W+'numId')
            if il is not None: ilvl = il.get(W+'val') or '0'
            if ni is not None: numid = ni.get(W+'val')
    if not txt:
        return ''
    m = re.match(r'^Heading(\d)$', style, re.I)
    if m:
        return '#'*int(m.group(1)) + ' ' + txt
    if style.lower() in ('title',):
        return '# ' + txt
    if style.lower() in ('subtitle',):
        return '## ' + txt
    sl = style.lower()
    if numid is not None or sl in ('listbullet', 'listnumber'):
        if numid is not None:
            fmt = numfmt.get(numid, {}).get(ilvl, 'bullet')
        else:
            fmt = 'bullet' if sl == 'listbullet' else 'decimal'
        indent = '  ' * int(ilvl)
        marker = '-' if fmt == 'bullet' else '1.'
        return f'{indent}{marker} {txt}'
    return txt

def table_md(tbl):
    rows = []
    for tr in tbl.findall(W+'tr'):
        cells = []
        for tc in tr.findall(W+'tc'):
            parts = [runs_text(p).strip() for p in tc.findall(W+'p')]
            cells.append(' '.join(x for x in parts if x).replace('|', '\\|'))
        rows.append(cells)
    if not rows:
        return ''
    n = max(len(r) for r in rows)
    rows = [r + ['']*(n-len(r)) for r in rows]
    out = ['| ' + ' | '.join(rows[0]) + ' |', '| ' + ' | '.join(['---']*n) + ' |']
    for r in rows[1:]:
        out.append('| ' + ' | '.join(r) + ' |')
    return '\n'.join(out)

lines = []
for child in body:
    if child.tag == W+'p':
        md = para_md(child)
        prev_list = bool(lines) and lines[-1][:2] in ('- ', '1.') or (bool(lines) and lines[-1].startswith('  '))
        is_list = md[:2] in ('- ', '1.') or md.startswith('  -') or md.startswith('  1.')
        if md and lines and lines[-1] != '' and not (is_list and prev_list):
            lines.append('')
        lines.append(md)
    elif child.tag == W+'tbl':
        lines.append('')
        lines.append(table_md(child))
        lines.append('')

# collapse runs of blank lines
out = []
for l in lines:
    if l == '' and out and out[-1] == '':
        continue
    out.append(l)
print('\n'.join(out).strip())
