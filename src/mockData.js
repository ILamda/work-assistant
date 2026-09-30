export const initialTrackList = [
    '대전 AX 1기', '대전 AX 2기',
    '대전 SF 1기', '대전 SF 2기',
    '대전 DM 1기', '대전 DM 2기'
  ];
  
  export const managers = ['나 (지역매니저)', '김매니저', '이매니저', '박매니저'];
  
  export const quickLinks = [
    { title: 'LMS 관리자', url: 'https://example.com/lms', tag: 'LMS' },
    { title: '출결관리 페이지', url: 'https://hrd.go.kr', tag: '출결' },
    { title: '만족도 조사 시트', url: 'https://docs.google.com', tag: '만족도' },
  ];
  
  export const initialTodos = [
    { id: 1, text: 'LMS 수기 출석부 대조 (외출/병가 차이 확인)', done: false, category: '출결 관리', assignee: '나 (지역매니저)', dueDate: '오늘' },
    { id: 2, text: 'SF 2기 강의실 빔프로젝터 케이블 교체 점검', done: false, category: '시설 점검', assignee: '김매니저', dueDate: '최대한 빨리' },
    { id: 3, text: '주간 만족도 취합 자료 회신 확인', done: false, category: '자료 취합', assignee: '이매니저', dueDate: '금요일까지' },
  ];
  
  export const initialPersonalTodos = [
    { id: 201, text: '치과 정기 검진 예약 (오후 3시)', category: '병원/약', dueDate: '10/12', done: false },
    { id: 202, text: '사무실 인터넷 & 통신비 잔액 확인', category: '요금/납부', dueDate: '매월 25일', done: false },
    { id: 203, text: '영양제 / 처방약 챙기기', category: '생활/루틴', dueDate: '오늘', done: true },
  ];
  
  export const initialNotes = [
    { id: 1, text: '고용센터 지원금 담당자 직통: 042-xxx-xxxx (매월 10일 전 제출)', date: '9/25' }
  ];
  
  export const initialStudents = [
    { id: 1, name: '김철수', track: '대전 AX 2기', phone: '010-1234-5678', attendance: '98%', status: '정상', tasks: [{ id: 101, text: '우수훈련생 추천 서류 검토', done: false }] },
    { id: 2, name: '이영희', track: '대전 AX 2기', phone: '010-2345-6789', attendance: '84%', status: '주의', tasks: [{ id: 201, text: '10/2 병가 예정 (진단서 10/4 수신)', done: false }] },
    { id: 3, name: '박민수', track: '대전 SF 2기', phone: '010-3456-7890', attendance: '92%', status: '정상', tasks: [] },
  ];
  
  export const initialClassrooms = [
    { id: 1, name: '1강의실 (30명)', currentTrack: '대전 AX 1기', issue: '' },
    { id: 2, name: '2강의실 (30명)', currentTrack: '대전 AX 2기', issue: '에어컨 필터 청소 요망' },
    { id: 3, name: '3강의실 (40명)', currentTrack: '대전 SF 1기', issue: '' },
    { id: 4, name: '4강의실 (40명)', currentTrack: '대전 SF 2기', issue: '' },
    { id: 5, name: '5강의실 (20명)', currentTrack: '공실', issue: 'HDMI 케이블 없음' },
  ];
  
  export const initialSchedules = [
    { id: 1, track: '대전 AX 2기', day: '월', subject: '파이썬 데이터 분석 기초', instructor: '김희원', prep: '파이썬 실습 교재 30부 인쇄 및 배부' },
    { id: 2, track: '대전 AX 2기', day: '화', subject: '파이썬 데이터 분석 기초', instructor: '김희원', prep: '' },
    { id: 3, track: '대전 AX 2기', day: '수', subject: '머신러닝 이해', instructor: '이태극', prep: '공공데이터 사전 다운로드 링크 공지' },
    { id: 4, track: '대전 AX 2기', day: '목', subject: '머신러닝 이해', instructor: '이태극', prep: '' },
    { id: 5, track: '대전 AX 2기', day: '금', subject: '미니 프로젝트 기획', instructor: '이태극', prep: '조별 편성표 출력 부착' },
  ];