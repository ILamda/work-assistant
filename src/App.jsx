// src/App.jsx
import React, { useState, useEffect } from 'react';
import { 
  ExternalLink, CheckCircle2, Circle, 
  Trash2, StickyNote, Clock, Settings, Bell, BellOff, BellRing, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

import { initialTrackList, quickLinks, initialTodos, initialNotes, initialStudents, initialClassrooms, initialSchedules, initialPersonalTodos } from './mockData';
import { SettingsModal, AddStudentModal, StudentCard } from './Modals';
import { requestNotificationPermission, sendAppNotification } from './notification';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  // 메인 대시보드 내부 서브뷰: 'memo' | 'work' | 'reminder' (1화면 1목적 집중)
  const [dashSubTab, setDashSubTab] = useState('memo');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState('all');
  const [todoFilter, setTodoFilter] = useState('all');
  const [showLinks, setShowLinks] = useState(false);

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

  // 입력 상태
  const [scratchText, setScratchText] = useState('');
  const [scratchDue, setScratchDue] = useState('오늘');

  const [newTodoInput, setNewTodoInput] = useState('');
  const [newTodoDue, setNewTodoDue] = useState('오늘');
  const [newTodoIsUrgent, setNewTodoIsUrgent] = useState(false);

  const [newReminderInput, setNewReminderInput] = useState('');
  const [newReminderDue, setNewReminderDue] = useState('오늘');
  const [newReminderTag, setNewReminderTag] = useState('병원/건강');

  const [scheduleTrack, setScheduleTrack] = useState('대전 AX 2기');

  // Firebase 실시간 동기화
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

  // 메모 처리
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
    setDashSubTab('work'); // 등록 후 바로 업무 목록으로 시선 전환
  };

  const convertScratchToReminder = () => {
    if (!scratchText.trim()) return;
    const text = scratchText.trim();
    const updated = [{
      id: Date.now(),
      text,
      tag: '리마인더',
      dueDate: scratchDue || '오늘',
      done: false
    }, ...personalTodos];
    setPersonalTodos(updated);
    setScratchText('');
    syncToCloud({ personalTodos: updated, scratchText: '' });
    setDashSubTab('reminder'); // 리마인더 탭으로 전환
  };

  // 업무 할 일
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

  // 개인 리마인더
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

  // 설정 제어 핸들러
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

  // 학생 데이터 핸들러
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

  const pendingTodosCount = todos.filter(t => !t.done).length;
  const pendingReminderCount = personalTodos.filter(p => !p.done).length;

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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '12px 10px 40px', color: '#1e293b' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        {/* 미니멀 헤더 */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '4px 2px' }}>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#0f172a' }}>대전 운영 대시보드</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              onClick={handleToggleNotification}
              style={{
                border: 'none', background: notificationEnabled ? '#eff6ff' : '#f1f5f9',
                color: notificationEnabled ? '#2563eb' : '#94a3b8',
                padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
              }}
            >
              {notificationEnabled ? <Bell size={13} /> : <BellOff size={13} />}
              <span>{notificationEnabled ? 'ON' : 'OFF'}</span>
            </button>
            <button onClick={() => setIsSettingsModalOpen(true)} style={{ border: 'none', background: '#f1f5f9', color: '#475569', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}>
              <Settings size={14} />
            </button>
          </div>
        </header>

        {/* 최상단 메인 탭 전환 (포털 / 시간표 / 교육생) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '12px', marginBottom: '12px' }}>
          {[
            { id: 'dashboard', label: '대시보드' },
            { id: 'schedule', label: '시간표/강의장' },
            { id: 'students', label: `학생(${students.length})` }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              style={{
                padding: '8px 0', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#0f172a' : '#64748b',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 1: 대시보드 (1화면 1목적 세부 전환) */}
        {activeTab === 'dashboard' && (
          <div>
            {/* 세부 서브탭 전환 버튼: 메모 / 업무 / 리마인더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
              <button 
                onClick={() => setDashSubTab('memo')}
                style={{
                  padding: '10px 4px', borderRadius: '10px', border: dashSubTab === 'memo' ? '2px solid #ea580c' : '1px solid #e2e8f0',
                  backgroundColor: dashSubTab === 'memo' ? '#fff7ed' : '#ffffff',
                  color: dashSubTab === 'memo' ? '#c2410c' : '#64748b',
                  fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                }}
              >
                ⚡ 빠른 메모
              </button>
              <button 
                onClick={() => setDashSubTab('work')}
                style={{
                  padding: '10px 4px', borderRadius: '10px', border: dashSubTab === 'work' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: dashSubTab === 'work' ? '#eff6ff' : '#ffffff',
                  color: dashSubTab === 'work' ? '#1d4ed8' : '#64748b',
                  fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                }}
              >
                📋 업무 ({pendingTodosCount})
              </button>
              <button 
                onClick={() => setDashSubTab('reminder')}
                style={{
                  padding: '10px 4px', borderRadius: '10px', border: dashSubTab === 'reminder' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  backgroundColor: dashSubTab === 'reminder' ? '#f0fdf4' : '#ffffff',
                  color: dashSubTab === 'reminder' ? '#15803d' : '#64748b',
                  fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                }}
              >
                🔔 리마인더 ({pendingReminderCount})
              </button>
            </div>

            {/* 1) 서브뷰: 빠른 메모장 (온전히 집중할 수 있는 깔끔한 입력창) */}
            {dashSubTab === 'memo' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #fed7aa', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <textarea 
                  rows={4} 
                  placeholder="지금 떠오른 생각, 즉시 적어야 할 현장 요청을 입력하세요..." 
                  value={scratchText} 
                  onChange={(e) => handleScratchChange(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #fed7aa', fontSize: '13px', outline: 'none', backgroundColor: '#fffbeb', boxSizing: 'border-box', marginBottom: '10px' }} 
                />
                
                {/* 간소화된 기한 선택 */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#9a3412', marginRight: '4px' }}>기한:</span>
                  {['오늘', '내일', '금요일'].map(val => (
                    <button key={val} onClick={() => setScratchDue(val)} style={{ padding: '3px 8px', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '11px', fontWeight: '700', backgroundColor: scratchDue === val ? '#ffedd5' : '#fff', color: scratchDue === val ? '#c2410c' : '#78716c', cursor: 'pointer' }}>{val}</button>
                  ))}
                  <input type="text" placeholder="직접입력" value={scratchDue} onChange={(e) => setScratchDue(e.target.value)} style={{ padding: '3px 6px', borderRadius: '6px', border: '1px solid #fed7aa', fontSize: '11px', width: '70px' }} />
                </div>

                {/* 2단 원터치 버튼 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => convertScratchToTodo(false)} disabled={!scratchText.trim()} style={{ padding: '11px 0', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                    📝 업무로 등록
                  </button>
                  <button onClick={() => convertScratchToTodo(true)} disabled={!scratchText.trim()} style={{ padding: '11px 0', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                    🚨 급한 일로 등록
                  </button>
                  <button onClick={convertScratchToReminder} disabled={!scratchText.trim()} style={{ gridColumn: 'span 2', padding: '9px 0', borderRadius: '10px', border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    🔔 개인 리마인더(병원/약/납부)로 등록
                  </button>
                </div>
              </div>
            )}

            {/* 2) 서브뷰: 현장 업무 목록 */}
            {dashSubTab === 'work' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                {/* 필터 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a' }}>현장 업무 ({filteredTodos.length})</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[['all', '전체'], ['urgent', '🚨급한일'], ['pending', '미완료']].map(([k, label]) => (
                      <button key={k} onClick={() => setTodoFilter(k)} style={{ padding: '3px 7px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer', backgroundColor: todoFilter === k ? '#3b82f6' : '#f1f5f9', color: todoFilter === k ? '#fff' : '#64748b' }}>{label}</button>
                    ))}
                  </div>
                </div>

                {/* 한 줄 추가 인풋 */}
                <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="업무 내용 입력..." 
                    value={newTodoInput} 
                    onChange={(e) => setNewTodoInput(e.target.value)} 
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }} 
                  />
                  <input 
                    type="text" 
                    placeholder="기한" 
                    value={newTodoDue} 
                    onChange={(e) => setNewTodoDue(e.target.value)} 
                    style={{ width: '60px', padding: '8px 4px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center' }} 
                  />
                  <button type="submit" style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    추가
                  </button>
                </form>

                {/* 목록 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredTodos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '12px', color: '#94a3b8' }}>남은 업무가 없습니다! ✨</div>
                  ) : (
                    filteredTodos.map(t => (
                      <div key={t.id} onClick={() => toggleTodo(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: t.done ? '#f8fafc' : t.isUrgent ? '#fff5f5' : '#ffffff', opacity: t.done ? 0.5 : 1, cursor: 'pointer' }}>
                        {t.done ? <CheckCircle2 size={16} color="#3b82f6" /> : <Circle size={16} color="#94a3b8" />}
                        {t.isUrgent && <span style={{ fontSize: '10px', padding: '2px 4px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c', fontWeight: '800' }}>급한일</span>}
                        <span style={{ flex: 1, fontSize: '12.5px', textDecoration: t.done ? 'line-through' : 'none', color: '#1e293b' }}>{t.text}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: t.isUrgent ? '#dc2626' : '#64748b' }}>{t.dueDate}</span>
                        <button onClick={(e) => deleteTodo(t.id, e)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', padding: '2px' }}><Trash2 size={13} /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3) 서브뷰: 개인 리마인더 */}
            {dashSubTab === 'reminder' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#166534', marginBottom: '10px' }}>
                  개인 리마인더 (병원, 납부, 루틴)
                </div>

                <form onSubmit={handleAddReminder} style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="예: 10/15 치과, 통신비 납부" 
                    value={newReminderInput} 
                    onChange={(e) => setNewReminderInput(e.target.value)} 
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '12px', outline: 'none' }} 
                  />
                  <input 
                    type="text" 
                    placeholder="기한" 
                    value={newReminderDue} 
                    onChange={(e) => setNewReminderDue(e.target.value)} 
                    style={{ width: '60px', padding: '8px 4px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '12px', textAlign: 'center' }} 
                  />
                  <button type="submit" style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    등록
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {personalTodos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '12px', color: '#94a3b8' }}>등록된 일정이 없습니다.</div>
                  ) : (
                    personalTodos.map(item => (
                      <div key={item.id} onClick={() => toggleReminder(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', borderRadius: '8px', border: '1px solid #dcfce7', backgroundColor: item.done ? '#f8fafc' : '#f0fdf4', opacity: item.done ? 0.5 : 1, cursor: 'pointer' }}>
                        {item.done ? <CheckCircle2 size={16} color="#16a34a" /> : <Circle size={16} color="#86efac" />}
                        <span style={{ flex: 1, fontSize: '12.5px', textDecoration: item.done ? 'line-through' : 'none', color: '#1e293b' }}>{item.text}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d' }}>{item.dueDate}</span>
                        <button onClick={(e) => deleteReminder(item.id, e)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={12} /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 접이식 바로가기 링크 (스크롤 방해 제거) */}
            <div style={{ marginTop: '14px' }}>
              <button 
                onClick={() => setShowLinks(!showLinks)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
              >
                <span>🔗 업무 시스템 바로가기 ({quickLinks.length})</span>
                {showLinks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showLinks && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '6px' }}>
                  {quickLinks.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#334155', fontSize: '11.5px', fontWeight: '600' }}>
                      <span>{l.title}</span><ExternalLink size={11} color="#94a3b8" />
                    </a>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 탭 2: 시간표 & 강의장 */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800' }}>강의장 현황</span>
                <button onClick={() => setIsSettingsModalOpen(true)} style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>설정에서 수정</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {classrooms.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{c.name}</span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '6px', background: c.currentTrack === '공실' ? '#e2e8f0' : '#dbeafe', color: c.currentTrack === '공실' ? '#64748b' : '#1d4ed8', fontWeight: '700' }}>{c.currentTrack}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800' }}>주간 시간표</span>
                <select value={scheduleTrack} onChange={(e) => setScheduleTrack(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', fontWeight: '700' }}>
                  {trackList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {schedules.filter(s => s.track === scheduleTrack).map(sc => (
                  <div key={sc.id} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>[{sc.day}] {sc.subject}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>강사: {sc.instructor} {sc.prep ? `| 준비: ${sc.prep}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 탭 3: 학생 관리 */}
        {activeTab === 'students' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800' }}>교육생 ({filteredStudents.length})</span>
              <button onClick={() => setIsAddModalOpen(true)} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>+ 추가</button>
            </div>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
              <button onClick={() => setSelectedTrackFilter('all')} style={{ padding: '4px 8px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer', background: selectedTrackFilter === 'all' ? '#1e3a8a' : '#f1f5f9', color: selectedTrackFilter === 'all' ? '#fff' : '#64748b' }}>전체</button>
              {trackList.map(t => (
                <button key={t} onClick={() => setSelectedTrackFilter(t)} style={{ padding: '4px 8px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer', background: selectedTrackFilter === t ? '#3b82f6' : '#f1f5f9', color: selectedTrackFilter === t ? '#fff' : '#64748b', whiteSpace: 'nowrap' }}>{t}</button>
              ))}
            </div>
            <input type="text" placeholder="이름 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
