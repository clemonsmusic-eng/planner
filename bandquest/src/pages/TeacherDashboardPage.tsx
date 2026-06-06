import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { INSTRUMENTS, getInstrumentColor } from '../lib/instruments';
import Avatar from '../components/Avatar';
import { normalizeAppearance } from '../lib/appearance';
import type { InstrumentId, Rating } from '../types/game';

interface StudentRow {
  id: string;
  userId: string;
  displayName: string;
  instrument: InstrumentId;
  level: number;
  currentZone: number;
  power: number;
  accuracy: number;
  technique: number;
  endurance: number;
  hp: number;
  maxHp: number;
  bootCampComplete: boolean;
  practiceStreak: number;
  lastActiveDate: string | null;
  weeklyXp: number;
  bossVictories: number;
  ensembleTechs: number;
  totalAttempts: number;
  suspended: boolean;
  appearance: unknown;
}

interface ClassroomData {
  id: string;
  name: string;
  period: string;
  joinCode: string;
  currentZone: number;
  baseInstrumentsOnly: boolean;
  archived: boolean;
}

export default function TeacherDashboardPage() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<ClassroomData[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomData | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'analytics' | 'leaderboard'>('roster');
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    if (user.role !== 'teacher') { navigate('/hub'); return; }
    loadClassrooms();
  }, [user]);

  async function loadClassrooms() {
    setLoading(true);
    const { data } = await supabase
      .from('classrooms')
      .select('*')
      .eq('teacher_id', user!.id)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const cls = data.map((d) => ({
        id: d.id,
        name: d.name,
        period: d.period ?? '',
        joinCode: d.join_code,
        currentZone: d.current_zone,
        baseInstrumentsOnly: d.base_instruments_only,
        archived: d.archived ?? false,
      }));
      setClassrooms(cls);
      setSelectedClassroom(cls[0]);
      await loadStudents(cls[0].id);
    }
    setLoading(false);
  }

  async function loadStudents(classroomId: string) {
    const { data } = await supabase
      .from('characters')
      .select('*')
      .eq('classroom_id', classroomId)
      .order('level', { ascending: false });

    if (data) {
      setStudents(data.map((d) => ({
        id: d.id,
        userId: d.user_id,
        displayName: d.display_name,
        instrument: d.instrument as InstrumentId,
        level: d.level,
        currentZone: d.current_zone,
        power: d.power,
        accuracy: d.accuracy,
        technique: d.technique,
        endurance: d.endurance,
        hp: d.hp,
        maxHp: d.max_hp,
        bootCampComplete: d.boot_camp_complete,
        practiceStreak: d.practice_streak,
        lastActiveDate: d.last_active_date,
        weeklyXp: d.weekly_xp,
        bossVictories: d.boss_victories,
        ensembleTechs: d.ensemble_techs,
        totalAttempts: d.total_attempts,
        suspended: d.suspended ?? false,
        appearance: d.appearance,
      })));
    }
  }

  async function selectClassroom(cls: ClassroomData) {
    setSelectedClassroom(cls);
    await loadStudents(cls.id);
  }

  async function advanceClassroomZone() {
    if (!selectedClassroom || selectedClassroom.currentZone >= 12) return;
    const newZone = selectedClassroom.currentZone + 1;
    await supabase
      .from('classrooms')
      .update({ current_zone: newZone })
      .eq('id', selectedClassroom.id);
    const updated = { ...selectedClassroom, currentZone: newZone };
    setSelectedClassroom(updated);
    setClassrooms((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  }

  async function toggleArchiveClassroom() {
    if (!selectedClassroom) return;
    const next = !selectedClassroom.archived;
    const { error } = await supabase
      .from('classrooms')
      .update({ archived: next })
      .eq('id', selectedClassroom.id);
    if (error) { alert('Could not update class: ' + error.message); return; }
    const updated = { ...selectedClassroom, archived: next };
    setSelectedClassroom(updated);
    setClassrooms((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  }

  async function deleteClassroom() {
    if (!selectedClassroom) return;
    const ok = window.confirm(
      `Delete "${selectedClassroom.name}" permanently?\n\nThis removes the class and ALL student characters in it. This cannot be undone.`
    );
    if (!ok) return;
    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', selectedClassroom.id);
    if (error) { alert('Could not delete class: ' + error.message); return; }
    setSelectedClassroom(null);
    setStudents([]);
    await loadClassrooms();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-academy-cream/60 font-fantasy">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center justify-between">
        <div className="fantasy-title text-lg text-academy-gold">Teacher Dashboard</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customize')}
            className="flex items-center gap-2 group"
            aria-label="Customize avatar"
          >
            <span className="text-academy-cream/40 group-hover:text-academy-cream/80 text-xs transition-colors hidden sm:inline">
              {user?.displayName}
            </span>
            <span className="rounded-lg overflow-hidden ring-1 ring-academy-gold/20 group-hover:ring-academy-gold/60 transition-all">
              <Avatar appearance={user?.appearance} size={32} />
            </span>
          </button>
          <button onClick={signOut} className="text-academy-cream/40 hover:text-academy-cream/80 text-xs transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Classroom selector */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {classrooms.map((cls) => (
            <button
              key={cls.id}
              onClick={() => selectClassroom(cls)}
              className={`px-4 py-2 rounded-lg border text-sm font-fantasy transition-all
                ${selectedClassroom?.id === cls.id
                  ? 'bg-academy-gold/20 border-academy-gold text-academy-gold'
                  : 'border-academy-gold/20 text-academy-cream/60 hover:border-academy-gold/40'
                }`}
            >
              {cls.name}{cls.period ? ` · ${cls.period}` : ''}
            </button>
          ))}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-secondary text-sm py-2"
          >
            + New Class
          </button>
        </div>

        {selectedClassroom ? (
          <>
            {/* Classroom info card */}
            <div className="card-panel mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="fantasy-title text-lg flex items-center gap-2">
                    {selectedClassroom.name}
                    {selectedClassroom.archived && (
                      <span className="text-[10px] uppercase tracking-widest bg-academy-cream/10 text-academy-cream/50 px-2 py-0.5 rounded">
                        Archived
                      </span>
                    )}
                  </div>
                  {selectedClassroom.period && (
                    <div className="text-academy-cream/50 text-sm">{selectedClassroom.period}</div>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-academy-cream/40 text-xs mb-1">Join Code</div>
                    <div className="font-fantasy text-xl text-academy-gold tracking-widest">
                      {selectedClassroom.joinCode}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-academy-cream/40 text-xs mb-1">Class Zone</div>
                    <div className="font-fantasy text-xl text-academy-gold">{selectedClassroom.currentZone}</div>
                  </div>
                  <button
                    onClick={advanceClassroomZone}
                    disabled={selectedClassroom.currentZone >= 12}
                    className="btn-secondary text-xs py-2 px-3 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Advance Class →
                  </button>
                  <div className="text-center">
                    <div className="text-academy-cream/40 text-xs mb-1">Students</div>
                    <div className="font-fantasy text-xl text-academy-gold">{students.length}</div>
                  </div>
                </div>
              </div>
              {/* Class management row */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-academy-gold/10">
                <button
                  onClick={toggleArchiveClassroom}
                  className="text-academy-cream/50 hover:text-academy-cream text-xs px-3 py-1.5 border border-academy-gold/20 rounded transition-colors"
                >
                  {selectedClassroom.archived ? '↩ Unarchive' : '📦 Archive'}
                </button>
                <button
                  onClick={deleteClassroom}
                  className="text-red-400/70 hover:text-red-400 text-xs px-3 py-1.5 border border-red-500/30 rounded transition-colors"
                >
                  🗑 Delete Class
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-black/30 rounded-lg p-1">
              {(['roster', 'analytics', 'leaderboard'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-md text-sm font-fantasy capitalize transition-all
                    ${activeTab === tab
                      ? 'bg-academy-gold/20 text-academy-gold'
                      : 'text-academy-cream/50 hover:text-academy-cream/80'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'roster' && <RosterTab students={students} onSelectStudent={setSelectedStudent} />}
            {activeTab === 'analytics' && <AnalyticsTab students={students} />}
            {activeTab === 'leaderboard' && <LeaderboardTab students={students} />}
          </>
        ) : (
          <EmptyState onCreate={() => setShowCreateModal(true)} />
        )}
      </div>

      {showCreateModal && (
        <CreateClassroomModal
          teacherId={user!.id}
          onCreated={async () => { await loadClassrooms(); setShowCreateModal(false); }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {selectedStudent && selectedClassroom && (
        <StudentDetailModal
          student={selectedStudent}
          teacherId={user!.id}
          onClose={() => setSelectedStudent(null)}
          onChanged={async () => {
            setSelectedStudent(null);
            await loadStudents(selectedClassroom.id);
          }}
        />
      )}
    </div>
  );
}

// ── Roster Tab ────────────────────────────────────────────────────────────────

function RosterTab({ students, onSelectStudent }: { students: StudentRow[]; onSelectStudent: (s: StudentRow) => void }) {
  const daysSinceActive = (dateStr: string | null) => {
    if (!dateStr) return 999;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const statusColor = (s: StudentRow) => {
    const days = daysSinceActive(s.lastActiveDate);
    if (days === 0) return 'bg-rating-excellent';
    if (days <= 3) return 'bg-rating-fair';
    return 'bg-rating-poor';
  };

  if (students.length === 0) {
    return <div className="text-center text-academy-cream/40 py-12">No students enrolled yet.</div>;
  }

  return (
    <div className="space-y-2">
      {students.map((s) => {
        const color = getInstrumentColor(s.instrument);
        const inst = INSTRUMENTS[s.instrument];
        const days = daysSinceActive(s.lastActiveDate);

        return (
          <button
            key={s.id}
            onClick={() => onSelectStudent(s)}
            className="w-full card-panel flex items-center gap-4 py-3 hover:border-academy-gold/40 transition-all text-left"
          >
            <div
              className="rounded-lg overflow-hidden flex-shrink-0"
              style={{ border: `1px solid ${color}40` }}
            >
              <Avatar appearance={normalizeAppearance(s.appearance)} instrument={s.instrument} size={40} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-academy-cream/90 text-sm font-semibold truncate">{s.displayName}</span>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor(s)}`} title={`Active ${days} day(s) ago`} />
              </div>
              <div className="text-academy-cream/40 text-xs">
                {inst?.className ?? s.instrument} · Lv.{s.level} · Zone {s.currentZone}
              </div>
            </div>
            <div className="flex items-center gap-4 text-center flex-shrink-0">
              <div>
                <div className="text-[10px] text-academy-cream/40">STR</div>
                <div className="text-xs font-fantasy" style={{ color }}>{s.power}</div>
              </div>
              <div>
                <div className="text-[10px] text-academy-cream/40">ACC</div>
                <div className="text-xs font-fantasy" style={{ color }}>{s.accuracy}</div>
              </div>
              <div>
                <div className="text-[10px] text-academy-cream/40">TCH</div>
                <div className="text-xs font-fantasy" style={{ color }}>{s.technique}</div>
              </div>
              <div>
                <div className="text-[10px] text-academy-cream/40">END</div>
                <div className="text-xs font-fantasy" style={{ color }}>{s.endurance}</div>
              </div>
              <div className="text-academy-gold/40 text-xs">→</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ students }: { students: StudentRow[] }) {
  if (students.length === 0) return <div className="text-center text-academy-cream/40 py-12">No data yet.</div>;

  const avgLevel = students.reduce((a, s) => a + s.level, 0) / students.length;
  const totalAttempts = students.reduce((a, s) => a + s.totalAttempts, 0);
  const activeToday = students.filter((s) => {
    if (!s.lastActiveDate) return false;
    const d = new Date(s.lastActiveDate);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }).length;

  const instrumentCounts: Record<string, number> = {};
  students.forEach((s) => {
    instrumentCounts[s.instrument] = (instrumentCounts[s.instrument] ?? 0) + 1;
  });

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatChip label="Avg Level" value={avgLevel.toFixed(1)} />
        <StatChip label="Active Today" value={String(activeToday)} />
        <StatChip label="Total Attempts" value={String(totalAttempts)} />
        <StatChip label="Enrolled" value={String(students.length)} />
      </div>

      <div className="card-panel">
        <div className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-4">
          Instrument Distribution
        </div>
        <div className="space-y-2">
          {Object.entries(instrumentCounts).sort(([,a],[,b]) => b-a).map(([inst, count]) => {
            const color = getInstrumentColor(inst as InstrumentId);
            const pct = (count / students.length) * 100;
            return (
              <div key={inst} className="flex items-center gap-3">
                <span className="text-academy-cream/60 text-xs w-24 truncate capitalize">{inst.replace('_',' ')}</span>
                <div className="flex-1 stat-bar">
                  <div className="stat-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <span className="text-academy-cream/40 text-xs w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-panel text-center py-4">
      <div className="text-academy-cream/40 text-xs mb-1">{label}</div>
      <div className="fantasy-title text-2xl text-academy-gold">{value}</div>
    </div>
  );
}

// ── Leaderboard Tab ───────────────────────────────────────────────────────────

function LeaderboardTab({ students }: { students: StudentRow[] }) {
  const sorted = [...students].sort((a, b) => b.level - a.level || b.weeklyXp - a.weeklyXp);

  return (
    <div className="space-y-2">
      {sorted.map((s, i) => {
        const color = getInstrumentColor(s.instrument);
        const rankColors = ['text-rating-superior', 'text-academy-cream/60', 'text-amber-600'];
        return (
          <div key={s.id} className="card-panel flex items-center gap-4 py-3">
            <div className={`w-8 text-center font-fantasy text-lg flex-shrink-0 ${rankColors[i] ?? 'text-academy-cream/40'}`}>
              {i + 1}
            </div>
            <div className="text-xl flex-shrink-0">{getEmoji(s.instrument)}</div>
            <div className="flex-1 min-w-0">
              <div className="text-academy-cream/90 text-sm truncate">{s.displayName}</div>
              <div className="text-academy-cream/40 text-xs">{INSTRUMENTS[s.instrument]?.className}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-fantasy text-sm" style={{ color }}>Lv.{s.level}</div>
              <div className="text-academy-cream/40 text-xs">{s.weeklyXp} XP/wk</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Create Classroom Modal ────────────────────────────────────────────────────

function CreateClassroomModal({ teacherId, onCreated, onClose }: {
  teacherId: string;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [period, setPeriod] = useState('');
  const [baseOnly, setBaseOnly] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function create() {
    if (!name.trim()) { setError('Class name is required.'); return; }
    setSaving(true);
    setError('');

    // Generate join code client-side (3 letters + 3 digits, e.g. HRM-47X)
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '0123456789';
    const rand = (chars: string, n: number) =>
      Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const codeData = `${rand(letters, 3)}-${rand(digits, 2)}${rand(letters, 1)}`;

    try {
      const { error: insertErr } = await supabase.from('classrooms').insert({
        teacher_id: teacherId,
        name: name.trim(),
        period: period.trim() || null,
        join_code: codeData,
        base_instruments_only: baseOnly,
      });

      if (insertErr) {
        const msg = `${insertErr.message}${insertErr.hint ? ' — ' + insertErr.hint : ''} (code: ${insertErr.code ?? 'none'})`;
        setError(msg);
        alert('Could not create classroom:\n\n' + msg);
        setSaving(false);
        return;
      }

      onCreated();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg);
      alert('Unexpected error creating classroom:\n\n' + msg);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-academy-dark border border-academy-gold/30 rounded-2xl p-6 mx-4">
        <h2 className="fantasy-title text-xl mb-5">Create Classroom</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-academy-gold/70 text-xs uppercase tracking-widest mb-2">
              Class Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Period 2 Band"
              className="w-full bg-black/40 border border-academy-gold/30 rounded-lg px-3 py-2 text-academy-cream focus:outline-none focus:border-academy-gold/70"
            />
          </div>
          <div>
            <label className="block text-academy-gold/70 text-xs uppercase tracking-widest mb-2">
              Period (optional)
            </label>
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. Fall 2025"
              className="w-full bg-black/40 border border-academy-gold/30 rounded-lg px-3 py-2 text-academy-cream focus:outline-none focus:border-academy-gold/70"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="baseOnly"
              checked={baseOnly}
              onChange={(e) => setBaseOnly(e.target.checked)}
              className="w-4 h-4 accent-academy-gold"
            />
            <label htmlFor="baseOnly" className="text-academy-cream/70 text-sm">
              Base six instruments only (flute, clarinet, sax, trumpet, trombone/euphonium, percussion)
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-3 bg-red-900/40 border border-red-500/60 rounded-lg px-4 py-3">
            <p className="text-red-300 text-sm font-semibold">Error: {error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={create} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-4">🏫</div>
      <h2 className="fantasy-title text-2xl mb-3">No Classrooms Yet</h2>
      <p className="text-academy-cream/60 text-sm mb-6">
        Create your first classroom to give students their join code.
      </p>
      <button onClick={onCreate} className="btn-primary">Create First Class</button>
    </div>
  );
}

function getEmoji(id: string): string {
  const map: Record<string, string> = {
    flute: '🪈', clarinet: '🎵', alto_sax: '🎷',
    trumpet: '🎺', trombone: '📯', euphonium: '🎶',
    percussion: '🥁', french_horn: '📯', tuba: '🎺',
    oboe: '🪘', bassoon: '🎵',
  };
  return map[id] ?? '🎵';
}

// ── Student Detail Modal with Rating Override ─────────────────────────────────

interface ChallengeResult {
  id: string;
  challengeId: string;
  challengeType: string;
  rating: Rating;
  score: number;
  xpAwarded: number;
  overrideRating: Rating | null;
  overrideNote: string | null;
  recordedAt: string;
}

function StudentDetailModal({ student, teacherId, onClose, onChanged }: {
  student: StudentRow;
  teacherId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [results, setResults] = useState<ChallengeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideTarget, setOverrideTarget] = useState<ChallengeResult | null>(null);
  const [bootCampConfirm, setBootCampConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const color = getInstrumentColor(student.instrument);
  const inst = INSTRUMENTS[student.instrument];

  async function advanceStudentZone() {
    if (student.currentZone >= 12) return;
    setBusy(true);
    const { error } = await supabase
      .from('characters')
      .update({ current_zone: student.currentZone + 1 })
      .eq('id', student.id);
    setBusy(false);
    if (error) { alert('Could not advance student: ' + error.message); return; }
    onChanged();
  }

  async function toggleSuspend() {
    setBusy(true);
    const { error } = await supabase
      .from('characters')
      .update({ suspended: !student.suspended })
      .eq('id', student.id);
    setBusy(false);
    if (error) { alert('Could not update student: ' + error.message); return; }
    onChanged();
  }

  async function removeStudent() {
    const ok = window.confirm(
      `Remove ${student.displayName} from this class?\n\nTheir character and all progress will be permanently deleted. They can rejoin with the class code to start over.`
    );
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', student.id);
    setBusy(false);
    if (error) { alert('Could not remove student: ' + error.message); return; }
    onChanged();
  }

  useEffect(() => {
    supabase
      .from('challenge_results')
      .select('*')
      .eq('character_id', student.id)
      .order('recorded_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setResults(data.map((d) => ({
            id: d.id,
            challengeId: d.challenge_id,
            challengeType: d.challenge_type,
            rating: (d.override_rating ?? d.rating) as Rating,
            score: d.score,
            xpAwarded: d.xp_awarded,
            overrideRating: d.override_rating as Rating | null,
            overrideNote: d.override_note,
            recordedAt: d.recorded_at,
          })));
        }
        setLoading(false);
      });
  }, [student.id]);

  async function confirmBootCampStep(stepId: string) {
    await supabase.from('boot_camp_progress').upsert({
      character_id: student.id,
      step_id: stepId,
      completed: true,
      completed_at: new Date().toISOString(),
    });
    setBootCampConfirm(true);
    setTimeout(() => setBootCampConfirm(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-academy-dark border border-academy-gold/30 rounded-t-2xl sm:rounded-2xl mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 p-4 flex items-center gap-3">
          <div
            className="rounded-lg overflow-hidden flex-shrink-0"
            style={{ border: `1px solid ${color}40` }}
          >
            <Avatar appearance={normalizeAppearance(student.appearance)} instrument={student.instrument} size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-fantasy text-base text-academy-cream truncate">{student.displayName}</div>
            <div className="text-academy-cream/40 text-xs">
              {inst?.className} · Lv.{student.level} · Zone {student.currentZone}
            </div>
          </div>
          <button onClick={onClose} className="text-academy-cream/40 hover:text-academy-cream/80 text-xl p-1">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {(['power', 'accuracy', 'technique', 'endurance'] as const).map((stat) => (
              <div key={stat} className="card-panel py-2 text-center">
                <div className="text-[10px] text-academy-cream/40 capitalize mb-1">{stat}</div>
                <div className="font-fantasy text-base" style={{ color }}>
                  {student[stat as keyof StudentRow] as number}
                </div>
              </div>
            ))}
          </div>

          {/* Quick info */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="card-panel py-2">
              <div className="text-[10px] text-academy-cream/40 mb-1">Streak</div>
              <div className="font-fantasy text-sm text-academy-gold">{student.practiceStreak}d</div>
            </div>
            <div className="card-panel py-2">
              <div className="text-[10px] text-academy-cream/40 mb-1">Attempts</div>
              <div className="font-fantasy text-sm text-academy-gold">{student.totalAttempts}</div>
            </div>
            <div className="card-panel py-2">
              <div className="text-[10px] text-academy-cream/40 mb-1">Boot Camp</div>
              <div className={`font-fantasy text-sm ${student.bootCampComplete ? 'text-rating-superior' : 'text-rating-fair'}`}>
                {student.bootCampComplete ? '✓ Done' : 'Pending'}
              </div>
            </div>
          </div>

          {/* Student management */}
          <div className="card-panel border-academy-gold/30">
            <div className="text-xs text-academy-gold/70 uppercase tracking-widest font-fantasy mb-3">Manage Student</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={advanceStudentZone}
                disabled={busy || student.currentZone >= 12}
                className="text-academy-cream/70 hover:text-academy-cream text-xs px-3 py-1.5 border border-academy-gold/20 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ↗ Advance to Zone {Math.min(student.currentZone + 1, 12)}
              </button>
              <button
                onClick={toggleSuspend}
                disabled={busy}
                className={`text-xs px-3 py-1.5 border rounded transition-colors disabled:opacity-40 ${
                  student.suspended
                    ? 'text-rating-superior border-rating-superior/30 hover:text-rating-superior'
                    : 'text-amber-400/80 border-amber-500/30 hover:text-amber-400'
                }`}
              >
                {student.suspended ? '▶ Reinstate' : '⏸ Suspend'}
              </button>
              <button
                onClick={removeStudent}
                disabled={busy}
                className="text-red-400/70 hover:text-red-400 text-xs px-3 py-1.5 border border-red-500/30 rounded transition-colors disabled:opacity-40"
              >
                🗑 Remove from Class
              </button>
            </div>
            {student.suspended && (
              <p className="text-amber-400/70 text-[11px] mt-2">This student is suspended and cannot play until reinstated.</p>
            )}
          </div>

          {/* Boot camp confirmation (if not complete) */}
          {!student.bootCampComplete && (
            <div className="card-panel border-academy-gold/30">
              <div className="text-xs text-academy-gold/70 uppercase tracking-widest font-fantasy mb-3">Confirm Boot Camp Steps</div>
              {['posture', 'assembly', 'hold'].map((step) => (
                <button
                  key={step}
                  onClick={() => confirmBootCampStep(step)}
                  className="w-full text-left py-2 px-3 mb-1 rounded-lg border border-academy-gold/20 hover:border-academy-gold/50 text-academy-cream/70 text-sm transition-all capitalize"
                >
                  ✓ Confirm: {step}
                </button>
              ))}
              {bootCampConfirm && (
                <div className="text-rating-superior text-xs text-center mt-2">Step confirmed!</div>
              )}
            </div>
          )}

          {/* Recent challenges + override */}
          <div>
            <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-3">Recent Challenges</div>
            {loading ? (
              <div className="text-academy-cream/40 text-sm text-center py-4">Loading…</div>
            ) : results.length === 0 ? (
              <div className="text-academy-cream/40 text-sm text-center py-4">No challenges yet.</div>
            ) : (
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.id} className="card-panel py-2 px-3 flex items-center gap-3">
                    <RatingChip rating={r.rating} />
                    <div className="flex-1 min-w-0">
                      <div className="text-academy-cream/80 text-xs truncate">{r.challengeId}</div>
                      <div className="text-academy-cream/40 text-[10px]">
                        {new Date(r.recordedAt).toLocaleDateString()} · {r.xpAwarded} XP
                      </div>
                      {r.overrideNote && (
                        <div className="text-academy-gold/60 text-[10px] italic mt-0.5">
                          Teacher: {r.overrideNote}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setOverrideTarget(r)}
                      className="text-academy-gold/50 hover:text-academy-gold text-xs px-2 py-1 border border-academy-gold/20 rounded flex-shrink-0 transition-colors"
                    >
                      Override
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {overrideTarget && (
        <RatingOverrideModal
          result={overrideTarget}
          teacherId={teacherId}
          onSaved={() => {
            setOverrideTarget(null);
            // Refresh results
            supabase
              .from('challenge_results')
              .select('*')
              .eq('character_id', student.id)
              .order('recorded_at', { ascending: false })
              .limit(20)
              .then(({ data }) => {
                if (data) setResults(data.map((d) => ({
                  id: d.id, challengeId: d.challenge_id, challengeType: d.challenge_type,
                  rating: (d.override_rating ?? d.rating) as Rating, score: d.score,
                  xpAwarded: d.xp_awarded, overrideRating: d.override_rating as Rating | null,
                  overrideNote: d.override_note, recordedAt: d.recorded_at,
                })));
              });
          }}
          onClose={() => setOverrideTarget(null)}
        />
      )}
    </div>
  );
}

function RatingOverrideModal({ result, teacherId, onSaved, onClose }: {
  result: ChallengeResult;
  teacherId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [newRating, setNewRating] = useState<Rating>(result.rating);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from('challenge_results')
      .update({
        override_rating: newRating,
        override_note: note.trim() || null,
        override_by: teacherId,
        override_at: new Date().toISOString(),
      })
      .eq('id', result.id);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-academy-dark border border-academy-gold/40 rounded-2xl p-5 mx-4">
        <h3 className="fantasy-title text-lg mb-1">Override Rating</h3>
        <p className="text-academy-cream/50 text-xs mb-4">{result.challengeId}</p>

        <div className="mb-4">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest mb-2">New Rating</div>
          <div className="grid grid-cols-5 gap-1">
            {(['superior', 'excellent', 'good', 'fair', 'poor'] as Rating[]).map((r) => (
              <button
                key={r}
                onClick={() => setNewRating(r)}
                className={`py-2 rounded-lg border text-xs font-fantasy capitalize transition-all
                  ${newRating === r ? 'border-academy-gold bg-academy-gold/20 text-academy-gold' : 'border-academy-gold/20 text-academy-cream/50 hover:border-academy-gold/50'}`}
              >
                {r.slice(0, 3).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest mb-2">Note (optional)</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Observed in class — significant improvement"
            rows={2}
            className="w-full bg-black/40 border border-academy-gold/30 rounded-lg px-3 py-2 text-academy-cream text-sm focus:outline-none focus:border-academy-gold/70 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1 text-sm py-2 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Override'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingChip({ rating }: { rating: Rating }) {
  const colors: Record<Rating, string> = {
    superior: '#FFD700', excellent: '#4ADE80',
    good: '#60A5FA', fair: '#FB923C', poor: '#F87171',
  };
  return (
    <span
      className="text-[10px] font-fantasy px-2 py-0.5 rounded flex-shrink-0"
      style={{ color: colors[rating], backgroundColor: `${colors[rating]}20` }}
    >
      {rating.toUpperCase().slice(0, 3)}
    </span>
  );
}
