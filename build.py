#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้างไฟล์ใช้งานจริงจากไฟล์ต้นแบบใน src/"""
import json, pathlib, sys, re

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'

API_URL = sys.argv[1] if len(sys.argv) > 1 else ''

schools = json.load(open(ROOT / 'schools2569.json', encoding='utf-8'))
schools_json = json.dumps(schools, ensure_ascii=False, separators=(',', ':'))
slim = [{'code': s['code'], 'name': s['name'], 'group': s['group'],
         'amphoe': s['amphoe'], 'total': s['total'], 'size': s['size']} for s in schools]
schools_slim = json.dumps(slim, ensure_ascii=False, separators=(',', ':'))
icons = open(SRC / 'icons.svg', encoding='utf-8').read().strip()
rubric = open(ROOT / 'rubric.js', encoding='utf-8').read().strip()

def sub(txt, **kw):
    for k, v in kw.items():
        txt = txt.replace('__%s__' % k, v)
    return txt

# ---- Code.gs -------------------------------------------------------------
gs = open(SRC / 'Code.template.gs', encoding='utf-8').read()
gs = sub(gs, SCHOOLS_JSON=schools_json)
(ROOT / 'Code.gs').write_text(gs, encoding='utf-8')

# ---- หน้าเว็บ ------------------------------------------------------------
pages = {
    'index.template.html': 'index.html',    # หน้าเขตพื้นที่ (สาธารณะ)
    'school.template.html': 'school.html',  # หน้าโรงเรียน (สาธารณะ)
    'form.template.html': 'form.html',      # หน้ากรอกข้อมูล (ต้องล็อกอิน)
}
for tpl, out in pages.items():
    p = SRC / tpl
    if not p.exists():
        print('  ! ข้าม', tpl, '(ยังไม่มีไฟล์)')
        continue
    t = open(p, encoding='utf-8').read()
    t = sub(t, ICONS=icons, RUBRIC_JS=rubric,
            SCHOOLS_JSON=schools_json, SCHOOLS_SLIM=schools_slim)
    if API_URL:
        t = re.sub(r'const API_URL = "[^"]*";', 'const API_URL = "%s";' % API_URL, t, count=1)
    (ROOT / out).write_text(t, encoding='utf-8')
    print('  ✓', out, '%.1f KB' % (len(t.encode()) / 1024))

print('  ✓ Code.gs %.1f KB' % (len(gs.encode()) / 1024))
print('  โรงเรียน', len(schools), 'แห่ง')
