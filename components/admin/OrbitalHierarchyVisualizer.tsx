"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  Clock,
  Radio,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HierarchyHODNode,
  HierarchyBranchNode,
  HierarchyTLNode,
  HierarchyTMNode,
  HierarchyNodeMetrics,
} from "@/lib/actions/super-admin-hierarchy";

export type SelectedNodeType =
  | { type: "HOD"; data: HierarchyHODNode }
  | { type: "BRANCH"; data: HierarchyBranchNode; parentHOD: HierarchyHODNode }
  | { type: "TL"; data: HierarchyTLNode; parentBranch: HierarchyBranchNode; parentHOD: HierarchyHODNode }
  | { type: "TM"; data: HierarchyTMNode; parentTL: HierarchyTLNode; parentBranch: HierarchyBranchNode; parentHOD: HierarchyHODNode };

interface OrbitalHierarchyVisualizerProps {
  hod: HierarchyHODNode;
  selectedNode: SelectedNodeType | null;
  onSelectNode: (node: SelectedNodeType) => void;
}

export function OrbitalHierarchyVisualizer({
  hod,
  selectedNode,
  onSelectNode,
}: OrbitalHierarchyVisualizerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tlOffset, setTlOffset] = useState(0);
  const [tmOffset, setTmOffset] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Active Lineage tracking based on selected node
  const activeBranchId = useMemo(() => {
    if (!selectedNode) return hod.branches[0]?.id || null;
    if (selectedNode.type === "BRANCH") return selectedNode.data.id;
    if (selectedNode.type === "TL") return selectedNode.parentBranch.id;
    if (selectedNode.type === "TM") return selectedNode.parentBranch.id;
    return hod.branches[0]?.id || null;
  }, [selectedNode, hod]);

  const activeTLId = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.type === "TL") return selectedNode.data.id;
    if (selectedNode.type === "TM") return selectedNode.parentTL.id;
    return null;
  }, [selectedNode]);

  const activeTMId = useMemo(() => {
    if (selectedNode?.type === "TM") return selectedNode.data.id;
    return null;
  }, [selectedNode]);

  // Current active Branch & TL objects
  const currentBranch = useMemo(() => {
    return hod.branches.find((b) => b.id === activeBranchId) || hod.branches[0] || null;
  }, [hod, activeBranchId]);

  const currentTL = useMemo(() => {
    if (!currentBranch) return null;
    if (activeTLId) {
      return currentBranch.teamLeaders.find((tl) => tl.id === activeTLId) || currentBranch.teamLeaders[0] || null;
    }
    return currentBranch.teamLeaders[0] || null;
  }, [currentBranch, activeTLId]);

  // Tier 1: HOD position
  const hodPos = { x: 500, y: 95 };

  // Tier 2: Branches on upper elliptical arc
  const branchPositions = useMemo(() => {
    const branches = hod.branches;
    const count = branches.length;
    const spanAngle = Math.min(Math.PI * 0.7, 0.25 * count * Math.PI);
    const startAngle = Math.PI / 2 - spanAngle / 2;

    return branches.map((branch, idx) => {
      const angle = count === 1 ? Math.PI / 2 : startAngle + (idx / (count - 1)) * spanAngle;
      const x = 500 + 320 * Math.cos(angle);
      const y = 220 + 40 * Math.sin(angle);
      return { branch, x, y };
    });
  }, [hod.branches]);

  // Tier 3: TLs on middle elliptical arc (filtered by currentBranch)
  const visibleTLs = useMemo(() => {
    return currentBranch?.teamLeaders || [];
  }, [currentBranch]);

  const tlPositions = useMemo(() => {
    const count = visibleTLs.length;
    const maxVisible = 6;
    const slice = visibleTLs.slice(tlOffset, tlOffset + maxVisible);
    const visibleCount = slice.length;
    const spanAngle = Math.min(Math.PI * 0.8, 0.2 * visibleCount * Math.PI);
    const startAngle = Math.PI / 2 - spanAngle / 2;

    return slice.map((tl, idx) => {
      const angle = visibleCount === 1 ? Math.PI / 2 : startAngle + (idx / (visibleCount - 1)) * spanAngle;
      const x = 500 + 430 * Math.cos(angle);
      const y = 370 + 60 * Math.sin(angle);
      return { tl, x, y };
    });
  }, [visibleTLs, tlOffset]);

  // Tier 4: TMs on outer elliptical arc (filtered by currentTL)
  const visibleTMs = useMemo(() => {
    return currentTL?.teamMembers || [];
  }, [currentTL]);

  const tmPositions = useMemo(() => {
    const count = visibleTMs.length;
    const maxVisible = 10;
    const slice = visibleTMs.slice(tmOffset, tmOffset + maxVisible);
    const visibleCount = slice.length;
    const spanAngle = Math.min(Math.PI * 0.9, 0.12 * visibleCount * Math.PI);
    const startAngle = Math.PI / 2 - spanAngle / 2;

    return slice.map((tm, idx) => {
      const angle = visibleCount === 1 ? Math.PI / 2 : startAngle + (idx / (visibleCount - 1)) * spanAngle;
      const x = 500 + 520 * Math.cos(angle);
      const y = 540 + 75 * Math.sin(angle);
      return { tm, x, y };
    });
  }, [visibleTMs, tmOffset]);

  // Connector Paths
  // 1. HOD to Active Branch
  const activeBranchPos = branchPositions.find((bp) => bp.branch.id === activeBranchId) || branchPositions[0];

  // 2. Active Branch to Active TL (or all TLs)
  const activeTLPos = tlPositions.find((tp) => tp.tl.id === currentTL?.id);

  // Search filter matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const set = new Set<string>();

    if (hod.name.toLowerCase().includes(q)) set.add(hod.id);

    for (const b of hod.branches) {
      if (b.name.toLowerCase().includes(q)) set.add(b.id);
      for (const tl of b.teamLeaders) {
        if (tl.name.toLowerCase().includes(q) || tl.email.toLowerCase().includes(q)) set.add(tl.id);
        for (const tm of tl.teamMembers) {
          if (tm.name.toLowerCase().includes(q) || tm.email.toLowerCase().includes(q)) set.add(tm.id);
        }
      }
    }
    return set;
  }, [searchQuery, hod]);

  return (
    <div className="relative w-full h-full min-h-[580px] lg:min-h-[640px] flex flex-col items-center justify-between bg-gradient-to-b from-[#FCFAF7] via-[#F4F7F9] to-[#EAEFF2] rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden select-none">
      {/* Background radial dome grid lines and ambient glow (Ref: Image 1) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[#ACCAD5]/25 blur-3xl opacity-70" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] rounded-full bg-[#F0944D]/10 blur-3xl opacity-60" />
      </div>

      {/* Top Floating Control Bar */}
      <div className="relative z-20 w-full px-5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search hierarchy by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-white/90 border border-slate-200 text-slate-800 placeholder-slate-400 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#F0944D]/30 focus:border-[#F0944D] backdrop-blur-md transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Legend / Status Badges */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/80 border border-slate-200/70 text-[11px] font-semibold text-slate-700 shadow-xs backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#F0944D] animate-pulse" />
            <span>Active Lineage</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/80 border border-slate-200/70 text-[11px] font-semibold text-slate-700 shadow-xs backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Clocked-in</span>
          </div>
          <button
            onClick={() => onSelectNode({ type: "HOD", data: hod })}
            className="px-2.5 py-1 rounded-xl bg-white/90 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 shadow-xs backdrop-blur-md cursor-pointer transition-all"
            title="Focus Head of Sales apex"
          >
            Reset to Apex
          </button>
        </div>
      </div>

      {/* Central SVG Interactive Canvas */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center">
        <svg
          viewBox="0 0 1000 660"
          className="w-full h-full max-h-[640px] drop-shadow-sm select-none"
        >
          <defs>
            {/* Glowing filter for active lineage connector root lines */}
            <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear gradients */}
            <linearGradient id="rootLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F0944D" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#E26A1B" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="idleLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CBDDE4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#9BB8C4" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Perspective Dome Longitudes (Radiating lines from Apex) */}
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((step) => {
            const bottomX = 500 + step * 110;
            return (
              <path
                key={step}
                d={`M 500 95 Q ${500 + step * 40} 340 ${bottomX} 620`}
                fill="none"
                stroke="#ACCAD5"
                strokeOpacity="0.25"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            );
          })}

          {/* Concentric Latitudinal Orbital Arcs (Ellipses) */}
          {/* Tier 1 Hub Circle */}
          <ellipse cx="500" cy="95" rx="55" ry="18" fill="none" stroke="#ACCAD5" strokeOpacity="0.4" strokeWidth="1.2" />

          {/* Tier 2 Branch Arc */}
          <ellipse cx="500" cy="220" rx="320" ry="42" fill="none" stroke="#ACCAD5" strokeOpacity="0.35" strokeWidth="1.2" />

          {/* Tier 3 TL Arc */}
          <ellipse cx="500" cy="370" rx="430" ry="62" fill="none" stroke="#ACCAD5" strokeOpacity="0.3" strokeWidth="1.2" />

          {/* Tier 4 TM Arc */}
          <ellipse cx="500" cy="540" rx="520" ry="78" fill="none" stroke="#ACCAD5" strokeOpacity="0.25" strokeWidth="1.2" />

          {/* ---------------------------------------------------- */}
          {/* CONNECTOR PATHS (Curved Bezier Root Lines) */}
          {/* ---------------------------------------------------- */}

          {/* 1. HOD to All Branches */}
          {branchPositions.map((bp) => {
            const isActive = bp.branch.id === activeBranchId;
            return (
              <motion.path
                key={`line-hod-${bp.branch.id}`}
                d={`M 500 120 C 500 160, ${bp.x} 170, ${bp.x} ${bp.y - 25}`}
                fill="none"
                stroke={isActive ? "url(#rootLineGradient)" : "url(#idleLineGradient)"}
                strokeWidth={isActive ? 3 : 1.2}
                filter={isActive ? "url(#glow-orange)" : undefined}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6 }}
              />
            );
          })}

          {/* 2. Active Branch to its TLs */}
          {activeBranchPos &&
            tlPositions.map((tp) => {
              const isActive = tp.tl.id === currentTL?.id;
              return (
                <motion.path
                  key={`line-branch-${tp.tl.id}`}
                  d={`M ${activeBranchPos.x} ${activeBranchPos.y + 25} C ${activeBranchPos.x} ${
                    (activeBranchPos.y + tp.y) / 2
                  }, ${tp.x} ${(activeBranchPos.y + tp.y) / 2}, ${tp.x} ${tp.y - 25}`}
                  fill="none"
                  stroke={isActive ? "url(#rootLineGradient)" : "url(#idleLineGradient)"}
                  strokeWidth={isActive ? 3 : 1.2}
                  filter={isActive ? "url(#glow-orange)" : undefined}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6 }}
                />
              );
            })}

          {/* 3. Active TL to its TMs */}
          {activeTLPos &&
            tmPositions.map((tmp) => {
              const isActive = tmp.tm.id === activeTMId;
              return (
                <motion.path
                  key={`line-tl-${tmp.tm.id}`}
                  d={`M ${activeTLPos.x} ${activeTLPos.y + 25} C ${activeTLPos.x} ${
                    (activeTLPos.y + tmp.y) / 2
                  }, ${tmp.x} ${(activeTLPos.y + tmp.y) / 2}, ${tmp.x} ${tmp.y - 25}`}
                  fill="none"
                  stroke={isActive ? "url(#rootLineGradient)" : "url(#idleLineGradient)"}
                  strokeWidth={isActive ? 3 : 1.2}
                  filter={isActive ? "url(#glow-orange)" : undefined}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6 }}
                />
              );
            })}

          {/* ---------------------------------------------------- */}
          {/* TIER 1: SALES HOD (Apex Rotating Hub) */}
          {/* ---------------------------------------------------- */}
          <g
            className="cursor-pointer group"
            onClick={() => onSelectNode({ type: "HOD", data: hod })}
            onMouseEnter={() => setHoveredNode(hod.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            {/* Halo Ring */}
            <circle
              cx={hodPos.x}
              cy={hodPos.y}
              r={32}
              fill="white"
              stroke={selectedNode?.type === "HOD" ? "#F0944D" : "#ACCAD5"}
              strokeWidth={selectedNode?.type === "HOD" ? 4 : 2}
              className="transition-all filter drop-shadow-md"
            />
            {/* Inner Avatar Graphic */}
            <circle
              cx={hodPos.x}
              cy={hodPos.y}
              r={25}
              fill="#EBF3F6"
            />
            <text
              x={hodPos.x}
              y={hodPos.y + 5}
              textAnchor="middle"
              className="text-xs font-bold fill-[#274854]"
            >
              {hod.name.charAt(0)}
            </text>
            {/* Active Glow Badge */}
            <circle
              cx={hodPos.x + 18}
              cy={hodPos.y + 18}
              r={6}
              fill="#F0944D"
              stroke="white"
              strokeWidth={1.5}
            />
            <text
              x={hodPos.x}
              y={hodPos.y + 45}
              textAnchor="middle"
              className="text-[11px] font-bold fill-slate-800"
            >
              {hod.name} (HOD)
            </text>
            <text
              x={hodPos.x}
              y={hodPos.y + 57}
              textAnchor="middle"
              className="text-[9px] font-semibold fill-slate-500"
            >
              ₹{(hod.metrics.achievedAmount / 100000).toFixed(1)}L • {hod.metrics.attainmentRate}% Target
            </text>
          </g>

          {/* ---------------------------------------------------- */}
          {/* TIER 2: BRANCHES (Ring 2) */}
          {/* ---------------------------------------------------- */}
          {branchPositions.map(({ branch, x, y }) => {
            const isSelected = selectedNode?.type === "BRANCH" && selectedNode.data.id === branch.id;
            const isActiveLineage = branch.id === activeBranchId;
            const isMatch = searchMatches.has(branch.id);

            return (
              <g
                key={branch.id}
                className="cursor-pointer group"
                onClick={() =>
                  onSelectNode({
                    type: "BRANCH",
                    data: branch,
                    parentHOD: hod,
                  })
                }
                onMouseEnter={() => setHoveredNode(branch.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={26}
                  fill="white"
                  stroke={isSelected || isActiveLineage ? "#F0944D" : "#CBDDE4"}
                  strokeWidth={isSelected || isActiveLineage ? 3.5 : 1.5}
                  className="transition-all filter drop-shadow-sm hover:scale-105"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={20}
                  fill={isActiveLineage ? "#FFF5EE" : "#F4F7F9"}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-extrabold",
                    isActiveLineage ? "fill-[#C66318]" : "fill-slate-700"
                  )}
                >
                  {branch.code}
                </text>
                <text
                  x={x}
                  y={y + 36}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-slate-800"
                >
                  {branch.name.replace(/Headquarters\s*-\s*/i, "")}
                </text>
                <text
                  x={x}
                  y={y + 47}
                  textAnchor="middle"
                  className="text-[8.5px] font-semibold fill-slate-500"
                >
                  {branch.teamLeaders.length} TLs • {branch.metrics.attainmentRate}% Attain
                </text>
              </g>
            );
          })}

          {/* ---------------------------------------------------- */}
          {/* TIER 3: TEAM LEADERS (Ring 3) */}
          {/* ---------------------------------------------------- */}
          {tlPositions.map(({ tl, x, y }) => {
            const isSelected = selectedNode?.type === "TL" && selectedNode.data.id === tl.id;
            const isActiveLineage = tl.id === currentTL?.id;
            const isOnline = tl.metrics.attendanceStatus === "ACTIVE" || tl.metrics.attendanceStatus === "MEETING_MODE";
            const isMatch = searchMatches.has(tl.id);

            return (
              <g
                key={tl.id}
                className="cursor-pointer group"
                onClick={() =>
                  onSelectNode({
                    type: "TL",
                    data: tl,
                    parentBranch: currentBranch!,
                    parentHOD: hod,
                  })
                }
                onMouseEnter={() => setHoveredNode(tl.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={24}
                  fill="white"
                  stroke={isSelected || isActiveLineage ? "#F0944D" : "#CBDDE4"}
                  strokeWidth={isSelected || isActiveLineage ? 3.5 : 1.5}
                  className="transition-all filter drop-shadow-sm hover:scale-105"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={18}
                  fill={isOnline ? "#ECFDF5" : "#F8FAFC"}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-bold",
                    isOnline ? "fill-emerald-800" : "fill-slate-700"
                  )}
                >
                  {tl.name.charAt(0)}
                </text>
                {/* Online indicator dot */}
                {isOnline && (
                  <circle cx={x + 14} cy={y + 14} r={4.5} fill="#10B981" stroke="white" strokeWidth={1} />
                )}
                <text
                  x={x}
                  y={y + 34}
                  textAnchor="middle"
                  className="text-[9.5px] font-bold fill-slate-800"
                >
                  {tl.name}
                </text>
                <text
                  x={x}
                  y={y + 45}
                  textAnchor="middle"
                  className="text-[8px] font-medium fill-slate-500"
                >
                  {tl.teamMembers.length} TMs • {tl.metrics.attainmentRate}%
                </text>
              </g>
            );
          })}

          {/* ---------------------------------------------------- */}
          {/* TIER 4: TEAM MEMBERS (BDMs / CDMs) (Ring 4) */}
          {/* ---------------------------------------------------- */}
          {tmPositions.map(({ tm, x, y }) => {
            const isSelected = selectedNode?.type === "TM" && selectedNode.data.id === tm.id;
            const isOnline = tm.metrics.attendanceStatus === "ACTIVE" || tm.metrics.attendanceStatus === "MEETING_MODE";
            const isMatch = searchMatches.has(tm.id);

            return (
              <g
                key={tm.id}
                className="cursor-pointer group"
                onClick={() =>
                  onSelectNode({
                    type: "TM",
                    data: tm,
                    parentTL: currentTL!,
                    parentBranch: currentBranch!,
                    parentHOD: hod,
                  })
                }
                onMouseEnter={() => setHoveredNode(tm.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={21}
                  fill="white"
                  stroke={isSelected ? "#F0944D" : isMatch ? "#ACCAD5" : "#E2E8F0"}
                  strokeWidth={isSelected ? 3.5 : isMatch ? 2.5 : 1.2}
                  className="transition-all filter drop-shadow-xs hover:scale-110"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={16}
                  fill={isSelected ? "#FFF5EE" : isOnline ? "#ECFDF5" : "#F8FAFC"}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  className={cn(
                    "text-[9px] font-bold",
                    isSelected ? "fill-[#C66318]" : isOnline ? "fill-emerald-800" : "fill-slate-600"
                  )}
                >
                  {tm.name.charAt(0)}
                </text>
                {/* Online indicator */}
                {isOnline && (
                  <circle cx={x + 12} cy={y + 12} r={4} fill="#10B981" stroke="white" strokeWidth={1} />
                )}
                {/* Text Label */}
                <text
                  x={x}
                  y={y + 32}
                  textAnchor="middle"
                  className={cn(
                    "text-[8.5px] font-semibold transition-all",
                    isSelected ? "fill-[#C66318] font-bold" : "fill-slate-700"
                  )}
                >
                  {tm.name.split(" ")[0]}
                </text>
                <text
                  x={x}
                  y={y + 42}
                  textAnchor="middle"
                  className="text-[7.5px] font-medium fill-slate-400"
                >
                  {tm.metrics.attainmentRate}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Ring Rotation Arrow Controls on Left and Right (Ref: Image 1) */}
        {visibleTMs.length > 10 && (
          <>
            <button
              onClick={() => setTmOffset((prev) => Math.max(0, prev - 2))}
              disabled={tmOffset === 0}
              className="absolute left-6 bottom-16 w-9 h-9 rounded-full bg-white/90 border border-slate-200/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-30 cursor-pointer backdrop-blur-md transition-all"
              title="Rotate Ring Left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setTmOffset((prev) => Math.min(visibleTMs.length - 10, prev + 2))}
              disabled={tmOffset >= visibleTMs.length - 10}
              className="absolute right-6 bottom-16 w-9 h-9 rounded-full bg-white/90 border border-slate-200/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-30 cursor-pointer backdrop-blur-md transition-all"
              title="Rotate Ring Right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Context Bar */}
      <div className="relative z-20 w-full px-5 py-3 border-t border-slate-200/70 bg-white/70 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">Current Focus:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#ACCAD5]/20 text-[#274854] font-semibold border border-[#ACCAD5]/40">
            {selectedNode?.type === "HOD" && "Entire Sales Department"}
            {selectedNode?.type === "BRANCH" && `${selectedNode.data.name}`}
            {selectedNode?.type === "TL" && `Team Leader: ${selectedNode.data.name}`}
            {selectedNode?.type === "TM" && `BDM: ${selectedNode.data.name}`}
            {!selectedNode && "Head of Sales (Apex)"}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          💡 Click any node on any orbit (HOD → Branch → TL → BDM) to open their live 1-on-1 Performance Report Card.
        </p>
      </div>
    </div>
  );
}
