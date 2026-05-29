import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { INSTRUMENTS, getInstrumentColor } from '../lib/instruments';
import type { InstrumentId } from '../types/game';

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
}

interface ClassroomData {
  id: string;
  name: string;
  period: string;
  joinCode: string;
  currentZone: number;
  baseInstrumentsOnly: boolean;
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
      })));
    }
  }

  async function selectClassroom(cls: ClassroomData) {
    setSelectedClassroom(cls);
    await loadStudents(cls.id);
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
          <span className="text-academy-cream/40 text-xs">{user?.displayName}</span>
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
            <div className="card-panel mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="fantasy-title text-lg">{selectedClassroom.name}</div>
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
                  <div className="text-academy-cream/40 text-xs mb-1">Zone</div>
                  <div className="font-fantasy text-xl text-academy-gold">{selectedClassroom.currentZone}</div>
                </div>
                <div className="text-center">
                  <div className="text-academy-cream/40 text-xs mb-1">Students</div>
                  <div className="font-fantasy text-xl text-academy-gold">{students.length}</div>
                </div>
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

            {activeTab === 'roster' && <RosterTab students={students} />}
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
    </div>
  );
}

// ── Roster Tab ────────────────────────────────────────────────────────────────

function RosterTab({ students }: { students: StudentRow[] }) {
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
          <div key={s.id} className="card-panel flex items-center gap-4 py-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: `${color}20`, borderColor: `${color}40`, border: '1px solid' }}
            >
              {getEmoji(s.instrument)}
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
            </div>
          </div>
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

    // Generate join code
    const { data: codeData, error: codeErr } = await supabase.rpc('generate_join_code');
    if (codeErr || !codeData) { setError('Failed to generate join code.'); setSaving(false); return; }

    const { error: insertErr } = await supabase.from('classrooms').insert({
      teacher_id: teacherId,
      name: name.trim(),
      period: period.trim() || null,
      join_code: codeData,
      base_instruments_only: baseOnly,
    });

    if (insertErr) { setError(insertErr.message); setSaving(false); return; }
    onCreated();
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
          <p className="mt-3 text-rating-poor text-sm">{error}</p>
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
