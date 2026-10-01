// uploadCsv.js
const fs = require('fs');
const Papa = require('papaparse');
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

function readCsv(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  return parsed.data;
}

async function runMigration() {
  console.log("CSV 데이터 읽는 중...");

  // 다운로드한 CSV 파일 경로 (다운로드 폴더에 있다면 경로를 맞춰주세요)
  // 예: ./instructors.csv, ./schedules.csv
  const rawInstructors = fs.existsSync('./instructors.csv') ? readCsv('./instructors.csv') : [];
  const rawSchedules = fs.existsSync('./schedules.csv') ? readCsv('./schedules.csv') : [];

  // 컬럼 매핑 (Supabase 컬럼명에 맞춰 필요시 조정)
  const formattedInstructors = rawInstructors.map((row, idx) => ({
    id: row.id || Date.now() + idx,
    name: row.name || row.instructor_name || '',
    subject: row.subject || row.course || '',
    track: row.track || '대전 AX 2기',
    phone: row.phone || row.contact || '',
    email: row.email || '',
    room: row.room || row.classroom || '',
    prep: row.prep || row.notes || ''
  }));

  const formattedSchedules = rawSchedules.map((row, idx) => ({
    id: row.id || Date.now() + idx,
    day: row.day || row.day_of_week || '월요일',
    track: row.track || '대전 AX 2기',
    time: row.time || `${row.start_time || '09:30'} ~ ${row.end_time || '17:30'}`,
    instructor: row.instructor || row.instructor_name || '',
    subject: row.subject || row.course_name || '',
    room: row.room || row.classroom || '302호',
    prep: row.prep || ''
  }));

  console.log(`강사 ${formattedInstructors.length}명, 스케줄 ${formattedSchedules.length}건 준비 완료.`);

  try {
    await setDoc(doc(db, "shared", "teamSpace"), {
      instructors: formattedInstructors,
      weeklySchedule: formattedSchedules
    }, { merge: true });

    console.log("🎉 Firebase Firestore (shared/teamSpace) 마이그레이션 성공!");
  } catch (err) {
    console.error("업로드 실패:", err);
  }
}

runMigration();