import React, { useState } from 'react';
import { X, Settings, Trash2, CalendarClock, CheckCircle2, Circle, Plus, Phone, Bell } from 'lucide-react';

export function SettingsModal({ isOpen, onClose, classrooms, onUpdateRoom, onAddRoom, onDeleteRoom, trackList, onUpdateTrack, onAddTrack, onDeleteTrack, onTestNotification, notificationEnabled }) {
  const [newRoomName, setNewRoomName] = useState('');
  const [newTrackName, setNewTrackName] = useState('');
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1100 }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '560px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>운영 환경 설정</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>

        <div style={{ backgroundColor: '#eff6ff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}><Bell size={14} color="#2563eb" /> 상단 바 알림 테스트</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>현재 상태: <strong>{notificationEnabled ? '🟢 켜짐' : '⚪ 꺼짐'}</strong></div>
          </div>
          <button onClick={onTestNotification} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}>알림 울려보기</button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '10px' }}>🏢 강의장 관리</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            {classrooms.map(room => (
              <div key={room.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <input type="text" value={room.name} onChange={(e) => onUpdateRoom(room.id, 'name', e.target.value)} style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: '700' }} />
                <select value={room.currentTrack} onChange={(e) => onUpdateRoom(room.id, 'currentTrack', e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}>
                  <option value="공실">공실 (대기)</option>
                  {trackList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={() => onDeleteRoom(room.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (newRoomName.trim()) { onAddRoom(newRoomName); setNewRoomName(''); } }} style={{ display: 'flex', gap: '6px' }}>
            <input type="text" placeholder="새 강의장 이름" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            <button type="submit" style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>+ 추가</button>
          </form>
        </div>

        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '10px' }}>🎓 교육과정(반) 관리</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            {trackList.map(track => (
              <div key={track} style={{ display: 'flex', gap: '6px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <input type="text" defaultValue={track} onBlur={(e) => onUpdateTrack(track, e.target.value)} style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: '700' }} />
                <button onClick={() => onDeleteTrack(track)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (newTrackName.trim()) { onAddTrack(newTrackName); setNewTrackName(''); } }} style={{ display: 'flex', gap: '6px' }}>
            <input type="text" placeholder="새 과정/반 이름" value={newTrackName} onChange={(e) => setNewTrackName(e.target.value)} style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            <button type="submit" style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>+ 추가</button>
          </form>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

export function AddStudentModal({ isOpen, onClose, onAdd, trackList }) {
  const [form, setForm] = useState({ name: '', track: trackList[0] || '', phone: '', attendance: '100%', status: '정상' });
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd(form);
    setForm({ name: '', track: trackList[0] || '', phone: '', attendance: '100%', status: '정상' });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '380px', padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>새 교육생 등록</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>이름 *</label><input type="text" required placeholder="예: 홍길동" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>소속 과정 *</label><select value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}>{trackList.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>연락처</label><input type="tel" placeholder="010-0000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} /></div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>취소</button>
            <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>등록하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StudentCard({ student, onToggleTask, onAddTask, onDeleteTask, onDeleteStudent }) {
  const [taskText, setTaskText] = useState('');
  const handleAdd = (e) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    onAddTask(student.id, taskText);
    setTaskText('');
  };

  return (
    <div style={{ borderRadius: '16px', padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(226, 232, 240, 0.4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>{student.name}</span>
            <button onClick={() => onDeleteStudent(student.id)} title="삭제" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={12} /></button>
          </div>
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '700', backgroundColor: student.status === '경고' ? '#fee2e2' : student.status === '주의' ? '#fef3c7' : '#dcfce7', color: student.status === '경고' ? '#b91c1c' : student.status === '주의' ? '#b45309' : '#15803d' }}>출석률 {student.attendance}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div><span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: '700' }}>🎓 {student.track}</span></div>
          <a href={`tel:${student.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2563eb', textDecoration: 'none' }}><Phone size={12} color="#2563eb" /> {student.phone || '연락처 없음'}</a>
        </div>
      </div>
      <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}><CalendarClock size={13} color="#0284c7" /><span>결석 예정 & 서류 제출 체크</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
          {(!student.tasks || student.tasks.length === 0) ? <div style={{ fontSize: '11px', color: '#94a3b8' }}>등록된 체크 항목이 없습니다.</div> : (
            student.tasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '12px', padding: '4px 6px', borderRadius: '6px', backgroundColor: t.done ? '#f1f5f9' : '#ffffff', border: '1px solid #e2e8f0' }}>
                <div onClick={() => onToggleTask(student.id, t.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, cursor: 'pointer' }}>
                  {t.done ? <CheckCircle2 size={14} color="#3b82f6" /> : <Circle size={14} color="#94a3b8" />}
                  <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#94a3b8' : '#1e293b', fontSize: '11.5px' }}>{t.text}</span>
                </div>
                <button onClick={() => onDeleteTask(student.id, t.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={12} /></button>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '4px' }}>
          <input type="text" placeholder="예: 10/4 결석 (진단서 제출)" value={taskText} onChange={(e) => setTaskText(e.target.value)} style={{ flex: 1, padding: '6px 8px', fontSize: '11.5px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#ffffff' }} />
          <button type="submit" style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}><Plus size={13} /></button>
        </form>
      </div>
    </div>
  );
}
