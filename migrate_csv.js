const fs = require('fs');
const readline = require('readline');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDWCNqD3zhG_FEnZx-54v8SDMqEb7sP2Ks",
  authDomain: "adhd-f85b0.firebaseapp.com",
  projectId: "adhd-f85b0",
  storageBucket: "adhd-f85b0.firebasestorage.app",
  messagingSenderId: "491098650505",
  appId: "1:491098650505:web:c830e9a64ef09268a31358"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function parseCsvFile(filePath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ 파일을 찾을 수 없습니다: ${filePath}`);
      return resolve([]);
    }
    const lines = [];
    const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
    rl.on('line', (line) => { if (line.trim()) lines.push(line.trim()); });
    rl.on('close', () => {
      if (lines.length < 2) return resolve([]);
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
        rows.push(obj);
      }
      resolve(rows);
    });
  });
}

function extractDateStr(row) {
  const possibleFields = ['date', 'lecture_date', 'schedule_date', 'lesson_date', 'start_date', 'day_date', 'start_time'];
  for (const field of possibleFields) {
    if (row[field]) {
      const match = String(row[field]).match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
      if (match) {
        const parts = match[0].split(/[-/.]/);
        return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
      }
    }
  }
  for (const key of Object.keys(row)) {
    const match = String(row[key]).match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
    if (match) {
      const parts = match[0].split(/[-/.]/);
      return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    }
  }
  return '';
}

async function runMigration() {
  console.log("🚀 CSV cohort 컬럼 직접 참조 정밀 마이그레이션 시작...");

  try {
    const rawInstructors = await parseCsvFile('./instructors.csv');
    const rawSchedules = await parseCsvFile('./schedules.csv');

    // 1. 강사진 데이터 매핑
    const formattedInstructors = rawInstructors.map((row, idx) => ({
      id: row.id ? Number(row.id) || row.id : Date.now() + idx,
      name: row.name || row.instructor_name || row.instructor || '',
      organization: row.organization || row.company || row.agency || row.org || '기타',
      subject: row.subject || row.course_name || row.course || '',
      phone: row.phone || row.contact || row.tel || '',
      email: row.email || '',
      prep: row.prep || row.notes || row.memo || ''
    }));

    // 2. 시간표 데이터 매핑
    const formattedSchedules = [];
    const otherRegions = ['서울', '대구', '부산', '광주', '인천', '전주', '울산', '창원', '구미', '포항', '수원', '판교', '강남', '마포'];

    rawSchedules.forEach((row, idx) => {
      const parsedDate = extractDateStr(row);
      const rawClass = String(row.class_name || row.classname || row.track || row.course || '').toUpperCase();
      const rawSubject = String(row.subject || row.course_name || '').toUpperCase();
      const rawInstructor = String(row.instructor || row.instructor_name || row.name || '').toUpperCase();
      const fullText = `${rawClass} ${rawSubject} ${rawInstructor} ${String(row.notes || row.memo || '').toUpperCase()}`;

      // 타 지역 배제 (대전이 포함되어 있지 않은 경우)
      if (otherRegions.some(reg => fullText.includes(reg)) && !fullText.includes('대전')) {
        return;
      }

      // 트랙 판정
      let trackType = null;
      if (fullText.includes('SF') || fullText.includes('스마트팩토리')) {
        trackType = 'SF';
      } else if (fullText.includes('DM') || fullText.includes('디지털마케팅') || fullText.includes('마케팅') || fullText.includes('MARKETING')) {
        trackType = 'DM';
      } else if (fullText.includes('AX') || fullText.includes('인공지능') || fullText.includes('AI') || fullText.includes('트랙1')) {
        trackType = 'AX';
      }

      if (!trackType) return;

      // CSV의 cohort 컬럼 직접 참조
      let rawCohortVal = String(row.cohort || row.generation || row.th || '').trim();
      let cohort = '';

      if (rawCohortVal.includes('1')) {
        cohort = '1기';
      } else if (rawCohortVal.includes('2')) {
        cohort = '2기';
      } else {
        if (trackType === 'SF') cohort = '1기';
        else if (trackType === 'DM') cohort = '2기';
        else if (trackType === 'AX') {
          cohort = (parsedDate && parsedDate > '2026-10-06') ? '2기' : '1기';
        }
      }

      // 대전 4대 운영 트랙 화이트리스트
      const combo = `${cohort} ${trackType}`;
      if (!['1기 AX', '1기 SF', '2기 AX', '2기 DM'].includes(combo)) {
        return;
      }

      formattedSchedules.push({
        id: row.id ? Number(row.id) || row.id : Date.now() + idx,
        date: parsedDate,
        cohort: cohort,
        trackType: trackType,
        instructor: row.instructor || row.instructor_name || row.name || '',
        organization: row.organization || row.company || '기타',
        subject: row.subject || row.course_name || row.course || '',
        prep: row.prep || row.memo || ''
      });
    });

    // 날짜 오름차순 정렬
    formattedSchedules.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    console.log(`- 전체 원본 시간표: ${rawSchedules.length}건`);
    console.log(`- 정제 완료 시간표: ${formattedSchedules.length}건`);

    const summary = formattedSchedules.reduce((acc, cur) => {
      const key = `${cur.cohort} ${cur.trackType}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log("📊 [최종 결과] 대전 4개 트랙 집계:", summary);

    await setDoc(doc(db, "shared", "teamSpace"), {
      instructors: formattedInstructors,
      weeklySchedule: formattedSchedules
    }, { merge: true });

    console.log("🎉 성공: cohort 컬럼 기준 대전 4개 과정이 정상 동기화되었습니다!");
    process.exit(0);
  } catch (error) {
    console.error("❌ 마이그레이션 실패:", error);
    process.exit(1);
  }
}

runMigration();