/*******************************************************************
 *  ระบบเก็บข้อมูลทักษะแห่งศตวรรษที่ 21 (8C)
 *  สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุดรธานี เขต 1
 *  -----------------------------------------------------------------
 *  โครงสร้าง 3 ชั้น
 *    1) ครูประจำชั้น  → กรอกข้อมูล "รายห้อง" (index.html)
 *    2) โรงเรียน      → ดูแดชบอร์ดของโรงเรียนตนเอง ด้วยรหัสเฉพาะโรงเรียน (school.html)
 *    3) เขตพื้นที่     → ดูแดชบอร์ดภาพรวมทั้งเขต ด้วยรหัสผู้ดูแลระบบ (admin.html)
 *
 *  ข้อมูลระดับโรงเรียน / กลุ่ม / อำเภอ / เขต คำนวณจากข้อมูลรายห้องอัตโนมัติ
 *  ประเมินด้วยรูบริก 4 ระดับ ในทักษะ 8 ด้าน (C1–C8)
 *  ส่งซ้ำได้ — ระบบทับข้อมูลเดิมของ ปีการศึกษา+ภาคเรียน+โรงเรียน+ชั้น+ห้อง เดียวกัน
 *******************************************************************/

/* =================== ⚙️ ตั้งค่า 4 บรรทัดนี้ =================== */

// 1) รหัส Google Sheet (คัดลอกจาก URL ของชีต ช่วง /d/........./edit)
const SHEET_ID = 'ใส่รหัส_GOOGLE_SHEET_ที่นี่';

// 2) รหัสผ่านสำหรับเข้าหน้าผู้ดูแลระบบระดับเขต (admin.html)
const ADMIN_PASS = 'udn1@8c2569';

// 3) กุญแจลับสำหรับสร้าง "รหัสเฉพาะโรงเรียน" — เปลี่ยนแล้วรหัสทุกโรงเรียนจะเปลี่ยนตาม
//    ห้ามเผยแพร่ค่านี้ เพราะผู้ที่รู้จะสร้างรหัสของโรงเรียนใดก็ได้
const CODE_SALT = 'udn1-8c-salt-เปลี่ยนค่านี้ด้วย';

// 4) เปิด/ปิดการรับข้อมูล (true = เปิดรับ, false = ปิดระบบชั่วคราว)
const OPEN_FOR_SUBMIT = true;

/* ============================================================== */

const SHEET_ROOM = 'ข้อมูลรายห้อง';

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

const LV_NAME = ['ควรพัฒนา', 'พอใช้', 'ดี', 'ดีเยี่ยม'];

/* หัวตาราง: ฐาน 13 คอลัมน์ + (4 ช่องจำนวนคน + 1 ค่าเฉลี่ย) × 8 ด้าน + ท้าย 10 คอลัมน์ */
const HEAD_BASE = ['ลำดับ', 'วันที่บันทึก', 'แก้ไขล่าสุด', 'รหัสอ้างอิง',
  'ปีการศึกษา', 'ภาคเรียน', 'อำเภอ', 'กลุ่มโรงเรียน', 'โรงเรียน',
  'ระดับชั้น', 'ห้องที่', 'ชั้น/ห้อง', 'จำนวนนักเรียนในห้อง'];

const HEAD_SKILL = (function () {
  var out = [];
  C_KEYS.forEach(function (k, i) {
    for (var L = 0; L < 4; L++) out.push(k + ' ระดับ ' + (L + 1) + ' ' + LV_NAME[L] + ' (คน)');
    out.push(k + ' คะแนนเฉลี่ย');
  });
  return out;
})();

const HEAD_TAIL = ['คะแนนเฉลี่ย 8C', 'ระดับคุณภาพ', 'จุดเด่น', 'จุดที่ควรพัฒนา', 'ลิงก์หลักฐาน',
  'ครูผู้กรอกข้อมูล', 'ตำแหน่ง', 'เบอร์โทรศัพท์', 'อีเมล / ID Line', 'หมายเหตุ'];

const HEAD_ROOM = HEAD_BASE.concat(HEAD_SKILL).concat(HEAD_TAIL);
const SKILL_START = HEAD_BASE.length;              // 13
const TAIL_START = SKILL_START + HEAD_SKILL.length; // 53

const LEVELS = ['อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3',
  'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
  'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6',
  'มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3'];

const LEVEL_ABBR = {
  'อนุบาล 1': 'อ.1', 'อนุบาล 2': 'อ.2', 'อนุบาล 3': 'อ.3',
  'ประถมศึกษาปีที่ 1': 'ป.1', 'ประถมศึกษาปีที่ 2': 'ป.2', 'ประถมศึกษาปีที่ 3': 'ป.3',
  'ประถมศึกษาปีที่ 4': 'ป.4', 'ประถมศึกษาปีที่ 5': 'ป.5', 'ประถมศึกษาปีที่ 6': 'ป.6',
  'มัธยมศึกษาปีที่ 1': 'ม.1', 'มัธยมศึกษาปีที่ 2': 'ม.2', 'มัธยมศึกษาปีที่ 3': 'ม.3'
};

/* รายชื่อกลุ่มโรงเรียน / โรงเรียน — สร้างจากไฟล์ schools.json */
const SCHOOLS = {
  "กลุ่มเมือง 1": ["บ้านหมากแข้ง", "ชุมชนบ้านเดื่อวิทยา", "บ้านหนองขาม(ค่ายเสนีย์อุปถัมภ์)", "บ้านดงอุดม", "บ้านเก่าน้อย#เรียนรวมทุกชั้น", "บ้านหนองเหล็ก", "บ้านหนองตุ", "บ้านม่วงสว่างสามัคคี", "บ้านดอนอุดม(เนยอุปถัมภ์)", "บ้านหนองบัว"],
  "กลุ่มเมือง 2": ["อนุบาลอุดรธานี", "บ้านศรีเชียงใหม่", "บ้านกุดลิงง้อหนองแก", "บ้านดงเค็ง (นําวัฒนาอุปถัมภ์)", "บ้านคำกลิ้ง", "บ้านหนองตูม", "บ้านจั่นศรีวิไล", "บ้านเลี่ยมพิลึก", "ค่ายประจักษ์ศิลปาคม"],
  "กลุ่มเมือง 3": ["นิคมสร้างตนเองเชียงพิณ 3", "นิคมสร้างตนเองเชียงพิณ 5", "บ้านนาสมบูรณ์", "บ้านโคกสะอาดศรีบูรพา", "บ้านหนองสวรรค์ (ไชยเชียงพิณ)", "บ้านหนองโอนหนองฮาง", "บ้านเชียงพิณ", "นาคลองหนองศรีคามวิทยา", "บ้านโนนสวรรค์#เรียนรวมทุกชั้น", "บ้านนาแอง", "บ้านนิคมพัฒนา", "บ้านหนองขุ่นเหล่าหลักวิทยา", "บ้านปากดงส่งเสริมธรรม"],
  "กลุ่มเมือง 4": ["บ้านเชียงพัง", "ชุมชนนากว้างพัฒนศึกษา", "บ้านนาทาม#เรียนรวมทุกชั้น บ้านเชียงพัง", "บ้านเม่น", "บ้านขาว", "บ้านดู่", "บ้านหัวบึง", "บ้านพรานเหมือน", "บ้านเลื่อม", "หนองสำโรงวิทยา"],
  "กลุ่มเมือง 5": ["บ้านตาด", "บ้านกกสะทอนเครือหวายดิน", "บ้านโนนเดื่อ", "บ้านสุขสมบูรณ์", "บ้านศรีบุญเรือง", "เจ ซี บ้านอินทร์แปลง", "ผ่านศึกสงเคราะห์", "บ้านหลุบหวายป่าขาม", "บ้านโสกน้ำขาว", "หนองไฮวิทยา", "บ้านโนนสะอาดผาสุข", "บ้านดงมะกรูดทรายทอง", "บ้านโคกลาด"],
  "กลุ่มเมือง 6": ["ชุมชนสามพร้าว", "บ้านหนองบุนาหล่ำ", "บ้านหนองบั่วประชาสรรค์", "บ้านดอนหาดดงเหล่าต้อง", "บ้านอี่เลี่ยน", "บ้านเซประชาอุทิศ", "บ้านโก่ย", "บ้านจำปาโนนสะอาด", "บ้านหนองนาคำ", "บ้านหนองหว้าหนองไผ่", "บ้านหนองแก", "บ้านถ่อนน้อยหนองไผ่คำ"],
  "กลุ่มเมือง 7": ["บ้านท่าตูมดงสระพัง", "มิตรภาพ 6", "บ้านโนนยางโนนบ่อ", "บ้านขมิ้นบ่อโคลน", "บ้านดอนหวาย", "บ้านหมากตูมดอนยานาง", "ไทยรัฐวิทยา ๙๒ (ชุมชนนาข่า)", "บ้านถ่อนใหญ่ถ่อนน้อย", "บ้านเหล่าดอนแตง", "บ้านนาคำหลวง", "บ้านงอยเลิงทอง", "ประชาสามัคคี"],
  "กลุ่มเมือง 8": ["บ้านเชียงยืน", "บ้านอีหลุ่ง", "บ้านจำปา", "บ้านป่องมหิดลอนุสรณ์ 6", "บ้านหนองน้ำเค็ม", "บ้านหนองหลอด", "บ้านหนองตอสูงแคน", "บ่อน้อยประชาสรรค์", "บ้านนาเยีย"],
  "กลุ่มเมือง 9": ["ชุมชนโนนสูง", "บ้านหนองโสกดาว", "บ้านข้าวสาร", "บ้านชัยพรมิตรภาพที่ 67", "บ้านแม่นนท์", "บ้านหนองไผ่หนองหิน", "บ้านหนองนาเจริญ", "บ้านหนองบัวเงินหนองบัวทอง", "บ้านหนองตะไก้"],
  "กลุ่มหนองวัวซอ 1 (หนองวัวซอ น้ำพ่น หนองบัวบาน)": ["อนุบาลหนองวัวซอ", "บ้านหนองแซงสร้อย", "บ้านหนองแวงเดิดเกษตรสมบูรณ์", "บ้านน้ำพ่น", "บ้านเลา", "บ้านหนองบัวบาน", "นิคมสร้างตนเองเชียงพิณ 1", "บ้านหนองอ้อน้อย", "บ้านโคกก่องหนองแวงยาว"],
  "กลุ่มหนองวัวซอ 2 (หมากหญ้า หนองอ้อ โนนหวาย)": ["รัฐประชา 509", "บ้านโนนหวาย", "บ้านหนองเม็กห้วยทราย", "บ้านโคกหนองแซง", "บ้านเสาเล้า", "บ้านหนองอ้อ", "บ้านโนนสำราญ", "ชุมชนหนองแสง", "บ้านหนองแวงฮีคำหมากคูณ", "บ้านหมากหญ้า", "บ้านผาสิงห์"],
  "กลุ่มหนองวัวซอ 3 (กุดหมากไฟ อูบมุง)": ["ชุมชนกุดหมากไฟ", "บ้านโคกล่าม", "บ้านหนองแวงจุมพล", "บ้านดงบัง", "บ้านโนนชัยศรี", "บ้านหนองบัวเงิน", "บ้านอูบมุง", "บ้านห้วยไร่", "บ้านโคกผักหอม"],
  "กลุ่มเพ็ญ 1": ["อนุบาลเพ็ญประชานุกูล", "บ้านนาส่อนโพนทัน", "บ้านใหม่", "บ้านศรีสุวรรณโพนสว่าง", "บ้านโพนงามหนองตุ", "สุมเส้าวิทยา", "บ้านดงปอ", "บ้านหนองนาไฮโนนสะอาด", "บ้านแพงศรี", "บ้านหนองบัวบาน", "บ้านหนองแสนตอโนนสร้างคำ", "ดงยางวังโตนวิทยา"],
  "กลุ่มเพ็ญ 2": ["ชุมชนบ้านธาตุ", "บ้านสังซาวังน้ำขาว", "บ้านถิ่นสุขาวิทยา", "นิคมโนนสมบูรณ์", "บ้านนาคอมนาดอกไม้", "บ้านดอนแก้ว", "บ้านยามกาใหญ่", "บ้านนาพูนทรัพย์", "บ้านหมูม่นโพนโนนสะอาด", "บ้านยามกาโนนคำ"],
  "กลุ่มเพ็ญ 3": ["บ้านเชียงหวางสร้างลาน", "บ้านนาดี", "บ้านสร้างหลวงสร้างคำ", "ดงใหญ่เจริญพัฒน์", "บ้านดอนข่าคำผักหนามประชาสามัคคี", "บ้านโพนเลาโพนทอง", "บ้านด่าน", "บ้านนาพู่", "บ้านป่าก้าวดอนแดง", "บ้านหลวงหัวสวย", "บ้านศรีบุญเรือง", "บ้านกิ่วดงมะไฟ", "บ้านหนองนกเขียนโพนทัน"],
  "กลุ่มเพ็ญ 4": ["บ้านโนนสวาง", "บ้านคอนเลียบ", "บ้านนาพัง", "บ้านเตาไห", "บ้านหม้อ", "บ้านคอนสวรรค์สินเจริญ", "บ้านเหล่าดอนเงิน", "บ้านหนองผง", "บ้านยาง (คุรุราษฎร์วิทยา)", "บ้านโคกสว่าง", "บ้านหนองกุง", "บ้านดงขันทอง", "บ้านดงศรีสําราญ"],
  "กลุ่มเพ็ญ 5": ["บ้านนาบัวไผ่วิทยา", "บ้านยางซอง", "บ้านนาทรายนาม่วง", "บ้านดอนกลอยดอนอุดม", "บ้านท่าหนาด", "บ้านโนนรังหนองผือวิทยา", "บ้านทอนดอนยาว", "บ้านสร้างแป้น", "บ้านหว้าน"],
  "กลุ่มเพ็ญ 6": ["บ้านนาสีนวล", "บ้านโคกกลาง", "บ้านดอนจันทร์โพนสวรรค์คำเจริญ", "บ้านจอมศรี", "บ้านข่าทุ่งม่วงโนนศรีสมบูรณ์", "บ้านหนองบ่อ", "บ้านสะอาดนาพังศรีเจริญ", "จอมตาลโนนดู่โนนสำราญ", "บ้านดงยางนารายณ์"],
  "กลุ่มสร้างคอม 1 (สร้างคอม)": ["อนุบาลสร้างคอม", "บ้านเชียงดา", "บ้านแมดวิทยาคม", "บ้านนาหว้า(สันติราษฎร์พิทยาคม)", "บ้านไชยฟอง", "บ้านนาสะอาด", "บ้านโนนนกหอ(เพ็งแสนวิทยา)#เรียนรวมทุกชั้น", "บ้านดงผักเทียม", "บ้านท่าเสียว", "บ้านโนนชาดวรุบลวิทยา", "บ้านโคกสว่าง#เรียนรวมทุกชั้น อนุบาลสร้างคอม"],
  "กลุ่มสร้างคอม 2 (โคกโพธิ์ บ้านยวด หินโงม)": ["บ้านดอนเดื่อ", "บ้านดอนบาก", "โคกโพธิ์วิทยา", "บ้านนาน้ำชุ่ม", "บ้านยวด", "บ้านชาด", "บ้านนามั่ง", "บ้านน้ำเที่ยง", "บ้านตลิ่งชัน-สร้างแก้ว", "บ้านศรีชมชื่นบุญชิตวิทยา", "บ้านหินโงม"]
};

/* ---------------------------------------------------------------
 *  รหัสเฉพาะโรงเรียน
 *  รูปแบบ  UDN-<ลำดับกลุ่ม 2 หลัก><ลำดับโรงเรียน 2 หลัก>-<ตรวจสอบ 4 ตัว>
 *  เช่น    UDN-0103-7F2A
 *  ส่วนหน้าใช้บอกว่าเป็นโรงเรียนใด ส่วนท้ายเป็นลายเซ็นจาก CODE_SALT
 * --------------------------------------------------------------- */
function schoolCode(school) {
  const groups = Object.keys(SCHOOLS);
  for (var g = 0; g < groups.length; g++) {
    const list = SCHOOLS[groups[g]];
    for (var s = 0; s < list.length; s++) {
      if (list[s] === school) return buildCode(g, s, school);
    }
  }
  return '';
}

function buildCode(g, s, school) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, CODE_SALT + '|' + school,
    Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < 2; i++) {
    var b = raw[i] < 0 ? raw[i] + 256 : raw[i];
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return 'UDN-' + ('0' + (g + 1)).slice(-2) + ('0' + (s + 1)).slice(-2) + '-' + hex.toUpperCase();
}

/** แปลงรหัสกลับเป็นโรงเรียน — คืน null ถ้ารหัสไม่ถูกต้อง */
function schoolFromCode(code) {
  const m = /^UDN-(\d{2})(\d{2})-([0-9A-Fa-f]{4})$/.exec(String(code || '').trim().toUpperCase());
  if (!m) return null;
  const g = Number(m[1]) - 1, s = Number(m[2]) - 1;
  const groups = Object.keys(SCHOOLS);
  if (g < 0 || g >= groups.length) return null;
  const list = SCHOOLS[groups[g]];
  if (s < 0 || s >= list.length) return null;
  const school = list[s];
  if (buildCode(g, s, school) !== String(code).trim().toUpperCase()) return null;
  return { school: school, group: groups[g], district: districtOf(groups[g]) };
}

/* ---------------------------------------------------------------
 *  doPost — รับข้อมูลรายห้องจาก index.html
 * --------------------------------------------------------------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const d = JSON.parse(e.postData.contents);
    if (d.action !== 'submit') return json({ ok: false, message: 'คำสั่งไม่ถูกต้อง' });
    if (!OPEN_FOR_SUBMIT) return json({ ok: false, message: 'ขณะนี้ปิดรับข้อมูลชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' });

    var need = ['year', 'term', 'schoolGroup', 'school', 'grade', 'room', 'nAll', 'reporter', 'position', 'phone'];
    for (var i = 0; i < need.length; i++) {
      if (!d[need[i]] || String(d[need[i]]).trim() === '') {
        return json({ ok: false, message: 'ข้อมูลไม่ครบถ้วน (' + need[i] + ')' });
      }
    }
    if (LEVELS.indexOf(String(d.grade)) < 0) return json({ ok: false, message: 'ระดับชั้นไม่ถูกต้อง' });

    const room = Number(d.room);
    if (!(room >= 1 && room <= 20) || Math.round(room) !== room) {
      return json({ ok: false, message: 'ห้องที่ต้องเป็นตัวเลข 1–20' });
    }
    if (!SCHOOLS[d.schoolGroup] || SCHOOLS[d.schoolGroup].indexOf(d.school) < 0) {
      return json({ ok: false, message: 'ไม่พบโรงเรียนนี้ในกลุ่มที่เลือก' });
    }

    const nAll = Number(d.nAll || 0);
    if (!(nAll >= 1 && nAll <= 200) || Math.round(nAll) !== nAll) {
      return json({ ok: false, message: 'จำนวนนักเรียนในห้องต้องเป็นตัวเลข 1–200' });
    }

    /* รับจำนวนนักเรียนแต่ละระดับ ของทั้ง 8 ด้าน — แต่ละด้านต้องรวมเท่ากับจำนวนนักเรียนในห้อง */
    const dist = [], means = [];
    for (var k = 0; k < C_KEYS.length; k++) {
      const row = [];
      var sum = 0, tot = 0;
      for (var L = 1; L <= 4; L++) {
        const n = Number(d[C_KEYS[k] + '_' + L]);
        if (!(n >= 0) || Math.round(n) !== n) {
          return json({ ok: false, message: 'จำนวนนักเรียนต้องเป็นจำนวนเต็ม (' + C_KEYS[k] + ' ระดับ ' + L + ')' });
        }
        row.push(n); sum += n; tot += n * L;
      }
      if (sum !== nAll) {
        return json({
          ok: false,
          message: C_KEYS[k] + ': จำนวนนักเรียนรวม ' + sum + ' คน ไม่เท่ากับจำนวนนักเรียนในห้อง ' + nAll + ' คน'
        });
      }
      dist.push(row);
      means.push(Math.round((tot / nAll) * 100) / 100);
    }
    const avg = Math.round((means.reduce(function (a, b) { return a + b; }, 0) / 8) * 100) / 100;
    const grade = qualityLabel(avg);
    if (d.evidence && !/^https?:\/\/.+/i.test(String(d.evidence))) {
      return json({ ok: false, message: 'ลิงก์หลักฐานต้องขึ้นต้นด้วย http:// หรือ https://' });
    }

    const sh = getSheet();
    const now = new Date();
    const stamp = Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    const label = (LEVEL_ABBR[d.grade] || d.grade) + '/' + room;

    const found = findRow(sh, d.year, d.term, d.school, d.grade, room);
    const seq = found ? found.seq : Math.max(0, sh.getLastRow() - 1) + 1;
    const refCode = found ? found.refCode : makeRef(now, seq);
    const created = found ? found.created : stamp;

    var skillCells = [];
    for (var k = 0; k < 8; k++) skillCells = skillCells.concat(dist[k]).concat([means[k]]);

    const row = [
      seq, created, found ? stamp : '', refCode,
      String(d.year), String(d.term), districtOf(d.schoolGroup), d.schoolGroup, d.school,
      d.grade, room, label, nAll
    ]
      .concat(skillCells)
      .concat([avg, grade, d.strength || '', d.improve || '', d.evidence || '',
        d.reporter, d.position, "'" + String(d.phone), "'" + String(d.contact || ''), d.note || '']);

    if (found) sh.getRange(found.row, 1, 1, HEAD_ROOM.length).setValues([row]);
    else sh.appendRow(row);

    return json({
      ok: true, refCode: refCode, avg: avg, quality: grade, label: label, means: means,
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
 *  doGet — API (JSONP)
 *    ?action=list&token=รหัสผู้ดูแล   → ข้อมูลทั้งเขต
 *    ?action=codes&token=รหัสผู้ดูแล  → รหัสเฉพาะโรงเรียนทั้ง 214 แห่ง
 *    ?action=school&code=UDN-....    → ข้อมูลเฉพาะโรงเรียนนั้น
 *    ?action=summary                 → ความคืบหน้ารวม (สาธารณะ)
 * --------------------------------------------------------------- */
function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  const cb = p.callback;
  var out;

  try {
    if (p.action === 'list') {
      out = (p.token === ADMIN_PASS)
        ? { ok: true, rows: readAll(), cHead: C_HEAD }
        : { ok: false, message: 'รหัสผ่านไม่ถูกต้อง' };

    } else if (p.action === 'codes') {
      out = (p.token === ADMIN_PASS)
        ? { ok: true, codes: allCodes() }
        : { ok: false, message: 'รหัสผ่านไม่ถูกต้อง' };

    } else if (p.action === 'school') {
      const info = schoolFromCode(p.code);
      out = info
        ? {
            ok: true, school: info.school, group: info.group, district: info.district,
            rows: readAll().filter(function (r) { return r.school === info.school; })
          }
        : { ok: false, message: 'รหัสโรงเรียนไม่ถูกต้อง' };

    } else if (p.action === 'summary') {
      out = { ok: true, summary: summaryCount(p.year || '', p.term || '') };

    } else {
      out = { ok: true, message: 'ระบบเก็บข้อมูลทักษะ 8C — สพป.อุดรธานี เขต 1', open: OPEN_FOR_SUBMIT };
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

function makeRef(now, n) {
  const y = (now.getFullYear() + 543).toString().slice(-2);
  return 'RM' + y + '-' + ('00000' + n).slice(-5);
}

function allCodes() {
  const out = [];
  const groups = Object.keys(SCHOOLS);
  groups.forEach(function (g, gi) {
    SCHOOLS[g].forEach(function (s, si) {
      out.push({ group: g, district: districtOf(g), school: s, code: buildCode(gi, si, s) });
    });
  });
  return out;
}

/** ค้นหาแถวเดิมจาก ปีการศึกษา + ภาคเรียน + โรงเรียน + ระดับชั้น + ห้อง */
function findRow(sh, year, term, school, grade, room) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const v = sh.getRange(2, 1, last - 1, HEAD_ROOM.length).getDisplayValues();
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][4]) === String(year) && String(v[i][5]) === String(term) &&
      String(v[i][8]) === String(school) && String(v[i][9]) === String(grade) &&
      String(v[i][10]) === String(room)) {
      return { row: i + 2, seq: v[i][0], refCode: v[i][3], created: v[i][1] };
    }
  }
  return null;
}

function readAll() {
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const v = sh.getRange(2, 1, last - 1, HEAD_ROOM.length).getDisplayValues();
  return v.map(function (r) {
    const T = TAIL_START;
    const o = {
      seq: r[0], created: r[1], updated: r[2], refCode: r[3],
      year: r[4], term: r[5], district: r[6], schoolGroup: r[7], school: r[8],
      grade: r[9], room: r[10], label: r[11], nAll: Number(r[12]) || 0,
      avg: Number(r[T]) || 0, quality: r[T + 1],
      strength: r[T + 2], improve: r[T + 3], evidence: r[T + 4],
      reporter: r[T + 5], position: r[T + 6], phone: r[T + 7], contact: r[T + 8], note: r[T + 9]
    };
    o.nEval = o.nAll;
    o.c = []; o.dist = [];
    for (var k = 0; k < 8; k++) {
      const b = SKILL_START + k * 5;
      o.dist.push([Number(r[b]) || 0, Number(r[b + 1]) || 0, Number(r[b + 2]) || 0, Number(r[b + 3]) || 0]);
      o.c.push(Number(r[b + 4]) || 0);
    }
    return o;
  }).reverse();
}

function summaryCount(year, term) {
  const out = { rooms: 0, schools: 0 };
  try {
    const rows = readAll().filter(function (r) {
      return (!year || r.year === String(year)) && (!term || r.term === String(term));
    });
    out.rooms = rows.length;
    const set = {};
    rows.forEach(function (r) { set[r.school] = 1; });
    out.schools = Object.keys(set).length;
  } catch (e) { }
  return out;
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_ROOM);
  if (!sh) sh = ss.insertSheet(SHEET_ROOM);
  if (sh.getLastRow() === 0) {
    writeHeader(sh);
  } else {
    const cur = sh.getRange(1, 1, 1, HEAD_ROOM.length).getDisplayValues()[0];
    if (cur[12] !== HEAD_ROOM[12] || cur[SKILL_START] !== HEAD_ROOM[SKILL_START]) writeHeader(sh);
  }
  return sh;
}

function writeHeader(sh) {
  sh.getRange(1, 1, 1, HEAD_ROOM.length).setValues([HEAD_ROOM]);
  const h = sh.getRange(1, 1, 1, HEAD_ROOM.length);
  h.setFontWeight('bold').setBackground('#4c2a96').setFontColor('#ffffff')
    .setVerticalAlignment('middle').setHorizontalAlignment('center').setWrap(true);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(12);
  sh.setRowHeight(1, 70);
  const w = [55, 140, 140, 110, 85, 75, 115, 240, 225, 160, 65, 85, 120];
  for (var k = 0; k < 8; k++) w.push(78, 78, 78, 78, 100);
  [105, 105, 250, 250, 210, 185, 155, 120, 145, 210].forEach(function (x) { w.push(x); });
  w.forEach(function (x, i) { if (i < HEAD_ROOM.length) sh.setColumnWidth(i + 1, x); });
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
    var sh = getSheet();
    msg.push('✅ เชื่อมต่อ Google Sheet สำเร็จ: ' + sh.getParent().getName());
    msg.push('   • แผ่นงาน "' + sh.getName() + '" (' + Math.max(0, sh.getLastRow() - 1) + ' ห้อง)');
  } catch (e) { msg.push('❌ Google Sheet: ' + e.message); }
  try {
    var n = 0;
    Object.keys(SCHOOLS).forEach(function (g) { n += SCHOOLS[g].length; });
    msg.push('✅ รายชื่อโรงเรียน ' + Object.keys(SCHOOLS).length + ' กลุ่ม / ' + n + ' โรงเรียน');
    var first = SCHOOLS[Object.keys(SCHOOLS)[0]][0];
    msg.push('   • ตัวอย่างรหัสโรงเรียน: ' + first + ' → ' + schoolCode(first));
  } catch (e) { msg.push('❌ รายชื่อโรงเรียน: ' + e.message); }
  msg.push(OPEN_FOR_SUBMIT ? '✅ ระบบเปิดรับข้อมูล' : '⚠️ ระบบปิดรับข้อมูลอยู่');
  Logger.log(msg.join('\n'));
  return msg.join('\n');
}

/* ---------------------------------------------------------------
 *  ▶ พิมพ์รหัสโรงเรียนทั้งหมด — กด Run เพื่อดูใน Log (สำรองไว้)
 * --------------------------------------------------------------- */
function พิมพ์รหัสโรงเรียน() {
  const t = allCodes().map(function (x) { return x.code + '\t' + x.school + '\t' + x.group; });
  Logger.log(t.join('\n'));
  return t.length + ' โรงเรียน';
}
