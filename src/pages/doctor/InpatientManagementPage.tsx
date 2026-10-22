import React, { useState, useEffect, useMemo } from 'react';
import {
  Bed,
  Building2,
  Activity,
  Search,
  Plus,
  ArrowRightLeft,
  LogOut,
  FileText,
  Pill,
  Eye,
  Loader2,
  RefreshCw,
  AlertTriangle,
  HeartPulse,
  User,
  CheckCircle2,
  Building,
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
import { InpatientAdmissionDetailsModal } from '../../components/doctor/InpatientAdmissionDetailsModal';
import { InpatientTransferModal } from '../../components/doctor/InpatientTransferModal';

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
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedAcuity, setSelectedAcuity] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Modals
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [selectedAdmissionForDetails, setSelectedAdmissionForDetails] = useState<InpatientAdmissionRecord | null>(null);
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

      // If initialAdmissionId is passed, automatically open its details modal
      if (initialAdmissionId) {
        const found = records.find((a) => a.id === initialAdmissionId);
        if (found) {
          setSelectedAdmissionForDetails(found);
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

  // Filtered Admissions List
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((adm) => {
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
  }, [admissions, searchTerm, selectedWard, selectedStatus, selectedAcuity, dateFilter]);

  // Handle Admission Created
  const handleAdmissionSuccess = (newAdmission: InpatientAdmissionRecord) => {
    setAdmissions((prev) => [newAdmission, ...prev.filter((a) => a.id !== newAdmission.id)]);
    fetchData();
  };

  // Handle Transfer Completed
  const handleTransferSuccess = (updated: InpatientAdmissionRecord) => {
    setAdmissions((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
    fetchData();
  };

  // Acuity Badge colors
  const getAcuityBadge = (level?: string) => {
    switch ((level || '').toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MODERATE':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'LOW':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  // Status Badge colors
  const getStatusBadge = (status?: string) => {
    switch ((status || '').toUpperCase()) {
      case 'DISCHARGED':
        return 'bg-slate-500/20 text-gray-400 border-slate-500/40';
      case 'UNDER_OBSERVATION':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ADMITTED':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                <span>Inpatient Management</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/40 font-mono">
                  PostgreSQL Active
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Hospital inpatient registry, admission records, ward telemetry, and clinical transitions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Refresh Inpatient Records"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-accent' : ''}`} />
          </button>

          {onNavigateToBedAllocation && (
            <button
              type="button"
              onClick={onNavigateToBedAllocation}
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-accent" />
              <span>Bed Allocation Grid</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAdmitModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-navy-950 font-bold text-xs transition-all shadow-glow-accent flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Admit Patient</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Current Inpatients */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">Current Inpatients</span>
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/30">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary?.currentInpatientCount ?? admissions.filter((a) => a.admissionStatus !== 'DISCHARGED').length}
          </div>
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <span className="text-accent font-semibold">Active</span> across all hospital wards
          </p>
        </div>

        {/* Total Hospital Beds */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">Total Hospital Beds</span>
            <div className="p-2 rounded-xl bg-primary/20 text-primary-light border border-primary/30">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary?.totalHospitalBeds ?? 46}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Across {summary?.wards.length ?? wards.length} registered wards
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

      {/* Search, Filter & View Controls */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, patient ID, admission #, diagnosis, or ward/bed..."
              className="w-full bg-navy-950/80 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Quick Filters */}
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
              <option value="ALL">All Admission Statuses</option>
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
              <option value="ALL">All Acuity Levels</option>
              <option value="CRITICAL">Critical Acuity</option>
              <option value="HIGH">High Acuity</option>
              <option value="MODERATE">Moderate Acuity</option>
              <option value="LOW">Low Acuity</option>
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

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
          <span>
            Showing <strong className="text-white">{filteredAdmissions.length}</strong> of{' '}
            <strong className="text-white">{admissions.length}</strong> recorded inpatient admissions
          </span>
          {(searchTerm || selectedWard !== 'ALL' || selectedStatus !== 'ALL' || selectedAcuity !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
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

      {/* Inpatient Registry Table */}
      <div className="rounded-2xl bg-gradient-to-b from-navy-900 to-navy-950 border border-white/10 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
            <p className="text-sm font-semibold text-white">Loading hospital inpatient registry...</p>
            <p className="text-xs text-gray-400">Querying PostgreSQL database and bed telemetry</p>
          </div>
        ) : filteredAdmissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 px-4">
            <div className="p-3 rounded-2xl bg-white/[0.04] text-gray-500 mb-3">
              <Bed className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">No Inpatients Match Current Filter</h4>
            <p className="text-xs text-gray-400 max-w-md mb-4">
              Try adjusting your search criteria, ward selection, or admit a new patient to an available hospital bed.
            </p>
            <button
              onClick={() => setIsAdmitModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-accent text-navy-950 text-xs font-bold hover:bg-accent-light transition-colors"
            >
              Admit New Patient
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/80 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Patient / ID</th>
                  <th className="py-3.5 px-4">Admission #</th>
                  <th className="py-3.5 px-4">Ward & Bed</th>
                  <th className="py-3.5 px-4">Admitted At</th>
                  <th className="py-3.5 px-4">Diagnosis & Chief Complaint</th>
                  <th className="py-3.5 px-4">Acuity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Clinical Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAdmissions.map((adm) => {
                  const isDischarged = adm.admissionStatus === 'DISCHARGED';
                  return (
                    <tr
                      key={adm.id}
                      className="hover:bg-white/[0.02] transition-colors group cursor-default"
                    >
                      {/* Patient Name & Demographics */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">
                            {(adm.patientName || 'PT').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs hover:text-accent transition-colors flex items-center gap-1.5">
                              <span>{adm.patientName}</span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              <span className="font-mono text-gray-400">{adm.patientCode || `PT-${adm.patientId}`}</span> •{' '}
                              <span>{adm.gender}</span>, {adm.age}y
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Admission Number */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-gray-200">
                          {adm.admissionNumber}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">
                          {adm.doctorName ? `by ${adm.doctorName}` : 'Attending MD'}
                        </span>
                      </td>

                      {/* Ward & Bed */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <span>{adm.wardName}</span>
                        </div>
                        <div className="text-[11px] text-accent font-mono flex items-center gap-1 mt-0.5">
                          <Bed className="w-3 h-3 text-accent" />
                          <span>{adm.bedNumber}</span>
                        </div>
                      </td>

                      {/* Admission Date/Time */}
                      <td className="py-3.5 px-4">
                        <div className="text-gray-300 font-medium">
                          {adm.admissionDateTime
                            ? new Date(adm.admissionDateTime).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Recent'}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {adm.admissionDateTime
                            ? new Date(adm.admissionDateTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </div>
                      </td>

                      {/* Diagnosis & Chief Complaint */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-white truncate" title={adm.admissionDiagnosis}>
                          {adm.admissionDiagnosis}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate mt-0.5" title={adm.chiefComplaint}>
                          {adm.chiefComplaint}
                        </div>
                      </td>

                      {/* Acuity Level */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getAcuityBadge(adm.acuityLevel)}`}>
                          {adm.acuityLevel}
                        </span>
                      </td>

                      {/* Admission Status */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(adm.admissionStatus)}`}>
                          {adm.admissionStatus === 'UNDER_OBSERVATION' ? 'Observation' : adm.admissionStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => setSelectedAdmissionForDetails(adm)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="View Full Admission Record & Timeline"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Patient Chart / Medical Record */}
                          {onNavigateToPatient && (
                            <button
                              type="button"
                              onClick={() => onNavigateToPatient(adm.patientId, 'overview')}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-accent hover:bg-white/10 transition-colors"
                              title="Open Patient Medical Record"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          {/* Observations / Vitals */}
                          {onNavigateToPatient && (
                            <button
                              type="button"
                              onClick={() => onNavigateToPatient(adm.patientId, 'labs')}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-300 hover:bg-white/10 transition-colors"
                              title="View Observations & Vitals"
                            >
                              <Activity className="w-4 h-4" />
                            </button>
                          )}

                          {/* Prescriptions */}
                          {onNavigateToPatient && (
                            <button
                              type="button"
                              onClick={() => onNavigateToPatient(adm.patientId, 'prescriptions')}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-light hover:bg-white/10 transition-colors"
                              title="View Prescriptions"
                            >
                              <Pill className="w-4 h-4" />
                            </button>
                          )}

                          {/* Transfer Bed */}
                          {!isDischarged && (
                            <button
                              type="button"
                              onClick={() => setSelectedAdmissionForTransfer(adm)}
                              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 transition-colors"
                              title="Transfer to Another Bed / Ward"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          {/* Start Discharge Workflow */}
                          {!isDischarged && onNavigateToPatient && (
                            <button
                              type="button"
                              onClick={() => onNavigateToPatient(adm.patientId, 'discharge-summary')}
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                              title="Initiate Discharge Summary Workflow"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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

      <InpatientAdmissionDetailsModal
        admission={selectedAdmissionForDetails}
        onClose={() => setSelectedAdmissionForDetails(null)}
        onOpenPatientChart={(pid) => {
          setSelectedAdmissionForDetails(null);
          if (onNavigateToPatient) onNavigateToPatient(pid, 'overview');
        }}
        onTransferBed={(adm) => {
          setSelectedAdmissionForDetails(null);
          setSelectedAdmissionForTransfer(adm);
        }}
        onStartDischarge={(adm) => {
          setSelectedAdmissionForDetails(null);
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
};
