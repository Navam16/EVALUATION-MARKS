import { useState, useCallback, useRef } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Upload, Mic, FileText, ChevronDown, ChevronUp, BookOpen,
  TrendingUp, Users, Zap, AlertCircle, CheckCircle2, Target,
  MessageSquare, Volume2, Brain, Star, Award
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

// ── Constants ─────────────────────────────────────────────────────────────────
const TEXT_FACTORS = [
  { key: "relevance",        label: "Relevance",       color: "#22d3ee", icon: "📌" },
  { key: "knowledgeability", label: "Knowledge",       color: "#fbbf24", icon: "🧠" },
  { key: "engagement",       label: "Engagement",      color: "#10b981", icon: "🙋" },
  { key: "critical_thinking",label: "Critical Think",  color: "#a78bfa", icon: "💡" },
  { key: "communication",    label: "Communication",   color: "#fb923c", icon: "🗣️" },
];

const AUDIO_FACTORS = [
  ...TEXT_FACTORS,
  { key: "fluency",          label: "Fluency",         color: "#f472b6", icon: "🎙️" },
  { key: "confidence",       label: "Confidence",      color: "#34d399", icon: "💪" },
  { key: "vocabulary_depth", label: "Vocabulary",      color: "#60a5fa", icon: "📚" },
];

const GRADE_COLORS = { A:"#10b981", "B+":"#22d3ee", B:"#fbbf24", "C+":"#fb923c", C:"#f87171", D:"#ef4444" };

// ── Shared UI ─────────────────────────────────────────────────────────────────
const Card = ({ children, className = "", style = {} }) => (
  <div style={{
    background: "linear-gradient(135deg, #0c1830, #0f1e3a)",
    border: "1.5px solid #1a2f55",
    borderRadius: 14,
    padding: "1.4rem",
    ...style
  }} className={className}>{children}</div>
);

const Tag = ({ children, color = "#22d3ee" }) => (
  <span style={{
    display: "inline-block", padding: "3px 14px", borderRadius: 99,
    background: `${color}18`, border: `1px solid ${color}40`,
    color, fontSize: 12, fontWeight: 600, margin: "3px 4px",
    fontFamily: "var(--font-mono)", letterSpacing: "0.04em"
  }}>{children}</span>
);

const ScoreBadge = ({ label, score, color, icon }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    background: `${color}12`, border: `1px solid ${color}30`,
    borderRadius: 10, padding: "8px 14px", margin: "4px 0"
  }}>
    <span style={{ fontSize: 16 }}>{icon}</span>
    <span style={{ color: "#94a3b8", fontSize: 12, flex: 1, fontWeight: 600 }}>{label}</span>
    <span style={{ color, fontWeight: 800, fontSize: 16, fontFamily: "var(--font-mono)" }}>{score}<span style={{ color: "#334155", fontSize: 11 }}>/10</span></span>
  </div>
);

const Spinner = () => (
  <div style={{
    width: 32, height: 32, border: "3px solid #1a2f55",
    borderTopColor: "#22d3ee", borderRadius: "50%",
    animation: "spin 0.7s linear infinite", display: "inline-block"
  }} />
);

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ accept, label, hint, icon: Icon, onFile, file }) {
  const [hover, setHover] = useState(false);
  const ref = useRef();

  const handle = (e) => {
    e.preventDefault(); setHover(false);
    const f = e.dataTransfer?.files[0] || e.target.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={handle}
      style={{
        border: `2px dashed ${hover ? "#22d3ee" : file ? "#10b981" : "#1a2f55"}`,
        borderRadius: 14, padding: "2.2rem 1.5rem", textAlign: "center",
        cursor: "pointer", transition: "all 0.2s",
        background: hover ? "rgba(34,211,238,0.05)" : file ? "rgba(16,185,129,0.05)" : "rgba(12,24,48,0.6)",
        boxShadow: hover ? "0 0 24px rgba(34,211,238,0.15)" : "none",
      }}
    >
      <input ref={ref} type="file" accept={accept} onChange={handle} style={{ display: "none" }} />
      {file ? (
        <>
          <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: 10 }} />
          <div style={{ color: "#10b981", fontWeight: 700, fontSize: 15 }}>{file.name}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            {(file.size / 1024).toFixed(1)} KB · Click to change
          </div>
        </>
      ) : (
        <>
          <Icon size={32} color="#334155" style={{ marginBottom: 10 }} />
          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: 15 }}>{label}</div>
          <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>{hint}</div>
        </>
      )}
    </div>
  );
}

// ── Radar chart wrapper ───────────────────────────────────────────────────────
function RadarViz({ scores, factors }) {
  const data = factors.map(f => ({ factor: f.label, score: scores[f.key] ?? 0, fullMark: 10 }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#1a2f55" />
        <PolarAngleAxis dataKey="factor" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Syne" }} />
        <PolarRadiusAxis angle={90} domain={[0,10]} tick={{ fill: "#475569", fontSize: 9 }} />
        <Radar name="Score" dataKey="score" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.18} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Bar chart wrapper ─────────────────────────────────────────────────────────
function ClassBarChart({ students, selected }) {
  const data = students.map(s => ({
    name: s.name.split(" ")[0],
    avg: +(Object.values(s.scores).reduce((a,b)=>a+b,0) / Object.keys(s.scores).length).toFixed(1),
    full: s.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="30%">
        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0,10]} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#0c1830", border: "1px solid #1a2f55", borderRadius: 10, color: "#f1f5f9" }}
          formatter={(v, _, p) => [v + "/10", p.payload.full]}
        />
        <Bar dataKey="avg" radius={[6,6,0,0]}>
          {data.map((d,i) => (
            <Cell key={i} fill={d.full === selected ? "#22d3ee" : "#1a2f55"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Professor Dashboard ───────────────────────────────────────────────────────
function ProfDashboard({ data }) {
  const { professor_dashboard: pd, student_evaluations: se } = data;
  const [openQ, setOpenQ] = useState(null);

  const tableRows = (se||[]).map(s => {
    const sc = s.scores || {};
    const avg = Object.values(sc).length
      ? +(Object.values(sc).reduce((a,b)=>a+b,0)/Object.values(sc).length).toFixed(1)
      : 0;
    return { name: s.name, ...sc, avg };
  }).sort((a,b) => b.avg - a.avg);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="fade-up">
        <Card>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <BookOpen size={20} color="#22d3ee" style={{ marginTop:2, flexShrink:0 }} />
            <div>
              <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Class Understanding</div>
              <div style={{ color:"#f1f5f9", lineHeight:1.7, fontSize:14 }}>{pd.overall_class_understanding}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <TrendingUp size={20} color="#fbbf24" style={{ marginTop:2, flexShrink:0 }} />
            <div>
              <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Teaching Feedback</div>
              <div style={{ color:"#f1f5f9", lineHeight:1.7, fontSize:14 }}>{pd.teaching_feedback}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Topics */}
      {(pd.topics_to_review||[]).length > 0 && (
        <Card className="fade-up-1">
          <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>🔖 Topics to Review</div>
          <div>{(pd.topics_to_review||[]).map((t,i) => <Tag key={i} color="#f87171">{t}</Tag>)}</div>
        </Card>
      )}

      {/* Question Mapping */}
      {(pd.question_mapping||[]).length > 0 && (
        <Card className="fade-up-2">
          <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>❓ Question Mapping</div>
          {pd.question_mapping.map((q,i) => (
            <div key={i} style={{ marginBottom:8, borderRadius:10, overflow:"hidden", border:"1px solid #1a2f55" }}>
              <button
                onClick={() => setOpenQ(openQ===i ? null : i)}
                style={{
                  width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
                  background:"#091222", border:"none", color:"#f1f5f9", padding:"12px 16px",
                  cursor:"pointer", textAlign:"left", fontSize:13, fontFamily:"Syne", fontWeight:600
                }}
              >
                <span>Q{i+1}: {q.professor_question}</span>
                {openQ===i ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
              </button>
              {openQ===i && (
                <div style={{ padding:"12px 16px", background:"#0c1830" }}>
                  {(q.students_who_answered||[]).length > 0
                    ? (q.students_who_answered||[]).map((s,j) => <Tag key={j} color="#10b981">👤 {s}</Tag>)
                    : <span style={{ color:"#f87171", fontSize:12 }}>⚠️ No students answered</span>
                  }
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Full summary table */}
      {tableRows.length > 0 && (
        <Card className="fade-up-3">
          <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>📈 Participation Summary</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #1a2f55" }}>
                  {["Rank","Student","Relevance","Knowledge","Engagement","Crit. Think","Communication","Avg ⭐"].map(h => (
                    <th key={h} style={{ padding:"8px 12px", color:"#64748b", fontWeight:700, textAlign:"left", fontSize:11, letterSpacing:"0.06em", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r,i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #0f1e3a", transition:"background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background="#0f1e3a"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}
                  >
                    <td style={{ padding:"10px 12px", color:"#475569", fontFamily:"var(--font-mono)" }}>#{i+1}</td>
                    <td style={{ padding:"10px 12px", color:"#f1f5f9", fontWeight:700 }}>{r.name}</td>
                    {["relevance","knowledgeability","engagement","critical_thinking","communication"].map(k => (
                      <td key={k} style={{ padding:"10px 12px", color:"#94a3b8", fontFamily:"var(--font-mono)", textAlign:"center" }}>{r[k] ?? "–"}</td>
                    ))}
                    <td style={{ padding:"10px 12px" }}>
                      <span style={{ background:"rgba(34,211,238,0.15)", color:"#22d3ee", borderRadius:8, padding:"3px 10px", fontWeight:800, fontFamily:"var(--font-mono)", fontSize:13 }}>{r.avg}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Student Dashboard (Transcript mode) ──────────────────────────────────────
function StudentDashboard({ students }) {
  const [selected, setSelected] = useState(students[0]?.name || "");
  const s = students.find(x => x.name === selected) || students[0];
  if (!s) return null;

  const sc = s.scores || {};
  const avg = +(Object.values(sc).reduce((a,b)=>a+b,0)/Object.values(sc).length).toFixed(1);
  const { feedback = {} } = s;

  const allAvg = students.map(x => +(Object.values(x.scores||{}).reduce((a,b)=>a+b,0)/Object.values(x.scores||{}).length).toFixed(1));
  const classAvg = +(allAvg.reduce((a,b)=>a+b,0)/allAvg.length).toFixed(1);

  return (
    <div style={{ display:"grid", gap:"1.5rem" }}>

      {/* Student picker */}
      <div className="fade-up" style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ color:"#64748b", fontSize:12, fontWeight:700 }}>SELECT STUDENT:</span>
        {students.map(x => (
          <button key={x.name} onClick={() => setSelected(x.name)} style={{
            padding:"6px 18px", borderRadius:99, fontFamily:"Syne", fontWeight:700, fontSize:12,
            border: x.name===selected ? "1.5px solid #22d3ee" : "1.5px solid #1a2f55",
            background: x.name===selected ? "rgba(34,211,238,0.12)" : "transparent",
            color: x.name===selected ? "#22d3ee" : "#64748b",
            cursor:"pointer", transition:"all 0.15s"
          }}>{x.name}</button>
        ))}
      </div>

      {/* Metric strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.8rem" }} className="fade-up-1">
        {TEXT_FACTORS.map(f => (
          <Card key={f.key} style={{ padding:"1rem", textAlign:"center" }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{f.icon}</div>
            <div style={{ color:"#64748b", fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{f.label}</div>
            <div style={{ color:f.color, fontWeight:800, fontSize:22, fontFamily:"var(--font-mono)" }}>{sc[f.key] ?? "–"}</div>
            <div style={{ color:"#334155", fontSize:11, fontFamily:"var(--font-mono)" }}>/10</div>
          </Card>
        ))}
      </div>

      {/* Radar + scores */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }} className="fade-up-2">
        <Card>
          <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>🕸️ Performance Radar</div>
          <RadarViz scores={sc} factors={TEXT_FACTORS} />
        </Card>
        <Card>
          <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>📊 Score Breakdown</div>
          {TEXT_FACTORS.map(f => <ScoreBadge key={f.key} label={f.label} score={sc[f.key]??0} color={f.color} icon={f.icon} />)}
          <div style={{ marginTop:16, padding:"10px 14px", background:"rgba(34,211,238,0.08)", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:"#94a3b8", fontWeight:700, fontSize:13 }}>Overall Average</span>
            <span style={{ color:"#22d3ee", fontWeight:800, fontSize:20, fontFamily:"var(--font-mono)" }}>{avg}/10</span>
          </div>
        </Card>
      </div>

      {/* Feedback */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }} className="fade-up-3">
        {[
          { label:"✅ Strengths", key:"strengths", color:"#10b981" },
          { label:"⚠️ Weaknesses", key:"weaknesses", color:"#f87171" },
          { label:"🎯 Needs Improvement", key:"needs_improvement", color:"#fbbf24" },
        ].map(fb => (
          <Card key={fb.key} style={{ borderLeft:`3px solid ${fb.color}`, borderRadius:"0 14px 14px 0" }}>
            <div style={{ color:fb.color, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>{fb.label}</div>
            <div style={{ color:"#94a3b8", lineHeight:1.7, fontSize:13 }}>{feedback[fb.key] || "N/A"}</div>
          </Card>
        ))}
      </div>

      {/* Class comparison */}
      {students.length > 1 && (
        <Card className="fade-up-4">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>🏆 Class Comparison</div>
            <div style={{ display:"flex", gap:16 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ color:"#64748b", fontSize:10 }}>CLASS AVG</div>
                <div style={{ color:"#94a3b8", fontWeight:800, fontFamily:"var(--font-mono)" }}>{classAvg}</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ color:"#64748b", fontSize:10 }}>YOUR SCORE</div>
                <div style={{ color:"#22d3ee", fontWeight:800, fontFamily:"var(--font-mono)" }}>{avg}</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ color:"#64748b", fontSize:10 }}>DELTA</div>
                <div style={{ color: avg >= classAvg ? "#10b981" : "#f87171", fontWeight:800, fontFamily:"var(--font-mono)" }}>
                  {avg >= classAvg ? "+" : ""}{(avg - classAvg).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
          <ClassBarChart students={students} selected={selected} />
        </Card>
      )}
    </div>
  );
}

// ── Audio Evaluation Result ───────────────────────────────────────────────────
function AudioResult({ data }) {
  const sc = data.scores || {};
  const [showTranscript, setShowTranscript] = useState(false);
  const grade = data.grade_recommendation || "N/A";

  return (
    <div style={{ display:"grid", gap:"1.5rem" }}>

      {/* Header strip */}
      <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }} className="fade-up">
        <Card style={{ flex:"1 1 200px", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{
            width:56, height:56, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center",
            background:`${GRADE_COLORS[grade]||"#22d3ee"}18`, border:`2px solid ${GRADE_COLORS[grade]||"#22d3ee"}40`
          }}>
            <Award size={28} color={GRADE_COLORS[grade]||"#22d3ee"} />
          </div>
          <div>
            <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>Grade</div>
            <div style={{ color:GRADE_COLORS[grade]||"#22d3ee", fontWeight:900, fontSize:32, fontFamily:"var(--font-mono)", lineHeight:1 }}>{grade}</div>
          </div>
        </Card>
        <Card style={{ flex:"1 1 200px", display:"flex", alignItems:"center", gap:16 }}>
          <Star size={28} color="#fbbf24" />
          <div>
            <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>Overall Score</div>
            <div style={{ color:"#fbbf24", fontWeight:900, fontSize:32, fontFamily:"var(--font-mono)", lineHeight:1 }}>{data.overall_score}<span style={{ fontSize:14, color:"#334155" }}>/10</span></div>
          </div>
        </Card>
        <Card style={{ flex:"1 1 200px", display:"flex", alignItems:"center", gap:16 }}>
          <MessageSquare size={28} color="#a78bfa" />
          <div>
            <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>Word Count</div>
            <div style={{ color:"#a78bfa", fontWeight:900, fontSize:32, fontFamily:"var(--font-mono)", lineHeight:1 }}>{data.estimated_word_count||"—"}</div>
          </div>
        </Card>
        <Card style={{ flex:"1 1 200px" }}>
          <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Filler Words Detected</div>
          <div>{(data.filler_words_detected||[]).length > 0
            ? (data.filler_words_detected||[]).map((w,i) => <Tag key={i} color="#f87171">{w}</Tag>)
            : <Tag color="#10b981">✅ None detected</Tag>
          }</div>
        </Card>
      </div>

      {/* Radar + Scores */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }} className="fade-up-1">
        <Card>
          <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>🕸️ 8-Factor Radar</div>
          <RadarViz scores={sc} factors={AUDIO_FACTORS} />
        </Card>
        <Card>
          <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>📊 Factor Scores</div>
          {AUDIO_FACTORS.map(f => <ScoreBadge key={f.key} label={f.label} score={sc[f.key]??0} color={f.color} icon={f.icon} />)}
        </Card>
      </div>

      {/* Feedback */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }} className="fade-up-2">
        {[
          { label:"✅ Strengths", key:"strengths", color:"#10b981" },
          { label:"⚠️ Weaknesses", key:"weaknesses", color:"#f87171" },
          { label:"🎯 Needs Improvement", key:"needs_improvement", color:"#fbbf24" },
          { label:"🎙️ Speech Notes", key:"speech_notes", color:"#22d3ee" },
        ].map(fb => (
          <Card key={fb.key} style={{ borderLeft:`3px solid ${fb.color}`, borderRadius:"0 14px 14px 0" }}>
            <div style={{ color:fb.color, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>{fb.label}</div>
            <div style={{ color:"#94a3b8", lineHeight:1.7, fontSize:13 }}>{(data.feedback||{})[fb.key] || "N/A"}</div>
          </Card>
        ))}
      </div>

      {/* Transcription */}
      {data.full_transcription && (
        <Card className="fade-up-3">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontSize:12, fontFamily:"Syne", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}
          >
            <Volume2 size={15} /> FULL TRANSCRIPTION {showTranscript ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          {showTranscript && (
            <div style={{
              marginTop:12, padding:"1rem", background:"#050d1a", borderRadius:10,
              color:"#94a3b8", lineHeight:1.8, fontSize:13, fontFamily:"var(--font-mono)",
              maxHeight:240, overflowY:"auto", border:"1px solid #1a2f55"
            }}>
              {data.full_transcription}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Upload panels ─────────────────────────────────────────────────────────────
function TranscriptPanel({ onResult }) {
  const [file, setFile] = useState(null);
  const [profName, setProfName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!file) return setError("Please upload a transcript file.");
    if (!profName.trim()) return setError("Enter the professor's name.");
    setError(""); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("professor_name", profName.trim());
      const res = await fetch(`${API}/api/analyse/transcript`, { method:"POST", body:fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail||"Server error"); }
      onResult(await res.json());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:"grid", gap:"1.2rem" }}>
      <div>
        <label style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Professor's Name</label>
        <input
          value={profName} onChange={e => setProfName(e.target.value)}
          placeholder="e.g. Dr. Sharma"
          style={{
            width:"100%", padding:"10px 16px", background:"#091222", border:"1.5px solid #1a2f55",
            borderRadius:10, color:"#f1f5f9", fontFamily:"Syne", fontSize:14,
            outline:"none", transition:"border-color 0.2s"
          }}
          onFocus={e => e.target.style.borderColor="#22d3ee"}
          onBlur={e => e.target.style.borderColor="#1a2f55"}
        />
      </div>
      <DropZone
        accept=".vtt,.txt"
        label="Drop transcript here"
        hint="Supports Zoom .vtt, Google Meet .txt, or plain-text with Speaker: format"
        icon={FileText}
        onFile={setFile}
        file={file}
      />
      {error && <div style={{ color:"#f87171", fontSize:13, display:"flex", gap:8, alignItems:"center" }}><AlertCircle size={14}/>{error}</div>}
      <button
        onClick={submit} disabled={loading}
        style={{
          padding:"13px 28px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer",
          background: loading ? "#1a2f55" : "linear-gradient(135deg, #0e3a6e, #0a2a5e)",
          color:"#22d3ee", fontFamily:"Syne", fontWeight:800, fontSize:15,
          display:"flex", alignItems:"center", justifyContent:"center", gap:12,
          border:"1.5px solid #22d3ee40", transition:"all 0.2s",
          boxShadow: loading ? "none" : "0 4px 20px rgba(34,211,238,0.15)",
        }}
      >
        {loading ? <><Spinner /> Analysing transcript…</> : <><Zap size={18}/> Analyse Transcript</>}
      </button>
    </div>
  );
}

function AudioPanel({ onResult }) {
  const [file, setFile] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!file) return setError("Please upload an audio file.");
    if (!studentName.trim()) return setError("Enter the student's name.");
    setError(""); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("student_name", studentName.trim());
      fd.append("topic_context", topic.trim() || "General class participation");
      const res = await fetch(`${API}/api/analyse/audio`, { method:"POST", body:fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail||"Server error"); }
      onResult(await res.json());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:"grid", gap:"1.2rem" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <div>
          <label style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Student Name</label>
          <input value={studentName} onChange={e=>setStudentName(e.target.value)} placeholder="e.g. Priya Sharma"
            style={{ width:"100%", padding:"10px 16px", background:"#091222", border:"1.5px solid #1a2f55", borderRadius:10, color:"#f1f5f9", fontFamily:"Syne", fontSize:14, outline:"none" }}
            onFocus={e=>e.target.style.borderColor="#22d3ee"} onBlur={e=>e.target.style.borderColor="#1a2f55"}
          />
        </div>
        <div>
          <label style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Topic / Assignment</label>
          <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Financial Risk Management"
            style={{ width:"100%", padding:"10px 16px", background:"#091222", border:"1.5px solid #1a2f55", borderRadius:10, color:"#f1f5f9", fontFamily:"Syne", fontSize:14, outline:"none" }}
            onFocus={e=>e.target.style.borderColor="#22d3ee"} onBlur={e=>e.target.style.borderColor="#1a2f55"}
          />
        </div>
      </div>

      {/* Audio-specific badge */}
      <div style={{ padding:"10px 16px", background:"rgba(34,211,238,0.06)", borderRadius:10, border:"1px solid #22d3ee20", display:"flex", gap:10, alignItems:"center" }}>
        <Brain size={16} color="#22d3ee" />
        <div style={{ color:"#64748b", fontSize:12, lineHeight:1.6 }}>
          <span style={{ color:"#22d3ee", fontWeight:700 }}>8-factor audio analysis:</span> Groq Whisper transcribes your audio, then LLaMA evaluates 5 standard + 3 speech-specific dimensions (Fluency, Confidence, Vocabulary Depth).
        </div>
      </div>

      <DropZone
        accept=".mp3,.wav,.m4a,.ogg,.webm,.flac"
        label="Drop audio file here"
        hint="MP3, WAV, M4A, OGG, WebM, FLAC · Max ~25 MB"
        icon={Mic}
        onFile={setFile}
        file={file}
      />
      {error && <div style={{ color:"#f87171", fontSize:13, display:"flex", gap:8, alignItems:"center" }}><AlertCircle size={14}/>{error}</div>}
      <button
        onClick={submit} disabled={loading}
        style={{
          padding:"13px 28px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer",
          background: loading ? "#1a2f55" : "linear-gradient(135deg, #1a0e5e, #2d0a5e)",
          color:"#a78bfa", fontFamily:"Syne", fontWeight:800, fontSize:15,
          display:"flex", alignItems:"center", justifyContent:"center", gap:12,
          border:"1.5px solid #a78bfa40", transition:"all 0.2s",
          boxShadow: loading ? "none" : "0 4px 20px rgba(167,139,250,0.15)",
        }}
      >
        {loading ? <><Spinner /> Transcribing & analysing…</> : <><Mic size={18}/> Analyse Audio</>}
      </button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("transcript"); // "transcript" | "audio"
  const [view, setView] = useState("prof");        // "prof" | "student" (transcript mode)
  const [transcriptResult, setTranscriptResult] = useState(null);
  const [audioResult, setAudioResult] = useState(null);
  const [showUpload, setShowUpload] = useState(true);

  const handleTranscriptResult = (data) => {
    setTranscriptResult(data);
    setShowUpload(false);
  };

  const handleAudioResult = (data) => {
    setAudioResult(data);
    setShowUpload(false);
  };

  const reset = () => {
    setTranscriptResult(null);
    setAudioResult(null);
    setShowUpload(true);
  };

  const students = transcriptResult?.student_evaluations || [];

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom:"1px solid #1a2f55",
        background:"linear-gradient(180deg, #091222, #050d1a)",
        padding:"0 2rem",
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:36, height:36, borderRadius:10, background:"rgba(34,211,238,0.12)",
              border:"1.5px solid #22d3ee40", display:"flex", alignItems:"center", justifyContent:"center"
            }}>
              <span style={{ fontSize:18 }}>🏛️</span>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:"#f1f5f9", letterSpacing:"0.02em" }}>Participation Evaluator</div>
              <div style={{ color:"#334155", fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>AI-Powered · 5-8 Factor Assessment</div>
            </div>
          </div>

          <div style={{ display:"flex", gap:4 }}>
            {(transcriptResult||audioResult) && (
              <button onClick={reset} style={{
                padding:"7px 16px", borderRadius:8, background:"transparent",
                border:"1px solid #1a2f55", color:"#64748b", fontSize:12, fontFamily:"Syne", cursor:"pointer", fontWeight:600
              }}>← New Analysis</button>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"2rem" }}>

        {/* ── Mode tabs (always visible when uploading) ── */}
        {showUpload && (
          <div className="fade-up" style={{ marginBottom:"2rem" }}>

            {/* Hero */}
            <div style={{
              textAlign:"center", padding:"3rem 2rem 2.5rem",
              background:"linear-gradient(135deg, #0c1830, #091222)",
              borderRadius:20, border:"1.5px solid #1a2f55",
              marginBottom:"2rem",
              boxShadow:"0 8px 40px rgba(34,211,238,0.06)",
              position:"relative", overflow:"hidden"
            }}>
              <div style={{
                position:"absolute", top:-60, right:-60, width:200, height:200,
                borderRadius:"50%", background:"radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%)"
              }}/>
              <div style={{ fontSize:48, marginBottom:12 }}>🏛️</div>
              <h1 style={{ fontWeight:900, fontSize:28, color:"#f1f5f9", marginBottom:10, letterSpacing:"-0.02em" }}>
                Class Participation Evaluator
              </h1>
              <p style={{ color:"#475569", fontSize:15, lineHeight:1.7, maxWidth:560, margin:"0 auto" }}>
                Upload a class transcript <span style={{ color:"#22d3ee" }}>or</span> an individual audio recording.
                AI evaluates participation across <strong style={{ color:"#f1f5f9" }}>5–8 research-backed dimensions</strong>.
              </p>
            </div>

            {/* Mode switcher */}
            <div style={{ display:"flex", gap:0, background:"#091222", borderRadius:14, padding:4, border:"1.5px solid #1a2f55", marginBottom:"1.5rem" }}>
              {[
                { id:"transcript", label:"📄 Class Transcript", desc:"Evaluate all students from a full session transcript" },
                { id:"audio",      label:"🎙️ Audio Submission", desc:"Evaluate a single student's spoken response" },
              ].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  flex:1, padding:"12px 20px", borderRadius:10, border:"none", cursor:"pointer",
                  background: mode===m.id ? "linear-gradient(135deg, #0c1830, #0f1e3a)" : "transparent",
                  color: mode===m.id ? "#f1f5f9" : "#475569",
                  fontFamily:"Syne", fontWeight:700, fontSize:14,
                  borderLeft: mode===m.id ? `3px solid ${m.id==="transcript"?"#22d3ee":"#a78bfa"}` : "3px solid transparent",
                  transition:"all 0.2s", textAlign:"left"
                }}>
                  <div>{m.label}</div>
                  <div style={{ fontSize:11, fontWeight:400, color: mode===m.id ? "#64748b" : "#334155", marginTop:2 }}>{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Panel */}
            <Card>
              {mode === "transcript"
                ? <TranscriptPanel onResult={handleTranscriptResult} />
                : <AudioPanel onResult={handleAudioResult} />
              }
            </Card>

            {/* Factor legend */}
            <div style={{ marginTop:"1.5rem" }}>
              <div style={{ color:"#334155", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12, textAlign:"center" }}>
                {mode==="transcript" ? "5 EVALUATION FACTORS" : "8 EVALUATION FACTORS (5 STANDARD + 3 AUDIO-SPECIFIC)"}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:8 }}>
                {(mode==="transcript" ? TEXT_FACTORS : AUDIO_FACTORS).map(f => (
                  <div key={f.key} style={{
                    padding:"6px 14px", borderRadius:99, background:`${f.color}12`, border:`1px solid ${f.color}30`,
                    display:"flex", alignItems:"center", gap:6
                  }}>
                    <span style={{ fontSize:14 }}>{f.icon}</span>
                    <span style={{ color:f.color, fontSize:12, fontWeight:700 }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Transcript results ── */}
        {transcriptResult && !showUpload && (
          <div>
            {/* Sub-tabs */}
            <div style={{ display:"flex", gap:0, background:"#091222", borderRadius:14, padding:4, border:"1.5px solid #1a2f55", marginBottom:"1.5rem" }} className="fade-up">
              {[
                { id:"prof",    label:"📋 Professor Dashboard", icon:Users },
                { id:"student", label:"🎓 Student Dashboard",   icon:BookOpen },
              ].map(t => (
                <button key={t.id} onClick={() => setView(t.id)} style={{
                  flex:1, padding:"11px 20px", borderRadius:10, border:"none", cursor:"pointer",
                  background: view===t.id ? "linear-gradient(135deg,#0c1830,#0f1e3a)" : "transparent",
                  color: view===t.id ? "#f1f5f9" : "#475569",
                  fontFamily:"Syne", fontWeight:700, fontSize:14,
                  borderBottom: view===t.id ? "2px solid #22d3ee" : "2px solid transparent",
                  transition:"all 0.2s"
                }}>{t.label}</button>
              ))}
            </div>

            {view === "prof"
              ? <ProfDashboard data={transcriptResult} />
              : <StudentDashboard students={students} />
            }
          </div>
        )}

        {/* ── Audio results ── */}
        {audioResult && !showUpload && (
          <div>
            <div className="fade-up" style={{ marginBottom:"1.5rem", display:"flex", alignItems:"center", gap:12 }}>
              <Mic size={20} color="#a78bfa" />
              <div>
                <div style={{ color:"#f1f5f9", fontWeight:800, fontSize:18 }}>{audioResult.student_name}</div>
                <div style={{ color:"#475569", fontSize:12 }}>Topic: {audioResult.topic}</div>
              </div>
            </div>
            <AudioResult data={audioResult} />
          </div>
        )}
      </div>
    </div>
  );
}
