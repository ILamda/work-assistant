import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  requestRoutinePermission, 
  scheduleRoutineAlarm, 
  cancelRoutineAlarm 
} from './routineNotification';
import { 
  LayoutDashboard, Users, Users2, Clock, BellRing, Bell, BellOff, Plus, 
  ExternalLink, Edit2, Trash2, CheckCircle2, Circle, 
  LogOut, LogIn, HelpCircle, X, Globe, Save, Search, Phone, 
  FileText, CheckSquare, Briefcase, UserCheck, Send, BookmarkCheck, 
  UserPlus, Calendar, UserCheck2, History, GraduationCap, 
  Sparkles, Filter, MessageSquare, Lock
} from 'lucide-react';
import InstructorProfileList from './components/InstructorProfileList';
import StudentExcelModal from './components/StudentExcelModal';
export default function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [scheduleSubTab, setScheduleSubTab] = useState('schedule');
  const [showGuide, setShowGuide] = useState(false);
  const [cohortList, setCohortList] = useState(['1기', '2기']);
const [trackList, setTrackList] = useState(['AX', 'SF', 'DM']);
const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  // 오늘 날짜 계산 (YYYY-MM-DD)
  const todayObj = new Date();
  const todayDateStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  // 1. 스마트 콘솔 상태
  const [omniInput, setOmniInput] = useState('');
  const [omniTime, setOmniTime] = useState('09:00');
  const [omniAssignee, setOmniAssignee] = useState('');
  const [selectedStudentForMemo, setSelectedStudentForMemo] = useState('');

  // 2. 출퇴근 기록 (개인)
  const [attendance, setAttendance] = useState({
    date: todayObj.toLocaleDateString('ko-KR'),
    clockIn: null,
    clockOut: null,
    status: '미출근'
  });
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  // 3. 일반 메모 & 할 일 (개인)
  const [memoList, setMemoList] = useState([]);
  const [memoSearch, setMemoSearch] = useState('');
  const [todos, setTodos] = useState([]);

  // 4. 바로가기 링크 (개인)
  const [quickLinks, setQuickLinks] = useState([
    { id: 1, title: '강사 허브 (Instructor Hub)', url: 'https://instructor-hub.pages.dev/' },
    { id: 2, title: 'LMS 관리 시스템', url: 'https://example.com/lms' },
    { id: 3, title: 'HRD-Net 출결관리', url: 'https://hrd.go.kr' }
  ]);

  // 5. 팀 공용 데이터 (공지 & 팀 업무)
  const [teamNotices, setTeamNotices] = useState([]);
  const [teamTasks, setTeamTasks] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingTaskAssignee, setEditingTaskAssignee] = useState('');
  const [editingTaskDueDate, setEditingTaskDueDate] = useState('');
  
  // 댓글 입력 상태
  const [openCommentsTaskId, setOpenCommentsTaskId] = useState(null);
  const [commentInput, setCommentInput] = useState('');

  // 6. 교육생 데이터
  const [members, setMembers] = useState([]);
  const [memberFilterCohort, setMemberFilterCohort] = useState('전체');
  const [memberFilterTrack, setMemberFilterTrack] = useState('전체');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // 7. 강사 및 시간표 데이터
  const [instructors, setInstructors] = useState([]);
  const [weeklySchedule, setWeeklySchedule] = useState([]);

  // 시간표 필터 및 검색 상태
  const [filterCohort, setFilterCohort] = useState('전체');
  const [filterTrack, setFilterTrack] = useState('전체');
  const [scheduleSearchInput, setScheduleSearchInput] = useState('');
  const [appliedSearchKeyword, setAppliedSearchKeyword] = useState('');
  const [scheduleSearchDate, setScheduleSearchDate] = useState('');

  const handleExecuteSearch = (e) => {
    if (e) e.preventDefault();
    setAppliedSearchKeyword(scheduleSearchInput.trim());
  };

  const todayLectures = weeklySchedule.filter(s => s.date === todayDateStr);

  const filteredSchedule = weeklySchedule.filter(s => {
    const matchCohort = (filterCohort === '전체') || (s.cohort === filterCohort);
    const matchTrack = (filterTrack === '전체') || (s.trackType === filterTrack);
    const matchDate = !scheduleSearchDate || (s.date === scheduleSearchDate);

    const keyword = appliedSearchKeyword.toLowerCase();
    const matchKeyword = !keyword || 
      (s.instructor && s.instructor.toLowerCase().includes(keyword)) ||
      (s.subject && s.subject.toLowerCase().includes(keyword)) ||
      (s.organization && s.organization.toLowerCase().includes(keyword));

    return matchCohort && matchTrack && matchDate && matchKeyword;
  });

  const filteredMembers = members.filter(m => {
    const trackStr = m.track || '';
    const matchCohort = (memberFilterCohort === '전체') || 
      (memberFilterCohort === '1기' && trackStr.includes('1기')) ||
      (memberFilterCohort === '2기' && trackStr.includes('2기'));

    const matchTrack = (memberFilterTrack === '전체') ||
      (memberFilterTrack === 'AX' && trackStr.toUpperCase().includes('AX')) ||
      (memberFilterTrack === 'SF' && trackStr.toUpperCase().includes('SF')) ||
      (memberFilterTrack === 'DM' && trackStr.toUpperCase().includes('DM'));

    const searchLower = memberSearchTerm.trim().toLowerCase();
    const matchSearch = !searchLower ||
      (m.name || '').toLowerCase().includes(searchLower) ||
      (m.course || '').toLowerCase().includes(searchLower) ||
      (m.track || '').toLowerCase().includes(searchLower) ||
      (m.phone || '').includes(searchLower) ||
      (m.birth || '').includes(searchLower) ||
      (m.requestNote || '').toLowerCase().includes(searchLower);

    return matchCohort && matchTrack && matchSearch;
  });

  const filteredMemos = memoList.filter(memo => {
    if (!memoSearch.trim()) return true;
    return memo.text && memo.text.toLowerCase().includes(memoSearch.trim().toLowerCase());
  });

  const getOrgBadgeStyle = (orgRaw) => {
    const org = String(orgRaw || '').trim().toUpperCase();
    if (org.includes('LGE') || org.includes('LG')) {
      return { backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' };
    }
    if (org.includes('CLIPS') || org.includes('클립스')) {
      return { backgroundColor: '#fefce8', color: '#b45309', border: '1px solid #fef08a' };
    }
    if (org.includes('LAB4DX') || org.includes('LAB')) {
      return { backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' };
    }
    if (org.includes('ASSIST') || org.includes('에이블')) {
      return { backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };
    }
    return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
  };

  // 모달 상태
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', course: '', track: '2기 AX', phone: '', birth: '', status: '정상', requestNote: '' });

  const [isInstructorModalOpen, setIsInstructorModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [instructorForm, setInstructorForm] = useState({ name: '', organization: 'LGE', subject: '', phone: '', email: '', prep: '' });

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: todayDateStr,
    cohort: '2기',
    trackType: 'AX',
    instructor: '',
    organization: 'LGE',
    subject: '',
    prep: ''
  });

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkTitleInput, setLinkTitleInput] = useState('');
  const [linkUrlInput, setLinkUrlInput] = useState('');

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setTodos([]);
    setMemoList([]);
    setAttendanceLogs([]);
    setAttendance({
      date: todayObj.toLocaleDateString('ko-KR'),
      clockIn: null,
      clockOut: null,
      status: '미출근'
    });
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currUser) => {
      setUser(currUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const teamDocRef = doc(db, 'shared', 'teamSpace');
    const unsubTeam = onSnapshot(teamDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.teamNotices) setTeamNotices(data.teamNotices);
        if (data.teamTasks) setTeamTasks(data.teamTasks);
        if (data.members) setMembers(data.members);
        if (data.instructors) setInstructors(data.instructors);
        if (data.weeklySchedule) setWeeklySchedule(data.weeklySchedule);
      }
    });

    return () => unsubTeam();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.quickLinks) setQuickLinks(data.quickLinks);
        if (data.todos) setTodos(data.todos);
        if (data.memoList) setMemoList(data.memoList);
        if (data.attendanceLogs) setAttendanceLogs(data.attendanceLogs);
        if (data.attendance) {
          const today = new Date().toLocaleDateString('ko-KR');
          if (data.attendance.date === today) setAttendance(data.attendance);
        }
      }
    });

    return () => unsubUser();
  }, [user]);

  const syncUserData = async (newData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), newData, { merge: true });
    } catch (err) {
      console.error('User sync error:', err);
    }
  };

  const syncTeamData = async (newData) => {
    try {
      await setDoc(doc(db, 'shared', 'teamSpace'), newData, { merge: true });
    } catch (err) {
      console.error('Team sync error:', err);
    }
  };

  const handleClockIn = () => {
    if (!user) return alert('출퇴근을 기록하려면 먼저 로그인해 주세요.');
    const today = new Date().toLocaleDateString('ko-KR');
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const newAtt = { date: today, clockIn: timeStr, clockOut: attendance.clockOut, status: '근무 중' };
    setAttendance(newAtt);

    const existingIndex = attendanceLogs.findIndex(log => log.date === today);
    let updatedLogs;
    if (existingIndex >= 0) {
      updatedLogs = attendanceLogs.map((l, i) => i === existingIndex ? { ...l, clockIn: timeStr, status: '근무 중' } : l);
    } else {
      updatedLogs = [{ date: today, clockIn: timeStr, clockOut: '—', status: '근무 중' }, ...attendanceLogs];
    }
    setAttendanceLogs(updatedLogs);
    syncUserData({ attendance: newAtt, attendanceLogs: updatedLogs });
  };

  const handleClockOut = () => {
    if (!user) return alert('출퇴근을 기록하려면 먼저 로그인해 주세요.');
    const today = new Date().toLocaleDateString('ko-KR');
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const newAtt = { ...attendance, date: today, clockOut: timeStr, status: '퇴근 완료' };
    setAttendance(newAtt);

    const existingIndex = attendanceLogs.findIndex(log => log.date === today);
    let updatedLogs;
    if (existingIndex >= 0) {
      updatedLogs = attendanceLogs.map((l, i) => i === existingIndex ? { ...l, clockOut: timeStr, status: '퇴근 완료' } : l);
    } else {
      updatedLogs = [{ date: today, clockIn: '—', clockOut: timeStr, status: '퇴근 완료' }, ...attendanceLogs];
    }
    setAttendanceLogs(updatedLogs);
    syncUserData({ attendance: newAtt, attendanceLogs: updatedLogs });
  };

  const handleSaveToStudentNote = () => {
    if (!omniInput.trim()) return;

    let targetMember = null;
    let cleanNote = omniInput.trim();

    if (selectedStudentForMemo) {
      targetMember = members.find(m => String(m.id) === String(selectedStudentForMemo));
    } else {
      targetMember = members.find(m => m.name && omniInput.includes(m.name));
    }

    if (!targetMember) {
      alert('등록된 학생 이름을 본문에 입력하거나 드롭다운에서 선택해 주세요.');
      return;
    }

    const now = new Date();
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newEntry = `[${timeStr}] ${cleanNote}`;

    const updatedNote = targetMember.requestNote ? `${targetMember.requestNote}\n${newEntry}` : newEntry;
    const updatedMembers = members.map(m => m.id === targetMember.id ? { ...m, requestNote: updatedNote } : m);

    setMembers(updatedMembers);
    syncTeamData({ members: updatedMembers });
    setOmniInput('');
    setSelectedStudentForMemo('');
    alert(`[${targetMember.name}] 학생의 요청사항에 등록되었습니다.`);
  };

  const handleSaveAsMemo = () => {
    if (!user) return alert('메모를 보관하려면 먼저 로그인해 주세요.');
    if (!omniInput.trim()) return;
    const now = new Date();
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newMemo = { id: Date.now(), text: omniInput.trim(), date: timeStr };
    const updated = [newMemo, ...memoList];
    setMemoList(updated);
    syncUserData({ memoList: updated });
    setOmniInput('');
    alert('메모 보관함에 저장되었습니다.');
  };

  const handleSaveAsTodo = async () => {
    if (!user) return alert('할 일을 등록하려면 먼저 로그인해 주세요.');
    if (!omniInput.trim()) return;
    const granted = await requestRoutinePermission();
    const newId = Date.now();
    const newTodo = { id: newId, text: omniInput.trim(), time: omniTime, repeatDaily: false, alarmEnabled: true, done: false };
    const updated = [newTodo, ...todos];
    setTodos(updated);
    syncUserData({ todos: updated });

    if (granted && omniTime) await scheduleRoutineAlarm(newId, omniInput.trim(), omniTime);
    setOmniInput('');
  };

  const handleSendAsTeamNotice = () => {
    if (!omniInput.trim()) return;
    const newNotice = { id: Date.now(), title: omniInput.trim(), author: user?.displayName || '팀원', date: new Date().toLocaleDateString('ko-KR') };
    const updated = [newNotice, ...teamNotices];
    setTeamNotices(updated);
    syncTeamData({ teamNotices: updated });
    setOmniInput('');
    alert('팀 공지사항으로 등록되었습니다.');
  };

  const handleSendAsTeamTask = () => {
    if (!omniInput.trim()) return;
    const newTask = { 
      id: Date.now(), 
      title: omniInput.trim(), 
      assignee: omniAssignee.trim() || '미지정', 
      dueDate: '오늘', 
      done: false, 
      comments: [] 
    };
    const updated = [newTask, ...teamTasks];
    setTeamTasks(updated);
    syncTeamData({ teamTasks: updated });
    setOmniInput('');
    setOmniAssignee('');
    alert('팀 업무로 등록되었습니다.');
  };

  const handleDeleteMemo = (id) => {
    const updated = memoList.filter(m => m.id !== id);
    setMemoList(updated);
    syncUserData({ memoList: updated });
  };

  const handleToggleTodo = (id) => {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated);
    syncUserData({ todos: updated });
  };

  const handleToggleAlarm = async (item, e) => {
    e.stopPropagation();
    const willEnable = !item.alarmEnabled;
    if (willEnable) {
      const granted = await requestRoutinePermission();
      if (granted && item.time) await scheduleRoutineAlarm(item.id, item.text, item.time);
    } else {
      await cancelRoutineAlarm(item.id);
    }
    const updated = todos.map(t => t.id === item.id ? { ...t, alarmEnabled: willEnable } : t);
    setTodos(updated);
    syncUserData({ todos: updated });
  };

  const handleDeleteTodo = async (id, e) => {
    e.stopPropagation();
    await cancelRoutineAlarm(id);
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    syncUserData({ todos: updated });
  };

  const handleToggleTask = (id) => {
    const updated = teamTasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTeamTasks(updated);
    syncTeamData({ teamTasks: updated });
  };

  const handleDeleteTask = (id, e) => {
    e.stopPropagation();
    const updated = teamTasks.filter(t => t.id !== id);
    setTeamTasks(updated);
    syncTeamData({ teamTasks: updated });
  };

  const startEditTask = (task, e) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
    setEditingTaskAssignee(task.assignee);
    setEditingTaskDueDate(task.dueDate || '오늘');
  };

  const saveEditTask = (taskId, e) => {
    e.stopPropagation();
    const updated = teamTasks.map(t => t.id === taskId ? {
      ...t,
      title: editingTaskTitle.trim() || t.title,
      assignee: editingTaskAssignee.trim() || t.assignee,
      dueDate: editingTaskDueDate.trim() || t.dueDate
    } : t);
    setTeamTasks(updated);
    syncTeamData({ teamTasks: updated });
    setEditingTaskId(null);
  };

  const handleAddComment = (taskId, e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const now = new Date();
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newComment = {
      id: Date.now(),
      author: user?.displayName || '팀원',
      text: commentInput.trim(),
      date: timeStr
    };

    const updated = teamTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, comments: [...(t.comments || []), newComment] };
      }
      return t;
    });

    setTeamTasks(updated);
    syncTeamData({ teamTasks: updated });
    setCommentInput('');
  };

  const handleDeleteNotice = (id) => {
    const updated = teamNotices.filter(n => n.id !== id);
    setTeamNotices(updated);
    syncTeamData({ teamNotices: updated });
  };

  const openAddScheduleModal = () => {
    setEditingSchedule(null);
    setScheduleForm({
      date: todayDateStr,
      cohort: '2기',
      trackType: 'AX',
      instructor: instructors[0]?.name || '',
      organization: instructors[0]?.organization || 'LGE',
      subject: '',
      prep: ''
    });
    setIsScheduleModalOpen(true);
  };

  const openEditScheduleModal = (sched, e) => {
    e.stopPropagation();
    setEditingSchedule(sched);
    setScheduleForm({ ...sched });
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = () => {
    if (!scheduleForm.subject.trim()) {
      alert('교과목명을 입력해 주세요.');
      return;
    }
    const payload = { ...scheduleForm };
    let updated;
    if (editingSchedule) {
      updated = weeklySchedule.map(s => s.id === editingSchedule.id ? { ...s, ...payload } : s);
    } else {
      updated = [{ id: Date.now(), ...payload }, ...weeklySchedule];
    }
    setWeeklySchedule(updated);
    syncTeamData({ weeklySchedule: updated });
    setIsScheduleModalOpen(false);
  };

  const handleDeleteSchedule = (id, e) => {
    e.stopPropagation();
    if (!window.confirm('해당 강의 스케줄을 삭제하시겠습니까?')) return;
    const updated = weeklySchedule.filter(s => s.id !== id);
    setWeeklySchedule(updated);
    syncTeamData({ weeklySchedule: updated });
  };

  const openAddInstructorModal = () => {
    setEditingInstructor(null);
    setInstructorForm({ name: '', organization: 'LGE', subject: '', phone: '', email: '', prep: '' });
    setIsInstructorModalOpen(true);
  };

  const handleSaveInstructor = () => {
    if (!instructorForm.name.trim()) {
      alert('강사명을 입력해 주세요.');
      return;
    }
    let updated;
    if (editingInstructor) {
      updated = instructors.map(i => i.id === editingInstructor.id ? { ...i, ...instructorForm } : i);
    } else {
      updated = [{ id: Date.now(), ...instructorForm }, ...instructors];
    }
    setInstructors(updated);
    syncTeamData({ instructors: updated });
    setIsInstructorModalOpen(false);
  };

  const openAddMemberModal = () => {
    setEditingMember(null);
    setMemberForm({ name: '', course: '', track: '2기 AX', phone: '', birth: '', status: '정상', requestNote: '' });
    setIsMemberModalOpen(true);
  };

  const openEditMemberModal = (member, e) => {
    e.stopPropagation();
    setEditingMember(member);
    setMemberForm({ ...member });
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = () => {
    if (!memberForm.name.trim()) {
      alert('이름을 입력해 주세요.');
      return;
    }
    let updated;
    if (editingMember) {
      updated = members.map(m => m.id === editingMember.id ? { ...m, ...memberForm } : m);
    } else {
      updated = [{ id: Date.now(), ...memberForm }, ...members];
    }
    setMembers(updated);
    syncTeamData({ members: updated });
    setIsMemberModalOpen(false);
  };

  const handleDeleteMember = (id, e) => {
    e.stopPropagation();
    if (!window.confirm('해당 교육생 정보를 삭제하시겠습니까?')) return;
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    syncTeamData({ members: updated });
  };

  const openAddLinkModal = () => {
    setEditingLink(null);
    setLinkTitleInput('');
    setLinkUrlInput('');
    setIsLinkModalOpen(true);
  };

  const openEditLinkModal = (link, e) => {
    e.stopPropagation();
    setEditingLink(link);
    setLinkTitleInput(link.title);
    setLinkUrlInput(link.url);
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = () => {
    if (!linkTitleInput.trim() || !linkUrlInput.trim()) return;
    let url = linkUrlInput.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    let updated;
    if (editingLink) {
      updated = quickLinks.map(l => l.id === editingLink.id ? { ...l, title: linkTitleInput.trim(), url } : l);
    } else {
      updated = [...quickLinks, { id: Date.now(), title: linkTitleInput.trim(), url }];
    }
    setQuickLinks(updated);
    syncUserData({ quickLinks: updated });
    setIsLinkModalOpen(false);
  };

  const handleDeleteLink = (id, e) => {
    e.stopPropagation();
    const updated = quickLinks.filter(l => l.id !== id);
    setQuickLinks(updated);
    syncUserData({ quickLinks: updated });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif', fontSize: '15px' }}>

      {/* 1. 글로벌 헤더 (크기 확대 & 시인성 개선) */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '800', fontSize: '18px', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}>
              M
            </div>
            <span style={{ fontSize: '19px', fontWeight: '800', letterSpacing: '-0.4px', color: '#0f172a' }}>
              대전 교육운영 통합 포털
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowGuide(!showGuide)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: '#334155', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', minHeight: '38px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
            >
              <HelpCircle size={16} /> 가이드
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13.5px', color: '#1e293b', fontWeight: '700', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13.5px', color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', minHeight: '38px', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                >
                  <LogOut size={15} /> 로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: '#ffffff', backgroundColor: '#2563eb', border: 'none', minHeight: '38px', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}
              >
                <LogIn size={15} /> 로그인
              </button>
            )}
          </div>

          {/* 메인 네비게이션 바 */}
          <nav className="header-nav" style={{ width: '100%', display: 'flex', gap: '8px', paddingTop: '8px' }}>
            <button
              onClick={() => setCurrentTab('dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', minHeight: '42px', padding: '8px 16px', borderRadius: '8px',
                fontSize: '14.5px', fontWeight: '700', border: 'none', cursor: 'pointer', flexShrink: 0,
                backgroundColor: currentTab === 'dashboard' ? '#eff6ff' : 'transparent',
                color: currentTab === 'dashboard' ? '#2563eb' : '#64748b',
                boxShadow: currentTab === 'dashboard' ? 'inset 0 0 0 1.5px #bfdbfe' : 'none'
              }}
            >
              <LayoutDashboard size={17} /> 개인 대시보드 {!user && <Lock size={14} color="#94a3b8" />}
            </button>

            <button
              onClick={() => setCurrentTab('instructors')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', minHeight: '42px', padding: '8px 16px', borderRadius: '8px',
                fontSize: '14.5px', fontWeight: '700', border: 'none', cursor: 'pointer', flexShrink: 0,
                backgroundColor: currentTab === 'instructors' ? '#eff6ff' : 'transparent',
                color: currentTab === 'instructors' ? '#2563eb' : '#64748b',
                boxShadow: currentTab === 'instructors' ? 'inset 0 0 0 1.5px #bfdbfe' : 'none'
              }}
            >
              <GraduationCap size={18} /> 강사 & 시간표
            </button>

            <button
              onClick={() => setCurrentTab('members')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', minHeight: '42px', padding: '8px 16px', borderRadius: '8px',
                fontSize: '14.5px', fontWeight: '700', border: 'none', cursor: 'pointer', flexShrink: 0,
                backgroundColor: currentTab === 'members' ? '#eff6ff' : 'transparent',
                color: currentTab === 'members' ? '#2563eb' : '#64748b',
                boxShadow: currentTab === 'members' ? 'inset 0 0 0 1.5px #bfdbfe' : 'none'
              }}
            >
              <Users size={17} /> 교육생 관리
            </button>

            <button
              onClick={() => setCurrentTab('team')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', minHeight: '42px', padding: '8px 16px', borderRadius: '8px',
                fontSize: '14.5px', fontWeight: '700', border: 'none', cursor: 'pointer', flexShrink: 0,
                backgroundColor: currentTab === 'team' ? '#eff6ff' : 'transparent',
                color: currentTab === 'team' ? '#2563eb' : '#64748b',
                boxShadow: currentTab === 'team' ? 'inset 0 0 0 1.5px #bfdbfe' : 'none'
              }}
            >
              <Users2 size={17} /> 공용 협업 (팀 업무)
            </button>

            <button
              onClick={() => setCurrentTab('memos')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', minHeight: '42px', padding: '8px 16px', borderRadius: '8px',
                fontSize: '14.5px', fontWeight: '700', border: 'none', cursor: 'pointer', flexShrink: 0,
                backgroundColor: currentTab === 'memos' ? '#eff6ff' : 'transparent',
                color: currentTab === 'memos' ? '#2563eb' : '#64748b',
                boxShadow: currentTab === 'memos' ? 'inset 0 0 0 1.5px #bfdbfe' : 'none'
              }}
            >
              <BookmarkCheck size={17} /> 메모 보관함 {!user && <Lock size={14} color="#94a3b8" />}
            </button>
          </nav>

        </div>
      </header>

      {/* 스타일 선언 (모바일 터치 44px 이상 규격 확보) */}
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }

        .responsive-split-grid {
          display: grid;
          grid-template-columns: minmax(0, 6fr) minmax(0, 6fr);
          gap: 24px;
          align-items: start;
        }

        .desktop-schedule-table {
          display: block;
          overflow-x: auto;
        }
        .mobile-schedule-cards {
          display: none;
        }

        @media (max-width: 820px) {
          .responsive-split-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .header-nav {
            overflow-x: auto !important;
            white-space: nowrap !important;
            padding-bottom: 8px !important;
          }
          .console-btn-group {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
        }

        @media (max-width: 768px) {
          .desktop-schedule-table {
            display: none !important;
          }
          .mobile-schedule-cards {
            display: flex !important;
            flex-direction: column;
            gap: 14px;
          }
        }
      `}</style>

      {/* 가이드 배너 */}
      {showGuide && (
        <div style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '14px 20px' }}>
          <div style={{ maxWidth: '1360px', margin: '0 auto', fontSize: '14px', color: '#1e40af', lineHeight: 1.6, position: 'relative' }}>
            <div style={{ fontWeight: '800', marginBottom: '4px' }}>💡 기능 안내</div>
            <div>• <strong>개인 대시보드 & 메모 보관함:</strong> 로그인한 사용자만 이용할 수 있는 개인 공간입니다.</div>
            <div>• <strong>강사 & 시간표 / 교육생 관리:</strong> 비로그인 상태에서도 대전 4개 트랙의 정보 열람 및 검색이 가능합니다.</div>
            <button onClick={() => setShowGuide(false)} style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* 2. 메인 콘텐츠 */}
      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '20px' }}>

        {/* ==================== [탭 1: 개인 대시보드] ==================== */}
        {currentTab === 'dashboard' && (
          !user ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '56px 24px', textAlign: 'center', maxWidth: '520px', margin: '60px auto', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '28px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#2563eb' }}>
                <Lock size={28} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>개인 대시보드 로그인 필요</h3>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
                출퇴근 기록, 개인 할 일 목록, 빠른 바로가기는<br />구글 로그인 후 이용하실 수 있습니다.
              </p>
              <button
                onClick={handleGoogleLogin}
                style={{ minHeight: '46px', padding: '10px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
              >
                <LogIn size={18} /> 구글 계정으로 로그인하기
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 스마트 콘솔 */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FileText size={20} color="#2563eb" />
                  <span style={{ fontSize: '16.5px', fontWeight: '800', color: '#0f172a' }}>스마트 업무 콘솔</span>
                </div>

                <textarea
                  placeholder="예: '김철수 10/2 병가 증빙 제출', '강사 미팅 일정', '학생 상담 메모' 등을 입력하세요..."
                  value={omniInput}
                  onChange={(e) => setOmniInput(e.target.value)}
                  style={{
                    width: '100%', height: '85px', padding: '12px 14px', borderRadius: '10px',
                    border: '1.5px solid #cbd5e1', fontSize: '15px', outline: 'none',
                    resize: 'none', boxSizing: 'border-box', backgroundColor: '#f8fafc', lineHeight: 1.5
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', minHeight: '42px', padding: '4px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <Users size={15} color="#2563eb" />
                      <select
                        value={selectedStudentForMemo}
                        onChange={(e) => setSelectedStudentForMemo(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '13.5px', outline: 'none', cursor: 'pointer', fontWeight: '700' }}
                      >
                        <option value="">학생 메모 대상 선택</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.track || '학생'})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', minHeight: '42px', padding: '4px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <Clock size={15} color="#64748b" />
                      <input
                        type="time"
                        value={omniTime}
                        onChange={(e) => setOmniTime(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '13.5px', fontWeight: '700', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', minHeight: '42px', padding: '4px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        placeholder="담당자 입력"
                        value={omniAssignee}
                        onChange={(e) => setOmniAssignee(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '13.5px', outline: 'none', width: '90px' }}
                      />
                    </div>
                  </div>

                  <div className="console-btn-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleSaveToStudentNote}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '44px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      <UserCheck2 size={16} /> 🎓 학생 메모
                    </button>
                    <button onClick={handleSaveAsMemo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '44px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                      <BookmarkCheck size={16} color="#64748b" /> 메모 보관함
                    </button>
                    <button onClick={handleSaveAsTodo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '44px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                      <CheckSquare size={16} /> 내 할일 등록
                    </button>
                    <button onClick={handleSendAsTeamNotice} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '44px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                      <Send size={15} /> 팀 공지
                    </button>
                    <button onClick={handleSendAsTeamTask} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '44px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                      <Users size={15} /> 팀 업무 등록
                    </button>
                  </div>

                </div>
              </div>

              {/* 내 정보 그리드 */}
              <div className="responsive-split-grid">
                
                {/* 좌측: 출퇴근 & 바로가기 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* 출퇴근 카드 */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={19} color="#2563eb" />
                        <span style={{ fontSize: '16px', fontWeight: '800' }}>오늘 출퇴근 기록</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '12px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px',
                          backgroundColor: attendance.status === '근무 중' ? '#dcfce7' : attendance.status === '퇴근 완료' ? '#f1f5f9' : '#fef3c7',
                          color: attendance.status === '근무 중' ? '#16a34a' : attendance.status === '퇴근 완료' ? '#64748b' : '#d97706'
                        }}>
                          {attendance.status}
                        </span>
                        <button
                          onClick={() => setIsAttendanceModalOpen(true)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', minHeight: '34px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: '700' }}
                        >
                          <History size={13} /> 기록
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', gap: '16px' }}>
                        <div>출근: <strong style={{ color: '#0f172a' }}>{attendance.clockIn || '—'}</strong></div>
                        <div>퇴근: <strong style={{ color: '#0f172a' }}>{attendance.clockOut || '—'}</strong></div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={handleClockIn} style={{ minHeight: '38px', padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}>출근</button>
                        <button onClick={handleClockOut} style={{ minHeight: '38px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}>퇴근</button>
                      </div>
                    </div>
                  </div>

                  {/* 빠른 바로가기 */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={19} color="#2563eb" />
                        <span style={{ fontSize: '16px', fontWeight: '800' }}>개인 바로가기</span>
                      </div>
                      <button onClick={openAddLinkModal} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', minHeight: '34px', color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' }}>
                        <Plus size={14} /> 추가
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                      {quickLinks.map(link => (
                        <div key={link.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#1e293b', fontSize: '13.5px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.title}</span>
                            <ExternalLink size={12} color="#94a3b8" />
                          </a>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: 'auto' }}>
                            <button onClick={(e) => openEditLinkModal(link, e)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}><Edit2 size={13} /></button>
                            <button onClick={(e) => handleDeleteLink(link.id, e)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}><Trash2 size={13} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* 우측: 내 할 일 */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BellRing size={19} color="#2563eb" />
                      <span style={{ fontSize: '16px', fontWeight: '800' }}>내 할 일 & 마감 목록</span>
                    </div>
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>총 {todos.length}건</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {todos.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '48px 0', fontSize: '14px', color: '#94a3b8' }}>
                        등록된 할 일이 없습니다. 스마트 콘솔에서 등록해 보세요!
                      </div>
                    ) : (
                      todos.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleTodo(item.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', padding: '10px 14px',
                            borderRadius: '8px', border: '1px solid #e2e8f0',
                            backgroundColor: item.done ? '#f8fafc' : '#ffffff',
                            opacity: item.done ? 0.5 : 1, cursor: 'pointer'
                          }}
                        >
                          {item.done ? <CheckCircle2 size={18} color="#2563eb" /> : <Circle size={18} color="#cbd5e1" />}
                          <span style={{ flex: 1, fontSize: '14.5px', textDecoration: item.done ? 'line-through' : 'none', color: '#1e293b' }}>
                            {item.text}
                          </span>
                          
                          {item.time && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: item.alarmEnabled ? '#eff6ff' : '#f1f5f9', color: item.alarmEnabled ? '#2563eb' : '#94a3b8', fontWeight: '700' }}>
                                {item.time}
                              </span>
                              <button
                                onClick={(e) => handleToggleAlarm(item, e)}
                                style={{
                                  border: 'none', background: item.alarmEnabled ? '#eff6ff' : '#f1f5f9',
                                  color: item.alarmEnabled ? '#2563eb' : '#94a3b8', borderRadius: '4px',
                                  padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                                }}
                              >
                                {item.alarmEnabled ? <Bell size={13} /> : <BellOff size={13} />}
                              </button>
                            </div>
                          )}

                          <button onClick={(e) => handleDeleteTodo(item.id, e)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )
        )}

        {/* ==================== [탭 2: 강사 & 주간 시간표] ==================== */}
        {currentTab === 'instructors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 오늘의 강의 현황 위젯 */}
            <div style={{ 
              backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #bfdbfe', 
              padding: '20px', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.05)',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={19} color="#2563eb" />
                  <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                    오늘의 강의 & 강사 현황
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: '800', padding: '3px 8px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                    {todayDateStr}
                  </span>
                </div>
              </div>

              {todayLectures.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', fontSize: '14px', color: '#64748b' }}>
                  오늘({todayDateStr}) 배정된 강의 일정이 없습니다.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {todayLectures.map(lecture => (
                    <div 
                      key={lecture.id} 
                      style={{ 
                        backgroundColor: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e8f0', 
                        padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#2563eb', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '5px' }}>
                          {lecture.trackType} {lecture.cohort}
                        </span>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          {lecture.date}
                        </span>
                      </div>

                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                        {lecture.subject}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#475569', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                        <span>강사: <strong style={{ color: '#1e293b' }}>{lecture.instructor}</strong></span>
                        <span style={{ fontSize: '11.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', ...getOrgBadgeStyle(lecture.organization) }}>
                          {lecture.organization}
                        </span>
                      </div>

                      {lecture.prep && (
                        <div style={{ fontSize: '12.5px', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', color: '#334155' }}>
                          💡 {lecture.prep}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 서브 세그먼트 토글 */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'inline-flex', backgroundColor: '#e2e8f0', padding: '5px', borderRadius: '12px', gap: '6px' }}>
                <button
                  onClick={() => setScheduleSubTab('schedule')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    minHeight: '44px', padding: '8px 22px', borderRadius: '8px', border: 'none', fontSize: '15px', fontWeight: '800', cursor: 'pointer',
                    backgroundColor: scheduleSubTab === 'schedule' ? '#ffffff' : 'transparent',
                    color: scheduleSubTab === 'schedule' ? '#2563eb' : '#64748b',
                    boxShadow: scheduleSubTab === 'schedule' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Calendar size={17} /> 강의 시간표
                </button>
                <button
                  onClick={() => setScheduleSubTab('instructors')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    minHeight: '44px', padding: '8px 22px', borderRadius: '8px', border: 'none', fontSize: '15px', fontWeight: '800', cursor: 'pointer',
                    backgroundColor: scheduleSubTab === 'instructors' ? '#ffffff' : 'transparent',
                    color: scheduleSubTab === 'instructors' ? '#2563eb' : '#64748b',
                    boxShadow: scheduleSubTab === 'instructors' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <GraduationCap size={18} /> 강사진 프로필
                </button>
              </div>
            </div>

            {/* 시간표 단독 뷰 */}
            {scheduleSubTab === 'schedule' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', color: '#0f172a' }}>
                      📅 대전 과정 시간표 현황
                    </h2>
                    <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
                      대전 운영 트랙 (1기 AX, 1기 SF, 2기 AX, 2기 DM) 날짜별 정렬
                    </p>
                  </div>

                  {user && (
                    <button
                      onClick={openAddScheduleModal}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', minHeight: '40px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #dbeafe', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '13.5px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      <Plus size={15} /> 스케줄 등록
                    </button>
                  )}
                </div>

                {/* 필터 바 */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Filter size={15} color="#64748b" />
                        <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#475569' }}>기수:</span>
                        {['전체', '1기', '2기'].map(c => (
                          <button
                            key={c}
                            onClick={() => setFilterCohort(c)}
                            style={{
                              minHeight: '34px', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer',
                              backgroundColor: filterCohort === c ? '#2563eb' : '#ffffff',
                              color: filterCohort === c ? '#ffffff' : '#64748b',
                              boxShadow: filterCohort === c ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'
                            }}
                          >
                            {c}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#475569' }}>트랙:</span>
                        {['전체', 'AX', 'SF', 'DM'].map(t => (
                          <button
                            key={t}
                            onClick={() => setFilterTrack(t)}
                            style={{
                              minHeight: '34px', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer',
                              backgroundColor: filterTrack === t ? '#2563eb' : '#ffffff',
                              color: filterTrack === t ? '#ffffff' : '#64748b',
                              boxShadow: filterTrack === t ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                    </div>

                    <div style={{ fontSize: '13.5px', color: '#64748b' }}>
                      조회: <strong style={{ color: '#2563eb', fontSize: '15px' }}>{filteredSchedule.length}</strong>건
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                    
                    <form onSubmit={handleExecuteSearch} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 260px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                        <input
                          type="text"
                          placeholder="강사명, 과목명 검색..."
                          value={scheduleSearchInput}
                          onChange={(e) => setScheduleSearchInput(e.target.value)}
                          style={{ width: '100%', minHeight: '42px', padding: '8px 10px 8px 34px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', backgroundColor: '#fff' }}
                        />
                      </div>
                      <button
                        type="submit"
                        style={{ minHeight: '42px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        검색
                      </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', border: '1.5px solid #cbd5e1', minHeight: '42px', padding: '4px 12px', borderRadius: '8px' }}>
                      <Calendar size={16} color="#64748b" />
                      <input
                        type="date"
                        value={scheduleSearchDate}
                        onChange={(e) => setScheduleSearchDate(e.target.value)}
                        style={{ border: 'none', outline: 'none', fontSize: '14px', color: '#334155', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setScheduleSearchDate(todayDateStr)}
                      style={{ minHeight: '42px', padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '13.5px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      오늘 보기
                    </button>

                    {(appliedSearchKeyword || scheduleSearchInput || scheduleSearchDate || filterCohort !== '전체' || filterTrack !== '전체') && (
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleSearchInput('');
                          setAppliedSearchKeyword('');
                          setScheduleSearchDate('');
                          setFilterCohort('전체');
                          setFilterTrack('전체');
                        }}
                        style={{ minHeight: '42px', padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        초기화
                      </button>
                    )}

                  </div>

                </div>

                {filteredSchedule.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', fontSize: '14px', color: '#94a3b8' }}>
                    조건에 해당하는 스케줄이 없습니다.
                  </div>
                ) : (
                  <>
                    <div className="desktop-schedule-table">
                      <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                            <th style={{ padding: '12px 14px', width: '120px' }}>날짜</th>
                            <th style={{ padding: '12px 14px', width: '100px' }}>트랙</th>
                            <th style={{ padding: '12px 14px' }}>교과목명</th>
                            <th style={{ padding: '12px 14px', width: '110px' }}>강사명</th>
                            <th style={{ padding: '12px 14px', width: '120px' }}>소속</th>
                            <th style={{ padding: '12px 14px', width: '200px' }}>준비사항</th>
                            {user && <th style={{ padding: '12px 14px', width: '80px', textAlign: 'right' }}>관리</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSchedule.map((sched) => {
                            const isToday = sched.date === todayDateStr;
                            return (
                              <tr 
                                key={sched.id} 
                                style={{ 
                                  borderBottom: '1px solid #f1f5f9',
                                  backgroundColor: isToday ? '#f0f7ff' : '#ffffff'
                                }}
                              >
                                <td style={{ padding: '14px', fontWeight: '700', color: isToday ? '#1d4ed8' : '#334155' }}>
                                  {sched.date || '—'}
                                  {isToday && <span style={{ marginLeft: '4px', fontSize: '11px', color: '#2563eb', fontWeight: '800' }}>●</span>}
                                </td>
                                <td style={{ padding: '14px' }}>
                                  <span style={{ fontSize: '12.5px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '700' }}>
                                    {sched.trackType} {sched.cohort}
                                  </span>
                                </td>
                                <td style={{ padding: '14px', fontWeight: '700', color: '#0f172a' }}>
                                  {sched.subject}
                                </td>
                                <td style={{ padding: '14px', fontWeight: '700', color: '#1e293b' }}>
                                  {sched.instructor}
                                </td>
                                <td style={{ padding: '14px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: '800', padding: '3px 8px', borderRadius: '5px', ...getOrgBadgeStyle(sched.organization) }}>
                                    {sched.organization}
                                  </span>
                                </td>
                                <td style={{ padding: '14px', color: '#475569', fontSize: '13px' }}>
                                  {sched.prep ? `💡 ${sched.prep}` : '—'}
                                </td>
                                {user && (
                                  <td style={{ padding: '14px', textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                                      <button onClick={(e) => openEditScheduleModal(sched, e)} style={{ border: 'none', background: '#f1f5f9', padding: '5px 7px', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}>
                                        <Edit2 size={13} />
                                      </button>
                                      <button onClick={(e) => handleDeleteSchedule(sched.id, e)} style={{ border: 'none', background: '#fee2e2', padding: '5px 7px', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}>
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 모바일 1열 카드 (터치 친화형 크기) */}
                    <div className="mobile-schedule-cards">
                      {filteredSchedule.map((sched) => {
                        const isToday = sched.date === todayDateStr;
                        return (
                          <div 
                            key={sched.id}
                            style={{
                              backgroundColor: isToday ? '#f0f7ff' : '#ffffff',
                              border: isToday ? '1.5px solid #bfdbfe' : '1px solid #cbd5e1',
                              borderRadius: '12px',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: isToday ? '#1d4ed8' : '#334155' }}>
                                  {sched.date || '—'}
                                </span>
                                {isToday && <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '800', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>오늘</span>}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '5px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '800' }}>
                                  {sched.trackType} {sched.cohort}
                                </span>
                                {user && (
                                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                                    <button onClick={(e) => openEditScheduleModal(sched, e)} style={{ border: 'none', background: '#f1f5f9', minHeight: '32px', minWidth: '32px', borderRadius: '5px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Edit2 size={14} />
                                    </button>
                                    <button onClick={(e) => handleDeleteSchedule(sched.id, e)} style={{ border: 'none', background: '#fee2e2', minHeight: '32px', minWidth: '32px', borderRadius: '5px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: 1.4 }}>
                              {sched.subject}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                              <span style={{ fontSize: '14px', color: '#475569' }}>
                                강사: <strong style={{ color: '#0f172a' }}>{sched.instructor}</strong>
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: '800', padding: '3px 8px', borderRadius: '5px', ...getOrgBadgeStyle(sched.organization) }}>
                                {sched.organization}
                              </span>
                            </div>

                            {sched.prep && (
                              <div style={{ fontSize: '13px', color: '#64748b', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', marginTop: '4px' }}>
                                💡 {sched.prep}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 강사진 프로필 뷰 */}
            {scheduleSubTab === 'instructors' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', color: '#0f172a' }}>
                      👨‍🏫 강사진 프로필 현황
                    </h2>
                    <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
                      소속별 뱃지 및 강사 연락처/이메일 원클릭 복사 지원
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href="https://instructor-hub.pages.dev/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', minHeight: '40px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '13.5px', fontWeight: '700' }}
                    >
                      <ExternalLink size={14} /> 강사허브
                    </a>
                    {user && (
                      <button
                        onClick={openAddInstructorModal}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', minHeight: '40px', padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '13.5px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        <Plus size={15} /> 강사 등록
                      </button>
                    )}
                  </div>
                </div>

                <InstructorProfileList instructors={instructors || []} />
              </div>
            )}

          </div>
        )}

        {/* ==================== [탭 3: 교육생 관리] ==================== */}
        {currentTab === 'members' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0' }}>🎓 교육생 명단 및 관리</h2>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>기수별/트랙별 구분 및 상세 상담 메모</p>
              </div>

              {user && (
  <button
    onClick={() => setIsExcelModalOpen(true)}
    style={{ display: 'flex', alignItems: 'center', gap: '5px', minHeight: '40px', padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '13.5px', fontWeight: '800', cursor: 'pointer' }}
  >
    📊 반 관리 / 엑셀 업로드
  </button>
)}
            </div>

            {/* 교육생 필터 바 */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={15} color="#64748b" />
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#475569' }}>기수:</span>
                    {['전체', '1기', '2기'].map(c => (
                      <button
                        key={c}
                        onClick={() => setMemberFilterCohort(c)}
                        style={{
                          minHeight: '34px', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer',
                          backgroundColor: memberFilterCohort === c ? '#2563eb' : '#ffffff',
                          color: memberFilterCohort === c ? '#ffffff' : '#64748b',
                          boxShadow: memberFilterCohort === c ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#475569' }}>트랙:</span>
                    {['전체', 'AX', 'SF', 'DM'].map(t => (
                      <button
                        key={t}
                        onClick={() => setMemberFilterTrack(t)}
                        style={{
                          minHeight: '34px', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer',
                          backgroundColor: memberFilterTrack === t ? '#2563eb' : '#ffffff',
                          color: memberFilterTrack === t ? '#ffffff' : '#64748b',
                          boxShadow: memberFilterTrack === t ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                </div>

                <div style={{ fontSize: '13.5px', color: '#64748b' }}>
                  조회: <strong style={{ color: '#2563eb', fontSize: '15px' }}>{filteredMembers.length}</strong>명 / 전체 {members.length}명
                </div>
              </div>

              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="이름, 과정, 연락처 검색..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  style={{ width: '100%', minHeight: '42px', padding: '8px 10px 8px 34px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', backgroundColor: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
              {filteredMembers.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '48px 0', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                  일치하는 교육생 정보가 없습니다.
                </div>
              ) : (
                filteredMembers.map(member => (
                  <div key={member.id} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '800', fontSize: '16.5px', color: '#0f172a' }}>{member.name}</span>
                      <span style={{
                        fontSize: '11.5px', padding: '3px 8px', borderRadius: '12px', fontWeight: '800',
                        backgroundColor: member.status === '경고' ? '#fee2e2' : member.status === '주의' ? '#fef3c7' : '#dcfce7',
                        color: member.status === '경고' ? '#dc2626' : member.status === '주의' ? '#d97706' : '#16a34a'
                      }}>
                        {member.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '13.5px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div>과정: <strong style={{ color: '#334155' }}>{member.course || '미지정'}</strong></div>
                      <div>트랙: <strong style={{ color: '#2563eb' }}>{member.track || '미지정'}</strong></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Phone size={13} /> {member.phone || '연락처 없음'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={13} /> 생년월일: {member.birth || '미등록'}</div>
                      
                      <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#1e293b', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                        <div style={{ fontWeight: '800', color: '#2563eb', marginBottom: '3px', fontSize: '12px' }}>📝 요청사항 & 상담 메모:</div>
                        {member.requestNote || '등록된 메모가 없습니다.'}
                      </div>
                    </div>

                    {user && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <button onClick={(e) => openEditMemberModal(member, e)} style={{ display: 'flex', alignItems: 'center', gap: '4px', minHeight: '34px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                          <Edit2 size={13} /> 수정
                        </button>
                        <button onClick={(e) => handleDeleteMember(member.id, e)} style={{ display: 'flex', alignItems: 'center', gap: '4px', minHeight: '34px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                          <Trash2 size={13} /> 삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ==================== [탭 4: 공용 협업 (팀 업무)] ==================== */}
        {currentTab === 'team' && (
          <div className="responsive-split-grid">
            
            {/* 공지사항 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Briefcase size={19} color="#2563eb" />
                <span style={{ fontSize: '16.5px', fontWeight: '800' }}>팀 공지사항</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {teamNotices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', fontSize: '14px', color: '#94a3b8' }}>등록된 공지가 없습니다.</div>
                ) : (
                  teamNotices.map(notice => (
                    <div key={notice.id} style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#1e293b', marginBottom: '3px' }}>{notice.title}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{notice.author} · {notice.date}</div>
                      </div>
                      {user && (
                        <button onClick={() => handleDeleteNotice(notice.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px' }}><Trash2 size={15} /></button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 팀 업무 현황 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={19} color="#2563eb" />
                  <span style={{ fontSize: '16.5px', fontWeight: '800' }}>팀 업무 현황</span>
                </div>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>총 {teamTasks.length}건</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {teamTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', fontSize: '14px', color: '#94a3b8' }}>진행 중인 업무가 없습니다.</div>
                ) : (
                  teamTasks.map(task => {
                    const isEditing = editingTaskId === task.id;
                    const isCommentsOpen = openCommentsTaskId === task.id;

                    return (
                      <div key={task.id} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: task.done ? '#f8fafc' : '#ffffff', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={() => user ? handleToggleTask(task.id) : alert('업무 상태를 변경하려면 로그인해 주세요.')}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {task.done ? <CheckCircle2 size={19} color="#2563eb" /> : <Circle size={19} color="#cbd5e1" />}
                          </button>

                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
                              <input
                                type="text"
                                value={editingTaskTitle}
                                onChange={(e) => setEditingTaskTitle(e.target.value)}
                                style={{ flex: 1, minHeight: '36px', padding: '4px 8px', fontSize: '14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', outline: 'none' }}
                              />
                              <input
                                type="text"
                                value={editingTaskAssignee}
                                onChange={(e) => setEditingTaskAssignee(e.target.value)}
                                placeholder="담당자"
                                style={{ width: '70px', minHeight: '36px', padding: '4px 8px', fontSize: '13px', borderRadius: '6px', border: '1.5px solid #cbd5e1', outline: 'none' }}
                              />
                              <input
                                type="text"
                                value={editingTaskDueDate}
                                onChange={(e) => setEditingTaskDueDate(e.target.value)}
                                placeholder="마감일"
                                style={{ width: '60px', minHeight: '36px', padding: '4px 8px', fontSize: '13px', borderRadius: '6px', border: '1.5px solid #cbd5e1', outline: 'none' }}
                              />
                              <button
                                onClick={(e) => saveEditTask(task.id, e)}
                                style={{ border: 'none', backgroundColor: '#2563eb', color: '#fff', minHeight: '36px', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '800' }}
                              >
                                저장
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <span style={{ flex: 1, fontSize: '14.5px', textDecoration: task.done ? 'line-through' : 'none', color: '#1e293b' }}>
                                {task.title}
                              </span>
                              <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '5px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '700' }}>
                                👤 {task.assignee}
                              </span>
                              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                                {task.dueDate || '오늘'}
                              </span>
                            </div>
                          )}

                          {!isEditing && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {user && (
                                <button
                                  onClick={(e) => startEditTask(task, e)}
                                  title="업무 수정"
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                                >
                                  <Edit2 size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => setOpenCommentsTaskId(isCommentsOpen ? null : task.id)}
                                title="댓글 보기"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: (task.comments && task.comments.length > 0) ? '#2563eb' : '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12.5px' }}
                              >
                                <MessageSquare size={15} />
                                {(task.comments && task.comments.length > 0) && task.comments.length}
                              </button>
                              {user && (
                                <button
                                  onClick={(e) => handleDeleteTask(task.id, e)}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px' }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {isCommentsOpen && (
                          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #edf2f7', marginTop: '6px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', maxHeight: '140px', overflowY: 'auto' }}>
                              {(!task.comments || task.comments.length === 0) ? (
                                <div style={{ fontSize: '13px', color: '#94a3b8' }}>작성된 댓글이 없습니다.</div>
                              ) : (
                                task.comments.map(c => (
                                  <div key={c.id} style={{ fontSize: '13px', color: '#334155', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                    <strong style={{ color: '#0f172a' }}>{c.author}:</strong> {c.text}
                                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>{c.date}</span>
                                  </div>
                                ))
                              )}
                            </div>

                            {user ? (
                              <form onSubmit={(e) => handleAddComment(task.id, e)} style={{ display: 'flex', gap: '6px' }}>
                                <input
                                  type="text"
                                  placeholder="댓글을 입력하세요..."
                                  value={commentInput}
                                  onChange={(e) => setCommentInput(e.target.value)}
                                  style={{ flex: 1, minHeight: '38px', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                                />
                                <button
                                  type="submit"
                                  style={{ minHeight: '38px', padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  등록
                                </button>
                              </form>
                            ) : (
                              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>댓글을 남기려면 로그인해 주세요.</div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* ==================== [탭 5: 독립 메모 보관함] ==================== */}
        {currentTab === 'memos' && (
          !user ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '56px 24px', textAlign: 'center', maxWidth: '520px', margin: '60px auto', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '28px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#2563eb' }}>
                <Lock size={28} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>메모 보관함 로그인 필요</h3>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
                개인 메모 보관함은 로그인 후 이용하실 수 있습니다.
              </p>
              <button
                onClick={handleGoogleLogin}
                style={{ minHeight: '46px', padding: '10px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
              >
                <LogIn size={18} /> 구글 계정으로 로그인하기
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', margin: '0 0 4px 0' }}>📌 보관된 개인 메모</h2>
                  <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>총 {filteredMemos.length}건의 메모가 보관되어 있습니다.</p>
                </div>

                <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                  <input
                    type="text"
                    placeholder="메모 내용 검색..."
                    value={memoSearch}
                    onChange={(e) => setMemoSearch(e.target.value)}
                    style={{ width: '100%', minHeight: '42px', padding: '8px 10px 8px 34px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              </div>

              {filteredMemos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '72px 0', fontSize: '14.5px', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  보관된 메모가 없습니다.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                  {filteredMemos.map(memo => (
                    <div key={memo.id} style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ fontSize: '14.5px', color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {memo.text}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #edf2f7' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{memo.date}</span>
                        <button onClick={() => handleDeleteMemo(memo.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
<StudentExcelModal
  isOpen={isExcelModalOpen}
  onClose={() => setIsExcelModalOpen(false)}
  cohortList={cohortList}
  trackList={trackList}
  onUpdateMetadata={(meta) => {
    if (meta.cohortList) setCohortList(meta.cohortList);
    if (meta.trackList) setTrackList(meta.trackList);
    syncTeamData(meta);
  }}
  onImportStudents={(newStudents) => {
    const merged = [...newStudents, ...members];
    setMembers(merged);
    syncTeamData({ members: merged });
  }}
/>
      </main>

      {/* 출퇴근 기록 모달 */}
      {isAttendanceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={18} color="#2563eb" />
                <span style={{ fontSize: '17px', fontWeight: '800' }}>출퇴근 기록부</span>
              </div>
              <button onClick={() => setIsAttendanceModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={20} /></button>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attendanceLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '14px', color: '#94a3b8' }}>기록된 내역이 없습니다.</div>
              ) : (
                attendanceLogs.map((log, index) => (
                  <div key={index} style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>{log.date}</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>출근: {log.clockIn} / 퇴근: {log.clockOut}</div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', padding: '3px 8px', borderRadius: '8px', backgroundColor: log.status === '퇴근 완료' ? '#f1f5f9' : '#dcfce7', color: log.status === '퇴근 완료' ? '#64748b' : '#16a34a' }}>
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setIsAttendanceModalOpen(false)} style={{ minHeight: '40px', padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#fff', fontSize: '14px', cursor: 'pointer', fontWeight: '700' }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 스케줄 모달 */}
      {isScheduleModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '17px', fontWeight: '800' }}>{editingSchedule ? '스케줄 수정' : '스케줄 등록'}</span>
              <button onClick={() => setIsScheduleModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>강의 날짜 (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={scheduleForm.date || ''}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>기수</label>
                  <select
                    value={scheduleForm.cohort}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, cohort: e.target.value })}
                    style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="1기">1기</option>
                    <option value="2기">2기</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>트랙</label>
                  <select
                    value={scheduleForm.trackType}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, trackType: e.target.value })}
                    style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="AX">AX</option>
                    <option value="SF">SF</option>
                    <option value="DM">DM</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>교과목명 *</label>
                <input
                  type="text"
                  placeholder="예: LangChain Agent 실무"
                  value={scheduleForm.subject}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, subject: e.target.value })}
                  style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>담당 강사</label>
                  <input
                    type="text"
                    placeholder="예: 김희원"
                    value={scheduleForm.instructor}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, instructor: e.target.value })}
                    style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>소속</label>
                  <input
                    type="text"
                    placeholder="LGE, CLIPS, LAB4DX 등"
                    value={scheduleForm.organization}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, organization: e.target.value })}
                    style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>준비사항</label>
                <input
                  type="text"
                  placeholder="예: 실습 서버 계정 확인"
                  value={scheduleForm.prep}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, prep: e.target.value })}
                  style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setIsScheduleModalOpen(false)} style={{ minHeight: '42px', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#fff', fontSize: '14px', cursor: 'pointer', fontWeight: '700' }}>취소</button>
              <button onClick={handleSaveSchedule} style={{ minHeight: '42px', display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}><Save size={15} /> 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 강사 모달 */}
      {isInstructorModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '17px', fontWeight: '800' }}>{editingInstructor ? '강사 수정' : '강사 등록'}</span>
              <button onClick={() => setIsInstructorModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>강사명 *</label>
                  <input type="text" placeholder="예: 김희원" value={instructorForm.name} onChange={(e) => setInstructorForm({ ...instructorForm, name: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>소속</label>
                  <input type="text" placeholder="LGE, CLIPS, LAB4DX 등" value={instructorForm.organization} onChange={(e) => setInstructorForm({ ...instructorForm, organization: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>담당 교과목</label>
                <input type="text" placeholder="예: LLM 실무" value={instructorForm.subject} onChange={(e) => setInstructorForm({ ...instructorForm, subject: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>연락처</label>
                  <input type="text" placeholder="010-0000-0000" value={instructorForm.phone} onChange={(e) => setInstructorForm({ ...instructorForm, phone: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>이메일</label>
                  <input type="text" placeholder="email@test.com" value={instructorForm.email} onChange={(e) => setInstructorForm({ ...instructorForm, email: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>준비사항/메모</label>
                <textarea placeholder="교재 세팅 등" value={instructorForm.prep} onChange={(e) => setInstructorForm({ ...instructorForm, prep: e.target.value })} style={{ width: '100%', height: '70px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setIsInstructorModalOpen(false)} style={{ minHeight: '42px', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#fff', fontSize: '14px', cursor: 'pointer', fontWeight: '700' }}>취소</button>
              <button onClick={handleSaveInstructor} style={{ minHeight: '42px', display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}><Save size={15} /> 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 교육생 등록/수정 모달 */}
      {isMemberModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '17px', fontWeight: '800' }}>{editingMember ? '교육생 수정' : '교육생 등록'}</span>
              <button onClick={() => setIsMemberModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>이름 *</label>
                  <input type="text" placeholder="예: 홍길동" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>상태</label>
                  <select value={memberForm.status} onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}>
                    <option value="정상">정상</option>
                    <option value="주의">주의</option>
                    <option value="경고">경고</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>과정</label>
                  <input type="text" placeholder="예: 인공지능 실무" value={memberForm.course} onChange={(e) => setMemberForm({ ...memberForm, course: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>기수/트랙</label>
                  <select
                    value={memberForm.track}
                    onChange={(e) => setMemberForm({ ...memberForm, track: e.target.value })}
                    style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="1기 AX">1기 AX</option>
                    <option value="1기 SF">1기 SF</option>
                    <option value="2기 AX">2기 AX</option>
                    <option value="2기 DM">2기 DM</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>연락처</label>
                  <input type="text" placeholder="010-0000-0000" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>생년월일</label>
                  <input type="text" placeholder="예: 980315" value={memberForm.birth} onChange={(e) => setMemberForm({ ...memberForm, birth: e.target.value })} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>요청사항/메모</label>
                <textarea placeholder="상담 내역 등" value={memberForm.requestNote} onChange={(e) => setMemberForm({ ...memberForm, requestNote: e.target.value })} style={{ width: '100%', height: '80px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setIsMemberModalOpen(false)} style={{ minHeight: '42px', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#fff', fontSize: '14px', cursor: 'pointer', fontWeight: '700' }}>취소</button>
              <button onClick={handleSaveMember} style={{ minHeight: '42px', display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}><Save size={15} /> 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 바로가기 모달 */}
      {isLinkModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '17px', fontWeight: '800' }}>{editingLink ? '바로가기 수정' : '새 바로가기 추가'}</span>
              <button onClick={() => setIsLinkModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>표시 이름</label>
                <input type="text" placeholder="예: LMS" value={linkTitleInput} onChange={(e) => setLinkTitleInput(e.target.value)} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>URL</label>
                <input type="text" placeholder="예: https://example.com" value={linkUrlInput} onChange={(e) => setLinkUrlInput(e.target.value)} style={{ width: '100%', minHeight: '42px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setIsLinkModalOpen(false)} style={{ minHeight: '42px', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#fff', fontSize: '14px', cursor: 'pointer', fontWeight: '700' }}>취소</button>
              <button onClick={handleSaveLink} style={{ minHeight: '42px', display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}><Save size={15} /> 저장</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}