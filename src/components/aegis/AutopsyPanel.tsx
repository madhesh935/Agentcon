import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import {
  X, Zap, Activity, Eye, Layers, Cpu, Droplets, Bone, Wind, Heart,
  Upload, FileText, Scan, CheckCircle, Loader2, ChevronRight,
} from "lucide-react";
import anatomyImg from "@/assets/anatomy.jpeg";

// ── Types ──────────────────────────────────────────────────────────────────

type Sev = "critical" | "high" | "medium" | "low";
type Layer = "organs" | "skeletal" | "circulatory" | "nervous" | "heatmap";
type SimPhase = "idle" | "reading" | "extracting" | "mapping" | "complete";

interface Hotspot {
  id: string; name: string;
  x: number; y: number;
  severity: Sev;
  injuryType: string;
  weight?: string;
  bleeding: string;
  fracture: string;
  laceration: string;
  observation: string;
  aiInsight: string;
  causeContribution: string;
  healthPct: number;
  toxicology?: string;
  fluid?: string;
  layers: Layer[];
}

// ── Forensic hotspot data ──────────────────────────────────────────────────

// ── Hotspot coordinates are calibrated against anatomy.jpeg ──────────────────
// The image has ~15% black padding left/right and ~2% top/bottom.
// All x/y values are percentages of the full image dimensions.
const HOTSPOTS: Hotspot[] = [
  // HEAD — center of skull, top of image
  { id: "brain",    name: "Brain",         x: 50,  y: 8,    severity: "critical", injuryType: "Blunt Force Trauma",    weight: "1,350g", bleeding: "Subarachnoid hemorrhage",     fracture: "Depressed occipital fracture (3 sites)", laceration: "None",             observation: "Mild diffuse cerebral edema. Subarachnoid hemorrhage in occipital sulci. Primary fatal injury.", aiInsight: "Cerebral edema pattern consistent with blunt impact 8–10h prior. Single high-energy impact trajectory.", causeContribution: "PRIMARY — 70%",   healthPct: 28,  toxicology: "Trace diazepam detected",          fluid: "None",           layers: ["organs","skeletal","nervous","heatmap"] },
  // NECK — base of skull, visible in image
  { id: "neck",     name: "Neck / Carotid",x: 50,  y: 17,   severity: "medium",   injuryType: "Contusion",             weight: "N/A",    bleeding: "Minor petechial hemorrhage",  fracture: "C1–C2 no fracture",              laceration: "Surface abrasion",  observation: "Carotid soft tissue bruising. No fracture. Indicates manual restraint applied briefly.", aiInsight: "Petechial pattern suggests transient compression — restraint or chokehold prior to blunt assault.",  causeContribution: "SECONDARY — 10%", healthPct: 62,  toxicology: "None",                             fluid: "None",           layers: ["organs","circulatory","nervous","heatmap"] },
  // HEART — left of sternum, upper chest
  { id: "heart",    name: "Heart",         x: 46,  y: 31,   severity: "low",      injuryType: "No Direct Injury",      weight: "320g",   bleeding: "None",                        fracture: "None",                           laceration: "None",             observation: "Heart 320g within normal limits. Coronary arteries patent. No myocardial infarction.", aiInsight: "No cardiac contribution to death. Elevated catecholamines consistent with acute traumatic stress.", causeContribution: "NONE",            healthPct: 91,  toxicology: "None",                             fluid: "None",           layers: ["organs","circulatory","heatmap"] },
  // RIGHT LUNG — viewer's right (body's left side)
  { id: "lung-r",   name: "Right Lung",    x: 58,  y: 28,   severity: "medium",   injuryType: "Contusion",             weight: "620g",   bleeding: "Subpleural hemorrhage",       fracture: "Rib 4–5 fracture (right)",       laceration: "None",             observation: "Subpleural hemorrhage inferior lobe. Rib 4–5 fractures consistent with lateral blunt force.", aiInsight: "Lung contusion pattern suggests right-lateral impact — secondary blow after primary head strike.",  causeContribution: "SECONDARY — 8%",  healthPct: 55,  toxicology: "None",                             fluid: "Mild effusion 80ml", layers: ["organs","circulatory","skeletal","heatmap"] },
  // LEFT LUNG — viewer's left (body's right side)
  { id: "lung-l",   name: "Left Lung",     x: 40,  y: 28,   severity: "low",      injuryType: "Congestion",            weight: "580g",   bleeding: "None",                        fracture: "None",                           laceration: "None",             observation: "Left lung 580g. Mild congestion and basal atelectasis. No primary injury.", aiInsight: "Congestion secondary to traumatic shock state. Not a direct contributing factor to death.",         causeContribution: "MINIMAL — 3%",    healthPct: 72,  toxicology: "None",                             fluid: "None",           layers: ["organs","circulatory","heatmap"] },
  // LIVER — right upper quadrant (viewer's right)
  { id: "liver",    name: "Liver",         x: 58,  y: 40,   severity: "critical", injuryType: "Laceration",            weight: "1,480g", bleeding: "Severe — hemoperitoneum",     fracture: "None",                           laceration: "Capsular tear 6.5cm", observation: "Liver 1,480g. Capsular tear right lobe 6.5cm depth 2.1cm. Active hemorrhage at recovery. Hemoperitoneum ~1,200 ml.", aiInsight: "Liver laceration is secondary cause of death. Blunt abdominal force consistent with weapon impact.", causeContribution: "CRITICAL — 20%",  healthPct: 18,  toxicology: "None",                             fluid: "1,200 ml hemoperitoneum", layers: ["organs","circulatory","heatmap"] },
  // SPLEEN — left upper quadrant (viewer's left)
  { id: "spleen",   name: "Spleen",        x: 42,  y: 40,   severity: "low",      injuryType: "No Injury",             weight: "150g",   bleeding: "None",                        fracture: "None",                           laceration: "None",             observation: "Spleen 150g, normal size and consistency. No laceration or rupture.", aiInsight: "No splenic involvement. Absence of splenic injury rules out high-velocity impact at left flank.",    causeContribution: "NONE",            healthPct: 95,  toxicology: "None",                             fluid: "None",           layers: ["organs","heatmap"] },
  // STOMACH — central upper abdomen
  { id: "stomach",  name: "Stomach",       x: 50,  y: 44,   severity: "low",      injuryType: "Contents Analysis",     weight: "N/A",    bleeding: "None",                        fracture: "None",                           laceration: "None",             observation: "Partially digested rice and vegetables. Meal approximately 2h before TOD. Pylorus intact.", aiInsight: "Gastric contents timing corroborates TOD window 19:30–21:00. Last meal ~17:30 confirmed.",          causeContribution: "NONE",            healthPct: 88,  toxicology: "Trace diazepam in gastric wash",   fluid: "None",           layers: ["organs","heatmap"] },
  // RIGHT KIDNEY — posterior right flank (image right side)
  { id: "kidney-r", name: "Right Kidney",  x: 60,  y: 49,   severity: "low",      injuryType: "No Injury",             weight: "130g",   bleeding: "None",                        fracture: "None",                           laceration: "None",             observation: "Right kidney 130g, normal capsule and cortex. No contusion or laceration.", aiInsight: "Renal function indicators within normal range. Kidney damage absent — rules out renal blunt trauma.", causeContribution: "NONE",            healthPct: 94,  toxicology: "None",                             fluid: "None",           layers: ["organs","heatmap"] },
  // LEFT KIDNEY — posterior left flank (image left side)
  { id: "kidney-l", name: "Left Kidney",   x: 40,  y: 49,   severity: "low",      injuryType: "No Injury",             weight: "136g",   bleeding: "None",                        fracture: "None",                           laceration: "None",             observation: "Left kidney 136g. No significant pathology.", aiInsight: "No renal pathology. Bilateral kidney integrity rules out fall mechanism.",                          causeContribution: "NONE",            healthPct: 96,  toxicology: "None",                             fluid: "None",           layers: ["organs","heatmap"] },
  // ABDOMEN — lower central, below navel
  { id: "abdomen",  name: "Abdomen",       x: 50,  y: 54,   severity: "critical", injuryType: "Internal Hemorrhage",   weight: "N/A",    bleeding: "~1,200 ml hemoperitoneum",    fracture: "None",                           laceration: "Mesenteric tear",  observation: "Hemoperitoneum ~1,200 ml. Source: liver laceration + mesenteric tear. Active hemorrhage confirmed.", aiInsight: "Abdominal hemorrhage volume indicates 30–40 min of active internal bleeding post-injury.",           causeContribution: "CRITICAL — 20%",  healthPct: 15,  toxicology: "None",                             fluid: "1,200 ml blood",  layers: ["organs","circulatory","heatmap"] },
  // LEFT ARM — forearm, viewer's left (body's right arm)
  { id: "arm-l",    name: "Left Arm",      x: 22,  y: 46,   severity: "low",      injuryType: "Defensive Bruise",      weight: "N/A",    bleeding: "Minor soft tissue",           fracture: "None",                           laceration: "Surface abrasion 3.1cm", observation: "Defensive contusion 12cm left forearm. Surface abrasion consistent with fall or defensive posture.", aiInsight: "Defensive wounds confirm victim was conscious during initial phase of assault.",                     causeContribution: "NONE",            healthPct: 85,  toxicology: "None",                             fluid: "None",           layers: ["organs","skeletal","heatmap"] },
  // RIGHT ARM — forearm, viewer's right (body's left arm)
  { id: "arm-r",    name: "Right Arm",     x: 78,  y: 46,   severity: "low",      injuryType: "No Injury",             weight: "N/A",    bleeding: "None",                        fracture: "None",                           laceration: "None",             observation: "Right arm unremarkable. No defensive injuries observed.", aiInsight: "Absence of right-arm defensive wounds suggests attacker approached from victim's right side.",        causeContribution: "NONE",            healthPct: 98,  toxicology: "None",                             fluid: "None",           layers: ["organs","skeletal","heatmap"] },
  // LEFT LEG — left thigh/upper leg (visible in lower image)
  { id: "leg-l",    name: "Left Leg",      x: 43,  y: 78,   severity: "medium",   injuryType: "Post-mortem Abrasion",  weight: "N/A",    bleeding: "None (post-mortem)",          fracture: "None",                           laceration: "Deep 8.0cm",       observation: "Post-mortem drag mark 8.0cm depth 1.3cm on left thigh. Body relocated after death.", aiInsight: "Drag pattern orientation consistent with body moved ~4 meters post-mortem. Confirms relocation.",    causeContribution: "INDICATOR",       healthPct: 78,  toxicology: "None",                             fluid: "None",           layers: ["organs","skeletal","heatmap"] },
  // RIGHT LEG — right thigh/upper leg (visible in lower image)
  { id: "leg-r",    name: "Right Leg",     x: 57,  y: 78,   severity: "low",      injuryType: "No Injury",             weight: "N/A",    bleeding: "None",                        fracture: "None",                           laceration: "None",             observation: "Right leg unremarkable. No trauma identified.", aiInsight: "No right-leg injuries. Confirms unidirectional assault approach from victim's right.",               causeContribution: "NONE",            healthPct: 97,  toxicology: "None",                             fluid: "None",           layers: ["organs","skeletal","heatmap"] },
];

const AI_INSIGHTS = [
  "Brain hemorrhage detected — primary cause of death confirmed",
  "Liver trauma indicates blunt force abdominal impact",
  "Hemoperitoneum ~1,200 ml — internal bleeding active at time of recovery",
  "Defensive wounds on left arm confirm victim was conscious during assault",
  "Diazepam trace suggests pre-assault chemical sedation",
  "Post-mortem body relocation confirmed via livor mortis analysis",
  "Cell tower + physical evidence converge: TOD window 20:15–20:55",
  "Suspect S-118 DNA match at 99.2% on recovered weapon",
];

const SEV: Record<Sev, { ring: string; glow: string; fill: string; text: string; badge: string; dot: string; heatmap: string }> = {
  critical: { ring: "#ef4444", glow: "rgba(239,68,68,0.8)",   fill: "rgba(239,68,68,0.25)",  text: "text-red-400",    badge: "bg-red-600/90 text-white",     dot: "bg-red-500",    heatmap: "rgba(239,68,68,0.35)"  },
  high:     { ring: "#f97316", glow: "rgba(249,115,22,0.7)",  fill: "rgba(249,115,22,0.22)", text: "text-orange-400", badge: "bg-orange-500/80 text-white",  dot: "bg-orange-500", heatmap: "rgba(249,115,22,0.28)" },
  medium:   { ring: "#eab308", glow: "rgba(234,179,8,0.65)",  fill: "rgba(234,179,8,0.18)",  text: "text-yellow-400", badge: "bg-yellow-500/80 text-black",  dot: "bg-yellow-400", heatmap: "rgba(234,179,8,0.22)"  },
  low:      { ring: "#22c55e", glow: "rgba(34,197,94,0.5)",   fill: "rgba(34,197,94,0.12)",  text: "text-emerald-400",badge: "bg-emerald-600/80 text-white", dot: "bg-emerald-400",heatmap: "rgba(34,197,94,0.1)"   },
};

const HEATMAP_SIZE: Record<Sev, number> = { critical: 90, high: 72, medium: 56, low: 32 };

const LAYERS: { id: Layer; label: string; icon: React.ReactNode; tint?: string }[] = [
  { id: "organs",      label: "Organ Damage",   icon: <Activity className="h-3 w-3" /> },
  { id: "heatmap",     label: "Trauma Heatmap", icon: <Droplets className="h-3 w-3" /> },
  { id: "skeletal",    label: "Skeletal",        icon: <Bone className="h-3 w-3" />,    tint: "rgba(100,160,255,0.18)" },
  { id: "circulatory", label: "Circulatory",     icon: <Heart className="h-3 w-3" />,   tint: "rgba(255,60,60,0.18)"  },
  { id: "nervous",     label: "Nervous System",  icon: <Cpu className="h-3 w-3" />,     tint: "rgba(240,200,40,0.15)" },
];

// ── Upload modal ───────────────────────────────────────────────────────────

function UploadModal({ onFile, onClose }: { onFile: (f: File) => void; onClose: () => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center rounded-xl"
      style={{ background: "rgba(2,6,20,0.94)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        onClick={e => e.stopPropagation()}
        className="w-[400px] rounded-2xl border border-cyan-500/30 bg-[#060e26] p-6 shadow-2xl"
        style={{ boxShadow: "0 0 60px rgba(34,211,238,0.1)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[12px] font-black uppercase tracking-[0.18em] text-cyan-400">Upload Autopsy Report</div>
            <div className="text-[9px] text-slate-500 mt-0.5">Any format · data auto-extracted on upload</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all ${
            drag ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5"
          }`}
        >
          <motion.div animate={{ y: drag ? -4 : 0 }} transition={{ duration: 0.2 }}>
            <Upload className={`h-10 w-10 transition-colors ${drag ? "text-cyan-400" : "text-slate-500"}`} />
          </motion.div>
          <div className="text-center">
            <div className={`text-[11px] font-semibold transition-colors ${drag ? "text-cyan-300" : "text-slate-400"}`}>
              {drag ? "Release to load report" : "Drag & drop report here"}
            </div>
            <div className="text-[9px] text-slate-600 mt-1">or click to browse files</div>
          </div>
          <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          {drag && (
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <motion.div className="absolute left-0 right-0 h-10"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(34,211,238,0.3), transparent)" }}
                animate={{ top: ["0%", "100%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {["Organ damage mapping","Injury hotspots","Trauma heatmap","AI forensic insights","Cause of death analysis","Victim profile reveal"].map(f => (
            <div key={f} className="flex items-center gap-1.5 text-[9px] text-slate-400">
              <div className="h-1 w-1 rounded-full bg-cyan-500/60" />{f}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Simulation progress overlay ────────────────────────────────────────────

const SIM_STEPS = [
  { phase: "reading",    label: "Reading Document",        pct: 25 },
  { phase: "extracting", label: "Extracting Forensic Data",pct: 65 },
  { phase: "mapping",    label: "Mapping to Body Model",   pct: 90 },
  { phase: "complete",   label: "Analysis Complete",       pct: 100 },
] as const;

function SimOverlay({ phase, fileName, progress, onDismiss }: {
  phase: SimPhase; fileName: string; progress: number; onDismiss: () => void;
}) {
  const currentStep = SIM_STEPS.find(s => s.phase === phase) ?? SIM_STEPS[0];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center rounded-xl"
      style={{ background: "rgba(2,6,20,0.96)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full max-w-md px-6 py-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30">
            <Scan className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-black uppercase tracking-[0.15em] text-cyan-400">{currentStep.label}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">{fileName}</div>
          </div>
          {phase === "complete" && (
            <button onClick={onDismiss} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
          )}
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-[9px] text-slate-500 mb-1.5">
            <span className="uppercase tracking-wider">{phase === "complete" ? "Done" : "Processing…"}</span>
            <span className="font-mono text-cyan-400">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>

        <div className="space-y-2">
          {SIM_STEPS.filter(s => s.phase !== "complete").map((s, i) => {
            const done = progress >= s.pct;
            const active = currentStep.phase === s.phase;
            return (
              <div key={s.phase} className="flex items-center gap-2.5">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                  done ? "border-emerald-500 bg-emerald-950/60" : active ? "border-cyan-500 bg-cyan-950/40" : "border-white/10 bg-transparent"
                }`}>
                  {done
                    ? <CheckCircle className="h-3 w-3 text-emerald-400" />
                    : active
                      ? <Loader2 className="h-3 w-3 text-cyan-400 animate-spin" />
                      : <span className="text-[8px] text-slate-600">{i + 1}</span>
                  }
                </div>
                <span className={`text-[10px] ${done ? "text-emerald-400" : active ? "text-cyan-300" : "text-slate-600"}`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {phase === "complete" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-emerald-400">Visualization Ready</div>
              <div className="text-[9px] text-slate-500">{HOTSPOTS.length} markers · {HOTSPOTS.filter(h=>h.severity==="critical").length} critical findings</div>
            </div>
            <button onClick={onDismiss}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition-colors"
            >
              View Results <ChevronRight className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SevBadge({ s }: { s: Sev }) {
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${SEV[s].badge}`}>{s}</span>;
}

function HealthBar({ pct, sev }: { pct: number; sev: Sev }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: SEV[sev].ring }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }} />
      </div>
      <span className={`text-[9px] font-mono ${SEV[sev].text}`}>{pct}%</span>
    </div>
  );
}

// ── HotspotMarker: just the pulsing dot — flash cards handle labels ──────────────
function HotspotMarker({ hs, active, layer, onClick }: { hs: Hotspot; active: boolean; layer: Layer; onClick: () => void }) {
  if (!hs.layers.includes(layer)) return null;
  const c = SEV[hs.severity];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring" }}
      className="absolute z-20 flex items-center justify-center cursor-pointer"
      style={{ left: `${hs.x}%`, top: `${hs.y}%`, transform: "translate(-50%,-50%)" }}
      onClick={onClick}
    >
      {/* Outer ping ring */}
      <div className="absolute rounded-full pointer-events-none"
        style={{
          width: active ? 46 : 30, height: active ? 46 : 30,
          border: `2px solid ${c.ring}`,
          boxShadow: `0 0 ${active ? 24 : 10}px ${c.glow}`,
          opacity: active ? 1 : 0.7,
          transition: "all 0.25s",
          animation: `hotspot-ping ${hs.severity === "critical" ? 1.0 : 1.8}s ease-out infinite`,
        }} />
      {/* Solid core dot */}
      <div className="relative rounded-full z-10"
        style={{
          width: active ? 18 : 11, height: active ? 18 : 11,
          background: c.ring,
          boxShadow: `0 0 ${active ? 26 : 14}px ${c.glow}`,
          transition: "all 0.2s",
          border: `2.5px solid ${active ? "#fff" : "rgba(255,255,255,0.4)"}`,
        }} />
    </motion.div>
  );
}

// (FlashCardLayer removed)

function HeatmapOverlay({ hotspots }: { hotspots: Hotspot[] }) {
  return (
    <>
      {hotspots.map(hs => (
        <div key={hs.id} className="absolute pointer-events-none"
          style={{ left: `${hs.x}%`, top: `${hs.y}%`, width: HEATMAP_SIZE[hs.severity], height: HEATMAP_SIZE[hs.severity],
            transform: "translate(-50%,-50%)", borderRadius: "50%",
            background: `radial-gradient(circle, ${SEV[hs.severity].heatmap} 0%, transparent 70%)`, filter: "blur(8px)" }} />
      ))}
    </>
  );
}

function ScanLine() {
  return (
    <motion.div className="absolute left-0 right-0 pointer-events-none z-10"
      style={{ height: 40, background: "linear-gradient(to bottom, transparent, rgba(34,211,238,0.35) 50%, transparent)" }}
      animate={{ top: ["0%", "100%"] }} transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }} />
  );
}

function InsightTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % AI_INSIGHTS.length), 3200); return () => clearInterval(t); }, []);
  return (
    <div className="rounded-lg border border-fuchsia-500/25 bg-fuchsia-950/20 p-2.5 min-h-[52px]">
      <div className="flex items-center gap-1.5 mb-1 text-fuchsia-400 text-[9px] font-bold uppercase tracking-widest">
        <Zap className="h-3 w-3 animate-pulse" /> LIVE AI INSIGHT
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }} className="text-[10px] text-fuchsia-200 leading-snug">
          {AI_INSIGHTS[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex gap-1">
      <span className="w-16 shrink-0 text-slate-500 uppercase tracking-wider text-[7px] mt-0.5">{label}</span>
      <span className={`text-[8px] font-medium leading-snug ${color ?? "text-slate-300"}`}>{value}</span>
    </div>
  );
}

// ForensicPopup — floating card that appears over the body canvas when a marker is clicked
function ForensicPopup({ hs, onClose, containerRef }: { hs: Hotspot; onClose: () => void; containerRef: React.RefObject<HTMLDivElement> }) {
  const c = SEV[hs.severity];
  
  // Custom layout to explicitly distribute cards so they DO NOT overlap each other vertically!
  const isBrain = hs.id === "brain";
  const isLiver = hs.id === "liver";
  const isAbdomen = hs.id === "abdomen";
  
  // Hardcoded distribution:
  // Brain -> Left side, Top
  // Abdomen -> Left side, Bottom
  // Liver -> Right side, Middle
  // Anything else -> falls back to right side, dynamic Y
  const placeLeft = isBrain ? true : isAbdomen ? true : isLiver ? false : hs.x <= 50; 
  const baseCardY = isBrain ? 22 : isAbdomen ? 76 : isLiver ? 50 : Math.max(20, Math.min(hs.y, 80)); 
  
  // Place horizontally so it rests in the black margin without touching the body.
  const horizontalAnchor = "82%"; 
  const baseCardEdgeX = placeLeft ? 18 : 82; // SVG connection point

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const [lineCx, setLineCx] = useState(baseCardEdgeX);
  const [lineCy, setLineCy] = useState(baseCardY);

  const handleDrag = () => {
    const w = containerRef.current?.offsetWidth || 800;
    const h = containerRef.current?.offsetHeight || 800;
    setLineCx(baseCardEdgeX + (dragX.get() / w) * 100);
    setLineCy(baseCardY + (dragY.get() / h) * 100);
  };

  return (
    <>
      {/* Dashed connector line */}
      <svg className="absolute inset-0 pointer-events-none z-30 overflow-visible" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={`${lineCx},${lineCy} ${hs.x},${hs.y}`}
          fill="none"
          stroke={c.ring}
          strokeWidth="0.2"
          strokeOpacity="0.8"
          strokeDasharray="0.8 0.8"
        />
        <circle cx={lineCx} cy={lineCy} r="0.3" fill={c.ring} />
      </svg>

      <motion.div
        key={hs.id}
        drag
        dragMomentum={false}
        onDrag={handleDrag}
        initial={{ opacity: 0, scale: 0.95, x: placeLeft ? 10 : -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95, x: placeLeft ? 10 : -10 }}
        transition={{ duration: 0.25 }}
        className="absolute z-50 shadow-2xl flex flex-col cursor-grab active:cursor-grabbing"
        style={{
          x: dragX,
          y: dragY,
          [placeLeft ? "right" : "left"]: horizontalAnchor,
          top: `${baseCardY}%`,
          transform: "translateY(-50%)",
          width: "175px", // Made card much smaller and compact
          background: "rgba(5,9,18,0.95)",
          border: `1px solid ${c.ring}60`,
          borderRadius: "10px",
          backdropFilter: "blur(16px)",
          boxShadow: `0 0 20px ${c.glow}20, 0 8px 24px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-2 pb-1.5 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="rounded-md p-1 shrink-0 flex items-center justify-center" style={{ background: c.fill, border: `1px solid ${c.ring}40`, width: "22px", height: "22px" }}>
              <Activity className="h-3 w-3" style={{ color: c.ring }} />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <div className="text-[11px] font-black text-white leading-none">{hs.name}</div>
              <SevBadge s={hs.severity} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors rounded p-0.5 hover:bg-white/5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Detail rows */}
        <div className="px-2 py-1 space-y-0.5">
          <DetailRow label="INJURY TYPE" value={hs.injuryType} />
          {hs.weight && hs.weight !== "N/A" && <DetailRow label="WEIGHT" value={hs.weight} />}
          <DetailRow label="BLEEDING" value={hs.bleeding} color={hs.severity !== "low" ? c.text : undefined} />
          <DetailRow label="FRACTURE" value={hs.fracture} />
          <DetailRow label="LACERATION" value={hs.laceration} />
          {hs.fluid && hs.fluid !== "None" && <DetailRow label="FLUID" value={hs.fluid} color={c.text} />}
          {hs.toxicology && hs.toxicology !== "None" && <DetailRow label="TOXICOLOGY" value={hs.toxicology} color="text-fuchsia-400" />}
        </div>

        {/* Observation */}
        <p className="px-2 pb-1.5 text-[7px] text-slate-400 leading-snug pt-0.5 border-t border-white/5">
          {hs.observation}
        </p>

        {/* AI Insight */}
        <div className="mx-2 mb-1.5 rounded-md border border-fuchsia-500/30 bg-fuchsia-950/30 p-1.5">
          <div className="flex items-center gap-1 text-fuchsia-400 text-[7px] font-black uppercase tracking-wider mb-0.5">
            <Zap className="h-2 w-2" /> AI INSIGHT
          </div>
          <p className="text-[7.5px] text-fuchsia-200 leading-snug">{hs.aiInsight}</p>
        </div>

        {/* Cause contribution + health bar */}
        <div className="px-2 pb-2">
          <div className="flex items-center justify-between text-[7.5px] mb-1">
            <span className="text-slate-500 uppercase tracking-wider">Cause contribution</span>
            <span className={`font-black ${c.text}`}>{hs.causeContribution}</span>
          </div>
          <div className="flex justify-between text-[7.5px] text-slate-500 mb-0.5">
            <span>Organ Health</span><span>{hs.healthPct}%</span>
          </div>
          <HealthBar pct={hs.healthPct} sev={hs.severity} />
        </div>
      </motion.div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{children}</div>;
}

function Placeholder({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-white/5 bg-slate-900/30 px-3 py-5 text-center">
      <div className="text-slate-700">{icon}</div>
      <div className="text-[9px] text-slate-600 leading-relaxed">{text}</div>
    </div>
  );
}

function LeftPanel({ layer, setLayer, dataLoaded }: { layer: Layer; setLayer: (l: Layer) => void; dataLoaded: boolean }) {
  return (
    <div className="flex flex-col gap-3 p-3 border-r border-white/5 overflow-y-auto">
      <div>
        <Label>Victim Profile</Label>
        {!dataLoaded ? (
          <Placeholder icon={<FileText className="h-6 w-6" />} text="Awaiting autopsy report…" />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
            className="rounded-lg border border-white/5 bg-slate-900/50 p-2.5 space-y-1.5">
            {[["NAME","R. Suresh"],["AGE","34"],["SEX","Male"],["HEIGHT","174 cm"],["WEIGHT","69 kg"],["BMI","22.8 — Normal"]].map(([k,v]) => (
              <div key={k} className="flex justify-between items-baseline">
                <span className="text-[8px] uppercase tracking-widest text-slate-500">{k}</span>
                <span className="text-[11px] font-medium text-white">{v}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2.5">
        <div className="text-[8px] uppercase tracking-widest text-cyan-500/80 mb-1">Postmortem Interval</div>
        {!dataLoaded
          ? <div className="font-mono text-sm font-bold text-slate-600">— — Hours</div>
          : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="font-mono text-lg font-bold text-cyan-300">8 – 10 Hours</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Vitreous potassium + algor mortis</div>
            </motion.div>
        }
      </div>

      <div>
        <Label>Visualization Layer</Label>
        <div className="space-y-1">
          {LAYERS.map(l => (
            <button key={l.id} onClick={() => setLayer(l.id)}
              className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                layer === l.id ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" : "border border-white/5 bg-slate-900/40 text-slate-400 hover:border-white/10 hover:text-slate-300"}`}>
              <span className={layer === l.id ? "text-cyan-400" : "text-slate-500"}>{l.icon}</span>{l.label}
            </button>
          ))}
        </div>
      </div>

      {dataLoaded && <InsightTicker />}

      <div className="rounded-lg border border-red-500/25 bg-red-950/15 p-2.5">
        <div className="text-[8px] uppercase tracking-widest text-red-400 mb-1">Cause of Death</div>
        {!dataLoaded
          ? <p className="text-[9px] text-slate-600 italic">Upload report to reveal findings</p>
          : <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
              className="text-[9px] text-slate-300 leading-relaxed">
              Blunt force trauma — occipital region with depressed skull fracture and subdural hemorrhage. Secondary: hepatic hemorrhage.
            </motion.p>
        }
      </div>
    </div>
  );
}


// ── Main component ─────────────────────────────────────────────────────────
// ── Main component ─────────────────────────────────────────────────────────

export function AutopsyPanel() {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [closedCriticals, setClosedCriticals] = useState<Set<string>>(new Set());
  const [dynSelected, setDynSelected] = useState<Hotspot | null>(null);
  const [layer, setLayer] = useState<Layer>("organs");
  const containerRef = useRef<HTMLDivElement>(null);
  // Dynamic aspect-ratio: set from the image's naturalWidth/naturalHeight on load
  const [imgRatio, setImgRatio] = useState("3 / 4");

  const [showUpload, setShowUpload] = useState(false);
  const [simPhase, setSimPhase] = useState<SimPhase>("idle");
  const [simProgress, setSimProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const isSimulating = simPhase !== "idle";

  async function handleFile(file: File) {
    setShowUpload(false);
    setFileName(file.name);
    setSimPhase("reading"); setSimProgress(10);
    await new Promise(r => setTimeout(r, 900));
    setSimProgress(25);
    await new Promise(r => setTimeout(r, 500));
    setSimPhase("extracting"); setSimProgress(40);
    await new Promise(r => setTimeout(r, 1100));
    setSimProgress(65);
    await new Promise(r => setTimeout(r, 600));
    setSimPhase("mapping"); setSimProgress(80);
    await new Promise(r => setTimeout(r, 1000));
    setSimProgress(100);
    setSimPhase("complete");
  }

  function handleDismiss() {
    setSimPhase("idle");
    setDataLoaded(true);
  }

  const layerTint = LAYERS.find(l => l.id === layer)?.tint;

  function toggle(hs: Hotspot) {
    if (hs.severity === "critical") {
      setClosedCriticals(prev => { const n = new Set(prev); n.has(hs.id) ? n.delete(hs.id) : n.add(hs.id); return n; });
    } else {
      setDynSelected(prev => prev?.id === hs.id ? null : hs);
    }
  }

  // Active critical hotspots + the dynamically selected one (if it's not critical)
  const activePopups = dataLoaded ? [
    ...HOTSPOTS.filter(h => h.severity === "critical" && !closedCriticals.has(h.id)),
    ...(dynSelected && dynSelected.severity !== "critical" ? [dynSelected] : [])
  ] : [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-xl border border-cyan-900/30 bg-[#04091a] overflow-hidden"
      style={{ boxShadow: "0 0 60px rgba(34,211,238,0.05) inset" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 bg-slate-950/60">
        <div>
          <div className="flex items-center gap-3">
            <Eye className="h-3.5 w-3.5 text-cyan-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400">Forensic Autopsy Visualization</span>
            <span className="rounded border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-mono text-[9px] text-cyan-400">CASE C-2041</span>
            {dataLoaded && <span className="rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 font-mono text-[9px] text-emerald-400 flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5" />REPORT LOADED</span>}
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5 ml-6">Report: 26 Apr 2025 · 23:47 &nbsp;|&nbsp; Pathologist: Dr. K. Meenakshi, CFSL Chennai</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-3 py-1.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
            style={{ boxShadow: "0 0 16px rgba(34,211,238,0.15)" }}
          >
            {isSimulating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Upload Autopsy
          </button>
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-cyan-500" />
            <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase">{LAYERS.find(l => l.id === layer)?.label}</span>
            <div className={`h-1.5 w-1.5 rounded-full ml-1 ${dataLoaded ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            <span className={`text-[9px] font-semibold ${dataLoaded ? "text-emerald-400" : "text-slate-600"}`}>{dataLoaded ? "AI ACTIVE" : "STANDBY"}</span>
          </div>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid" style={{ gridTemplateColumns: "190px 1fr 250px", minHeight: 800 }}>
        <LeftPanel layer={layer} setLayer={setLayer} dataLoaded={dataLoaded} />

        {/* Center */}
        <div
          className="relative bg-black overflow-hidden flex items-center justify-center"
          style={{ height: 800 }}
          onClick={e => { if (e.target === e.currentTarget) setDynSelected(null); }}
        >
          {/* Grid overlay and corner brackets span the full column */}
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ backgroundImage: "linear-gradient(rgba(34,211,238,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.06) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
          {[["top-2 left-2","border-t border-l"],["top-2 right-2","border-t border-r"],["bottom-2 left-2","border-b border-l"],["bottom-2 right-2","border-b border-r"]].map(([pos, border]) => (
            <div key={pos} className={`absolute ${pos} ${border} border-cyan-500/40 w-5 h-5 pointer-events-none`} />
          ))}
          <ScanLine />

          {/*
            Inner image+markers container — sized to the anatomy image's natural aspect ratio
            so that all hotspot x%/y% coordinates land precisely on the body.
            anatomy.jpeg is portrait; adjust the ratio below if your image differs.
          */}
          <div
            ref={containerRef}
            className="relative"
            style={{ height: "100%", aspectRatio: imgRatio, maxWidth: "100%" }}
            onClick={e => { if (e.target === e.currentTarget) setDynSelected(null); }}
          >
            <img
              src={anatomyImg}
              alt="Anatomy model"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
              style={{ opacity: 0.92 }}
              onLoad={e => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                if (w && h) setImgRatio(`${w} / ${h}`);
              }}
            />
            {layerTint && <div className="absolute inset-0 pointer-events-none" style={{ background: layerTint, mixBlendMode: "screen" }} />}
            {dataLoaded && layer === "heatmap" && <HeatmapOverlay hotspots={HOTSPOTS} />}

            {dataLoaded && HOTSPOTS.map(hs => {
              const isActive = activePopups.some(p => p.id === hs.id);
              return <HotspotMarker key={hs.id} hs={hs} active={isActive} layer={layer} onClick={() => toggle(hs)} />;
            })}
            {/* Forensic popups — float over the margins so they don't overlap the body center */}
            <AnimatePresence>
              {activePopups.map(hs => (
                <ForensicPopup
                  key={hs.id}
                  hs={hs}
                  onClose={() => toggle(hs)}
                  containerRef={containerRef}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Empty state overlay — spans the full column */}
          <AnimatePresence>
            {!dataLoaded && !isSimulating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-500/20 bg-black/65 px-8 py-6 backdrop-blur-sm text-center"
                  style={{ boxShadow: "0 0 40px rgba(34,211,238,0.06)" }}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/50"
                    style={{ boxShadow: "0 0 20px rgba(34,211,238,0.15)" }}>
                    <Upload className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-[12px] font-black uppercase tracking-[0.18em] text-cyan-400">Upload Autopsy Report</div>
                    <div className="mt-1 text-[10px] text-slate-500 max-w-[220px] leading-relaxed">
                      Upload any report to reveal organ damage markers, injury cards, and AI forensic analysis
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                    {["Organ markers","Injury cards","Heatmap","AI insights"].map(f => (
                      <span key={f} className="rounded-full border border-cyan-500/20 bg-cyan-950/30 px-2 py-0.5 text-[8px] text-cyan-500/70 uppercase tracking-wider">{f}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            <span className="text-[8px] font-mono text-cyan-500/50 tracking-widest uppercase">
              {dataLoaded
                ? `${HOTSPOTS.filter(h => h.severity === "critical").length} Critical · ${HOTSPOTS.filter(h => h.severity !== "low").length} Active Markers`
                : "Awaiting report upload — no markers loaded"}
            </span>
          </div>

          <AnimatePresence>
            {showUpload && !isSimulating && (
              <UploadModal key="upload-modal" onFile={handleFile} onClose={() => setShowUpload(false)} />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {isSimulating && (
              <SimOverlay key="sim" phase={simPhase} fileName={fileName} progress={simProgress} onDismiss={handleDismiss} />
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel — permanent organ health status + legend + findings */}
        <div className="flex flex-col gap-0 p-3 border-l border-white/5">
          <Label>Organ Health Status</Label>
          {!dataLoaded ? (
            <Placeholder icon={<Activity className="h-6 w-6" />} text="Upload a report to populate organ health data" />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mb-3">
              {HOTSPOTS.filter(h => h.weight && h.weight !== "N/A").map((h, i) => {
                const isActive = activePopups.some(p => p.id === h.id);
                return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => toggle(h)}
                  className="cursor-pointer rounded-lg border px-2 py-1.5 transition-all mb-1.5"
                  style={{
                    background: isActive ? `rgba(4,9,28,0.95)` : "rgba(15,23,42,0.5)",
                    borderColor: isActive ? SEV[h.severity].ring + "80" : "rgba(255,255,255,0.05)",
                    boxShadow: isActive ? `0 0 10px ${SEV[h.severity].glow}30` : "none",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-white">{h.name}</span>
                    <SevBadge s={h.severity} />
                  </div>
                  <div className="text-[7.5px] text-slate-500 mb-1.5">Weight: {h.weight}</div>
                  <HealthBar pct={h.healthPct} sev={h.severity} />
                </motion.div>
                );
              })}
            </motion.div>
          )}

          <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2 mb-2">
            <Label>Severity Legend</Label>
            <div className="space-y-1.5 mt-1">
              {(["critical","high","medium","low"] as Sev[]).map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ background: SEV[s].ring, boxShadow: `0 0 6px ${SEV[s].glow}` }} />
                  <span className="text-[8px] capitalize text-slate-400">
                    {s === "critical" ? "Critical — Primary COD" : s === "high" ? "High — Significant" : s === "medium" ? "Medium — Contributing" : "Low — No Impact"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {dataLoaded && (
            <div>
              <Label>Key Forensic Findings</Label>
              <ul className="space-y-1">
                {[
                  "3 patterned blunt impacts — iron rod",
                  "Hemoperitoneum ~1,200 ml confirmed",
                  "Post-mortem relocation via livor mortis",
                  "Trace diazepam — pre-assault sedation",
                  "DNA match S-118 at 99.2% on weapon",
                  "Defensive wounds: victim conscious",
                ].map((f, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex gap-1.5 text-[8px] text-slate-400 leading-snug"
                  >
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500/70" />{f}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bottom table */}
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Wind className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Comprehensive Injury & Organ Analysis Table</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="border-b border-white/5">
                {["Region","Injury Type","Bleeding","Fracture","Fluid / Tox","Cause Contribution","Health %"].map(h => (
                  <th key={h} className="pb-1.5 text-left font-semibold uppercase tracking-wider text-slate-500 pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!dataLoaded ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-6 w-6 text-slate-700" />
                      <span className="text-[10px] text-slate-600">Upload a report to populate this table</span>
                    </div>
                  </td>
                </tr>
              ) : HOTSPOTS.map((h, i) => {
                const c = SEV[h.severity];
                return (
                  <motion.tr key={h.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => toggle(h)}
                    className={`border-b border-white/4 cursor-pointer hover:bg-white/4 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
                  >
                    <td className="py-1.5 pr-3 font-semibold text-white whitespace-nowrap">{h.name}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{h.injuryType}</td>
                    <td className={`py-1.5 pr-3 ${h.bleeding !== "None" && h.bleeding !== "None (post-mortem)" ? c.text : "text-slate-600"}`}>{h.bleeding}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{h.fracture}</td>
                    <td className="py-1.5 pr-3 text-fuchsia-400">{h.toxicology && h.toxicology !== "None" ? h.toxicology : h.fluid && h.fluid !== "None" ? h.fluid : "—"}</td>
                    <td className={`py-1.5 pr-3 font-bold ${c.text}`}>{h.causeContribution}</td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${h.healthPct}%`, background: c.ring }} />
                        </div>
                        <span className={`font-mono ${c.text}`}>{h.healthPct}%</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes hotspot-ping {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(1.8); opacity: 0;   }
          100% { transform: scale(1);   opacity: 0;   }
        }
      `}</style>
    </motion.div>
  );
}
