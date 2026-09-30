// src/App.jsx
import React, { useState, useEffect } from 'react';
import { 
  ExternalLink, Search, CheckCircle2, Circle, 
  Trash2, StickyNote, CheckSquare, 
  Clock, MapPin, CalendarDays, Settings, Bell, BellOff, BellRing, AlertCircle, Plus
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

import { initialTrackList, quickLinks, initialTodos, initialNotes, initialStudents, initialClassrooms, initialSchedules, initialPersonalTodos } from './mockData';
import { SettingsModal, AddStudentModal, StudentCard } from './Modals';
import { requestNotificationPermission, sendAppNotification } from './notification';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState('all');
  const [todoFilter, setTodoFilter] = useState('all');

  // 모달 제어
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 알림 상태
  const [notificationEnabled, setNotificationEnabled] = useState(() => {
    return localStorage.getItem('lambda_noti_enabled') === 'true';
  });

  // 실시간 동기화 상태
  const [trackList, setTrackList] = useState(initialTrackList);
  const [todos, setTodos] = useState(initialTodos);
  const [personalTodos, setPersonalTodos] = useState(initialPersonalTodos);
  const [students, setStudents] = useState(initialStudents);
  const [classrooms, setClassrooms] = useState(initialClassrooms);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [savedNotes, setSavedNotes] = useState(initialNotes);

  // 빠른 메모장 상태
  const [scratchText, setScratchText] = useState('');
  const [scratchDue, setScratchDue] = useState('오늘');

  // 간소화된 업무 입력 상태 (위임 제거, 마감기한과 긴급도 중심)
  const [newTodoInput, setNewTodoInput] = useState('');
  const [newTodoDue, setNewTodoDue] = useState('오늘');
  const [newTodoIsUrgent, setNewTodoIsUrgent] = useState(false);

  // 개인 리마인더 입력 상태
  const [newReminderInput, setNewReminderInput] = useState('');
  const [newReminderDue, setNewReminderDue] = useState('오늘');
  const [newReminderTag, setNewReminderTag] = useState('병원/건강');

  const [scheduleTrack, setScheduleTrack] = useState('대전 AX 2기');

  // Firebase 실시간 동기화 리스너
  useEffect(() => {
    const docRef = doc(db, 'appData', 'sharedState');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.trackList) setTrackList(data.trackList);
        if (data.todos) setTodos(data.todos);
        if (data.personalTodos) setPersonalTodos(data.personalTodos);
        if (data.students) setStudents(data.students);
        if (data.classrooms) setClassrooms(data.classrooms);
        if (data.schedules) setSchedules(data.schedules);
        if (data.savedNotes) setSavedNotes(data.savedNotes);
        if (data.scratchText !== undefined) setScratchText(data.scratchText);
      } else {
        setDoc(docRef, {
          trackList: initialTrackList,
          todos: initialTodos,
          personalTodos: initialPersonalTodos,
          students: initialStudents,
          classrooms: initialClassrooms,
          schedules: initialSchedules,
          savedNotes: initialNotes,
          scratchText: ''
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const syncToCloud = async (fieldsToUpdate) => {
    try {
      const docRef = doc(db, 'appData', 'sharedState');
      await setDoc(docRef, fieldsToUpdate, { merge: true });
    } catch (e) {
      console.error('Firebase sync error:', e);
    }
  };

  useEffect(() => {
    localStorage.setItem('lambda_noti_enabled', String(notificationEnabled));
  }, [notificationEnabled]);

  // 알림 토글
  const handleToggleNotification = async () => {
    if (!notificationEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationEnabled(true);
        sendAppNotification('알림이 켜졌습니다', '마감 임박 및 긴급 일정 시 상단 바 알림이 전송됩니다.', true);
      }
    } else {
      setNotificationEnabled(false);
      alert('상단 바 알림이 꺼졌습니다.');
    }
  };

  const handleTestNotification = () => {
    if (!notificationEnabled) return alert('먼저 상단에서 알림을 켜주세요!');
    sendAppNotification('[테스트 알림] 대전 포털 알림 정상 작동', '스마트폰 상단 바 알림과 진동이 정상 수신되었습니다.', true);
  };

  // 1. 빠른 메모장 조작
  const handleScratchChange = (val) => {
    setScratchText(val);
    syncToCloud({ scratchText: val });
  };

  const convertScratchToTodo = (isUrgent = false) => {
    if (!scratchText.trim()) return;
    const text = scratchText.trim();
    const updated = [{ 
      id: Date.now(), 
      text, 
      dueDate: scratchDue || '오늘', 
      isUrgent: isUrgent || scratchDue.includes('빨리'), 
      done: false 
    }, ...todos];
    setTodos(updated);
    setScratchText('');
    syncToCloud({ todos: updated, scratchText: '' });
    if (isUrgent || scratchDue.includes('빨리')) {
      sendAppNotification('🚨 긴급 업무 등록', text, notificationEnabled);
    }
  };

  const convertScratchToReminder = () => {
    if (!scratchText.trim()) return;
    const text = scratchText.trim();
    const updated = [{
      id: Date.now(),
      text,
      tag: '메모 리마인더',
      dueDate: scratchDue || '오늘',
      done: false
    }, ...personalTodos];
    setPersonalTodos(updated);
    setScratchText('');
    syncToCloud({ personalTodos: updated, scratchText: '' });
  };

  const saveScratchAsNote = () => {
    if (!scratchText.trim()) return;
    const now = new Date();
    const updated = [{ id: Date.now(), text: scratchText.trim(), date: `${now.getMonth() + 1}/${now.getDate()}` }, ...savedNotes];
    setSavedNotes(updated);
    setScratchText('');
    syncToCloud({ savedNotes: updated, scratchText: '' });
  };

  // 2. 업무 할 일 조작 (위임 제거, 기한과 급한일 중심)
  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!newTodoInput.trim()) return;
    const item = {
      id: Date.now(),
      text: newTodoInput.trim(),
      dueDate: newTodoDue || '오늘',
      isUrgent: newTodoIsUrgent,
      done: false
    };
    const updated = [item, ...todos];
    setTodos(updated);
    syncToCloud({ todos: updated });
    setNewTodoInput('');
    setNewTodoIsUrgent(false);
    if (newTodoIsUrgent || newTodoDue.includes('빨리')) {
      sendAppNotification('🚨 긴급 업무 등록', item.text, notificationEnabled);
    }
  };

  const toggleTodo = (id) => {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated);
    syncToCloud({ todos: updated });
  };

  const deleteTodo = (id, e) => {
    e.stopPropagation();
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    syncToCloud({ todos: updated });
  };

  // 3. 개인 리마인더 조작
  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!newReminderInput.trim()) return;
    const item = {
      id: Date.now(),
      text: newReminderInput.trim(),
      tag: newReminderTag,
      dueDate: newReminderDue || '오늘',
      done: false
    };
    const updated = [item, ...personalTodos];
    setPersonalTodos(updated);
    syncToCloud({ personalTodos: updated });
    setNewReminderInput('');
    if (newReminderDue.includes('오늘') || newReminderDue.includes('빨리')) {
      sendAppNotification(`🔔 [리마인더] ${newReminderTag}`, item.text, notificationEnabled);
    }
  };

  const toggleReminder = (id) => {
    const updated = personalTodos.map(p => p.id === id ? { ...p, done: !p.done } : p);
    setPersonalTodos(updated);
    syncToCloud({ personalTodos: updated });
  };

  const deleteReminder = (id, e) => {
    e.stopPropagation();
    const updated = personalTodos.filter(p => p.id !== id);
    setPersonalTodos(updated);
    syncToCloud({ personalTodos: updated });
  };

  // 설정 제어
  const handleUpdateRoom = (id, field, val) => {
    const updated = classrooms.map(c => c.id === id ? { ...c, [field]: val } : c);
    setClassrooms(updated);
    syncToCloud({ classrooms: updated });
  };

  const handleAddRoom = (name) => {
    const updated = [...classrooms, { id: Date.now(), name, currentTrack: '공실', issue: '' }];
    setClassrooms(updated);
    syncToCloud({ classrooms: updated });
  };

  const handleDeleteRoom = (id) => {
    if (window.confirm('강의장을 삭제할까요?')) {
      const updated = classrooms.filter(c => c.id !== id);
      setClassrooms(updated);
      syncToCloud({ classrooms: updated });
    }
  };

  const handleUpdateTrack = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    const updatedTracks = trackList.map(t => t === oldName ? newName.trim() : t);
    const updatedStudents = students.map(s => s.track === oldName ? { ...s, track: newName.trim() } : s);
    const updatedRooms = classrooms.map(c => c.currentTrack === oldName ? { ...c, currentTrack: newName.trim() } : c);
    const updatedSchedules = schedules.map(sc => sc.track === oldName ? { ...sc, track: newName.trim() } : sc);
    setTrackList(updatedTracks);
    setStudents(updatedStudents);
    setClassrooms(updatedRooms);
    setSchedules(updatedSchedules);
    if (scheduleTrack === oldName) setScheduleTrack(newName.trim());
    syncToCloud({ trackList: updatedTracks, students: updatedStudents, classrooms: updatedRooms, schedules: updatedSchedules });
  };

  const handleAddTrack = (name) => {
    if (!trackList.includes(name.trim())) {
      const updated = [...trackList, name.trim()];
      setTrackList(updated);
      syncToCloud({ trackList: updated });
    }
  };

  const handleDeleteTrack = (name) => {
    if (window.confirm(`[${name}] 과정을 삭제할까요?`)) {
      const updated = trackList.filter(t => t !== name);
      setTrackList(updated);
      syncToCloud({ trackList: updated });
    }
  };

  // 학생 조작
  const handleAddStudent = (form) => {
    const updated = [{ id: Date.now(), ...form, tasks: [] }, ...students];
    setStudents(updated);
    syncToCloud({ students: updated });
  };

  const handleDeleteStudent = (id) => {
    if (window.confirm('학생을 삭제할까요?')) {
      const updated = students.filter(s => s.id !== id);
      setStudents(updated);
      syncToCloud({ students: updated });
    }
  };

  const toggleStudentTask = (sid, tid) => {
    const updated = students.map(s => s.id === sid ? { ...s, tasks: s.tasks.map(t => t.id === tid ? { ...t, done: !t.done } : t) } : s);
    setStudents(updated);
    syncToCloud({ students: updated });
  };

  const addStudentTask = (sid, text) => {
    const updated = students.map(s => s.id === sid ? { ...s, tasks: [...s.tasks, { id: Date.now(), text, done: false }] } : s);
    setStudents(updated);
    syncToCloud({ students: updated });
  };

  const deleteStudentTask = (sid, tid) => {
    const updated = students.map(s => s.id === sid ? { ...s, tasks: s.tasks.filter(t => t.id !== tid) } : s);
    setStudents(updated);
    syncToCloud({ students: updated });
  };

  // 필터링 계산
  const filteredTodos = todos.filter(t => {
    if (todoFilter === 'urgent') return t.isUrgent || t.dueDate?.includes('빨리') || t.dueDate?.includes('오늘');
    if (todoFilter === 'pending') return !t.done;
    return true;
  });

  const filteredStudents = students.filter(s => {
    const matchTrack = selectedTrackFilter === 'all' || s.track === selectedTrackFilter;
    const matchSearch = s.name.includes(searchTerm) || s.track.includes(searchTerm) || s.tasks?.some(t => t.text.includes(searchTerm));
    return matchTrack && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f7ff', fontFamily: 'sans-serif', padding: '14px 10px', color: '#334155' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* 상단 헤더 */}
        <header style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px 18px', boxShadow: '0 4px 18px rgba(186, 215, 245, 0.35)', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#1e3a8a' }}>람다의 대전 운영 총괄 포털</h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '11.5px' }}>ADHD 라이프 & 현장 포커스 대시보드</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleToggleNotification}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 11px', borderRadius: '10px',
                border: '1px solid', borderColor: notificationEnabled ? '#bfdbfe' : '#e2e8f0',
                backgroundColor: notificationEnabled ? '#eff6ff' : '#f8fafc',
                color: notificationEnabled ? '#2563eb' : '#64748b',
                fontSize: '11.5px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              {notificationEnabled ? <Bell size={13} color="#2563eb" /> : <BellOff size={13} color="#94a3b8" />}
              <span>{notificationEnabled ? '알림 켜짐' : '알림 꺼짐'}</span>
            </button>

            <button onClick={() => setIsSettingsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 11px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}>
              <Settings size={13} /> 설정
            </button>
            
            <div style={{ backgroundColor: '#e8f2fe', padding: '3px', borderRadius: '12px', display: 'flex', gap: '3px' }}>
              {['dashboard', 'schedule', 'students'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 11px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: '700', backgroundColor: activeTab === tab ? '#3b82f6' : 'transparent', color: activeTab === tab ? '#fff' : '#64748b' }}>
                  {tab === 'dashboard' ? '메모&업무' : tab === 'schedule' ? '일정&강의장' : `교육생(${students.length})`}
                </button>
              ))}
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* ⭐ 1. 메인: 빠른 메모장 (최상단 배치) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px', border: '2px solid #fed7aa', boxShadow: '0 4px 14px rgba(254, 215, 170, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <StickyNote size={17} color="#ea580c" />
                  <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#9a3412' }}>⚡ 빠른 메모장 (메인 뇌외주)</h2>
                </div>
                <span style={{ fontSize: '11px', color: '#c2410c', fontWeight: '700' }}>생각나는 즉시 적고 분류하세요</span>
              </div>
              
              <textarea 
                rows={3} 
                placeholder="머릿속에 떠오른 생각, 즉시 적어야 할 현장 요청이나 번뜩인 아이디어를 털어놓으세요..." 
                value={scratchText} 
                onChange={(e) => handleScratchChange(e.target.value)} 
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #fed7aa', fontSize: '13px', outline: 'none', backgroundColor: '#fffbeb', boxSizing: 'border-box', marginBottom: '8px' }} 
              />
              
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#9a3412' }}>마감 기한:</span>
                {['최대한 빨리', '오늘', '내일', '금요일'].map(val => (
                  <button key={val} onClick={() => setScratchDue(val)} style={{ padding: '3px 8px', borderRadius: '12px', border: '1px solid #fed7aa', fontSize: '11px', fontWeight: '700', backgroundColor: scratchDue === val ? '#ffedd5' : '#fff', color: scratchDue === val ? '#c2410c' : '#78716c', cursor: 'pointer' }}>{val}</button>
                ))}
                <input type="text" placeholder="직접입력(예: 10/24)" value={scratchDue} onChange={(e) => setScratchDue(e.target.value)} style={{ padding: '3px 6px', borderRadius: '6px', border: '1px solid #fed7aa', fontSize: '11px', width: '100px' }} />
              </div>

              {/* 버튼 그룹 - 모바일에서도 삐져나가지 않도록 flex-wrap 설정 */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={saveScratchAsNote} disabled={!scratchText.trim()} style={{ padding: '7px 11px', borderRadius: '8px', border: '1px solid #fed7aa', background: '#fff', color: '#ea580c', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}>
                  📌 보관 메모로 저장
                </button>
                <button onClick={convertScratchToReminder} disabled={!scratchText.trim()} style={{ padding: '7px 11px', borderRadius: '8px', border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}>
                  🔔 개인 리마인더로 등록
                </button>
                <button onClick={() => convertScratchToTodo(false)} disabled={!scratchText.trim()} style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}>
                  📝 [{scratchDue}] 업무 등록
                </button>
                <button onClick={() => convertScratchToTodo(true)} disabled={!scratchText.trim()} style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}>
                  🚨 급한 일로 등록
                </button>
              </div>
            </div>

            {/* ⭐ 2. 업무 진행 & 마감 트래커 (위임 제거, 모바일 최적화) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px', border: '2px solid #dbeafe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} color="#2563eb" />
                  <h2 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: '#1e3a8a' }}>현장 업무 & 기한 추적</h2>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[['all', '전체'], ['urgent', '🚨급한일'], ['pending', '미완료']].map(([k, label]) => (
                    <button key={k} onClick={() => setTodoFilter(k)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer', backgroundColor: todoFilter === k ? '#3b82f6' : '#f1f5f9', color: todoFilter === k ? '#fff' : '#64748b' }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* 업무 입력 폼: 모바일에서 버튼이 안 잘리도록 flex/wrap 레이아웃 적용 */}
              <form onSubmit={handleAddTodo} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                <input 
                  type="text" 
                  placeholder="업무 내용 (예: 수기 출석부 LMS 대조, 빔프로젝터 점검)" 
                  value={newTodoInput} 
                  onChange={(e) => setNewTodoInput(e.target.value)} 
                  style={{ flex: '1 1 200px', minWidth: '180px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                />
                <input 
                  type="text" 
                  placeholder="마감(예: 오늘, 10/5)" 
                  value={newTodoDue} 
                  onChange={(e) => setNewTodoDue(e.target.value)} 
                  style={{ width: '100px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: newTodoIsUrgent ? '#dc2626' : '#64748b', cursor: 'pointer', padding: '0 4px' }}>
                  <input type="checkbox" checked={newTodoIsUrgent} onChange={(e) => setNewTodoIsUrgent(e.target.checked)} />
                  🚨 급한일
                </label>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  등록
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredTodos.map(t => {
                  const isUrgent = t.isUrgent || t.dueDate?.includes('빨리') || t.dueDate?.includes('오늘');
                  return (
                    <div key={t.id} onClick={() => toggleTodo(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: t.done ? '#f8fafc' : isUrgent ? '#fff5f5' : '#f0f7ff', opacity: t.done ? 0.6 : 1, cursor: 'pointer' }}>
                      {t.done ? <CheckCircle2 size={16} color="#3b82f6" /> : <Circle size={16} color="#94a3b8" />}
                      {isUrgent && <span style={{ fontSize: '10.5px', padding: '2px 5px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', fontWeight: '800' }}>🚨 급한일</span>}
                      <span style={{ flex: 1, fontSize: '12.5px', textDecoration: t.done ? 'line-through' : 'none', color: '#1e293b' }}>{t.text}</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isUrgent ? '#dc2626' : '#64748b', whiteSpace: 'nowrap' }}>⏳ {t.dueDate}</span>
                      <button onClick={(e) => deleteTodo(t.id, e)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={13} /></button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ⭐ 3. 통칭 "개인 리마인더" (버튼 짤림 해결) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px', border: '2px solid #bbf7d0', boxShadow: '0 4px 14px rgba(187, 247, 208, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BellRing size={16} color="#16a34a" />
                  <h2 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: '#166534' }}>개인 리마인더 (ADHD 데일리 챙김)</h2>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '8px' }}>
                  남은 일정 {personalTodos.filter(p => !p.done).length}건
                </span>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: '#15803d' }}>
                병원 예약, 약 복용, 각종 요금 납부일 등 일상에서 놓치기 쉬운 일들을 등록해 두세요.
              </p>

              {/* 리마인더 입력 폼: 모바일에서도 등록 버튼이 아래로 떨어지며 절대 잘리지 않음 */}
              <form onSubmit={handleAddReminder} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                <input 
                  type="text" 
                  placeholder="리마인더 내용 (예: 치과 예약, 통신비 납부, 처방약 복용 등)" 
                  value={newReminderInput} 
                  onChange={(e) => setNewReminderInput(e.target.value)} 
                  style={{ flex: '1 1 200px', minWidth: '180px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '12px', outline: 'none' }} 
                />
                <select 
                  value={newReminderTag} 
                  onChange={(e) => setNewReminderTag(e.target.value)} 
                  style={{ width: '105px', padding: '8px 4px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '11.5px', backgroundColor: '#fff' }}
                >
                  <option value="병원/건강">🏥 병원/건강</option>
                  <option value="요금/납부">💳 요금/납부</option>
                  <option value="생활/루틴">🌿 생활/루틴</option>
                  <option value="개인약속">☕ 개인약속</option>
                </select>
                <input 
                  type="text" 
                  placeholder="기한(예: 오늘, 10/15)" 
                  value={newReminderDue} 
                  onChange={(e) => setNewReminderDue(e.target.value)} 
                  style={{ width: '100px', padding: '8px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '11.5px' }} 
                />
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  등록
                </button>
              </form>

              {/* 리마인더 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {personalTodos.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => toggleReminder(item.id)} 
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '10px',
                      border: '1px solid #dcfce7', backgroundColor: item.done ? '#f8fafc' : '#f0fdf4',
                      opacity: item.done ? 0.5 : 1, cursor: 'pointer'
                    }}
                  >
                    {item.done ? <CheckCircle2 size={16} color="#16a34a" /> : <Circle size={16} color="#86efac" />}
                    <span style={{
                      fontSize: '11px', padding: '2px 6px', borderRadius: '6px', fontWeight: '800',
                      backgroundColor: '#dcfce7', color: '#166534', whiteSpace: 'nowrap'
                    }}>
                      {item.tag || item.category || '리마인더'}
                    </span>
                    <span style={{ flex: 1, fontSize: '12.5px', fontWeight: '600', textDecoration: item.done ? 'line-through' : 'none', color: '#1e293b' }}>
                      {item.text}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#15803d', whiteSpace: 'nowrap' }}>
                      🗓️ {item.dueDate}
                    </span>
                    <button onClick={(e) => deleteReminder(item.id, e)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 바로가기 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '13px', fontWeight: '800', margin: '0 0 10px 0', color: '#0f172a' }}>자주 사용하는 페이지</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                {quickLinks.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#1e293b', fontSize: '12px', fontWeight: '600' }}>
                    <span>{l.title}</span><ExternalLink size={12} color="#94a3b8" />
                  </a>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 탭 2: 일정 & 강의장 */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#0f172a' }}>강의장 실시간 현황</h2>
                <button onClick={() => setIsSettingsModalOpen(true)} style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>설정에서 수정</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                {classrooms.map(c => (
                  <div key={c.id} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: c.currentTrack === '공실' ? '#f8fafc' : '#f5f3ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '800', fontSize: '13px' }}>{c.name}</span>
                      <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '8px', background: c.currentTrack === '공실' ? '#e2e8f0' : '#8b5cf6', color: c.currentTrack === '공실' ? '#64748b' : '#fff', fontWeight: '700' }}>{c.currentTrack}</span>
                    </div>
                    <input type="text" placeholder="현장 특이사항/점검사항" value={c.issue} onChange={(e) => handleUpdateRoom(c.id, 'issue', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#0f172a' }}>반별 주간 스케줄 & 준비물</h2>
                <select value={scheduleTrack} onChange={(e) => setScheduleTrack(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700' }}>{trackList.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {schedules.filter(s => s.track === scheduleTrack).map(sc => {
                  const dayTodos = todos.filter(t => !t.done && (t.dueDate?.includes(sc.day) || (sc.day === '금' && t.dueDate?.includes('금요일'))));
                  return (
                    <div key={sc.id} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '800', fontSize: '13px' }}>[{sc.day}요일] {sc.subject} (강사: {sc.instructor})</span>
                        {dayTodos.length > 0 && <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '800' }}>마감 업무 {dayTodos.length}건</span>}
                      </div>
                      {dayTodos.map(dt => <div key={dt.id} style={{ fontSize: '11.5px', color: '#b91c1c', marginBottom: '4px' }}>📌 마감: {dt.text}</div>)}
                      <input type="text" placeholder="강의 준비사항 (교재, 실습SW 등)" value={sc.prep} onChange={(e) => {
                        const updated = schedules.map(item => item.id === sc.id ? { ...item, prep: e.target.value } : item);
                        setSchedules(updated);
                        syncToCloud({ schedules: updated });
                      }} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', boxSizing: 'border-box' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 탭 3: 반별 교육생 관리 */}
        {activeTab === 'students' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#0f172a' }}>교육생 명부 ({filteredStudents.length}명)</h2>
              <button onClick={() => setIsAddModalOpen(true)} style={{ padding: '6px 11px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>+ 학생 추가</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '12px' }}>
              <button onClick={() => setSelectedTrackFilter('all')} style={{ padding: '5px 10px', borderRadius: '12px', border: 'none', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', background: selectedTrackFilter === 'all' ? '#1e3a8a' : '#f1f5f9', color: selectedTrackFilter === 'all' ? '#fff' : '#64748b' }}>전체 ({students.length})</button>
              {trackList.map(t => (
                <button key={t} onClick={() => setSelectedTrackFilter(t)} style={{ padding: '5px 10px', borderRadius: '12px', border: 'none', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', background: selectedTrackFilter === t ? '#3b82f6' : '#f1f5f9', color: selectedTrackFilter === t ? '#fff' : '#64748b' }}>{t}</button>
              ))}
            </div>
            <input type="text" placeholder="이름, 과정, 체크할 일 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '12px', boxSizing: 'border-box' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {filteredStudents.map(s => (
                <StudentCard key={s.id} student={s} onToggleTask={toggleStudentTask} onAddTask={addStudentTask} onDeleteTask={deleteStudentTask} onDeleteStudent={handleDeleteStudent} />
              ))}
            </div>
          </div>
        )}

      </div>

      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        classrooms={classrooms} 
        onUpdateRoom={handleUpdateRoom} 
        onAddRoom={handleAddRoom} 
        onDeleteRoom={handleDeleteRoom} 
        trackList={trackList} 
        onUpdateTrack={handleUpdateTrack} 
        onAddTrack={handleAddTrack} 
        onDeleteTrack={handleDeleteTrack}
        onTestNotification={handleTestNotification}
        notificationEnabled={notificationEnabled}
      />
      <AddStudentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddStudent} trackList={trackList} />
    </div>
  );
}