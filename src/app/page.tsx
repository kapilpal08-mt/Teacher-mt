"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────

interface Institute {
  id: number;
  name: string;
  location: string;
  mapsUrl: string;
}

interface Teacher {
  id: number;
  name: string;
  subject: string;
  instituteId: number;
  photoUrl: string;
  bio: string;
  experience: number;
  status: "active" | "inactive";
  abilityScore: number;
  instituteName: string;
  upVotes: number;
  downVotes: number;
}

interface VoteStats {
  totalVotes: number;
  recentActivity: VoteActivity[];
}

interface VoteActivity {
  id: number;
  teacherId: number;
  teacherName: string;
  instituteName: string;
  voteType: string;
  action: string;
  oldVoteType: string | null;
  loggedAt: string;
}

// ─── Tier System ──────────────────────────────────────────────

const TIERS = [
  { min: 30, label: "Grandmaster", emoji: "👑", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  { min: 20, label: "Master", emoji: "💎", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30" },
  { min: 15, label: "Expert", emoji: "⭐", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  { min: 10, label: "Skilled", emoji: "🔥", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  { min: 5, label: "Learner", emoji: "📘", color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/30" },
  { min: 1, label: "Beginner", emoji: "🌱", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
  { min: 0, label: "New", emoji: "🆕", color: "text-slate-500", bg: "bg-slate-500/5", border: "border-slate-500/15" },
];

function getTier(s: number) {
  for (const t of TIERS) if (s >= t.min) return t;
  return TIERS[TIERS.length - 1];
}

// ─── Fingerprint ──────────────────────────────────────────────

function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  const key = "milt_voter_id";
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const fp = "v_" + crypto.randomUUID();
  localStorage.setItem(key, fp);
  return fp;
}

// ─── SVG Icons ────────────────────────────────────────────────

const Icons = {
  trophy: <path strokeLinecap="round" strokeLinejoin="round" d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2m12 0h2a2 2 0 012 2v2a2 2 0 01-2 2h-2M8 21h8m-4-4V7" />,
  vote: <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />,
  settings: <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </>,
  clock: <>
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
  </>,
  sparkle: <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />,
  search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
  trash: <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </>,
  building: <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  mapPin: <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </>,
  user: <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </>,
  instagram: <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m.2 2A3.6 3.6 0 004.4 7.6v8.8C4.4 18.39 6.01 20 8 20h8a3.6 3.6 0 003.6-3.6V7.6C19.6 5.61 17.99 4 16 4H8zm9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z" />,
  arrowRight: <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />,
};

function SvgIcon({ d, className = "w-5 h-5", fill = "none" }: { d: React.ReactNode; className?: string; fill?: string }) {
  return (
    <svg className={className} fill={fill} stroke={fill === "none" ? "currentColor" : undefined} strokeWidth={fill === "none" ? "1.75" : undefined} viewBox="0 0 24 24">
      {d}
    </svg>
  );
}

// ─── Splash Screen ───────────────────────────────────────────

function SplashScreen({ onEnter, exiting }: { onEnter: () => void; exiting: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0a0e17] transition-all duration-700 ${exiting ? "opacity-0 scale-110 blur-sm" : "opacity-100 scale-100 blur-0"}`}>
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-500/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-400/6 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Top-right Instagram */}
      <div className={`absolute top-5 right-5 sm:top-8 sm:right-8 transition-all duration-1000 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
        <a
          href="https://instagram.com/kapilpal09"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-fuchsia-500/30 transition-all group"
        >
          <SvgIcon d={Icons.instagram} className="w-4 h-4 text-fuchsia-400" fill="currentColor" />
          <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">@kapilpal09</span>
        </a>
      </div>

      {/* Logo */}
      <div className={`relative transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-pulse-glow mx-auto">
          <span className="text-white font-black text-5xl sm:text-6xl tracking-tight" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
            M
          </span>
        </div>

        {/* MILT text */}
        <div className={`text-center mt-8 transition-all duration-1000 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tight leading-none">
            MILT
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-400 mt-3 tracking-wide">
            Markandey Institute of<br className="sm:hidden" /> Learning Technology
          </p>
        </div>

        {/* Developer credit */}
        <div className={`text-center mt-8 transition-all duration-1000 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm text-slate-500">
              Developer: <span className="text-slate-300 font-semibold">Janta Flat Branch Team</span>
            </span>
          </div>
        </div>

        {/* Enter button */}
        <div className={`text-center mt-10 transition-all duration-1000 delay-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <button
            onClick={onEnter}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-2xl transition-all text-lg shadow-xl shadow-white/10 hover:shadow-white/20 hover:scale-105 active:scale-95"
          >
            Enter Platform
            <SvgIcon d={Icons.arrowRight} className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Bottom hint */}
      <p className={`absolute bottom-8 text-xs text-slate-700 transition-all duration-1000 delay-1000 ${visible ? "opacity-100" : "opacity-0"}`}>
        Click to explore rankings &amp; vote for teachers
      </p>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────

function MainApp() {
  const [tab, setTab] = useState<"ranking" | "vote" | "locations" | "admin" | "activity">("ranking");
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [voteStats, setVoteStats] = useState<VoteStats | null>(null);
  const [filterInstitute, setFilterInstitute] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [adminAuth, setAdminAuth] = useState<boolean | null>(null); // null = checking, true/false = authed
  const [showLogin, setShowLogin] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  const fingerprint = useRef("");
  useEffect(() => { fingerprint.current = getFingerprint(); }, []);

  // Check admin auth on mount
  useEffect(() => {
    fetch("/api/auth/verify")
      .then((r) => r.json())
      .then((d) => setAdminAuth(d.authenticated))
      .catch(() => setAdminAuth(false));
  }, []);

  const handleLogin = async (password: string) => {
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const d = await r.json();
    if (r.ok) {
      setAdminAuth(true);
      setShowLogin(false);
      showToast("Logged in successfully!", true);
    } else {
      showToast(d.error || "Login failed", false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAdminAuth(false);
    showToast("Logged out", true);
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    const r = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const d = await r.json();
    if (r.ok) {
      setAdminAuth(false);
      setShowChangePwd(false);
      showToast(d.message, true);
    } else {
      showToast(d.error || "Failed", false);
    }
  };

  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchInstitutes = useCallback(async () => {
    const r = await fetch("/api/institutes");
    if (r.ok) setInstitutes(await r.json());
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    const url = filterInstitute ? `/api/teachers?instituteId=${filterInstitute}` : "/api/teachers";
    const r = await fetch(url);
    if (r.ok) setTeachers(await r.json());
    setLoading(false);
  }, [filterInstitute]);

  const fetchStats = useCallback(async () => {
    const r = await fetch("/api/vote/stats");
    if (r.ok) setVoteStats(await r.json());
  }, []);

  useEffect(() => { fetchInstitutes(); }, [fetchInstitutes]);
  useEffect(() => { fetchTeachers(); fetchStats(); }, [fetchTeachers, fetchStats]);

  const handleVote = async (teacherId: number, voteType: "up" | "down") => {
    try {
      const r = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, voterFingerprint: fingerprint.current, voteType }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(voteType === "up" ? "Upvoted! +10 pts" : "Downvoted! -10 pts", true);
        fetchTeachers(); fetchStats();
      } else {
        showToast(d.error || "Vote failed", false);
      }
    } catch { showToast("Network error", false); }
  };

  const handleAddTeacher = async (fd: FormData) => {
    const file = fd.get("photoFile") as File | null;
    let photoUrl = "";
    if (file && file.size > 0) {
      const uf = new FormData(); uf.append("file", file);
      const ur = await fetch("/api/upload", { method: "POST", body: uf });
      if (ur.ok) photoUrl = (await ur.json()).url;
    }
    const body = {
      name: fd.get("name"), subject: fd.get("subject"),
      instituteId: fd.get("instituteId"),
      photoUrl: photoUrl || "",
      bio: fd.get("bio") || "", experience: parseInt((fd.get("experience") as string) || "0"),
    };
    const r = await fetch("/api/teachers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return r.ok;
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm("Permanently delete this teacher and all their votes?")) return;
    await fetch(`/api/teachers/${id}`, { method: "DELETE" });
    fetchTeachers(); fetchStats();
  };

  const handleAddInstitute = async (name: string, location: string, mapsUrl: string) => {
    const r = await fetch("/api/institutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, location, mapsUrl }),
    });
    if (r.ok) fetchInstitutes();
    return r.ok;
  };

  const handleUpdateInstitute = async (id: number, name: string, location: string, mapsUrl: string) => {
    const r = await fetch(`/api/institutes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, location, mapsUrl }),
    });
    if (r.ok) fetchInstitutes();
    return r.ok;
  };

  const handleDeleteInstitute = async (id: number) => {
    if (!confirm("Delete this branch and ALL its teachers? This is irreversible.")) return;
    await fetch(`/api/institutes/${id}`, { method: "DELETE" });
    fetchInstitutes(); fetchTeachers();
  };

  const tabs = [
    { key: "ranking" as const, label: "Rankings", icon: Icons.trophy },
    { key: "vote" as const, label: "Vote", icon: Icons.vote },
    { key: "locations" as const, label: "Locations", icon: Icons.building },
    { key: "admin" as const, label: "Admin", icon: Icons.settings, requiresAuth: true },
    { key: "activity" as const, label: "Activity", icon: Icons.clock },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-200 flex flex-col">
      {/* ── Admin Login Modal ─────────────────────────────── */}
      {showLogin && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setShowLogin(false)}
        />
      )}

      {/* ── Change Password Modal ─────────────────────────── */}
      {showChangePwd && (
        <ChangePasswordModal
          onSubmit={handleChangePassword}
          onClose={() => setShowChangePwd(false)}
        />
      )}

      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-2xl backdrop-blur-xl border text-sm font-semibold animate-slide-up ${
          toast.ok ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300" : "bg-red-500/20 border-red-400/40 text-red-300"
        }`}>
          {toast.text}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 glass">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between py-4 gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 flex-shrink-0">
                <span className="text-white font-black text-lg sm:text-xl">M</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
                  Markandey Institute of Learning Technology
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  11 Branches
                </p>
              </div>
            </div>

            {/* Stats pill */}
            <div className="flex-shrink-0 glass-light rounded-2xl px-4 py-2.5 border border-slate-700/50 flex items-center gap-3">
              <div>
                <div className="text-xl sm:text-2xl font-black text-white tabular-nums leading-none">
                  {voteStats?.totalVotes ?? 0}
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-widest font-bold">Votes</div>
              </div>
              <SvgIcon d={Icons.sparkle} className="w-4 h-4 text-indigo-400" />
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  if (t.requiresAuth && !adminAuth) {
                    setShowLogin(true);
                    return;
                  }
                  setTab(t.key);
                }}
                className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                  tab === t.key
                    ? "bg-[#0a0e17] text-white border-t border-x border-slate-800"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                }`}
              >
                <SvgIcon d={t.icon} className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-8 py-8">
        {/* Branch filter */}
        {(tab === "ranking" || tab === "vote") && institutes.length > 0 && (
          <div className="mb-8">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-3">Filter by Branch</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterInstitute("")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  filterInstitute === "" ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300" : "bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                }`}
              >
                All Branches
              </button>
              {institutes.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setFilterInstitute(String(inst.id))}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    filterInstitute === String(inst.id) ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300" : "bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {inst.name.replace("MILT ", "")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {tab === "ranking" && <RankingTab teachers={teachers} loading={loading} />}
        {tab === "vote" && <VoteTab teachers={teachers} loading={loading} onVote={handleVote} />}
        {tab === "admin" && adminAuth && (
          <AdminTab
            teachers={teachers} institutes={institutes}
            onAddTeacher={handleAddTeacher} onDeleteTeacher={handleDeleteTeacher}
            onAddInstitute={handleAddInstitute} onUpdateInstitute={handleUpdateInstitute}
            onDeleteInstitute={handleDeleteInstitute}
            onRefresh={fetchTeachers}
            onLogout={handleLogout}
            onChangePassword={() => setShowChangePwd(true)}
          />
        )}
        {tab === "locations" && <LocationsTab institutes={institutes} />}
        {tab === "activity" && <ActivityTab stats={voteStats} />}
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-slate-600">
              Votes are permanently recorded &bull; Rankings update in real-time
            </p>
            <p className="text-[10px] text-slate-700 mt-1">
              Developer: Janta Flat Branch Team
            </p>
            <button
              onClick={() => setTab("locations")}
              className="text-[10px] text-indigo-500 hover:text-indigo-400 mt-1 transition-colors"
            >
              📍 View All Branch Locations
            </button>
          </div>
          {/* Instagram Contact */}
          <a
            href="https://instagram.com/kapilpal09"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-500/10 to-orange-500/10 border border-fuchsia-500/20 hover:border-fuchsia-400/40 transition-all group hover:scale-105"
          >
            <SvgIcon d={Icons.instagram} className="w-5 h-5 text-fuchsia-400" fill="currentColor" />
            <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
              @kapilpal09
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
}

// ─── Exported Page ──────────────────────────────────────────

export default function Page() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Always show splash on page load
    setShowSplash(true);
    setFadeOut(false);
  }, []);

  const handleEnter = () => {
    setFadeOut(true);
    setTimeout(() => setShowSplash(false), 700);
  };

  // Also allow Enter key to dismiss splash
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") handleEnter(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (showSplash) {
    return <SplashScreen onEnter={handleEnter} exiting={fadeOut} />;
  }

  return <MainApp />;
}

// ─── RANKING TAB ────────────────────────────────────────────

function RankingTab({ teachers, loading }: { teachers: Teacher[]; loading: boolean }) {
  if (loading) return <Spinner />;
  const active = teachers.filter((t) => t.status === "active");
  if (active.length === 0) return <Empty icon="🏆" title="No Teachers Yet" desc="Add teachers from the Admin panel to build the leaderboard." />;

  const top3 = active.slice(0, 3);
  const rest = active.slice(3);

  return (
    <div>
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-14 items-end">
          <PodiumCard t={top3[1]} rank={2} />
          <PodiumCard t={top3[0]} rank={1} />
          <PodiumCard t={top3[2]} rank={3} />
        </div>
      )}

      {top3.length > 0 && top3.length < 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {top3.map((t, i) => <RowCard key={t.id} t={t} rank={i + 1} />)}
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-4 px-1">
            Full Rankings &middot; {active.length} Teachers
          </p>
          {rest.map((t, i) => <RowCard key={t.id} t={t} rank={i + 4} compact />)}
        </div>
      )}
    </div>
  );
}

function PodiumCard({ t, rank }: { t: Teacher; rank: number }) {
  const tier = getTier(t.abilityScore);
  const h = rank === 1 ? "h-48 sm:h-56" : rank === 2 ? "h-48 sm:h-56" : "h-48 sm:h-56";
  const grad = rank === 1 ? "from-amber-500/15 to-amber-500/5" : rank === 2 ? "from-slate-500/10 to-slate-500/2" : "from-orange-600/10 to-orange-600/2";
  const borderColor = rank === 1 ? "border-amber-500/40" : rank === 2 ? "border-slate-400/25" : "border-orange-600/25";
  const medals = ["", "🥇", "🥈", "🥉"];

  return (
    <div className="flex flex-col items-center group">
      <div className="text-3xl sm:text-4xl mb-3">{medals[rank]}</div>
      <div className={`w-full ${h} rounded-2xl bg-gradient-to-b ${grad} border ${borderColor} glass p-3 sm:p-5 flex flex-col items-center justify-end text-center`}>
        {/* FIX: Yahan se ternary condition hata kar sabke liye w-16 h-16 sm:w-20 sm:h-20 kar diya hai */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden -mb-3 shadow-xl">
          {t.photoUrl ? <img src={t.photoUrl} alt="" className="w-full h-full object-cover" /> :
            <div className="w-full h-full flex items-center justify-center text-2xl text-slate-600"><SvgIcon d={Icons.user} className="w-8 h-8" /></div>}
        </div>
        <p className="font-bold text-white text-xs sm:text-sm mt-5 truncate max-w-full px-1">{t.name}</p>
        <p className="text-[10px] sm:text-xs text-slate-500">{t.subject}</p>
        <p className={`text-xl sm:text-2xl font-black mt-1 ${tier.color}`}>{t.abilityScore}</p>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${tier.bg} ${tier.color} mt-1`}>{tier.emoji} {tier.label}</span>
      </div>
      <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase tracking-widest">
        {rank === 1 ? "1st Place" : rank === 2 ? "2nd Place" : "3rd Place"}
      </p>
    </div>
  );
}

function RowCard({ t, rank, compact }: { t: Teacher; rank: number; compact?: boolean }) {
  const tier = getTier(t.abilityScore);
  const rankBg = rank === 1 ? "bg-amber-400/15 text-amber-400" : rank === 2 ? "bg-slate-400/10 text-slate-400" : rank === 3 ? "bg-orange-500/15 text-orange-400" : "bg-slate-800 text-slate-600";

  return (
    <div className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-300 ${
      rank <= 3 ? "bg-slate-900/60 border-slate-700/60 hover:border-slate-600" : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700/60"
    } ${rank === 1 ? "ring-1 ring-amber-500/20" : ""}`}>
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${rankBg}`}>
        {rank}
      </div>
      <div className={`${compact ? "w-9 h-9" : "w-10 h-10 sm:w-11 sm:h-11"} rounded-xl bg-slate-800 border border-slate-700/50 overflow-hidden flex-shrink-0`}>
        {t.photoUrl ? <img src={t.photoUrl} alt="" className="w-full h-full object-cover" /> :
          <div className="w-full h-full flex items-center justify-center text-slate-600"><SvgIcon d={Icons.user} className="w-5 h-5" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm truncate">{t.name}</p>
        <p className="text-xs text-slate-500 truncate">{t.subject} &middot; {t.instituteName.replace("MILT ", "")}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`font-black text-lg tabular-nums ${tier.color}`}>{t.abilityScore}</p>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${tier.bg} ${tier.color}`}>{tier.label}</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-xs flex-shrink-0">
        <span className="text-emerald-400 font-semibold tabular-nums">+{t.upVotes}</span>
        <span className="text-slate-700">/</span>
        <span className="text-red-400 font-semibold tabular-nums">-{t.downVotes}</span>
      </div>
    </div>
  );
}

// ─── VOTE TAB ───────────────────────────────────────────────

function VoteTab({ teachers, loading, onVote }: { teachers: Teacher[]; loading: boolean; onVote: (id: number, t: "up" | "down") => void }) {
  const [search, setSearch] = useState("");
  if (loading) return <Spinner />;

  const active = teachers.filter((t) => t.status === "active");
  const filtered = search ? active.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase())) : active;
  if (active.length === 0) return <Empty icon="🗳️" title="No Teachers to Vote" desc="Add teachers from the Admin panel first." />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Cast Your Vote</h2>
          <p className="text-sm text-slate-500 mt-1">Your vote directly impacts the ability score ranking.</p>
        </div>
        <div className="relative w-full sm:w-60">
          <SvgIcon d={Icons.search} className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text" placeholder="Search..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
        </div>
      </div>

      {filtered.length === 0 && <Empty icon="🔍" title="No Results" desc="Try a different search term." />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filtered.map((t) => (
          <VoteCard key={t.id} t={t} onVote={onVote} />
        ))}
      </div>
    </div>
  );
}

function VoteCard({ t, onVote }: { t: Teacher; onVote: (id: number, vt: "up" | "down") => void }) {
  const tier = getTier(t.abilityScore);
  return (
    <div className={`rounded-2xl border ${tier.border} bg-slate-900/50 glass p-5 sm:p-6 flex flex-col items-center text-center hover:scale-[1.01] transition-all duration-300 group`}>
      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-slate-800 border-2 ${tier.border} shadow-xl mb-4`}>
        {t.photoUrl ? <img src={t.photoUrl} alt="" className="w-full h-full object-cover" /> :
          <div className="w-full h-full flex items-center justify-center text-slate-600"><SvgIcon d={Icons.user} className="w-10 h-10" /></div>}
      </div>
      <h3 className="font-bold text-white">{t.name}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{t.subject}</p>
      <p className="text-[11px] text-indigo-400/70 font-semibold mt-1.5">{t.instituteName.replace("MILT ", "")}</p>
      <div className="mt-3 mb-1">
        <span className={`text-2xl sm:text-3xl font-black ${tier.color}`}>{t.abilityScore}</span>
        <span className="text-[10px] text-slate-600 ml-1">pts</span>
      </div>
      <span className={`text-[10px] px-3 py-1 rounded-full font-semibold ${tier.bg} ${tier.color} mb-4`}>{tier.emoji} {tier.label}</span>
      <div className="flex gap-3 text-xs mb-5">
        <span className="text-emerald-400 font-bold">👍 {t.upVotes}</span>
        <span className="text-red-400 font-bold">👎 {t.downVotes}</span>
      </div>
      <div className="flex gap-3 w-full mt-auto">
        <button onClick={() => onVote(t.id, "up")} className="flex-1 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold rounded-xl transition-all text-sm border border-emerald-500/20 hover:border-emerald-400/40 active:scale-95">
          👍 Upvote
        </button>
        <button onClick={() => onVote(t.id, "down")} className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition-all text-sm border border-red-500/15 hover:border-red-400/30 active:scale-95">
          👎 Downvote
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN TAB ──────────────────────────────────────────────

function AdminTab({
  teachers, institutes, onAddTeacher, onDeleteTeacher, onAddInstitute, onUpdateInstitute, onDeleteInstitute, onRefresh, onLogout, onChangePassword,
}: {
  teachers: Teacher[]; institutes: Institute[];
  onAddTeacher: (fd: FormData) => Promise<boolean>;
  onDeleteTeacher: (id: number) => void;
  onAddInstitute: (n: string, l: string, m: string) => Promise<boolean>;
  onUpdateInstitute: (id: number, n: string, l: string, m: string) => Promise<boolean>;
  onDeleteInstitute: (id: number) => void;
  onRefresh: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
}) {
  const [editInstitute, setEditInstitute] = useState<Institute | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMapsUrl, setEditMapsUrl] = useState("");
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showInstituteForm, setShowInstituteForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const flash = (t: string, ok: boolean) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 3000); };

  const submitTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ok = await onAddTeacher(new FormData(e.currentTarget));
    if (ok) { flash("Teacher added successfully!", true); setShowTeacherForm(false); setPreviewUrl(""); e.currentTarget.reset(); }
    else flash("Failed to add teacher.", false);
  };

  const submitInstitute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = await onAddInstitute(fd.get("name") as string, fd.get("location") as string, fd.get("mapsUrl") as string);
    if (ok) { flash("Branch added!", true); setShowInstituteForm(false); e.currentTarget.reset(); }
    else flash("Failed to add branch.", false);
  };

  return (
    <div>
      {msg && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-2xl backdrop-blur-xl border text-sm font-semibold animate-slide-up ${
          msg.ok ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300" : "bg-red-500/20 border-red-400/40 text-red-300"
        }`}>{msg.t}</div>
      )}

      <div className="flex flex-wrap gap-3 mb-10">
        <button onClick={() => { setShowTeacherForm(!showTeacherForm); setShowInstituteForm(false); setPreviewUrl(""); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all text-sm shadow-lg shadow-indigo-500/20">
          <SvgIcon d={Icons.plus} className="w-4 h-4" /> Add Teacher
        </button>
        <button onClick={() => { setShowInstituteForm(!showInstituteForm); setShowTeacherForm(false); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl transition-all text-sm border border-slate-700">
          <SvgIcon d={Icons.building} className="w-4 h-4" /> Add Branch
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={onChangePassword}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold rounded-2xl transition-all text-xs border border-slate-700">
            🔒 Change Password
          </button>
          <button onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-2xl transition-all text-xs border border-red-500/20">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Teacher Form */}
      {showTeacherForm && (
        <form onSubmit={submitTeacher} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-10 glass">
          <h3 className="text-lg font-bold text-white mb-6">New Teacher</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input name="name" label="Full Name" required placeholder="Enter full name" />
            <Input name="subject" label="Subject" required placeholder="e.g. Computer Science" />
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Branch *</label>
              <select name="instituteId" required className="w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                <option value="">Select Branch</option>
                {institutes.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <Input name="experience" label="Experience (years)" type="number" placeholder="e.g. 5" />
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Photo</label>
              <input name="photoFile" type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreviewUrl(URL.createObjectURL(f)); }}
                className="w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-2.5 text-sm text-white file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 transition-all" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Bio</label>
              <textarea name="bio" rows={3} className="w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none" placeholder="Brief description..." />
            </div>
          </div>
          {previewUrl && (
            <div className="mt-5 flex items-center gap-3">
              <img src={previewUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700" />
              <span className="text-xs text-slate-500">Preview</span>
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all text-sm shadow-lg shadow-indigo-500/20">Save Teacher</button>
            <button type="button" onClick={() => { setShowTeacherForm(false); setPreviewUrl(""); }} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold rounded-2xl transition-all text-sm border border-slate-700">Cancel</button>
          </div>
        </form>
      )}

      {/* Edit Institute Modal */}
      {editInstitute && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditInstitute(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-5">Edit Branch</h3>
            <div className="space-y-4">
              <Input name="editName" label="Branch Name" required placeholder="Branch name"
                value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Input name="editLocation" label="Location / Address" placeholder="e.g. Shahdara, Delhi"
                value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Google Maps Link</label>
                <input
                  type="url"
                  placeholder="Paste Google Maps link..."
                  value={editMapsUrl}
                  onChange={(e) => setEditMapsUrl(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
                <p className="text-[10px] text-slate-600 mt-1.5">
                  Go to Google Maps → search location → Share → Copy link → Paste here
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={async () => {
                  if (!editName.trim()) { flash("Name is required", false); return; }
                  const ok = await onUpdateInstitute(editInstitute.id, editName, editLocation, editMapsUrl);
                  if (ok) { flash("Branch updated!", true); setEditInstitute(null); }
                  else flash("Failed to update", false);
                }}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all text-sm"
              >
                Save Changes
              </button>
              <button onClick={() => setEditInstitute(null)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold rounded-2xl transition-all text-sm border border-slate-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Institute Form */}
      {showInstituteForm && (
        <form onSubmit={submitInstitute} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-10 glass">
          <h3 className="text-lg font-bold text-white mb-6">New Branch</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input name="name" label="Branch Name" required placeholder="e.g. MILT Shahdara" />
            <Input name="location" label="Location / Address" placeholder="e.g. Shahdara, Delhi" />
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Google Maps Link (optional)</label>
              <input name="mapsUrl" type="url" placeholder="Paste Google Maps link here..."
                className="w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all" />
              <p className="text-[10px] text-slate-600 mt-1.5">Add later from branch list below as well</p>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all text-sm">Save Branch</button>
            <button type="button" onClick={() => setShowInstituteForm(false)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold rounded-2xl transition-all text-sm border border-slate-700">Cancel</button>
          </div>
        </form>
      )}

      {/* Branches */}
      <section className="mb-10">
        <h3 className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-4">Branches ({institutes.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {institutes.map((i) => (
            <div key={i.id} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl px-4 py-3.5 hover:border-slate-700/60 transition-all">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm truncate">{i.name}</p>
                  {i.location && <p className="text-xs text-slate-600 mt-0.5 truncate">📍 {i.location}</p>}
                  {i.mapsUrl ? (
                    <p className="text-[10px] text-emerald-500 mt-1">✅ Maps link added</p>
                  ) : (
                    <p className="text-[10px] text-amber-500/70 mt-1">⚠️ No maps link yet</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => {
                      setEditInstitute(i);
                      setEditName(i.name);
                      setEditLocation(i.location);
                      setEditMapsUrl(i.mapsUrl || "");
                    }}
                    className="text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 px-2.5 py-1.5 rounded-xl transition-all text-xs font-semibold border border-slate-700/50 hover:border-indigo-500/30"
                  >
                    ✏️ Edit
                  </button>
                  <button onClick={() => onDeleteInstitute(i.id)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all">
                    <SvgIcon d={Icons.trash} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Teachers */}
      <section>
        <h3 className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-4">Manage Teachers ({teachers.length})</h3>
        <div className="space-y-2">
          {teachers.map((t) => (
            <div key={t.id} className="flex items-center gap-3 sm:gap-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl px-4 py-3 hover:border-slate-700/60 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/50 overflow-hidden flex-shrink-0">
                {t.photoUrl ? <img src={t.photoUrl} alt="" className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center text-slate-600"><SvgIcon d={Icons.user} className="w-4 h-4" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{t.name}</p>
                <p className="text-xs text-slate-600 truncate">{t.subject} &middot; {t.instituteName.replace("MILT ", "")}</p>
              </div>
              <span className="font-bold text-sm text-slate-400 tabular-nums">{t.abilityScore}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${t.status === "active" ? "bg-emerald-400/10 text-emerald-400" : "bg-slate-800 text-slate-600"}`}>{t.status}</span>
              <button onClick={() => onDeleteTeacher(t.id)} className="text-slate-700 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex-shrink-0">
                <SvgIcon d={Icons.trash} className="w-4 h-4" />
              </button>
            </div>
          ))}
          {teachers.length === 0 && <Empty icon="👨‍🏫" title="No Teachers Yet" desc="Add your first teacher using the button above." />}
        </div>
      </section>
    </div>
  );
}

function Input({ name, label, required, type = "text", placeholder, value, onChange }: {
  name: string; label: string; required?: boolean; type?: string; placeholder?: string;
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}{required ? " *" : ""}</label>
      <input name={name} required={required} type={type} placeholder={placeholder}
        value={value} onChange={onChange}
        className="w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all" />
    </div>
  );
}

// ─── ACTIVITY TAB ───────────────────────────────────────────

function ActivityTab({ stats }: { stats: VoteStats | null }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Activity Log</h2>
      <p className="text-sm text-slate-500 mb-8">Complete audit trail of every vote. Permanently recorded.</p>

      <div className="mb-8 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-6 sm:p-8">
        <p className="text-xs text-indigo-400/70 font-bold uppercase tracking-widest">Total Votes Cast</p>
        <p className="text-5xl sm:text-6xl font-black text-white mt-1 tabular-nums">{stats?.totalVotes ?? 0}</p>
      </div>

      <div className="space-y-1.5">
        {stats?.recentActivity.map((a) => (
          <div key={a.id} className="flex items-center gap-3 sm:gap-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl px-4 py-3 text-sm hover:border-slate-700/60 transition-all">
            <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap flex-shrink-0">
              {new Date(a.loggedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="font-semibold text-white truncate">{a.teacherName || `#${a.teacherId}`}</span>
            <span className="text-xs text-slate-600 truncate hidden sm:inline">{a.instituteName?.replace("MILT ", "") || "—"}</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
              a.action === "cast" ? "bg-blue-400/10 text-blue-400" : a.action === "change" ? "bg-amber-400/10 text-amber-400" : "bg-slate-800 text-slate-500"
            }`}>
              {a.action === "cast" ? "NEW" : a.action === "change" ? "CHANGED" : a.action.toUpperCase()}
            </span>
            <span className={`font-bold text-xs ml-auto flex-shrink-0 ${a.voteType === "up" ? "text-emerald-400" : "text-red-400"}`}>
              {a.voteType === "up" ? "👍 Up" : "👎 Down"}
            </span>
          </div>
        ))}
        {(!stats || stats.recentActivity.length === 0) && <Empty icon="📋" title="No Activity Yet" desc="Votes will appear here once voting begins." />}
      </div>
    </div>
  );
}

// ─── Shared ─────────────────────────────────────────────────

// ─── LOCATIONS TAB ──────────────────────────────────────────

function LocationsTab({ institutes }: { institutes: Institute[] }) {

  const openInMaps = (inst: Institute) => {
    if (inst.mapsUrl) {
      // Use the admin-provided Google Maps link
      window.open(inst.mapsUrl, "_blank");
    } else if (inst.location) {
      // Fallback: search on Google Maps by location text
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(inst.location)}`, "_blank");
    } else {
      // Fallback: search by branch name
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(inst.name)}`, "_blank");
    }
  };

  if (institutes.length === 0) {
    return <Empty icon="📍" title="No Branches Found" desc="Add branches from the Admin panel." />;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Our Branches</h2>
      <p className="text-sm text-slate-500 mb-8">Click on any branch to view its location on Google Maps.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {institutes.map((inst, idx) => (
          <button
            key={inst.id}
            onClick={() => openInMaps(inst)}
            className="group text-left bg-slate-900/50 border border-slate-800/60 hover:border-indigo-500/40 rounded-2xl p-5 sm:p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10"
          >
            {/* Number badge */}
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all">
                <SvgIcon d={Icons.mapPin} className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            <h3 className="font-bold text-white text-base mb-1">{inst.name}</h3>
            {inst.location && <p className="text-sm text-slate-500">📍 {inst.location}</p>}

            {/* Maps status */}
            {inst.mapsUrl ? (
              <p className="text-[11px] text-emerald-500 mt-1.5 font-medium">✅ Google Maps link set — Click to view</p>
            ) : (
              <p className="text-[11px] text-amber-500/70 mt-1.5">⚠️ No maps link — Add from Admin panel</p>
            )}


          </button>
        ))}
      </div>

      {/* All branches map overview */}
      <div className="mt-10 bg-slate-900/50 border border-slate-800/60 rounded-3xl p-6 sm:p-8 text-center">
        <div className="text-4xl mb-4">🗺️</div>
        <h3 className="text-lg font-bold text-white mb-2">View All Branches Together</h3>
        <p className="text-sm text-slate-500 mb-5">See all 11 MILT branches marked on one map.</p>
        <button
          onClick={() => {
            window.open(`https://www.google.com/maps/search/MILT+Institute+Delhi`, "_blank");
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all text-sm shadow-lg shadow-indigo-500/20"
        >
          <SvgIcon d={Icons.mapPin} className="w-4 h-4" />
          Open All Branches Map
        </button>
      </div>
    </div>
  );
}

// ─── Spinner ───────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24 gap-3">
      <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
      <span className="text-sm text-slate-600">Loading...</span>
    </div>
  );
}

function Empty({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-5 opacity-60">{icon}</div>
      <p className="text-lg font-semibold text-slate-500">{title}</p>
      <p className="text-sm text-slate-700 mt-1.5 max-w-sm">{desc}</p>
    </div>
  );
}

// ─── Login Modal ──────────────────────────────────────────

function LoginModal({ onLogin, onClose }: { onLogin: (pwd: string) => void; onClose: () => void }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd) { setError("Please enter password"); return; }
    setSubmitting(true);
    setError("");
    await onLogin(pwd);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <span className="text-white font-black text-xl">M</span>
          </div>
          <h3 className="text-xl font-bold text-white">Admin Login</h3>
          <p className="text-sm text-slate-500 mt-1">Enter password to access admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Enter password"
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError(""); }}
              autoFocus
              className="w-full bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 text-center"
            />
            {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all text-sm shadow-lg shadow-indigo-500/20"
          >
            {submitting ? "Verifying..." : "Login"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────

function ChangePasswordModal({ onSubmit, onClose }: { onSubmit: (current: string, newPwd: string) => void; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !newPwd || !confirm) { setError("All fields are required"); return; }
    if (newPwd.length < 6) { setError("New password must be at least 6 characters"); return; }
    if (newPwd !== confirm) { setError("Passwords do not match"); return; }
    setSubmitting(true);
    setError("");
    await onSubmit(current, newPwd);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔒</div>
          <h3 className="text-xl font-bold text-white">Change Password</h3>
          <p className="text-sm text-slate-500 mt-1">Update your admin password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password" placeholder="Current password"
            value={current} onChange={(e) => { setCurrent(e.target.value); setError(""); }}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
          <input
            type="password" placeholder="New password (min 6 chars)"
            value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setError(""); }}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
          <input
            type="password" placeholder="Confirm new password"
            value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit" disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all text-sm shadow-lg shadow-indigo-500/20"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
          <button
            type="button" onClick={onClose}
            className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
