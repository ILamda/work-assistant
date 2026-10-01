import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, Download, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function StudentExcelModal({ 
  isOpen, 
  onClose, 
  cohortList, 
  trackList, 
  onUpdateMetadata, 
  onImportStudents 
}) {
  const [newCohort, setNewCohort] = useState('');
  const [newTrack, setNewTrack] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [errorLog, setErrorLog] = useState([]);

  if (!isOpen) return null;

  // 1. 기수/트랙 동적 추가
  const handleAddCohort = () => {
    const val = newCohort.trim();
    if (!val) return;
    if (cohortList.includes(val)) return alert('이미 존재하는 기수입니다.');
    onUpdateMetadata({ cohortList: [...cohortList, val] });
    setNewCohort('');
  };

  const handleRemoveCohort = (c) => {
    if (cohortList.length <= 1) return alert('최소 1개의 기수는 유지되어야 합니다.');
    onUpdateMetadata({ cohortList: cohortList.filter(item => item !== c) });
  };

  const handleAddTrack = () => {
    const val = newTrack.trim().toUpperCase();
    if (!val) return;
    if (trackList.includes(val)) return alert('이미 존재하는 트랙입니다.');
    onUpdateMetadata({ trackList: [...trackList, val] });
    setNewTrack('');
  };

  const handleRemoveTrack = (t) => {
    if (trackList.length <= 1) return alert('최소 1개의 트랙은 유지되어야 합니다.');
    onUpdateMetadata({ trackList: trackList.filter(item => item !== t) });
  };

  // 2. 엑셀 표준 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        '이름(필수)': '홍길동',
        '기수(필수)': cohortList[0] || '2기',
        '트랙(필수)': trackList[0] || 'AX',
        '과정명': '인공지능 실무',
        '연락처': '010-1234-5678',
        '생년월일': '980315',
        '출결상태': '정상',
        '상담및요청사항': '실습 PC 사양 확인 요청'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '교육생명단양식');
    XLSX.writeFile(wb, '교육생_일괄등록_양식.xlsx');
  };

  // 3. 엑셀 파일 파싱 & 규격 검증
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const rawJson = XLSX.utils.sheet_to_json(wb.Sheets[wsName]);

        const validList = [];
        const errors = [];
        const autoCohorts = new Set();
        const autoTracks = new Set();

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2;
          const name = String(row['이름(필수)'] || row['이름'] || '').trim();
          const cohort = String(row['기수(필수)'] || row['기수'] || '').trim();
          const track = String(row['트랙(필수)'] || row['트랙'] || '').trim().toUpperCase();

          if (!name) {
            errors.push(`${rowNum}행: 이름이 누락되었습니다.`);
            return;
          }
          if (!cohort) {
            errors.push(`${rowNum}행 [${name}]: 기수가 누락되었습니다.`);
            return;
          }
          if (!track) {
            errors.push(`${rowNum}행 [${name}]: 트랙이 누락되었습니다.`);
            return;
          }

          if (!cohortList.includes(cohort)) autoCohorts.add(cohort);
          if (!trackList.includes(track)) autoTracks.add(track);

          validList.push({
            id: Date.now() + Math.random(),
            name,
            track: `${cohort} ${track}`,
            course: String(row['과정명'] || '').trim(),
            phone: String(row['연락처'] || '').trim(),
            birth: String(row['생년월일'] || '').trim(),
            status: String(row['출결상태'] || '정상').trim(),
            requestNote: String(row['상담및요청사항'] || '').trim()
          });
        });

        // 엑셀에 새로운 기수/트랙이 있으면 메타데이터 자동 추가
        if (autoCohorts.size > 0 || autoTracks.size > 0) {
          onUpdateMetadata({
            cohortList: Array.from(new Set([...cohortList, ...Array.from(autoCohorts)])),
            trackList: Array.from(new Set([...trackList, ...Array.from(autoTracks)]))
          });
        }

        setParsedData(validList);
        setErrorLog(errors);
      } catch (err) {
        alert('엑셀 파일을 읽는 도중 오류가 발생했습니다.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleApply = () => {
    if (parsedData.length === 0) return alert('등록할 유효한 데이터가 없습니다.');
    onImportStudents(parsedData);
    alert(`${parsedData.length}명의 교육생이 성공적으로 등록되었습니다.`);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '16px' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '580px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #cbd5e1', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
        
        {/* 상단 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>📊 기수·트랙 설정 및 엑셀 일괄 등록</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>새로운 과정을 생성하거나 엑셀 양식으로 교육생을 업로드합니다.</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>

        {/* 1. 기수 & 트랙 동적 관리 영역 */}
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '10px', color: '#1e293b' }}>⚙️ 운영 기수 & 트랙 설정</div>
          
          {/* 기수 관리 */}
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>현재 기수 목록:</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {cohortList.map(c => (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                  {c} <button onClick={() => handleRemoveCohort(c)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}><Trash2 size={11} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" placeholder="예: 3기" value={newCohort} onChange={(e) => setNewCohort(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
              <button onClick={handleAddCohort} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>+ 기수 추가</button>
            </div>
          </div>

          {/* 트랙 관리 */}
          <div>
            <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>현재 트랙 목록:</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {trackList.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                  {t} <button onClick={() => handleRemoveTrack(t)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}><Trash2 size={11} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" placeholder="예: Cloud, AI" value={newTrack} onChange={(e) => setNewTrack(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
              <button onClick={handleAddTrack} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>+ 트랙 추가</button>
            </div>
          </div>
        </div>

        {/* 2. 엑셀 템플릿 & 업로드 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>📥 엑셀 파일 업로드</span>
            <button onClick={handleDownloadTemplate} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
              <Download size={14} /> 표준 양식(.xlsx) 다운로드
            </button>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', borderRadius: '12px', border: '2px dashed #93c5fd', backgroundColor: '#eff6ff', cursor: 'pointer' }}>
            <Upload size={28} color="#2563eb" style={{ marginBottom: '8px' }} />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1d4ed8' }}>클릭하여 엑셀 파일 업로드 (.xlsx, .xls)</span>
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>규격 헤더에 맞추어 작성된 파일만 정상 등록됩니다.</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* 유효성 결과 피드백 */}
        {parsedData.length > 0 && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#166534', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> 정상 파싱된 교육생: <strong>{parsedData.length}명</strong>
          </div>
        )}

        {errorLog.length > 0 && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: '#991b1b', marginBottom: '14px' }}>
            <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <AlertTriangle size={15} /> 오류 목록 ({errorLog.length}건 제외됨)
            </div>
            <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
              {errorLog.map((err, i) => <div key={i}>• {err}</div>)}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}>닫기</button>
          <button onClick={handleApply} disabled={parsedData.length === 0} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: parsedData.length > 0 ? '#2563eb' : '#94a3b8', color: '#fff', fontSize: '13.5px', fontWeight: '800', cursor: parsedData.length > 0 ? 'pointer' : 'not-allowed' }}>
            {parsedData.length}명 일괄 등록 완료
          </button>
        </div>

      </div>
    </div>
  );
}