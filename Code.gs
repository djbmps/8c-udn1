/*******************************************************************
 *  ระบบเก็บข้อมูลทักษะแห่งศตวรรษที่ 21 (8C)
 *  สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุดรธานี เขต 1
 *  -----------------------------------------------------------------
 *  เก็บข้อมูล 2 ระดับ
 *    1) ระดับโรงเรียน (school) — สรุปภาพรวมทั้งโรงเรียน 1 แถว/ปีการศึกษา/ภาคเรียน
 *    2) ระดับชั้น    (class)  — แยกตามระดับชั้น (อ.1 – ม.3) 1 แถว/ชั้น
 *
 *  ประเมินด้วยรูบริก 4 ระดับ ในทักษะ 8 ด้าน (C1–C8)
 *  ส่งซ้ำได้ — ระบบจะทับข้อมูลเดิมของ ปีการศึกษา+ภาคเรียน+โรงเรียน(+ระดับชั้น) เดียวกัน
 *******************************************************************/

/* =================== ⚙️ ตั้งค่า 3 บรรทัดนี้ =================== */

// 1) รหัส Google Sheet (คัดลอกจาก URL ของชีต ช่วง /d/........./edit)
const SHEET_ID = 'ใส่รหัส_GOOGLE_SHEET_ที่นี่';

// 2) รหัสผ่านสำหรับเข้าหน้าผู้ดูแลระบบ (admin.html)
const ADMIN_PASS = 'udn1@8c2569';

// 3) เปิด/ปิดการรับข้อมูล (true = เปิดรับ, false = ปิดระบบชั่วคราว)
const OPEN_FOR_SUBMIT = true;

/* ============================================================== */

const SHEET_SCHOOL = 'ระดับโรงเรียน';
const SHEET_CLASS = 'ระดับชั้น';

const C_KEYS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'];

const C_HEAD = [
  'C1 คิดวิเคราะห์แก้ปัญหา',
  'C2 คิดสร้างสรรค์นวัตกรรม',
  'C3 เข้าใจต่างวัฒนธรรม',
  'C4 ทำงานเป็นทีม/ผู้นำ',
  'C5 สื่อสาร/รู้เท่าทันสื่อ',
  'C6 คอมพิวเตอร์และ ICT',
  'C7 ทักษะอาชีพ/เรียนรู้เอง',
  'C8 เมตตา คุณธรรม วินัย'
];

const HEAD_SCHOOL = ['ลำดับ', 'วันที่บันทึก', 'แก้ไขล่าสุด', 'รหัสอ้างอิง',
  'ปีการศึกษา', 'ภาคเรียน', 'อำเภอ', 'กลุ่มโรงเรียน', 'โรงเรียน', 'ขนาดโรงเรียน',
  'จำนวนนักเรียนทั้งหมด', 'จำนวนที่ประเมิน']
  .concat(C_HEAD)
  .concat(['คะแนนเฉลี่ย 8C', 'ระดับคุณภาพ', 'จุดเด่น', 'จุดที่ควรพัฒนา', 'ลิงก์หลักฐาน',
    'ผู้กรอกข้อมูล', 'ตำแหน่ง', 'เบอร์โทรศัพท์', 'อีเมล / ID Line', 'หมายเหตุ']);

const HEAD_CLASS = ['ลำดับ', 'วันที่บันทึก', 'แก้ไขล่าสุด', 'รหัสอ้างอิง',
  'ปีการศึกษา', 'ภาคเรียน', 'อำเภอ', 'กลุ่มโรงเรียน', 'โรงเรียน', 'ระดับชั้น',
  'จำนวนนักเรียนในชั้น', 'จำนวนที่ประเมิน']
  .concat(C_HEAD)
  .concat(['คะแนนเฉลี่ย 8C', 'ระดับคุณภาพ', 'จุดเด่น', 'จุดที่ควรพัฒนา', 'ลิงก์หลักฐาน',
    'ผู้กรอกข้อมูล', 'ตำแหน่ง', 'เบอร์โทรศัพท์', 'อีเมล / ID Line', 'หมายเหตุ']);

const LEVELS = ['อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3',
  'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
  'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6',
  'มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3'];

/* ---------------------------------------------------------------
 *  doPost — รับข้อมูลจาก index.html
 * --------------------------------------------------------------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const d = JSON.parse(e.postData.contents);
    if (d.action !== 'submit') return json({ ok: false, message: 'คำสั่งไม่ถูกต้อง' });
    if (!OPEN_FOR_SUBMIT) return json({ ok: false, message: 'ขณะนี้ปิดรับข้อมูลชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' });

    const isClass = String(d.level || 'school') === 'class';

    /* ---- ตรวจสอบข้อมูลฝั่งเซิร์ฟเวอร์ ---- */
    var need = ['year', 'term', 'schoolGroup', 'school', 'nEval', 'reporter', 'position', 'phone'];
    if (isClass) need.push('grade');
    for (var i = 0; i < need.length; i++) {
      if (!d[need[i]] || String(d[need[i]]).trim() === '') {
        return json({ ok: false, message: 'ข้อมูลไม่ครบถ้วน (' + need[i] + ')' });
      }
    }
    if (isClass && LEVELS.indexOf(String(d.grade)) < 0) {
      return json({ ok: false, message: 'ระดับชั้นไม่ถูกต้อง' });
    }

    /* ---- ตรวจคะแนนรูบริก 1–4 ---- */
    const scores = [];
    for (var k = 0; k < C_KEYS.length; k++) {
      const v = Number(d[C_KEYS[k]]);
      if (!(v >= 1 && v <= 4) || Math.round(v) !== v) {
        return json({ ok: false, message: 'กรุณาให้คะแนนครบทั้ง 8 ด้าน (' + C_KEYS[k] + ')' });
      }
      scores.push(v);
    }
    const avg = Math.round((scores.reduce(function (a, b) { return a + b; }, 0) / 8) * 100) / 100;
    const grade = qualityLabel(avg);

    const nAll = Number(d.nAll || 0);
    const nEval = Number(d.nEval || 0);
    if (!(nEval > 0)) return json({ ok: false, message: 'จำนวนนักเรียนที่ประเมินต้องมากกว่า 0' });
    if (nAll > 0 && nEval > nAll) {
      return json({ ok: false, message: 'จำนวนที่ประเมินมากกว่าจำนวนนักเรียนทั้งหมด' });
    }
    if (d.evidence && !/^https?:\/\/.+/i.test(String(d.evidence))) {
      return json({ ok: false, message: 'ลิงก์หลักฐานต้องขึ้นต้นด้วย http:// หรือ https://' });
    }

    const sh = getSheet(isClass);
    const head = isClass ? HEAD_CLASS : HEAD_SCHOOL;
    const now = new Date();
    const stamp = Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    const district = districtOf(d.schoolGroup);

    /* ---- หาแถวเดิม (upsert) ---- */
    const found = findRow(sh, head, d.year, d.term, d.school, isClass ? d.grade : '');
    const seq = found ? found.seq : Math.max(0, sh.getLastRow() - 1) + 1;
    const refCode = found ? found.refCode : makeRef(now, seq, isClass);
    const created = found ? found.created : stamp;

    const row = [
      seq, created, found ? stamp : '', refCode,
      String(d.year), String(d.term), district, d.schoolGroup, d.school,
      isClass ? d.grade : (d.size || ''),
      nAll || '', nEval
    ]
      .concat(scores)
      .concat([avg, grade, d.strength || '', d.improve || '', d.evidence || '',
        d.reporter, d.position, "'" + String(d.phone), "'" + String(d.contact || ''), d.note || '']);

    if (found) {
      sh.getRange(found.row, 1, 1, head.length).setValues([row]);
    } else {
      sh.appendRow(row);
    }

    return json({
      ok: true, refCode: refCode, avg: avg, quality: grade,
      updated: !!found,
      message: found ? 'ปรับปรุงข้อมูลเดิมเรียบร้อย' : 'บันทึกข้อมูลใหม่เรียบร้อย'
    });

  } catch (err) {
    return json({ ok: false, message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์: ' + err.message });
  } finally {
    try { lock.releaseLock(); } catch (e2) { }
  }
}

/* ---------------------------------------------------------------
 *  doGet — API สำหรับหน้าผู้ดูแลระบบ (JSONP)
 *    ?action=list&token=รหัสผ่าน   → ข้อมูลทั้งหมด 2 ระดับ
 *    ?action=summary               → ความคืบหน้า (สาธารณะ ไม่ต้องใช้รหัส)
 * --------------------------------------------------------------- */
function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  const cb = p.callback;
  var out;

  try {
    if (p.action === 'list') {
      out = (p.token === ADMIN_PASS)
        ? { ok: true, school: readAll(false), klass: readAll(true), cHead: C_HEAD }
        : { ok: false, message: 'รหัสผ่านไม่ถูกต้อง' };

    } else if (p.action === 'summary') {
      out = { ok: true, summary: summaryCount(p.year || '', p.term || '') };

    } else {
      out = { ok: true, message: 'ระบบเก็บข้อมูลทักษะ 8C — สพป.อุดรธานี เขต 1', open: OPEN_FOR_SUBMIT, time: new Date().toISOString() };
    }
  } catch (err) {
    out = { ok: false, message: err.message };
  }
  return cb ? jsonp(cb, out) : json(out);
}

/* ---------------------------------------------------------------
 *  ฟังก์ชันช่วย
 * --------------------------------------------------------------- */
function qualityLabel(avg) {
  if (avg >= 3.51) return 'ดีเยี่ยม';
  if (avg >= 2.51) return 'ดี';
  if (avg >= 1.51) return 'พอใช้';
  return 'ควรพัฒนา';
}

function districtOf(group) {
  const g = String(group || '');
  if (g.indexOf('หนองวัวซอ') >= 0) return 'หนองวัวซอ';
  if (g.indexOf('เพ็ญ') >= 0) return 'เพ็ญ';
  if (g.indexOf('สร้างคอม') >= 0) return 'สร้างคอม';
  if (g.indexOf('เมือง') >= 0) return 'เมืองอุดรธานี';
  return '-';
}

function makeRef(now, n, isClass) {
  const y = (now.getFullYear() + 543).toString().slice(-2);
  return (isClass ? 'CL' : 'SC') + y + '-' + ('0000' + n).slice(-4);
}

/** ค้นหาแถวเดิมจาก ปีการศึกษา + ภาคเรียน + โรงเรียน (+ ระดับชั้น) */
function findRow(sh, head, year, term, school, grade) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const v = sh.getRange(2, 1, last - 1, head.length).getDisplayValues();
  const iYear = 4, iTerm = 5, iSchool = 8, iGrade = 9;   // index ฐาน 0
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][iYear]) === String(year) &&
      String(v[i][iTerm]) === String(term) &&
      String(v[i][iSchool]) === String(school) &&
      (!grade || String(v[i][iGrade]) === String(grade))) {
      return { row: i + 2, seq: v[i][0], refCode: v[i][3], created: v[i][1] };
    }
  }
  return null;
}

function readAll(isClass) {
  const sh = getSheet(isClass);
  const head = isClass ? HEAD_CLASS : HEAD_SCHOOL;
  const last = sh.getLastRow();
  if (last < 2) return [];
  const v = sh.getRange(2, 1, last - 1, head.length).getDisplayValues();
  return v.map(function (r) {
    const o = {
      seq: r[0], created: r[1], updated: r[2], refCode: r[3],
      year: r[4], term: r[5], district: r[6], schoolGroup: r[7], school: r[8],
      nAll: r[10], nEval: r[11],
      avg: Number(r[20]) || 0, quality: r[21],
      strength: r[22], improve: r[23], evidence: r[24],
      reporter: r[25], position: r[26], phone: r[27], contact: r[28], note: r[29]
    };
    if (isClass) { o.grade = r[9]; o.size = ''; } else { o.size = r[9]; o.grade = ''; }
    o.c = [];
    for (var k = 0; k < 8; k++) o.c.push(Number(r[12 + k]) || 0);
    return o;
  }).reverse();
}

function summaryCount(year, term) {
  const out = { school: 0, klass: 0, schools: 0 };
  try {
    const rows = readAll(false).filter(function (r) {
      return (!year || r.year === String(year)) && (!term || r.term === String(term));
    });
    const kl = readAll(true).filter(function (r) {
      return (!year || r.year === String(year)) && (!term || r.term === String(term));
    });
    out.school = rows.length;
    out.klass = kl.length;
    const set = {};
    rows.concat(kl).forEach(function (r) { set[r.school] = 1; });
    out.schools = Object.keys(set).length;
  } catch (e) { }
  return out;
}

function getSheet(isClass) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const name = isClass ? SHEET_CLASS : SHEET_SCHOOL;
  const head = isClass ? HEAD_CLASS : HEAD_SCHOOL;
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    writeHeader(sh, head);
  } else {
    const cur = sh.getRange(1, 1, 1, head.length).getDisplayValues()[0];
    if (cur[3] !== head[3] || cur[12] !== head[12]) writeHeader(sh, head);
  }
  return sh;
}

function writeHeader(sh, head) {
  sh.getRange(1, 1, 1, head.length).setValues([head]);
  const h = sh.getRange(1, 1, 1, head.length);
  h.setFontWeight('bold').setBackground('#0f4c81').setFontColor('#ffffff')
    .setVerticalAlignment('middle').setHorizontalAlignment('center').setWrap(true);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(9);
  sh.setRowHeight(1, 52);
  const w = [55, 145, 145, 105, 90, 80, 120, 250, 230, 165, 120, 110,
    95, 95, 95, 95, 95, 95, 95, 95, 110, 105, 260, 260, 220, 180, 160, 125, 150, 220];
  w.forEach(function (x, i) { if (i < head.length) sh.setColumnWidth(i + 1, x); });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp(cb, obj) {
  const safeCb = String(cb).replace(/[^A-Za-z0-9_$]/g, '');
  return ContentService.createTextOutput(safeCb + '(' + JSON.stringify(obj) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/* ---------------------------------------------------------------
 *  ▶ ทดสอบการตั้งค่า — กด Run ฟังก์ชันนี้เพื่อตรวจการเชื่อมต่อ
 * --------------------------------------------------------------- */
function ทดสอบการตั้งค่า() {
  var msg = [];
  try {
    var a = getSheet(false);
    var b = getSheet(true);
    msg.push('✅ เชื่อมต่อ Google Sheet สำเร็จ: ' + a.getParent().getName());
    msg.push('   • แผ่นงาน "' + a.getName() + '" (' + Math.max(0, a.getLastRow() - 1) + ' รายการ)');
    msg.push('   • แผ่นงาน "' + b.getName() + '" (' + Math.max(0, b.getLastRow() - 1) + ' รายการ)');
  } catch (e) { msg.push('❌ Google Sheet: ' + e.message); }
  msg.push(OPEN_FOR_SUBMIT ? '✅ ระบบเปิดรับข้อมูล' : '⚠️ ระบบปิดรับข้อมูลอยู่');
  Logger.log(msg.join('\n'));
  return msg.join('\n');
}

/* ---------------------------------------------------------------
 *  ▶ สร้างข้อมูลทดสอบ 5 แถว — ใช้ลองหน้าแดชบอร์ด แล้วลบทิ้งได้
 * --------------------------------------------------------------- */
function สร้างข้อมูลทดสอบ() {
  const demo = [
    ['กลุ่มเมือง 1', 'บ้านหมากแข้ง', 'ขนาดใหญ่พิเศษ', 1250, 1250, [4, 3, 3, 4, 4, 4, 3, 4]],
    ['กลุ่มเมือง 2', 'อนุบาลอุดรธานี', 'ขนาดใหญ่พิเศษ', 2100, 2000, [4, 4, 3, 4, 3, 4, 4, 4]],
    ['กลุ่มเพ็ญ 1', 'บ้านเพ็ญ', 'ขนาดกลาง', 180, 180, [3, 2, 3, 3, 2, 2, 3, 4]],
    ['กลุ่มหนองวัวซอ 1 (หนองวัวซอ น้ำพ่น หนองบัวบาน)', 'บ้านหนองวัวซอ', 'ขนาดเล็ก', 85, 85, [2, 2, 3, 3, 2, 2, 2, 3]],
    ['กลุ่มสร้างคอม 1 (สร้างคอม)', 'บ้านสร้างคอม', 'ขนาดเล็ก', 60, 60, [3, 3, 3, 3, 3, 2, 3, 4]]
  ];
  const sh = getSheet(false);
  const now = new Date();
  const stamp = Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
  demo.forEach(function (x, i) {
    const avg = Math.round((x[5].reduce(function (a, b) { return a + b; }, 0) / 8) * 100) / 100;
    sh.appendRow([i + 1, stamp, '', makeRef(now, i + 1, false), '2569', '1',
      districtOf(x[0]), x[0], x[1], x[2], x[3], x[4]]
      .concat(x[5])
      .concat([avg, qualityLabel(avg), 'ข้อมูลทดสอบ', 'ข้อมูลทดสอบ', '',
        'ทดสอบ ระบบ', 'ครู', "'0800000000", '', 'ข้อมูลทดสอบ — ลบได้']));
  });
  return 'สร้างข้อมูลทดสอบ 5 แถวแล้ว';
}
