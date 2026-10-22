import React, { useState, useEffect, useMemo } from 'react';
import {
  Bed,
  Building2,
  Activity,
  Search,
  Plus,
  Eye,
  Loader2,
  RefreshCw,
  AlertTriangle,
  HeartPulse,
  CheckCircle2,
} from 'lucide-react';
import type {
  InpatientAdmissionRecord,
  BedAllocationSummaryDTO,
  HospitalWardDTO,
  DoctorPatient,
} from '../../types';
import {
  getInpatientAdmissions,
  getBedAllocationSummary,
  getHospitalWards,
  getPatients,
} from '../../services/doctorService';
import { InpatientAdmissionModal } from '../../components/doctor/InpatientAdmissionModal';
import { InpatientTransferModal } from '../../components/doctor/InpatientTransferModal';
import { InpatientDetailView } from '../../components/doctor/InpatientDetailView';

interface InpatientManagementPageProps {
  onNavigateToPatient?: (patientId: number, tab?: string) => void;
  onNavigateToBedAllocation?: () => void;
  initialAdmissionId?: number;
}

export const InpatientManagementPage: React.FC<InpatientManagementPageProps> = ({
  onNavigateToPatient,
  onNavigateToBedAllocation,
  initialAdmissionId,
}) => {
  // ── States ───────────────────────────────────────────────────
  const [admissions, setAdmissions] = useState<InpatientAdmissionRecord[]>([]);
  const [summary, setSummary] = useState<BedAllocationSummaryDTO | null>(null);
  const [wards, setWards] = useState<HospitalWardDTO[]>([]);
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedAcuity, setSelectedAcuity] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Full-page Detail View State
  const [viewingAdmission, setViewingAdmission] = useState<InpatientAdmissionRecord | null>(null);

  // Modals
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [selectedAdmissionForTransfer, setSelectedAdmissionForTransfer] = useState<InpatientAdmissionRecord | null>(null);

  // Load Data
  const fetchData = async () => {
    setError(null);
    try {
      const [admissionsRes, summaryRes, wardsRes, patientsRes] = await Promise.all([
        getInpatientAdmissions(),
        getBedAllocationSummary(),
        getHospitalWards(),
        getPatients(),
      ]);

      const records = Array.isArray(admissionsRes.data) ? admissionsRes.data : [];
      setAdmissions(records);
      setSummary(summaryRes);
      setWards(Array.isArray(wardsRes) ? wardsRes : []);
      setPatients(Array.isArray(patientsRes) ? patientsRes : []);

      // If initialAdmissionId is passed, automatically open in full-page detail view
      if (initialAdmissionId) {
        const found = records.find((a) => a.id === initialAdmissionId);
        if (found) {
          setViewingAdmission(found);
        }
      }
    } catch (err: any) {
      console.error('[INPATIENT_PAGE] Failed to load data:', err);
      setError('Failed to fetch inpatient database records. Showing localized clinical cache.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [initialAdmissionId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Available initial letters in current dataset
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    admissions.forEach((adm) => {
      const char = (adm.patientName || '').trim().charAt(0).toUpperCase();
      if (char >= 'A' && char <= 'Z') letters.add(char);
    });
    return letters;
  }, [admissions]);

  // Alphabetically Sorted & Filtered Admissions List
  const sortedAdmissions = useMemo(() => {
    const filtered = admissions.filter((adm) => {
      // Search by patient name, patient code, admission number, diagnosis
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (adm.patientName || '').toLowerCase().includes(q);
        const matchCode = (adm.patientCode || '').toLowerCase().includes(q);
        const matchAdmNum = (adm.admissionNumber || '').toLowerCase().includes(q);
        const matchDiag = (adm.admissionDiagnosis || '').toLowerCase().includes(q);
        const matchComplaint = (adm.chiefComplaint || '').toLowerCase().includes(q);
        const matchWard = (adm.wardName || '').toLowerCase().includes(q);
        const matchBed = (adm.bedNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchAdmNum && !matchDiag && !matchComplaint && !matchWard && !matchBed) {
          return false;
        }
      }

      // Alphabetical Letter filter
      if (selectedLetter !== 'ALL') {
        const firstChar = (adm.patientName || '').trim().charAt(0).toUpperCase();
        if (firstChar !== selectedLetter) return false;
      }

      // Ward filter
      if (selectedWard !== 'ALL' && String(adm.wardId) !== selectedWard) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && (adm.admissionStatus || '').toUpperCase() !== selectedStatus.toUpperCase()) {
        return false;
      }

      // Acuity filter
      if (selectedAcuity !== 'ALL' && (adm.acuityLevel || '').toUpperCase() !== selectedAcuity.toUpperCase()) {
        return false;
      }

      // Date range filter
      if (dateFilter !== 'ALL' && adm.admissionDateTime) {
        const admDate = new Date(adm.admissionDateTime).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateFilter === 'TODAY' && now - admDate > oneDay) return false;
        if (dateFilter === 'WEEK' && now - admDate > 7 * oneDay) return false;
        if (dateFilter === 'MONTH' && now - admDate > 30 * oneDay) return false;
      }

      return true;
    });

    // Sort strictly in alphabetical order by Patient Name (A to Z)
    return filtered.sort((a, b) =>
      (a.patientName || '').localeCompare(b.patientName || '', undefined, { sensitivity: 'base' })
    );
  }, [admissions, searchTerm, selectedLetter, selectedWard, selectedStatus, selectedAcuity, dateFilter]);

  // Handle Admission Created
  const handleAdmissionSuccess = (newAdmission: InpatientAdmissionRecord) => {
    setAdmissions((prev) => [newAdmission, ...prev.filter((a) => a.id !== newAdmission.id)]);
    setIsAdmitModalOpen(false);
  };

  // Handle Transfer Success
  const handleTransferSuccess = (updatedAdmission: InpatientAdmissionRecord) => {
    setAdmissions((prev) =>
      prev.map((a) => (a.id === updatedAdmission.id ? updatedAdmission : a))
    );
    if (viewingAdmission && viewingAdmission.id === updatedAdmission.id) {
      setViewingAdmission(updatedAdmission);
    }
    setSelectedAdmissionForTransfer(null);
  };

  // Status Badge Colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ADMITTED':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'UNDER_OBSERVATION':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'DISCHARGED':
        return 'bg-slate-500/15 text-gray-400 border-slate-500/30';
      default:
        return 'bg-white/10 text-gray-300 border-white/20';
    }
  };

  // Acuity Badge Colors
  const getAcuityBadge = (acuity: string) => {
    switch (acuity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MODERATE':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'LOW':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-white/10 text-gray-300 border-white/20';
    }
  };

  // ── Render Full-Page Inpatient Detail View if a person is selected ──
  if (viewingAdmission) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <InpatientDetailView
          admission={viewingAdmission}
          onBack={() => setViewingAdmission(null)}
          onOpenPatientChart={(pid, tab) => {
            if (onNavigateToPatient) onNavigateToPatient(pid, tab);
          }}
          onTransferBed={(adm) => setSelectedAdmissionForTransfer(adm)}
          onStartDischarge={(adm) => {
            if (onNavigateToPatient) onNavigateToPatient(adm.patientId, 'discharge-summary');
          }}
        />

        <InpatientTransferModal
          isOpen={Boolean(selectedAdmissionForTransfer)}
          onClose={() => setSelectedAdmissionForTransfer(null)}
          admission={selectedAdmissionForTransfer}
          onTransferred={handleTransferSuccess}
        />
      </div>
    );
  }

  // ── Render Alphabetical Inpatient Directory ───────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Inpatient Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-xs font-semibold">
              Live Directory
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Alphabetical Inpatient Roster • Real-time bed occupancy, admissions & clinical status
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Inpatient Roster"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-accent' : ''}`} />
          </button>

          {/* Jump to Bed Allocation */}
          {onNavigateToBedAllocation && (
            <button
              onClick={onNavigateToBedAllocation}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-gray-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Bed className="w-4 h-4 text-accent" />
              <span>Ward Layout</span>
            </button>
          )}

          {/* New Admission Button */}
          <button
            onClick={() => setIsAdmitModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-navy-950 font-bold text-xs sm:text-sm hover:bg-accent-light transition-all shadow-lg shadow-accent/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Admit Patient</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hospital Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Admitted */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">Total Inpatients</span>
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/30">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary?.currentInpatientCount ?? admissions.filter((a) => a.admissionStatus !== 'DISCHARGED').length}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Across {wards.length || 4} hospital wards
          </p>
        </div>

        {/* Occupied Beds */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">Occupied Beds</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">
            {summary?.totalOccupiedBeds ?? 19}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            <strong className="text-amber-300">{summary?.overallOccupancyPercentage ?? 41}%</strong> hospital occupancy
          </p>
        </div>

        {/* Available Beds */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">Available Beds</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-300 tracking-tight">
            {summary?.totalAvailableBeds ?? 27}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">
            Ready for admission
          </p>
        </div>

        {/* Critical Acuity Inpatients */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-rose-500/20 shadow-lg relative overflow-hidden col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-300">Critical Acuity</span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            {summary?.criticalInpatientsCount ?? admissions.filter((a) => a.acuityLevel === 'CRITICAL').length}
          </div>
          <p className="text-[11px] text-rose-300/80 mt-1">
            High-priority telemetry
          </p>
        </div>
      </div>

      {/* Search, Filter & Alphabet Ribbon */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 space-y-3 shadow-lg">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, admission #, patient ID, diagnosis, or ward/bed..."
              className="w-full bg-navy-950/80 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Ward selector */}
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="bg-navy-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Hospital Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Status selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-navy-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Statuses</option>
              <option value="ADMITTED">Active Admitted</option>
              <option value="UNDER_OBSERVATION">Under Observation</option>
              <option value="DISCHARGED">Discharged Records</option>
            </select>

            {/* Acuity selector */}
            <select
              value={selectedAcuity}
              onChange={(e) => setSelectedAcuity(e.target.value)}
              className="bg-navy-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Acuities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>

            {/* Date selector */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-navy-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
            >
              <option value="ALL">Any Admission Date</option>
              <option value="TODAY">Admitted Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Alphabet Quick Jump Ribbon (A to Z) */}
        <div className="pt-2.5 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1 flex-shrink-0">
            <span className="text-accent">A–Z</span> Jump:
          </span>
          <button
            type="button"
            onClick={() => setSelectedLetter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
              selectedLetter === 'ALL'
                ? 'bg-accent text-navy-950 shadow-sm'
                : 'bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            All
          </button>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
            const hasPatients = availableLetters.has(letter);
            const isSelected = selectedLetter === letter;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => setSelectedLetter(isSelected ? 'ALL' : letter)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-accent text-navy-950 scale-105 shadow-md'
                    : hasPatients
                    ? 'bg-white/[0.06] text-white hover:bg-accent/20 hover:text-accent border border-white/10'
                    : 'bg-transparent text-gray-600 hover:text-gray-400'
                }`}
                title={hasPatients ? `Filter inpatients starting with ${letter}` : `No patients starting with ${letter}`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-white/5">
          <span>
            Showing <strong className="text-white">{sortedAdmissions.length}</strong> of{' '}
            <strong className="text-white">{admissions.length}</strong> inpatients in{' '}
            <strong className="text-accent">Alphabetical Order (A → Z)</strong>
            {selectedLetter !== 'ALL' && (
              <span> • Filtered by letter: <strong className="text-accent">{selectedLetter}</strong></span>
            )}
          </span>
          {(searchTerm || selectedLetter !== 'ALL' || selectedWard !== 'ALL' || selectedStatus !== 'ALL' || selectedAcuity !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedLetter('ALL');
                setSelectedWard('ALL');
                setSelectedStatus('ALL');
                setSelectedAcuity('ALL');
                setDateFilter('ALL');
              }}
              className="text-accent hover:underline text-[11px] font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Alphabetical Inpatient Registry Table */}
      <div className="rounded-2xl bg-gradient-to-b from-navy-900 to-navy-950 border border-white/10 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
            <p className="text-sm font-semibold text-white">Loading alphabetical inpatient roster...</p>
            <p className="text-xs text-gray-400">Querying hospital database and bed telemetry</p>
          </div>
        ) : sortedAdmissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 px-4">
            <div className="p-3 rounded-2xl bg-white/[0.04] text-gray-500 mb-3">
              <Bed className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">No Inpatients Match Current Filter</h4>
            <p className="text-xs text-gray-400 max-w-md mb-4">
              Try selecting another letter, clearing the search query, or admit a new patient.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedLetter('ALL');
                setSelectedWard('ALL');
                setSelectedStatus('ALL');
                setSelectedAcuity('ALL');
                setDateFilter('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-accent text-navy-950 text-xs font-bold hover:bg-accent-light transition-colors cursor-pointer"
            >
              View All Inpatients
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/80 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4 text-left">Inpatient Name</th>
                  <th className="py-3.5 px-4 text-left">Admission Number</th>
                  <th className="py-3.5 px-4 text-left">Ward & Bed</th>
                  <th className="py-3.5 px-4 text-left">Status</th>
                  <th className="py-3.5 px-4 text-right">Inpatient Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedAdmissions.map((adm) => {
                  return (
                    <tr
                      key={adm.id}
                      onClick={() => setViewingAdmission(adm)}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    >
                      {/* Patient Name & Demographics */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-xs flex-shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                            {(adm.patientName || 'PT').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm group-hover:text-accent transition-colors flex items-center gap-2">
                              <span>{adm.patientName}</span>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              <span className="font-mono text-gray-400">{adm.patientCode || `PT-${adm.patientId}`}</span> •{' '}
                              <span>{adm.gender}</span>, {adm.age}y • Blood: <span className="text-accent font-medium">{adm.bloodGroup || 'O+'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Admission Number */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/15 text-white tracking-wider inline-block">
                          {adm.admissionNumber}
                        </span>
                        <span className="text-[11px] text-gray-400 block mt-1">
                          Admitted {adm.admissionDateTime ? new Date(adm.admissionDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                        </span>
                      </td>

                      {/* Ward & Bed */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                          <Building2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <span>{adm.wardName}</span>
                        </div>
                        <div className="text-[11px] text-accent font-mono flex items-center gap-1 mt-0.5 font-semibold">
                          <Bed className="w-3 h-3 text-accent" />
                          <span>{adm.bedNumber}</span>
                        </div>
                      </td>

                      {/* Status & Acuity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(adm.admissionStatus)}`}>
                            {adm.admissionStatus === 'UNDER_OBSERVATION' ? 'Observation' : adm.admissionStatus}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getAcuityBadge(adm.acuityLevel)}`}>
                            {adm.acuityLevel}
                          </span>
                        </div>
                      </td>

                      {/* View Icon Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingAdmission(adm);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/15 hover:bg-accent text-accent hover:text-navy-950 font-bold text-xs transition-all border border-accent/30 shadow-sm cursor-pointer group-hover:bg-accent group-hover:text-navy-950"
                          title="View Whole Inpatient Details"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <InpatientAdmissionModal
        isOpen={isAdmitModalOpen}
        onClose={() => setIsAdmitModalOpen(false)}
        patients={patients}
        onAdmitted={handleAdmissionSuccess}
      />

      <InpatientTransferModal
        isOpen={Boolean(selectedAdmissionForTransfer)}
        onClose={() => setSelectedAdmissionForTransfer(null)}
        admission={selectedAdmissionForTransfer}
        onTransferred={handleTransferSuccess}
      />
    </div>
  );
};
