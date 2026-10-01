import React, { useState, useMemo } from 'react';
import { Phone, Mail, Copy, Check, Search, X } from 'lucide-react';

// 소속별 뱃지 스타일 규격
const ORG_STYLES = {
  LGE: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  CLIPS: { bg: '#fef9c3', text: '#ca8a04', border: '#fde047' },
  LAB4DX: { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  aSSIST: { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  기타: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
};

const CATEGORIES = ['전체', 'LGE', 'CLIPS', 'LAB4DX', 'aSSIST', '기타'];

export default function InstructorProfileList({ instructors = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // 클립보드 복사 핸들러
  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // 소속명 정규화
  const getNormalizedOrg = (org) => {
    if (!org) return '기타';
    const upper = org.toUpperCase().trim();
    if (upper.includes('LGE') || upper.includes('LG')) return 'LGE';
    if (upper.includes('CLIPS') || upper.includes('클립스')) return 'CLIPS';
    if (upper.includes('LAB4DX') || upper.includes('LAB')) return 'LAB4DX';
    if (upper.includes('ASSIST') || upper.includes('에이블')) return 'aSSIST';
    return '기타';
  };

  // 소속 탭 필터 + 검색어 복합 필터링
  const filteredInstructors = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return instructors.filter(inst => {
      // 1. 소속 필터
      const matchCategory = (selectedCategory === '전체') || (getNormalizedOrg(inst.organization) === selectedCategory);
      if (!matchCategory) return false;

      // 2. 검색 필터
      if (!keyword) return true;
      const matchName = inst.name && inst.name.toLowerCase().includes(keyword);
      const matchSubject = inst.subject && inst.subject.toLowerCase().includes(keyword);
      const matchOrg = inst.organization && inst.organization.toLowerCase().includes(keyword);
      const matchEmail = inst.email && inst.email.toLowerCase().includes(keyword);
      const matchPhone = inst.phone && inst.phone.includes(keyword);

      return matchName || matchSubject || matchOrg || matchEmail || matchPhone;
    });
  }, [instructors, selectedCategory, searchKeyword]);

  // 카테고리별 인원 카운트
  const orgCounts = useMemo(() => {
    const counts = { 전체: instructors.length };
    CATEGORIES.slice(1).forEach(cat => { counts[cat] = 0; });
    instructors.forEach(inst => {
      const org = getNormalizedOrg(inst.organization);
      counts[org] = (counts[org] || 0) + 1;
    });
    return counts;
  }, [instructors]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* 1. 검색창 및 결과 건수 바 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '400px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '15px' }} />
          <input
            type="text"
            placeholder="강사명, 담당 과목, 연락처 검색..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '10px 40px 10px 42px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
              backgroundColor: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div style={{ fontSize: '14.5px', color: '#64748b' }}>
          조회: <strong style={{ color: '#2563eb', fontSize: '17px' }}>{filteredInstructors.length}</strong>명 / 전체 {instructors.length}명
        </div>
      </div>

      {/* 2. 소속 뱃지 카테고리 탭 바 (터치 영역 및 크기 확대) */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px', borderBottom: '1.5px solid #e2e8f0' }}>
        {CATEGORIES.map(category => {
          const isSelected = selectedCategory === category;
          const style = ORG_STYLES[category] || { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '44px',
                padding: '8px 18px',
                borderRadius: '24px',
                border: isSelected ? `2px solid ${style.border}` : '1.5px solid #cbd5e1',
                backgroundColor: isSelected ? style.bg : '#ffffff',
                color: isSelected ? style.text : '#475569',
                fontWeight: isSelected ? '800' : '600',
                fontSize: '14.5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <span>{category}</span>
              <span style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: isSelected ? style.border : '#f1f5f9',
                color: isSelected ? style.text : '#64748b',
                fontWeight: '800'
              }}>
                {orgCounts[category] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. 강사진 카드 그리드 (카드 폭 minmax 340px로 확장) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '18px'
      }}>
        {filteredInstructors.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '56px 0', textAlign: 'center', color: '#94a3b8', fontSize: '15px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            검색 조건에 일치하는 강사 정보가 없습니다.
          </div>
        ) : (
          filteredInstructors.map(inst => {
            const orgKey = getNormalizedOrg(inst.organization);
            const badgeStyle = ORG_STYLES[orgKey];

            return (
              <div
                key={inst.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'transform 0.1s ease'
                }}
              >
                {/* 카드 상단: 강사 이름 & 소속 뱃지 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '18.5px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                    {inst.name} 강사
                  </span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '800',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    backgroundColor: badgeStyle.bg,
                    color: badgeStyle.text,
                    border: `1.5px solid ${badgeStyle.border}`
                  }}>
                    {orgKey}
                  </span>
                </div>

                {/* 담당 과목 */}
                <div style={{ fontSize: '14.5px', color: '#334155', minHeight: '44px', lineHeight: 1.5, backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: '800', color: '#64748b' }}>담당 과목: </span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{inst.subject || '과목 미배정'}</span>
                </div>

                {/* 연락처 및 이메일 원클릭 복사 영역 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  {/* 전화번호 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={16} color="#64748b" />
                      <span style={{ fontWeight: '600' }}>{inst.phone || '연락처 없음'}</span>
                    </div>
                    {inst.phone && (
                      <button
                        onClick={() => handleCopy(inst.phone, `phone-${inst.id}`)}
                        style={{background: '#ffffff', minHeight: '34px', minWidth: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', padding: '4px', color: copiedId === `phone-${inst.id}` ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="전화번호 복사"
                      >
                        {copiedId === `phone-${inst.id}` ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>

                  {/* 이메일 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Mail size={16} color="#64748b" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '210px', fontWeight: '600' }}>
                        {inst.email || '이메일 없음'}
                      </span>
                    </div>
                    {inst.email && (
                      <button
                        onClick={() => handleCopy(inst.email, `email-${inst.id}`)}
                        style={{background: '#ffffff', minHeight: '34px', minWidth: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', padding: '4px', color: copiedId === `email-${inst.id}` ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="이메일 복사"
                      >
                        {copiedId === `email-${inst.id}` ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* 준비사항/메모 */}
                {inst.prep && (
                  <div style={{ fontSize: '13.5px', color: '#475569', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', padding: '10px 12px', borderRadius: '8px', lineHeight: 1.5 }}>
                    💡 <strong style={{ color: '#1e40af' }}>준비사항:</strong> {inst.prep}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}