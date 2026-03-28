import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api';

function App() {
  const [showFlash, setShowFlash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingSection, setPendingSection] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [authView, setAuthView] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [savedProjects, setSavedProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeSection, setActiveSection] = useState('new');
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState({
    project_name: '', project_type: '', description: '', depth: 'medium', specific_url: ''
  });
  const [soulReport, setSoulReport] = useState(null);
  const [projectPlan, setProjectPlan] = useState(null);
  const [pitchDeck, setPitchDeck] = useState(null);

  const [fileProject, setFileProject] = useState({ name: '', deadline: '' });
  const [files, setFiles] = useState([]);
  const [segregatedData, setSegregatedData] = useState(null);

  const [multiProjectPlan, setMultiProjectPlan] = useState(null);
  const [progressReports, setProgressReports] = useState({});
  const [checkingProgress, setCheckingProgress] = useState(null);
  const [completedDays, setCompletedDays] = useState({});
  const [reminders, setReminders] = useState([]);

  // ── Chat State ─────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hey! I'm your AuraFlow AI assistant 👋 I know all your projects and deadlines. Ask me anything — \"What should I work on today?\" or \"How is Atelier going?\"" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowFlash(false), 2500);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const loggedIn = params.get('logged_in');
  const user = params.get('user');
  if (loggedIn === 'true' && user) {
    setIsAuthenticated(true);
    setShowLogin(false);
    if (pendingSection) {
      setActiveSection(pendingSection);
      setActiveProjectId(null);
      setPendingSection(null);
    }
    window.history.replaceState({}, document.title, '/');
  }
}, []);// eslint-disable-line react-hooks/exhaustive-deps

  const attemptNavigation = (section) => {
    if (!isAuthenticated) {
      setPendingSection(section);
      setShowLogin(true);
    } else {
      setActiveSection(section);
      setActiveProjectId(null);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('auraflow_projects');
    if (stored) setSavedProjects(JSON.parse(stored));
    const storedReminders = localStorage.getItem('auraflow_reminders');
    if (storedReminders) setReminders(JSON.parse(storedReminders));
  }, []);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const saveProjects = (updated) => {
    setSavedProjects(updated);
    localStorage.setItem('auraflow_projects', JSON.stringify(updated));
  };

  const saveReminders = (updated) => {
    setReminders(updated);
    localStorage.setItem('auraflow_reminders', JSON.stringify(updated));
  };

  const addProject = (project) => {
    const newProject = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      source: project.source || 'file',
      ...project
    };
    const updated = [newProject, ...savedProjects];
    saveProjects(updated);
    return newProject.id;
  };

  const deleteProject = (id) => {
    const updated = savedProjects.filter(p => p.id !== id);
    saveProjects(updated);
    if (activeProjectId === id) { setActiveProjectId(null); setActiveSection('new'); }
  };

  const openProject = (project) => {
    setActiveProjectId(project.id);
    setActiveSection('view');
    if (project.source === 'soul') {
      setSoulReport(project.soul_report || null);
      setProjectPlan(project.project_plan || null);
      setPitchDeck(project.pitch_deck || null);
      setStep(project.step || 1);
    } else {
      setSegregatedData(project.segregated_data || null);
    }
  };

  const startNew = () => {
    setActiveProjectId(null);
    setActiveSection('new');
    setStep(1);
    setProjectData({ project_name: '', project_type: '', description: '', depth: 'medium', specific_url: '' });
    setSoulReport(null);
    setProjectPlan(null);
    setPitchDeck(null);
    setFiles([]);
    setSegregatedData(null);
    setFileProject({ name: '', deadline: '' });
  };

  const safeParse = (str) => {
    try { return typeof str === 'string' ? JSON.parse(str) : str; }
    catch { return null; }
  };

  const safeArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return [val];
    return [];
  };

  const getSourceIcon = (source) => source === 'soul' ? '🔍' : '📁';

  const getDaysColor = (days) => {
    if (days <= 3) return '#ff6b6b';
    if (days <= 7) return '#ffd93d';
    return '#6bcb77';
  };

  // ── Generate Reminders ─────────────────────────────────────────
  const generateReminders = (pd) => {
    const daysLeft = pd.days_remaining;
    const newReminders = [];
    newReminders.push({
      id: Date.now() + Math.random(), project: pd.project_name, type: 'deadline',
      message: `Project deadline in ${daysLeft} days`, date: pd.deadline,
      urgency: daysLeft <= 3 ? 'high' : daysLeft <= 7 ? 'medium' : 'low'
    });
    if (pd.sequential_plan?.length > 0) {
      const mid = Math.floor(pd.sequential_plan.length / 2);
      const quarter = Math.floor(pd.sequential_plan.length / 4);
      if (pd.sequential_plan[quarter]) newReminders.push({
        id: Date.now() + Math.random(), project: pd.project_name, type: 'milestone',
        message: `25% checkpoint: ${pd.sequential_plan[quarter].task}`,
        date: pd.sequential_plan[quarter].date, urgency: 'low'
      });
      if (pd.sequential_plan[mid]) newReminders.push({
        id: Date.now() + Math.random(), project: pd.project_name, type: 'milestone',
        message: `Halfway point: ${pd.sequential_plan[mid].task}`,
        date: pd.sequential_plan[mid].date, urgency: 'medium'
      });
    }
    if (pd.gaps?.length > 0) newReminders.push({
      id: Date.now() + Math.random(), project: pd.project_name, type: 'gap',
      message: `Unresolved gap: ${pd.gaps[0]}`, date: pd.deadline, urgency: 'high'
    });
    const updated = [...reminders, ...newReminders];
    saveReminders(updated);
    if (Notification.permission === 'granted') {
      new Notification(`AuraFlow: ${pd.project_name}`, { body: `${daysLeft} days left!` });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  // ── Soul Search Handlers ───────────────────────────────────────
  const handleSoulSearch = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/soul-search`, projectData);
      setSoulReport(res.data.soul_report);
      setStep(2);
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const handleProjectPlan = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/project-plan`, {
        soul_report: soulReport, project_name: projectData.project_name, deadline_days: 8
      });
      setProjectPlan(res.data.project_plan);
      setStep(3);
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const handlePitchDeck = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/pitch-deck`, {
        soul_report: soulReport, project_plan: projectPlan,
        project_name: projectData.project_name, team_name: 'AuraFlow Team'
      });
      setPitchDeck(res.data.pitch_deck);
      setStep(4);
      addProject({
        source: 'soul', project_name: projectData.project_name,
        project_type: projectData.project_type, days_remaining: 8, step: 4,
        soul_report: soulReport, project_plan: projectPlan, pitch_deck: res.data.pitch_deck
      });
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  // ── File Manager Handler ───────────────────────────────────────
  const handleFileUpload = async () => {
    if (!fileProject.name || !fileProject.deadline || files.length === 0) {
      alert('Please fill all fields and upload at least one file!'); return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('project_name', fileProject.name);
      formData.append('deadline', fileProject.deadline);
      files.forEach(f => formData.append('file', f));
      const res = await axios.post(`${API_BASE}/file-manager/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const parsed = JSON.parse(res.data.segregated_data);
      setSegregatedData(parsed);
      addProject({
        source: 'file',
        project_name: parsed.project_name || fileProject.name,
        project_type: parsed.project_type || 'Unknown',
        deadline: parsed.deadline,
        days_remaining: parsed.days_remaining,
        segregated_data: parsed
      });
      generateReminders(parsed);
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const handleClear = () => { setFiles([]); setSegregatedData(null); setFileProject({ name: '', deadline: '' }); };

  // ── Multi Project Handler ──────────────────────────────────────
  const handleMultiProject = async () => {
    const fileProjects = savedProjects.filter(p => p.source === 'file');
    if (fileProjects.length < 2) { alert('You need at least 2 analyzed file projects!'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/file-manager/multi-project`, {
        projects: fileProjects.map(p => p.segregated_data)
      });
      const parsed = JSON.parse(res.data.multi_project_plan);
      setMultiProjectPlan(parsed);
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  // ── Progress Handlers ──────────────────────────────────────────
  const handleCheckProgress = async (project) => {
    const key = project.project_name;
    const days = completedDays[key] || [];
    setCheckingProgress(key);
    try {
      const res = await axios.post(`${API_BASE}/progress/check`, {
        project_name: project.project_name, project_type: project.project_type || '',
        deadline: project.deadline, days_remaining: project.days_remaining,
        completed_days: days, sequential_plan: safeArray(project.sequential_plan),
        gaps: safeArray(project.gaps), summary: project.summary || ''
      });
      const parsed = JSON.parse(res.data.progress_report);
      setProgressReports(prev => ({ ...prev, [key]: parsed }));
    } catch (err) { alert('Error: ' + err.message); }
    setCheckingProgress(null);
  };

  const toggleDayComplete = (projectName, dayNum) => {
    setCompletedDays(prev => {
      const current = prev[projectName] || [];
      const updated = current.includes(dayNum) ? current.filter(d => d !== dayNum) : [...current, dayNum];
      return { ...prev, [projectName]: updated };
    });
  };

  // ── Chat Handler ───────────────────────────────────────────────
  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const projectContext = savedProjects.map(p => ({
        project_name: p.project_name,
        project_type: p.project_type,
        source: p.source,
        deadline: p.deadline || 'N/A',
        days_remaining: p.days_remaining || 'N/A',
        summary: p.segregated_data?.summary || p.description || '',
        gaps: p.segregated_data?.gaps || [],
        requirements: p.segregated_data?.requirements || []
      }));

      const res = await axios.post(`${API_BASE}/chat`, {
        message: chatInput,
        history: chatMessages.slice(-6),
        projects: projectContext
      });

      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Make sure the backend is running!'
      }]);
    }
    setChatLoading(false);
  };

  // ── Soul Report Card ───────────────────────────────────────────
  const renderSoulReportCard = (soulData) => {
    const r = safeParse(soulData);
    if (!r) return null;
    return (
      <div className="soul-display">
        {r.soul_summary && <div className="soul-summary-box"><p>{r.soul_summary}</p></div>}
        <div className="segments">
          <div className="segment">
            <h4>📈 Market Trends</h4>
            {safeArray(r.market_trends).map((t, i) => <p key={i}>• {t}</p>)}
          </div>
          <div className="segment">
            <h4>⚠️ Competitor Demerits</h4>
            {safeArray(r.competitor_demerits).map((t, i) => <p key={i}>• {t}</p>)}
          </div>
          <div className="segment">
            <h4>🎭 Cultural Vibe</h4>
            <p>{r.cultural_vibe}</p>
          </div>
          <div className="segment">
            <h4>⚙️ Technical Requirements</h4>
            {safeArray(r.technical_requirements).map((t, i) => <p key={i}>• {t}</p>)}
          </div>
        </div>
        {r.key_sources && (
          <div className="sources-box">
            <h4>🔗 Sources Used</h4>
            {safeArray(r.key_sources).map((s, i) => (
              <p key={i}>• <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#00bfff' }}>{s.title}</a></p>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Project Plan Card ──────────────────────────────────────────
  const renderProjectPlanCard = (planData) => {
    const r = safeParse(planData);
    if (!r) return null;
    return (
      <div className="soul-display">
        {safeArray(r.phases).map((phase, i) => (
          <div key={i} className="phase-card">
            <div className="phase-header">
              <span className="phase-name">{phase.phase}</span>
              <span className="phase-days">{phase.day_range || phase.days}</span>
            </div>
            <div className="phase-tasks">
              {safeArray(phase.tasks).map((t, j) => <p key={j}>• {t}</p>)}
            </div>
            <div className="phase-deliverable">✅ {phase.deliverable}</div>
          </div>
        ))}
        {r.daily_breakdown && (
          <>
            <h3 style={{ marginTop: '8px' }}>📅 Daily Breakdown</h3>
            <div className="plan">
              {safeArray(r.daily_breakdown).map((d, i) => (
                <div key={i} className="plan-item">
                  <div className="day-block">
                    <span className="day">Day {d.day}</span>
                  </div>
                  <div className="task-block">
                    <span className="task">{d.focus}</span>
                    {safeArray(d.tasks).map((t, j) => <span key={j} className="details">• {t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Pitch Deck Card ────────────────────────────────────────────
  const renderPitchDeckCard = (deckData) => {
    const r = safeParse(deckData);
    if (!r) return null;
    return (
      <div className="soul-display">
        {safeArray(r.slides).map((slide, i) => (
          <div key={i} className="slide-card">
            <div className="slide-header">
              <span className="slide-num">Slide {slide.slide_number}</span>
              <span className="slide-title">{slide.title}</span>
            </div>
            <p className="slide-content">{slide.content}</p>
            <div className="slide-key">💡 {slide.key_point}</div>
          </div>
        ))}
      </div>
    );
  };

  // ── Progress Block ─────────────────────────────────────────────
  const renderProgressBlock = (data) => {
    if (!data) return null;
    const r = progressReports[data.project_name];
    return (
      <>
        <h3>🗓️ Sequential Plan ({data.days_remaining} Days)</h3>
        <p style={{ fontSize: '0.82rem', color: '#555' }}>
          Tick completed days then click Check Progress for AI feedback.
        </p>
        <div className="plan">
          {safeArray(data.sequential_plan).map((p, i) => (
            <div key={i} className={`plan-item priority-${p.priority}`}>
              <div className="day-block">
                <span className="day">Day {p.day}</span>
                <span className="plan-date">{p.date}</span>
              </div>
              <div className="task-block">
                <span className="task">{p.task}</span>
                <span className="details">{p.details}</span>
                <span className="deliverable">✅ {p.deliverable}</span>
              </div>
              <span className={`priority ${p.priority}`}>{p.priority}</span>
              <input type="checkbox"
                checked={(completedDays[data.project_name] || []).includes(p.day)}
                onChange={() => toggleDayComplete(data.project_name, p.day)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00bfff' }} />
            </div>
          ))}
        </div>
        <button
          onClick={() => handleCheckProgress(data)}
          disabled={checkingProgress !== null}
          style={{ background: 'linear-gradient(135deg, #00bfff, #0077b3)', marginTop: '8px' }}>
          {checkingProgress === data.project_name ? '🔄 Analyzing...' : '📊 Check Progress'}
        </button>
        {r && (
          <div className="progress-report">
            <div className="progress-header">
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${r.completion_percentage}%` }} />
              </div>
              <span className="progress-pct">{r.completion_percentage}% complete</span>
            </div>
            <div className={`status-badge status-${r.status}`}>
              {r.status === 'on_track' ? '✅ On Track' : r.status === 'ahead' ? '🚀 Ahead' : r.status === 'at_risk' ? '⚠️ At Risk' : '🔴 Behind'}
              <span className="status-msg">{r.status_message}</span>
            </div>
            <div className="progress-section"><h4>📈 Pace Analysis</h4><p>{r.pace_analysis}</p></div>
            <div className="progress-section"><h4>🎯 Next Priority</h4><p className="next-priority">{r.next_priority}</p></div>
            {safeArray(r.risk_flags).length > 0 && (
              <div className="progress-risks">
                <h4>⚡ Risk Flags</h4>
                {r.risk_flags.map((rf, i) => <p key={i}>• {rf}</p>)}
              </div>
            )}
            <div className="progress-section">
              <h4>💡 Updated Recommendations</h4>
              {safeArray(r.updated_recommendations).map((rec, i) => <p key={i}>• {rec}</p>)}
            </div>
            <div className="motivation-box"><p>💬 {r.motivation}</p></div>
          </div>
        )}
      </>
    );
  };

  // ── Render Sidebar ─────────────────────────────────────────────
  const renderSidebar = () => (
    <div className="sidebar">
      <div className="sidebar-header" onClick={startNew} style={{ cursor: 'pointer' }}>
        <h1>🌊 AuraFlow</h1>
        <p>Strategic Engine</p>
      </div>
      <button className="new-project-btn" onClick={startNew}>+ New Project</button>
      <div className="sidebar-section">
        <span className="sidebar-label">📁 PROJECTS</span>
        <div className="project-list">
          {savedProjects.filter(p => p.source !== 'multi').length === 0 && (
            <p className="no-projects">No projects yet.</p>
          )}
          {savedProjects.filter(p => p.source !== 'multi').map(p => (
            <div key={p.id}
              className={`project-card ${activeProjectId === p.id ? 'active' : ''}`}
              onClick={() => openProject(p)}>
              <div className="project-card-top">
                <span className="project-card-icon">{getSourceIcon(p.source)}</span>
                <span className="project-card-name">{p.project_name}</span>
                <button className="delete-btn"
                  onClick={e => { e.stopPropagation(); deleteProject(p.id); }}>✕</button>
              </div>
              <div className="project-card-meta">
                <span className="project-card-type">{p.project_type}</span>
                {p.days_remaining && (
                  <span className="project-card-days" style={{ color: getDaysColor(p.days_remaining) }}>
                    {p.days_remaining}d left
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sidebar-section">
        <span className="sidebar-label">🛠️ TOOLS</span>
        <button className={`tool-btn ${activeSection === 'multi' ? 'active' : ''}`}
          onClick={() => attemptNavigation('multi')}>
          🗂️ Multi-Project
          {savedProjects.filter(p => p.source === 'file').length >= 2 && (
            <span className="ready-badge">Ready</span>
          )}
        </button>
        <button className={`tool-btn ${activeSection === 'reminders' ? 'active' : ''}`}
          onClick={() => attemptNavigation('reminders')}>
          🔔 Reminders
          {reminders.filter(r => r.urgency === 'high').length > 0 && (
            <span className="urgent-badge">{reminders.filter(r => r.urgency === 'high').length}</span>
          )}
        </button>
      </div>

      {/* Chat Button at bottom of sidebar */}
      <div style={{ padding: '12px', marginTop: 'auto' }}>
        <button
          onClick={() => setChatOpen(o => !o)}
          style={{
            width: '100%',
            background: chatOpen
              ? 'linear-gradient(135deg, #00bfff, #0077b3)'
              : 'linear-gradient(135deg, #00bfff, #00ccff)',
            border: 'none', borderRadius: '10px', padding: '12px',
            color: 'white', fontWeight: '600', cursor: 'pointer',
            fontSize: '0.88rem', marginTop: '0'
          }}>
          {chatOpen ? '✕ Close Assistant' : '💬 Ask AuraFlow AI'}
        </button>
      </div>
    </div>
  );

  // ── Chat Panel ─────────────────────────────────────────────────
  const renderChatPanel = () => (
    <div className="chat-overlay">
      <div className="chat-panel">
        <div className="chat-header">
          <div className="chat-header-info">
            <span className="chat-avatar">🌊</span>
            <div>
              <span className="chat-title">AuraFlow Assistant</span>
              <span className="chat-subtitle">
                Knows your {savedProjects.length} project{savedProjects.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button className="chat-close" onClick={() => setChatOpen(false)}>✕</button>
        </div>

        <div className="chat-messages">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              {msg.role === 'assistant' && <span className="chat-msg-avatar">🌊</span>}
              <div className="chat-bubble">{msg.content}</div>
              {msg.role === 'user' && <span className="chat-msg-avatar user-av">👤</span>}
            </div>
          ))}
          {chatLoading && (
            <div className="chat-message assistant">
              <span className="chat-msg-avatar">🌊</span>
              <div className="chat-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div className="chat-quick-btns">
          {['What should I work on today?', 'Which project is at risk?', 'Summarize all my projects'].map((q, i) => (
            <button key={i} className="quick-btn" onClick={() => setChatInput(q)}>
              {q}
            </button>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            className="chat-input"
            placeholder="Ask about your projects..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !chatLoading && handleChat()}
          />
          <button className="chat-send" onClick={handleChat} disabled={chatLoading}>
            {chatLoading ? '...' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render New Project ─────────────────────────────────────────
  const renderNewProject = () => (
    <div className="main-content">
      <div className="new-project-header">
        <h2>✨ New Project</h2>
        <p>Choose how you want to start</p>
      </div>
      <div className="new-project-options">
        <div className="option-card" onClick={() => attemptNavigation('soul')}>
          <span className="option-icon">🔍</span>
          <h3>Soul Search</h3>
          <p>Real-time market research, competitor analysis, and strategic positioning</p>
          <span className="option-tag">Research + Strategy</span>
        </div>
        <div className="option-card" onClick={() => attemptNavigation('file')}>
          <span className="option-icon">📁</span>
          <h3>File Manager</h3>
          <p>Upload project files and AI will analyze, segregate, and create a deadline-aware plan</p>
          <span className="option-tag">Files + Planning</span>
        </div>
      </div>
    </div>
  );

  // ── Render Soul Search ─────────────────────────────────────────
  const renderSoulSearch = () => (
    <div className="main-content">
      <div className="steps">
        {['Soul Search', 'Project Plan', 'Pitch Deck', 'Done'].map((s, i) => (
          <div key={i} className={`step ${step > i ? 'active' : ''}`}>
            <div className="step-number">{i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>
      {step === 1 && (
        <div className="card">
          <h2>🔍 Soul Search</h2>
          <p>Enter your project details for real-time market research and strategic analysis.</p>
          <input placeholder="Project Name" value={projectData.project_name}
            onChange={e => setProjectData({ ...projectData, project_name: e.target.value })} />
          <input placeholder="Project Type" value={projectData.project_type}
            onChange={e => setProjectData({ ...projectData, project_type: e.target.value })} />
          <textarea placeholder="Describe your project..." value={projectData.description}
            onChange={e => setProjectData({ ...projectData, description: e.target.value })} />
          <select value={projectData.depth}
            onChange={e => setProjectData({ ...projectData, depth: e.target.value })}>
            <option value="quick">⚡ Quick (10 mins)</option>
            <option value="medium">🔍 Medium (45 mins)</option>
            <option value="deep">🧠 Deep (2 hours)</option>
          </select>
          <div style={{ marginTop: '4px' }}>
            <input
              placeholder="🔗 Optional: Paste a specific URL or research paper link"
              value={projectData.specific_url}
              onChange={e => setProjectData({ ...projectData, specific_url: e.target.value })}
              style={{ borderColor: projectData.specific_url ? '#00bfff' : '' }}
            />
            <p style={{ fontSize: '0.78rem', color: projectData.specific_url ? '#00bfff' : '#555', margin: '4px 0 0 4px' }}>
              {projectData.specific_url ? '🔗 Deep Fetch mode — AI will read this page alongside web research' : 'Leave empty for general web search only'}
            </p>
          </div>
          <button onClick={handleSoulSearch} disabled={loading}>
            {loading ? '🔄 Researching the web...' : '🚀 Find the Soul'}
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="card">
          <h2>✨ Soul Report Ready!</h2>
          {renderSoulReportCard(soulReport)}
          <button onClick={handleProjectPlan} disabled={loading}>
            {loading ? '🔄 Generating...' : '📋 Generate Project Plan'}
          </button>
        </div>
      )}
      {step === 3 && (
        <div className="card">
          <h2>📋 Project Plan Ready!</h2>
          {renderProjectPlanCard(projectPlan)}
          <button onClick={handlePitchDeck} disabled={loading}>
            {loading ? '🔄 Generating...' : '🎯 Generate Pitch Deck'}
          </button>
        </div>
      )}
      {step === 4 && (
        <div className="card">
          <h2>🎯 Pitch Deck Ready!</h2>
          {renderPitchDeckCard(pitchDeck)}
          <div className="saved-notice">✅ Project saved to sidebar!</div>
          <button onClick={startNew}>🔄 Start New Project</button>
        </div>
      )}
    </div>
  );

  // ── Render File Manager ────────────────────────────────────────
  const renderFileManager = () => (
    <div className="main-content">
      <div className="card">
        <h2>📁 File Manager</h2>
        <p>Upload your project files and AI will deeply analyze, expand ideas, and generate a deadline-aware plan.</p>
        <input placeholder="Project Name" value={fileProject.name}
          onChange={e => setFileProject({ ...fileProject, name: e.target.value })} />
        <input type="date" value={fileProject.deadline}
          onChange={e => setFileProject({ ...fileProject, deadline: e.target.value })} />
        <div className="upload-zone"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); setFiles([...files, ...Array.from(e.dataTransfer.files)]); }}>
          <p>📂 Drag & drop files here or</p>
          <input type="file" multiple
            onChange={e => setFiles([...files, ...Array.from(e.target.files)])}
            style={{ marginTop: '10px' }} />
          {files.length > 0 && (
            <div className="file-list">
              {files.map((f, i) => <span key={i} className="file-tag">📄 {f.name}</span>)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleFileUpload} disabled={loading} style={{ flex: 1 }}>
            {loading ? '🔄 Analyzing...' : '🧠 Analyze & Segregate'}
          </button>
          <button onClick={handleClear} disabled={loading}
            style={{ background: '#1a1a2e', border: '1px solid #2a2a3a', flex: 'none', padding: '12px 20px', marginTop: '4px' }}>
            🗑️ Clear
          </button>
        </div>
        {segregatedData && (
          <div className="segregated">
            <div className="saved-notice">✅ Project saved to sidebar!</div>
            <div className="project-meta">
              <span className="meta-tag">📁 {segregatedData.project_type}</span>
              <span className="meta-tag">📅 {segregatedData.days_remaining} days remaining</span>
              <span className="meta-tag">🗓️ Due: {segregatedData.deadline}</span>
            </div>
            <h3>📊 Project Analysis</h3>
            <p className="summary">{segregatedData.summary}</p>
            <div className="segments">
              <div className="segment"><h4>📋 Requirements</h4>{safeArray(segregatedData.requirements).map((r, i) => <p key={i}>• {r}</p>)}</div>
              <div className="segment"><h4>💡 Ideas (Expanded)</h4>{safeArray(segregatedData.ideas).map((r, i) => <p key={i}>• {r}</p>)}</div>
              <div className="segment"><h4>🎨 Layouts</h4>{safeArray(segregatedData.layouts).map((r, i) => <p key={i}>• {r}</p>)}</div>
              <div className="segment"><h4>⚙️ Technical Specs</h4>{safeArray(segregatedData.technical_specs).map((r, i) => <p key={i}>• {r}</p>)}</div>
              <div className="segment"><h4>📅 Deadlines</h4>{safeArray(segregatedData.deadlines).map((r, i) => <p key={i}>• {r}</p>)}</div>
              <div className="segment"><h4>🌍 Market Insights</h4>{safeArray(segregatedData.market_insights).map((r, i) => <p key={i}>• {r}</p>)}</div>
            </div>
            <div className="gaps-section">
              <h4>⚠️ Gaps Found in Brief</h4>
              {safeArray(segregatedData.gaps).map((r, i) => <p key={i}>• {r}</p>)}
            </div>
            {renderProgressBlock(segregatedData)}
          </div>
        )}
      </div>
    </div>
  );

  // ── Render Project View ────────────────────────────────────────
  const renderProjectView = () => {
    const project = savedProjects.find(p => p.id === activeProjectId);
    if (!project) return null;
    if (project.source === 'soul') {
      return (
        <div className="main-content">
          <div className="view-header">
            <h2>🔍 {project.project_name}</h2>
            <span className="view-type">{project.project_type}</span>
          </div>
          {project.soul_report && <div className="card"><h3>✨ Soul Report</h3>{renderSoulReportCard(project.soul_report)}</div>}
          {project.project_plan && <div className="card"><h3>📋 Project Plan</h3>{renderProjectPlanCard(project.project_plan)}</div>}
          {project.pitch_deck && <div className="card"><h3>🎯 Pitch Deck</h3>{renderPitchDeckCard(project.pitch_deck)}</div>}
        </div>
      );
    }
    const data = project.segregated_data;
    return (
      <div className="main-content">
        <div className="view-header">
          <h2>📁 {project.project_name}</h2>
          <span className="view-type">{data?.project_type}</span>
        </div>
        <div className="card">
          <div className="project-meta">
            <span className="meta-tag">📁 {data?.project_type}</span>
            <span className="meta-tag">📅 {data?.days_remaining} days remaining</span>
            <span className="meta-tag">🗓️ Due: {data?.deadline}</span>
          </div>
          <p className="summary">{data?.summary}</p>
          <div className="segments">
            <div className="segment"><h4>📋 Requirements</h4>{safeArray(data?.requirements).map((r, i) => <p key={i}>• {r}</p>)}</div>
            <div className="segment"><h4>💡 Ideas</h4>{safeArray(data?.ideas).map((r, i) => <p key={i}>• {r}</p>)}</div>
            <div className="segment"><h4>🎨 Layouts</h4>{safeArray(data?.layouts).map((r, i) => <p key={i}>• {r}</p>)}</div>
            <div className="segment"><h4>⚙️ Technical Specs</h4>{safeArray(data?.technical_specs).map((r, i) => <p key={i}>• {r}</p>)}</div>
            <div className="segment"><h4>📅 Deadlines</h4>{safeArray(data?.deadlines).map((r, i) => <p key={i}>• {r}</p>)}</div>
            <div className="segment"><h4>🌍 Market Insights</h4>{safeArray(data?.market_insights).map((r, i) => <p key={i}>• {r}</p>)}</div>
          </div>
          <div className="gaps-section">
            <h4>⚠️ Gaps Found in Brief</h4>
            {safeArray(data?.gaps).map((r, i) => <p key={i}>• {r}</p>)}
          </div>
          {data && renderProgressBlock(data)}
        </div>
      </div>
    );
  };

  // ── Render Multi Project ───────────────────────────────────────
  const renderMultiProject = () => {
    const fileProjects = savedProjects.filter(p => p.source === 'file');
    return (
      <div className="main-content">
        <div className="card">
          <h2>🗂️ Multi-Project Manager</h2>
          <p>Analyze all pending projects and get an optimized master plan.</p>
          {fileProjects.length === 0 && (
            <div className="empty-state">
              <p>📂 No file projects yet.</p>
              <p>Use <strong>File Manager</strong> to analyze projects first.</p>
            </div>
          )}
          {fileProjects.length > 0 && (
            <div>
              <h3>📋 Available Projects ({fileProjects.length})</h3>
              <div className="loaded-projects">
                {fileProjects.map((p, i) => (
                  <div key={i} className="loaded-project-card">
                    <div className="lp-info">
                      <span className="lp-name">{p.project_name}</span>
                      <span className="lp-type">{p.project_type}</span>
                    </div>
                    <div className="lp-meta">
                      <span className="lp-days" style={{ color: getDaysColor(p.days_remaining) }}>
                        {p.days_remaining} days left
                      </span>
                      <span className="lp-deadline">📅 {p.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
              {fileProjects.length < 2 && (
                <div className="warning-box">⚠️ Add at least 2 file projects to generate a Master Plan.</div>
              )}
              {fileProjects.length >= 2 && (
                <button onClick={handleMultiProject} disabled={loading}>
                  {loading ? '🔄 Generating Master Plan...' : '🧠 Generate Master Plan'}
                </button>
              )}
            </div>
          )}
          {multiProjectPlan && (
            <div className="multi-results">
              <div className="analysis-summary">
                <h3>📊 Situation Analysis</h3>
                <p>{multiProjectPlan.analysis_summary}</p>
              </div>
              <h3>🎯 Priority Order</h3>
              <div className="priority-list">
                {multiProjectPlan.priority_order?.map((p, i) => (
                  <div key={i} className="priority-card">
                    <span className="rank">#{p.rank}</span>
                    <div className="priority-info">
                      <span className="priority-name">{p.project_name}</span>
                      <span className="priority-reason">{p.reason}</span>
                    </div>
                    <div className="priority-meta">
                      <span className="lp-days">{p.days_remaining} days</span>
                      <span className="lp-deadline">📅 {p.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
              {multiProjectPlan.conflicts?.length > 0 && (
                <div className="conflicts-section">
                  <h3>⚡ Conflicts Detected</h3>
                  {multiProjectPlan.conflicts.map((c, i) => (
                    <div key={i} className={`conflict-card severity-${c.severity}`}>
                      <span className={`severity-badge ${c.severity}`}>{c.severity}</span>
                      <div className="conflict-info">
                        <span className="conflict-type">{c.type}</span>
                        <span className="conflict-desc">{c.description}</span>
                        <span className="conflict-projects">Projects: {c.projects_involved?.join(' & ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {multiProjectPlan.at_risk_projects?.length > 0 && (
                <div className="risk-section">
                  <h3>🚨 At Risk Projects</h3>
                  {multiProjectPlan.at_risk_projects.map((r, i) => (
                    <div key={i} className="risk-card">
                      <span className="risk-name">{r.project_name}</span>
                      <span className="risk-reason">{r.reason}</span>
                      <span className="risk-rec">💡 {r.recommendation}</span>
                    </div>
                  ))}
                </div>
              )}
              <h3>🗓️ Master Plan</h3>
              <div className="master-plan">
                {multiProjectPlan.master_plan?.map((day, i) => (
                  <div key={i} className="master-day">
                    <div className="master-day-header">
                      <span className="day">Day {day.day}</span>
                      <span className="plan-date">{day.date}</span>
                      <span className="total-hours">⏱️ {day.total_hours}h</span>
                    </div>
                    <div className="master-schedule">
                      {day.schedule?.map((s, j) => (
                        <div key={j} className={`schedule-item priority-${s.priority}`}>
                          <span className="schedule-project">{s.project}</span>
                          <span className="schedule-task">{s.task}</span>
                          <span className="schedule-hours">{s.hours}h</span>
                          <span className={`priority ${s.priority}`}>{s.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="recommendations">
                <h3>💡 Recommendations</h3>
                {multiProjectPlan.recommendations?.map((r, i) => <p key={i}>• {r}</p>)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render Reminders ───────────────────────────────────────────
  const renderReminders = () => {
    const sorted = [...reminders].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.urgency] - order[b.urgency];
    });
    return (
      <div className="main-content">
        <div className="card">
          <h2>🔔 Reminders</h2>
          <p>Auto-generated reminders based on your project deadlines, milestones, and gaps.</p>
          {reminders.length === 0 && (
            <div className="empty-state">
              <p>📭 No reminders yet.</p>
              <p>Analyze a project in <strong>File Manager</strong> to auto-generate reminders.</p>
            </div>
          )}
          {reminders.length > 0 && (
            <div>
              <div className="reminder-stats">
                <div className="stat-box high">
                  <span className="stat-num">{reminders.filter(r => r.urgency === 'high').length}</span>
                  <span className="stat-label">Urgent</span>
                </div>
                <div className="stat-box medium">
                  <span className="stat-num">{reminders.filter(r => r.urgency === 'medium').length}</span>
                  <span className="stat-label">Soon</span>
                </div>
                <div className="stat-box low">
                  <span className="stat-num">{reminders.filter(r => r.urgency === 'low').length}</span>
                  <span className="stat-label">Upcoming</span>
                </div>
              </div>
              <div className="reminders-list">
                {sorted.map((r, i) => (
                  <div key={i} className={`reminder-card urgency-${r.urgency}`}>
                    <div className="reminder-icon">
                      {r.type === 'deadline' ? '⏰' : r.type === 'milestone' ? '🏁' : '⚠️'}
                    </div>
                    <div className="reminder-body">
                      <span className="reminder-project">{r.project}</span>
                      <span className="reminder-message">{r.message}</span>
                      <span className="reminder-date">📅 {r.date}</span>
                    </div>
                    <div className="reminder-right">
                      <span className={`urgency-badge ${r.urgency}`}>
                        {r.urgency === 'high' ? '🔴 Urgent' : r.urgency === 'medium' ? '🟡 Soon' : '🟢 Upcoming'}
                      </span>
                      <button className="dismiss-btn"
                        onClick={() => saveReminders(reminders.filter((_, idx) => idx !== i))}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => saveReminders([])}
                style={{ background: '#1a1a2e', border: '1px solid #2a2a3a', marginTop: '8px' }}>
                🗑️ Clear All
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Flash Screen & Login Modal ─────────────────────────────────
  if (showFlash) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#121212', zIndex: 9999, position: 'relative' }}>
        <style>{`
           @keyframes professionalFade {
             0% { opacity: 0; transform: scale(0.98) translateY(10px); }
             30% { opacity: 1; transform: scale(1) translateY(0); }
             85% { opacity: 1; transform: scale(1) translateY(0); }
             100% { opacity: 0; transform: scale(0.98) translateY(-10px); }
           }
         `}</style>
        <h1 style={{ fontSize: '3.5rem', color: '#ffffff', fontWeight: 500, letterSpacing: '0.5px', margin: 0, animation: 'professionalFade 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ marginRight: '8px' }}>🌊</span>AuraFlow
        </h1>
      </div>
    );
  }

  const renderAuthModal = () => {
    if (!showLogin) return null;

    const handleGoogleLogin = () => {
      window.location.href = `${API_BASE}/google`;
    };

    const handleAuthSubmit = async (type) => {
      setAuthError('');
      if (!loginForm.email) return setAuthError('Please enter an email address');
      if (type !== 'forgot' && !loginForm.password) return setAuthError('Please enter a password');

      setAuthLoading(true);
      try {
        setTimeout(() => {
          if (type === 'login') {
            setIsAuthenticated(true);
            setShowLogin(false);
            if (pendingSection) {
              setActiveSection(pendingSection);
              setActiveProjectId(null);
              setPendingSection(null);
            }
          } else if (type === 'signup') {
            //alert('Account successfully created! You may now log in.');
            setAuthView('login');
          } else if (type === 'forgot') {
            //alert('If an account matches that email, we have sent a reset password and username recovery link!');
            setAuthView('login');
          }
          setAuthLoading(false);
        }, 800);
      } catch (err) {
        setAuthError(err.response?.data?.detail || err.message);
        setAuthLoading(false);
      }
    };

    const googleIcon = (
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ width: '20px', height: '20px', marginRight: '10px' }}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
      </svg>
    );

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(10px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: '420px', textAlign: 'center', padding: '30px 40px', background: '#13131a' }}>

          {authView === 'login' && (
            <>
              <h2 style={{ color: '#ffffff', marginBottom: '4px', fontSize: '1.8rem' }}>🌊 AuraFlow Access</h2>
              <p style={{ color: '#888', marginBottom: '24px', fontSize: '0.9rem' }}>Please authenticate to access the engine core.</p>

              <input placeholder="Email Address" value={loginForm.email} onChange={e => { setAuthError(''); setLoginForm({ ...loginForm, email: e.target.value }); }} style={{ marginBottom: '12px', textAlign: 'center' }} />
              <input type="password" placeholder="Password" value={loginForm.password} onChange={e => { setAuthError(''); setLoginForm({ ...loginForm, password: e.target.value }); }} style={{ marginBottom: '8px', textAlign: 'center' }} />

              {authError && (
                <p style={{ color: '#ff4d4d', fontSize: '0.8rem', textAlign: 'left', margin: '0 0 10px 0' }}>
                  {authError}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
                <span style={{ color: '#00bfff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setAuthView('forgot')}>Forgot password?</span>
              </div>

              <button style={{ width: '100%', padding: '12px', fontSize: '1rem', boxShadow: '0 4px 15px rgba(0, 191, 255, 0.2)' }} onClick={() => handleAuthSubmit('login')} disabled={authLoading}>
                {authLoading ? 'Verifying...' : 'Login with Mail'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#555', fontSize: '0.75rem' }}>
                <div style={{ flex: 1, height: '1px', background: '#2a2a3a' }}></div>
                <span style={{ padding: '0 10px', fontWeight: 'bold' }}>OR CONTINUE WITH</span>
                <div style={{ flex: 1, height: '1px', background: '#2a2a3a' }}></div>
              </div>

              <button style={{ width: '100%', background: '#1a1a2e', border: '1px solid rgba(0,191,255,0.3)', color: '#fff', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }} onClick={handleGoogleLogin}>
                {googleIcon} Login with Google
              </button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>New here? <span style={{ color: '#00bfff', cursor: 'pointer', fontWeight: 'bold', marginLeft: '6px' }} onClick={() => setAuthView('signup')}>Sign up</span></span>
              </div>
            </>
          )}

          {authView === 'signup' && (
            <>
              <h2 style={{ color: '#ffffff', marginBottom: '4px', fontSize: '1.8rem' }}>🌊 Join AuraFlow</h2>
              <p style={{ color: '#888', marginBottom: '24px', fontSize: '0.9rem' }}>Create an account to unlock the strategic engine.</p>

              <input placeholder="Email Address" value={loginForm.email} onChange={e => { setAuthError(''); setLoginForm({ ...loginForm, email: e.target.value }); }} style={{ marginBottom: '12px', textAlign: 'center' }} />
              <input type="password" placeholder="Create Password" value={loginForm.password} onChange={e => { setAuthError(''); setLoginForm({ ...loginForm, password: e.target.value }); }} style={{ marginBottom: '20px', textAlign: 'center' }} />

              {authError && (
                <p style={{ color: '#ff4d4d', fontSize: '0.8rem', textAlign: 'left', margin: '-10px 0 10px 0' }}>
                  {authError}
                </p>
              )}

              <button style={{ width: '100%', padding: '12px', fontSize: '1rem', boxShadow: '0 4px 15px rgba(0, 191, 255, 0.2)' }} onClick={() => handleAuthSubmit('signup')} disabled={authLoading}>
                {authLoading ? 'Creating...' : 'Register with Mail'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#555', fontSize: '0.75rem' }}>
                <div style={{ flex: 1, height: '1px', background: '#2a2a3a' }}></div>
                <span style={{ padding: '0 10px', fontWeight: 'bold' }}>OR CONTINUE WITH</span>
                <div style={{ flex: 1, height: '1px', background: '#2a2a3a' }}></div>
              </div>

              <button style={{ width: '100%', background: '#1a1a2e', border: '1px solid rgba(0,191,255,0.3)', color: '#fff', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }} onClick={handleGoogleLogin}>
                {googleIcon} Sign up with Google
              </button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>Already have an account?<span style={{ color: '#00bfff', cursor: 'pointer', fontWeight: 'bold', marginLeft: '6px' }} onClick={() => setAuthView('login')}>Login</span></span>
              </div>
            </>
          )}

          {authView === 'forgot' && (
            <>
              <h2 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '1.8rem' }}>🔒 Reset Credentials</h2>
              <p style={{ color: '#888', marginBottom: '24px', fontSize: '0.9rem' }}>Enter your email. If registered, we will send an email containing your username alongside a reset password option.</p>

              <input placeholder="Registered Email Address" value={loginForm.email} onChange={e => { setAuthError(''); setLoginForm({ ...loginForm, email: e.target.value }); }} style={{ marginBottom: '20px', textAlign: 'center' }} />

              {authError && (
                <p style={{ color: '#ff4d4d', fontSize: '0.8rem', textAlign: 'left', margin: '-10px 0 10px 0' }}>
                  {authError}
                </p>
              )}

              <button style={{ width: '100%', padding: '12px', fontSize: '1rem', boxShadow: '0 4px 15px rgba(0, 191, 255, 0.2)' }} onClick={() => handleAuthSubmit('forgot')} disabled={authLoading}>
                {authLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <span style={{ color: '#00bfff', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setAuthView('login')}>Back to Login</span>
              </div>
            </>
          )}

          {(authView === 'login' || authView === 'signup') && (
            <button style={{ width: '100%', background: 'transparent', color: '#444', marginTop: '8px', border: 'none', fontSize: '0.75rem', boxShadow: 'none' }} onClick={() => { setShowLogin(false); setPendingSection(null); setAuthView('login'); }}>[Cancel & Return to Home]</button>
          )}
        </div>
      </div>
    );
  };

  // ── Main Return ────────────────────────────────────────────────
  return (
    <>
      {renderAuthModal()}
      <div className="layout">
        {renderSidebar()}
        <div className="content-area">
          {activeSection === 'new' && renderNewProject()}
          {activeSection === 'soul' && renderSoulSearch()}
          {activeSection === 'file' && renderFileManager()}
          {activeSection === 'view' && renderProjectView()}
          {activeSection === 'multi' && renderMultiProject()}
          {activeSection === 'reminders' && renderReminders()}
        </div>
        {chatOpen && renderChatPanel()}
      </div>
    </>
  );
}

export default App;