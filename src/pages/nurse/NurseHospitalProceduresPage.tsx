import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Search,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Stethoscope,
  ChevronRight,
  X,
  RotateCcw,
  ShieldCheck,
  FileText,
  Loader2,
  AlertCircle,
  Check,
  Layers,
} from 'lucide-react';
import * as nurseService from '../../services/nurseService';
import type {
  HospitalProcedureSummary,
  HospitalProcedureDetail,
  HospitalProcedureCategoryItem,
  HospitalProcedureDepartmentItem,
  HospitalProcedureScope,
  HospitalProcedureMetrics,
  HospitalProcedurePagination,
} from '../../types';

// Category color mapping for healthcare badges
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Infection Control': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  'Emergency Procedures': {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400',
  },
  'Medication Safety': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  'Nursing Procedures': {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400',
  },
  'Patient Safety': {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    dot: 'bg-indigo-400',
  },
  'Clinical Care': {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-400',
  },
  'Wound Care': {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    dot: 'bg-teal-400',
  },
  'Vital Monitoring': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
  },
  'Discharge Procedures': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
  },
  'Admission Procedures': {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    dot: 'bg-violet-400',
  },
  Documentation: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
  },
};

const DEFAULT_CATEGORY_COLOR = {
  bg: 'bg-sky-500/10',
  text: 'text-sky-400',
  border: 'border-sky-500/30',
  dot: 'bg-sky-400',
};

interface NurseHospitalProceduresPageProps {
  selectedCategoryProp?: string;
  onCategoryChangeProp?: (cat: string) => void;
}

export const NurseHospitalProceduresPage: React.FC<NurseHospitalProceduresPageProps> = ({
  selectedCategoryProp,
  onCategoryChangeProp,
}) => {
  // ── Data State ─────────────────────────────────────────────────────────────
  const [procedures, setProcedures] = useState<HospitalProcedureSummary[]>([]);
  const [categories, setCategories] = useState<HospitalProcedureCategoryItem[]>([]);
  const [departments, setDepartments] = useState<HospitalProcedureDepartmentItem[]>([]);
  const [scope, setScope] = useState<HospitalProcedureScope | null>(null);
  const [metrics, setMetrics] = useState<HospitalProcedureMetrics>({
    totalAvailable: 0,
    mandatoryCount: 0,
    departmentSpecificCount: 0,
  });
  const [pagination, setPagination] = useState<HospitalProcedurePagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // ── Filter State ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [mandatoryFilter, setMandatoryFilter] = useState<'all' | 'true' | 'false'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'effectiveDate' | 'procedureCode'>('title');

  // ── UI / Interaction State ────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<HospitalProcedureDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  // Print & Download State
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [printData, setPrintData] = useState<any>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Synchronize category with sidebar selection if provided
  useEffect(() => {
    if (selectedCategoryProp !== undefined && selectedCategoryProp !== selectedCategory) {
      setSelectedCategory(selectedCategoryProp);
    }
  }, [selectedCategoryProp]);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    if (onCategoryChangeProp) {
      onCategoryChangeProp(cat);
    }
  };

  // ── Load Categories and Departments on mount ───────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const loadMetadata = async () => {
      try {
        const [catList, deptList] = await Promise.all([
          nurseService.getHospitalProcedureCategories().catch(() => []),
          nurseService.getHospitalProcedureDepartments().catch(() => []),
        ]);
        if (isMounted) {
          setCategories(catList);
          setDepartments(deptList);
        }
      } catch (err: any) {
        console.error('Failed to load procedure metadata:', err);
      }
    };
    loadMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Fetch Procedures from PostgreSQL ───────────────────────────────────────
  const fetchProcedures = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setErrorBanner(null);
      try {
        const response = await nurseService.getHospitalProcedures({
          search: debouncedSearch,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          departmentId: selectedDepartmentId !== 'all' ? selectedDepartmentId : undefined,
          isMandatory: mandatoryFilter !== 'all' ? mandatoryFilter : undefined,
          page: pageToLoad,
          limit: 20,
          sortBy,
          sortOrder: 'asc',
        });

        setProcedures(response.data || []);
        if (response.scope) setScope(response.scope);
        if (response.metrics) setMetrics(response.metrics);
        if (response.pagination) setPagination(response.pagination);
      } catch (err: any) {
        console.error('Failed to load procedures:', err);
        setErrorBanner(err.message || 'Unable to load hospital procedures. Please try again.');
        setProcedures([]);
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, selectedCategory, selectedDepartmentId, mandatoryFilter, sortBy]
  );

  useEffect(() => {
    fetchProcedures(1);
  }, [fetchProcedures]);

  // ── Open Procedure Detail Modal ───────────────────────────────────────────
  const handleOpenProcedure = async (procedureId: number | string) => {
    setIsDetailLoading(true);
    setDetailModalOpen(true);
    setErrorBanner(null);
    try {
      const detail = await nurseService.getHospitalProcedureById(procedureId);
      setSelectedProcedure(detail);
    } catch (err: any) {
      console.error('Error loading procedure details:', err);
      setErrorBanner(err.message || 'Failed to load complete procedure details.');
      setDetailModalOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ── Trigger Document Download ─────────────────────────────────────────────
  const handleDownload = async (proc: HospitalProcedureSummary | HospitalProcedureDetail) => {
    setIsDownloading(true);
    try {
      const result = await nurseService.downloadHospitalProcedure(proc.id);
      // Generate client-side JSON download blob for controlled document
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${proc.procedureCode}_Official_SOP.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccessToast(`Official SOP (${proc.procedureCode}) downloaded successfully.`);
      setTimeout(() => setDownloadSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download official procedure document.');
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Trigger Official Document Print ───────────────────────────────────────
  const handlePrint = async (proc: HospitalProcedureSummary | HospitalProcedureDetail) => {
    setIsPreparingPrint(true);
    try {
      const data = await nurseService.getPrintHospitalProcedure(proc.id);
      setPrintData(data);
      setPrintModalOpen(true);
    } catch (err: any) {
      console.error('Print preparation error:', err);
      alert(err.message || 'Failed to prepare official print document.');
    } finally {
      setIsPreparingPrint(false);
    }
  };

  const executeBrowserPrint = () => {
    window.print();
  };

  // Reset filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    handleCategorySelect('All');
    setSelectedDepartmentId('all');
    setMandatoryFilter('all');
    setSortBy('title');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedDepartmentId !== 'all' ||
    mandatoryFilter !== 'all';

  return (
    <div className="space-y-6 pb-16">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Top Banner / Toast Messages */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {downloadSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500 text-white font-medium text-sm shadow-2xl border border-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{downloadSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Header Section */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-navy-900/90 via-navy-800/90 to-navy-900/90 border border-white/10 backdrop-blur-xl shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Hospital Procedures
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Clinical SOPs
                </span>
              </h1>
              <p className="text-sm text-gray-300">
                Access hospital-approved clinical and operational procedures.
              </p>
            </div>
          </div>

          {/* Hospital & Department Scope pill */}
          {scope && (
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-white">{scope.hospitalName}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                <span>Assigned: <strong className="text-white">{scope.nurseDepartment}</strong></span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Read-Only Authorized</span>
              </div>
            </div>
          )}
        </div>

        {/* Header Action: Quick refresh */}
        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <button
            onClick={() => fetchProcedures(pagination.page)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh procedures from PostgreSQL"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Metrics Summary Strip */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Available */}
        <div className="p-4 rounded-xl bg-navy-900/60 border border-white/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Available Procedures</p>
            <p className="text-2xl font-black text-white mt-0.5">{metrics.totalAvailable}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Approved & active in your facility</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Mandatory Procedures */}
        <div className="p-4 rounded-xl bg-navy-900/60 border border-white/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Mandatory Compliance
            </p>
            <p className="text-2xl font-black text-rose-400 mt-0.5">{metrics.mandatoryCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Core NABH / Hospital required SOPs</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Department Specific */}
        <div className="p-4 rounded-xl bg-navy-900/60 border border-white/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
              Department Specific
            </p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{metrics.departmentSpecificCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">SOPs tailored to your unit</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Search and Filters Section */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-navy-900/80 border border-white/10 backdrop-blur-xl shadow-lg">
        {/* Main Search & Filters Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by procedure title, code (e.g. SOP-INF-001), equipment, or keywords…"
              className="w-full pl-10 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown Selector */}
          <div className="min-w-[200px]">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategorySelect(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-navy-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="All">All Categories ({metrics.totalAvailable})</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div className="min-w-[190px]">
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-navy-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="all">All Departments & Hospital-wide</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory Filter Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl flex-shrink-0">
            <button
              onClick={() => setMandatoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mandatoryFilter === 'all'
                  ? 'bg-sky-500 text-white font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setMandatoryFilter('true')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                mandatoryFilter === 'true'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-gray-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Mandatory
            </button>
          </div>

          {/* Sort Selector */}
          <div className="min-w-[140px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-navy-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="title">Sort: Title (A-Z)</option>
              <option value="procedureCode">Sort: Code</option>
              <option value="effectiveDate">Sort: Effective Date</option>
              <option value="category">Sort: Category</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2.5 rounded-xl text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Error Banner */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-200">{errorBanner}</p>
            <p className="text-xs text-rose-300/80 mt-0.5">
              If this is unexpected, ensure you are signed in with an authorized nurse or medical account.
            </p>
          </div>
          <button
            onClick={() => fetchProcedures(pagination.page)}
            className="px-3 py-1 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg border border-rose-500/40 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Procedure List / Grid */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-navy-900/40 rounded-2xl border border-white/5">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-sm text-gray-300 font-medium">Loading hospital procedures from database…</p>
          <p className="text-xs text-gray-500">Enforcing hospital-level security scope</p>
        </div>
      ) : procedures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-navy-900/50 rounded-2xl border border-white/10 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Hospital Procedures Found</h3>
          <p className="text-xs text-gray-400 max-w-md">
            {hasActiveFilters
              ? 'No procedures match your current search and filter criteria. Try clearing filters or adjusting your search keyword.'
              : 'No approved hospital procedures are currently available for this facility.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 text-white hover:bg-sky-400 transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {procedures.map((proc) => {
            const catColors = CATEGORY_COLORS[proc.category] || DEFAULT_CATEGORY_COLOR;

            return (
              <motion.div
                key={proc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-navy-900/80 hover:bg-navy-850 border border-white/10 hover:border-sky-500/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all"
              >
                <div className="space-y-3">
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${catColors.bg} ${catColors.text} ${catColors.border} flex items-center gap-1.5`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${catColors.dot}`} />
                      {proc.category}
                    </span>

                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                      {proc.procedureCode}
                    </span>
                  </div>

                  {/* Mandatory Alert Banner if applicable */}
                  {proc.isMandatory && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-300">
                      <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                      <span>MANDATORY PROTOCOL — All Nursing Staff</span>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <h3
                      onClick={() => handleOpenProcedure(proc.id)}
                      className="text-base font-bold text-white group-hover:text-sky-300 transition-colors cursor-pointer line-clamp-2"
                    >
                      {proc.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {proc.description}
                    </p>
                  </div>

                  {/* Scope & Metadata Strip */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-gray-400">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Scope:</span>
                      <span className="text-gray-300 font-medium">
                        {proc.departmentName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Version:</span>
                      <span className="text-gray-300 font-semibold font-mono">
                        v{proc.version}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Effective:</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        {proc.effectiveDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePrint(proc)}
                      disabled={isPreparingPrint}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
                      title="Print Official Procedure"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownload(proc)}
                      disabled={isDownloading}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
                      title="Download Official Document"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenProcedure(proc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-sky-200 border border-sky-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>View Procedure</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Pagination Footer */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-navy-900/60 border border-white/10 text-xs text-gray-400">
          <span>
            Showing page <strong className="text-white">{pagination.page}</strong> of{' '}
            <strong className="text-white">{pagination.totalPages}</strong> ({pagination.total} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchProcedures(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => fetchProcedures(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Procedure Detail Modal (Full Clinical SOP Viewer) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {detailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-navy-950 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left"
            >
              {isDetailLoading || !selectedProcedure ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                  <p className="text-sm text-gray-300">Loading complete clinical procedure…</p>
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="p-6 bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border-b border-white/10 flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          {selectedProcedure.procedureCode}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300">
                          {selectedProcedure.category}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Approved • Active (v{selectedProcedure.version})
                        </span>
                        {selectedProcedure.isMandatory && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            Mandatory Protocol
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {selectedProcedure.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1 text-gray-300">
                          <Building2 className="w-3.5 h-3.5 text-sky-400" />
                          {selectedProcedure.hospitalName}
                        </span>
                        <span>•</span>
                        <span>Scope: <strong className="text-white">{selectedProcedure.departmentName}</strong></span>
                        <span>•</span>
                        <span>Effective: <strong className="text-emerald-400">{selectedProcedure.effectiveDate}</strong></span>
                        {selectedProcedure.reviewDate && (
                          <>
                            <span>•</span>
                            <span>Review: <strong className="text-gray-300">{selectedProcedure.reviewDate}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setDetailModalOpen(false)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Read-Only Governance Notice Bar */}
                  <div className="px-6 py-2.5 bg-sky-950/60 border-b border-sky-500/20 flex items-center justify-between text-xs text-sky-300">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <span>
                        Controlled Hospital Document. Certified for Staff Nurse access. Procedure management & publishing are restricted to Hospital Administration.
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-sky-400 uppercase tracking-widest hidden sm:inline">
                      Official SOP
                    </span>
                  </div>

                  {/* Modal Body / Structured Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Clinical Overview / Description */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Clinical Overview & Purpose
                      </h4>
                      <p className="text-sm text-gray-200 leading-relaxed">
                        {selectedProcedure.purpose || selectedProcedure.description}
                      </p>
                    </div>

                    {/* Scope & Responsibilities */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedProcedure.scope && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                            Scope of Application
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {selectedProcedure.scope}
                          </p>
                        </div>
                      )}

                      {selectedProcedure.responsibilities && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            Staff Responsibilities
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {selectedProcedure.responsibilities}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Required Equipment */}
                    {selectedProcedure.requiredEquipment && selectedProcedure.requiredEquipment.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-4 h-4 text-sky-400" />
                          Required Equipment & Supplies
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProcedure.requiredEquipment.map((eq, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-gray-200 flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              {eq}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step-by-Step Procedure Guide */}
                    {selectedProcedure.procedureSteps && selectedProcedure.procedureSteps.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4 text-sky-400" />
                          Step-by-Step Clinical Procedure
                        </h4>

                        <div className="space-y-3">
                          {selectedProcedure.procedureSteps.map((step) => (
                            <div
                              key={step.step}
                              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-2"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                  {step.step}
                                </span>
                                <h5 className="text-sm font-bold text-white">{step.title}</h5>
                              </div>

                              <p className="text-xs text-gray-300 pl-10 leading-relaxed">
                                {step.instruction}
                              </p>

                              {step.rationale && (
                                <div className="ml-10 p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300">
                                  <strong className="text-sky-200">Clinical Rationale: </strong>
                                  {step.rationale}
                                </div>
                              )}

                              {step.warning && (
                                <div className="ml-10 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300 flex items-start gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-rose-200">Caution: </strong>
                                    {step.warning}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Safety Precautions & Infection Control Callout */}
                    {selectedProcedure.safetyPrecautions && (
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                        <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Safety Precautions & Infection Control</span>
                        </div>
                        <p className="text-xs text-rose-200/90 leading-relaxed">
                          {selectedProcedure.safetyPrecautions}
                        </p>
                      </div>
                    )}

                    {/* Documentation & Escalation Instructions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedProcedure.documentationReq && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                            Documentation Requirements
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {selectedProcedure.documentationReq}
                          </p>
                        </div>
                      )}

                      {selectedProcedure.escalationSteps && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                            Escalation & Emergency Instructions
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {selectedProcedure.escalationSteps}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* References */}
                    {selectedProcedure.references && (
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 space-y-1">
                        <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                          Official References & Accreditation Standards
                        </h4>
                        <p className="text-[11px] text-gray-400 italic">
                          {selectedProcedure.references}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="p-4 bg-navy-900 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-gray-400">
                      Procedure Code: <strong className="text-white font-mono">{selectedProcedure.procedureCode}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrint(selectedProcedure)}
                        disabled={isPreparingPrint}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-sky-400" />
                        <span>Print Document</span>
                      </button>

                      <button
                        onClick={() => handleDownload(selectedProcedure)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-all cursor-pointer shadow-md"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Download SOP</span>
                      </button>

                      <button
                        onClick={() => setDetailModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Official Print Preview Modal */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {printModalOpen && printData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl max-h-[92vh] bg-white text-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left"
            >
              {/* Print Dialog Actions Bar */}
              <div className="p-3 bg-slate-100 border-b border-slate-300 flex items-center justify-between no-print">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-sky-600" />
                  Print Preview — Official Controlled Document
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={executeBrowserPrint}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Now</span>
                  </button>
                  <button
                    onClick={() => setPrintModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Document Container */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white text-black font-sans print:p-0">
                {/* Official Accreditation Header */}
                <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
                  <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                    {printData.hospitalHeader?.hospitalName || 'MediTwin Central Hospital'}
                  </h1>
                  <p className="text-xs text-slate-600 font-semibold tracking-wide">
                    {printData.hospitalHeader?.accreditation || 'NABH & JCI ACCREDITED HEALTHCARE NETWORK'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {printData.hospitalHeader?.address} • Phone: {printData.hospitalHeader?.phone}
                  </p>
                  <div className="pt-2">
                    <span className="inline-block px-3 py-0.5 border border-red-600 text-red-700 text-[10px] font-black uppercase tracking-widest rounded">
                      {printData.controlledDocumentNotice || 'CONTROLLED HOSPITAL DOCUMENT — HOSPITAL APPROVED'}
                    </span>
                  </div>
                </div>

                {/* Procedure Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-300 rounded text-xs">
                  <div>
                    <p><strong className="text-slate-800">Procedure Title:</strong> {printData.procedureTitle}</p>
                    <p><strong className="text-slate-800">Procedure Code:</strong> {printData.procedureCode}</p>
                    <p><strong className="text-slate-800">Category:</strong> {printData.category}</p>
                  </div>
                  <div>
                    <p><strong className="text-slate-800">Department Scope:</strong> {printData.department}</p>
                    <p><strong className="text-slate-800">Active Version:</strong> v{printData.version}</p>
                    <p><strong className="text-slate-800">Effective Date:</strong> {printData.effectiveDate}</p>
                  </div>
                </div>

                {/* Purpose */}
                {printData.sections?.purpose && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      1. Purpose & Clinical Objective
                    </h3>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      {printData.sections.purpose}
                    </p>
                  </div>
                )}

                {/* Scope & Responsibilities */}
                {(printData.sections?.scope || printData.sections?.responsibilities) && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      2. Scope & Responsibilities
                    </h3>
                    {printData.sections.scope && (
                      <p className="text-xs text-slate-800">
                        <strong>Scope: </strong>{printData.sections.scope}
                      </p>
                    )}
                    {printData.sections.responsibilities && (
                      <p className="text-xs text-slate-800">
                        <strong>Responsibilities: </strong>{printData.sections.responsibilities}
                      </p>
                    )}
                  </div>
                )}

                {/* Required Equipment */}
                {printData.sections?.requiredEquipment && printData.sections.requiredEquipment.length > 0 && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      3. Required Equipment & Supplies
                    </h3>
                    <ul className="list-disc pl-5 text-xs text-slate-800 space-y-0.5">
                      {printData.sections.requiredEquipment.map((eq: string, idx: number) => (
                        <li key={idx}>{eq}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Procedure Steps */}
                {printData.sections?.procedureSteps && printData.sections.procedureSteps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      4. Step-by-Step Procedure
                    </h3>
                    <div className="space-y-2">
                      {printData.sections.procedureSteps.map((s: any) => (
                        <div key={s.step} className="text-xs text-slate-800">
                          <p className="font-bold">Step {s.step}: {s.title}</p>
                          <p className="pl-4 text-slate-700">{s.instruction}</p>
                          {s.rationale && (
                            <p className="pl-4 text-[11px] text-slate-500 italic">
                              Rationale: {s.rationale}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety Precautions */}
                {printData.sections?.safetyPrecautions && (
                  <div className="space-y-1 p-2.5 border border-red-300 bg-red-50 rounded">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-800">
                      5. Safety Precautions & Infection Control
                    </h3>
                    <p className="text-xs text-red-900">
                      {printData.sections.safetyPrecautions}
                    </p>
                  </div>
                )}

                {/* Documentation & Escalation */}
                {printData.sections?.documentationRequirements && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      6. Documentation & Charting Requirements
                    </h3>
                    <p className="text-xs text-slate-800">
                      {printData.sections.documentationRequirements}
                    </p>
                  </div>
                )}

                {printData.sections?.escalationSteps && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      7. Escalation Procedure
                    </h3>
                    <p className="text-xs text-slate-800">
                      {printData.sections.escalationSteps}
                    </p>
                  </div>
                )}

                {/* Sign-off / Verification Footer */}
                <div className="pt-6 border-t-2 border-slate-400 grid grid-cols-2 gap-8 text-[11px] text-slate-700">
                  <div>
                    <p className="font-bold">Printed for Authorized Staff Nurse:</p>
                    <p>{printData.printedBy}</p>
                    <p>Print Timestamp: {printData.printedAt ? new Date(printData.printedAt).toLocaleString() : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Hospital Quality & Safety Committee</p>
                    <p>Verified Active Procedure Repository</p>
                    <p>Controlled Copy — Do not circulate unapproved photocopies</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
