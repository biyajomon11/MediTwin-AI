import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, BookOpen, ArrowLeft, Calendar, Tag,
  Building, ShieldCheck, Info, XCircle, Loader2, RefreshCw,
  SortAsc, FileText, DownloadCloud,
} from 'lucide-react';
import type { ClinicalGuideline, GuidelineCategory } from '../../types';
import { getGuidelines } from '../../services/doctorService';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const CATEGORIES: GuidelineCategory[] = [
  'General Medicine', 'Emergency Care', 'Nursing Procedures',
  'Medication Guidelines', 'Infection Control', 'Patient Safety', 'Hospital Procedures',
];

const DEPARTMENTS = ['All Departments', 'Cardiology', 'General Medicine', 'Oncology', 'Pediatrics'];

const CATEGORY_COLORS: Record<GuidelineCategory, string> = {
  'General Medicine':     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Emergency Care':       'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'Nursing Procedures':   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Medication Guidelines':'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Infection Control':    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Patient Safety':       'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Hospital Procedures':  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

const ACCESS_COLORS = {
  'All Staff':     'bg-emerald-500/20 text-emerald-300',
  'Medical Staff': 'bg-blue-500/20 text-blue-300',
  'Doctors Only':  'bg-purple-500/20 text-purple-300',
};

// ─────────────────────────────────────────────────────────────
// Guideline Viewer
// ─────────────────────────────────────────────────────────────
const GuidelineViewer: React.FC<{
  guideline: ClinicalGuideline;
  onBack: () => void;
}> = ({ guideline, onBack }) => (
  <div className="space-y-6">
    {/* Back */}
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-semibold transition-colors"
    >
      <ArrowLeft className="w-4 h-4" /> Back to Guidelines
    </button>

    {/* Header */}
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 border border-accent/30 space-y-4"
    >
      <div className="flex flex-wrap gap-2 items-start justify-between">
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${CATEGORY_COLORS[guideline.category]}`}>
            {guideline.category}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ACCESS_COLORS[guideline.accessLevel]}`}>
            <ShieldCheck className="w-3 h-3 inline mr-1" />{guideline.accessLevel}
          </span>
        </div>

        {/* Download — disabled in demo */}
        <button
          disabled
          title="Download unavailable in demo mode"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-xs font-semibold cursor-not-allowed opacity-50"
        >
          <DownloadCloud className="w-4 h-4" />Download
          <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-white/10">Demo</span>
        </button>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-white">{guideline.title}</h2>
        <p className="text-sm text-gray-300 mt-1">{guideline.description}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/10 text-xs">
        <div><p className="text-gray-500 mb-0.5">Department</p><p className="text-white font-semibold">{guideline.department}</p></div>
        <div><p className="text-gray-500 mb-0.5">Version</p><p className="text-white font-semibold">v{guideline.version}</p></div>
        <div><p className="text-gray-500 mb-0.5">Effective Date</p><p className="text-white font-semibold">{fmtDate(guideline.effectiveDate)}</p></div>
        <div><p className="text-gray-500 mb-0.5">Last Updated</p><p className="text-white font-semibold">{fmtDate(guideline.lastUpdated)}</p></div>
        <div className="col-span-2"><p className="text-gray-500 mb-0.5">Uploaded By</p><p className="text-white font-semibold">{guideline.uploadedBy}</p></div>
      </div>

      {guideline.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
          {guideline.tags.map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400">#{t}</span>
          ))}
        </div>
      )}
    </motion.div>

    {/* Read-only notice */}
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
      <Info className="w-4 h-4 flex-shrink-0" />
      You have read-only access to clinical guidelines. Modifications are managed by the Hospital Administrator.
    </div>

    {/* Content */}
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card p-6 border border-white/10"
    >
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-accent" />Guideline Content
      </h3>
      <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">{guideline.content}</pre>
    </motion.div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Main Clinical Guidelines Page
// ─────────────────────────────────────────────────────────────
export const ClinicalGuidelinesPage: React.FC = () => {
  const [guidelines, setGuidelines]       = useState<ClinicalGuideline[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [selected, setSelected]           = useState<ClinicalGuideline | null>(null);

  const [search, setSearch]               = useState('');
  const [category, setCategory]           = useState<GuidelineCategory | ''>('');
  const [department, setDepartment]       = useState('');
  const [sortBy, setSortBy]               = useState<'lastUpdated' | 'title'>('lastUpdated');

  const fetchGuidelines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGuidelines({ search, category, department, sortBy });
      setGuidelines(data);
    } catch {
      setError('Failed to load clinical guidelines. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, category, department, sortBy]);

  useEffect(() => { fetchGuidelines(); }, [fetchGuidelines]);

  if (selected) {
    return <GuidelineViewer guideline={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent" /> Clinical Guidelines
          </h1>
          <p className="text-sm text-gray-400 mt-1">Hospital-approved guidelines — read-only access for doctors</p>
        </div>
        <button onClick={fetchGuidelines} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guidelines, categories, tags..."
            className="glass-input w-full pl-9 pr-4 py-2.5 text-sm text-white"
          />
        </div>
        {/* Category */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={category} onChange={(e) => setCategory(e.target.value as GuidelineCategory | '')}
            className="glass-input w-full pl-8 pr-3 py-2.5 text-sm text-white appearance-none"
          >
            <option value="" className="bg-[#0F172A]">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0F172A]">{c}</option>)}
          </select>
        </div>
        {/* Department */}
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={department} onChange={(e) => setDepartment(e.target.value === 'All Departments' ? '' : e.target.value)}
            className="glass-input w-full pl-8 pr-3 py-2.5 text-sm text-white appearance-none"
          >
            {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-[#0F172A]">{d}</option>)}
          </select>
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <SortAsc className="w-4 h-4" />
        <span>Sort by:</span>
        {[{ v: 'lastUpdated', l: 'Latest Updated' }, { v: 'title', l: 'Title A-Z' }].map(({ v, l }) => (
          <button
            key={v}
            onClick={() => setSortBy(v as 'lastUpdated' | 'title')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === v ? 'bg-primary text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-sm text-gray-400">Loading clinical guidelines...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="glass-card p-6 border border-rose-500/30 bg-rose-500/10 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-300 flex-1">{error}</p>
          <button onClick={fetchGuidelines} className="text-xs text-accent font-semibold hover:underline">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && guidelines.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center"
        >
          <BookOpen className="w-12 h-12 text-gray-600" />
          <h3 className="text-lg font-bold text-white">No guidelines found</h3>
          <p className="text-sm text-gray-400">Try adjusting your search or filter criteria.</p>
        </motion.div>
      )}

      {/* Guideline Cards */}
      {!loading && !error && guidelines.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">{guidelines.length} guideline{guidelines.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {guidelines.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-interactive p-5 border border-white/10 flex flex-col gap-3"
              >
                {/* Category badge */}
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${CATEGORY_COLORS[g.category]}`}>
                    {g.category}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ACCESS_COLORS[g.accessLevel]}`}>
                    {g.accessLevel}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white leading-snug">{g.title}</h3>
                <p className="text-xs text-gray-400 line-clamp-2">{g.description}</p>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-y-1 text-[11px] text-gray-400 border-t border-white/10 pt-3">
                  <span className="flex items-center gap-1.5"><Building className="w-3 h-3" />{g.department}</span>
                  <span className="flex items-center gap-1.5"><Tag className="w-3 h-3" />v{g.version}</span>
                  <span className="flex items-center gap-1.5 col-span-2">
                    <Calendar className="w-3 h-3" />Updated: {fmtDate(g.lastUpdated)}
                  </span>
                </div>

                {/* Tags */}
                {g.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {g.tags.slice(0, 4).map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">#{t}</span>
                    ))}
                  </div>
                )}

                {/* View button */}
                <button
                  onClick={() => setSelected(g)}
                  className="mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/80 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />View Guideline
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
