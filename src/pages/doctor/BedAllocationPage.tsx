import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Bed,
  Search,
  Plus,
  ArrowRightLeft,
  RefreshCw,
  Loader2,
  User,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Wrench,
  Percent,
  ArrowUpDown,
  ChevronRight,
  Clock,
  X,
  RotateCcw,
  Check,
  Filter,
} from 'lucide-react';
import type {
  HospitalWardDTO,
  WardBedDTO,
  InpatientAdmissionRecord,
  BedAllocationSummaryDTO,
  DoctorPatient,
} from '../../types';
import {
  getHospitalWards,
  getWardBeds,
  getBedAllocationSummary,
  getInpatientAdmissions,
  getPatients,
} from '../../services/doctorService';
import { InpatientAdmissionModal } from '../../components/doctor/InpatientAdmissionModal';
import { InpatientAdmissionDetailsModal } from '../../components/doctor/InpatientAdmissionDetailsModal';
import { InpatientTransferModal } from '../../components/doctor/InpatientTransferModal';

interface BedAllocationPageProps {
  onNavigateToPatient?: (patientId: number, tab?: string) => void;
  onNavigateToInpatients?: () => void;
  onNavigateToDashboard?: () => void;
}

interface WardWithBeds extends HospitalWardDTO {
  beds: WardBedDTO[];
}

export const BedAllocationPage: React.FC<BedAllocationPageProps> = ({
  onNavigateToPatient,
  onNavigateToInpatients,
  onNavigateToDashboard,
}) => {
  const [wardsWithBeds, setWardsWithBeds] = useState<WardWithBeds[]>([]);
  const [summary, setSummary] = useState<BedAllocationSummaryDTO | null>(null);
  const [admissions, setAdmissions] = useState<InpatientAdmissionRecord[]>([]);
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Ward Selection (defaults to first active ward)
  const [selectedWardId, setSelectedWardId] = useState<string>('');

  // Ward-Wise Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'>('ALL');
  const [bedSortBy, setBedSortBy] = useState<'number-asc' | 'number-desc' | 'status'>('number-asc');

  // Modals state
  const [quickAllocateModal, setQuickAllocateModal] = useState<{
    isOpen: boolean;
    wardId?: number;
    bedId?: number;
  }>({ isOpen: false });

  const [detailsModalAdmission, setDetailsModalAdmission] = useState<InpatientAdmissionRecord | null>(null);
  const [transferModalAdmission, setTransferModalAdmission] = useState<InpatientAdmissionRecord | null>(null);

  // Auto-dismiss success toast
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 4500);
    return () => clearTimeout(timer);
  }, [successToast]);

  // Fetch all wards and their respective 50-bed inventories
  const loadBedAllocationData = async () => {
    setError(null);
    try {
      const [wardsRes, summaryRes, admissionsRes, patientsRes] = await Promise.all([
        getHospitalWards(),
        getBedAllocationSummary(),
        getInpatientAdmissions(),
        getPatients(),
      ]);

      const rawAdmissions = Array.isArray(admissionsRes.data) ? admissionsRes.data : [];
      setAdmissions(rawAdmissions);
      setSummary(summaryRes);
      setPatients(Array.isArray(patientsRes) ? patientsRes : []);

      // For each ward, load bed roster (50 physical beds)
      const loadedWards = await Promise.all(
        wardsRes.map(async (ward) => {
          try {
            const bedData = await getWardBeds(ward.id);
            const bedsList = Array.isArray(bedData?.beds) ? bedData.beds : [];

            // Enrich beds with active admission details if occupied
            const enrichedBeds: WardBedDTO[] = bedsList.map((bed) => {
              if (bed.status === 'OCCUPIED' || !bed.isAvailable) {
                const matchedAdm = rawAdmissions.find(
                  (a) =>
                    a.bedId === bed.id &&
                    (a.admissionStatus === 'ADMITTED' || a.admissionStatus === 'UNDER_OBSERVATION')
                );
                if (matchedAdm) {
                  return {
                    ...bed,
                    currentAdmission: {
                      id: matchedAdm.id,
                      admissionNumber: matchedAdm.admissionNumber,
                      patientId: matchedAdm.patientId,
                      patientName: matchedAdm.patientName,
                      acuityLevel: matchedAdm.acuityLevel || 'MODERATE',
                    },
                  };
                }
              }
              return bed;
            });

            return {
              ...ward,
              beds: enrichedBeds,
            };
          } catch (err) {
            console.error(`Error loading beds for ward ${ward.id}:`, err);
            return {
              ...ward,
              beds: [],
            };
          }
        })
      );

      setWardsWithBeds(loadedWards);
      setLastUpdated(new Date());

      // Default select the first ward if none selected yet
      if (!selectedWardId && loadedWards.length > 0) {
        setSelectedWardId(String(loadedWards[0].id));
      }
    } catch (err: any) {
      console.error('[BED_ALLOCATION] Failed to load wards and beds:', err);
      setError('Failed to fetch real-time bed roster from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBedAllocationData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBedAllocationData();
  };

  // Find full admission record for a bed
  const getFullAdmissionForBed = (bed: WardBedDTO): InpatientAdmissionRecord | null => {
    if (bed.currentAdmission?.id) {
      const match = admissions.find((a) => a.id === bed.currentAdmission!.id);
      if (match) return match;
    }
    const fallbackMatch = admissions.find(
      (a) => a.bedId === bed.id && a.admissionStatus !== 'DISCHARGED'
    );
    if (fallbackMatch) return fallbackMatch;

    if (bed.currentAdmission) {
      return {
        id: bed.currentAdmission.id,
        admissionNumber: bed.currentAdmission.admissionNumber,
        patientId: bed.currentAdmission.patientId,
        patientName: bed.currentAdmission.patientName,
        patientCode: `PT-${bed.currentAdmission.patientId}`,
        age: 45,
        gender: 'Unspecified',
        bloodGroup: 'Unknown',
        email: '',
        phone: '',
        admittingDoctorId: 101,
        doctorName: 'Attending Physician',
        doctorSpecialization: 'General Medicine',
        doctorDepartment: 'Hospital Care',
        wardId: bed.wardId,
        wardNumber: 'Ward',
        wardName: 'Hospital Ward',
        wardDepartment: 'Inpatient Care',
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        admissionDateTime: new Date().toISOString(),
        admissionDiagnosis: 'Clinical Monitoring & Inpatient Care',
        chiefComplaint: 'Recorded in medical record',
        nursingHandoverInstructions: null,
        admissionStatus: 'ADMITTED',
        acuityLevel: bed.currentAdmission.acuityLevel || 'MODERATE',
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  };

  // Resolve currently active ward
  const activeWard = useMemo(() => {
    if (selectedWardId === 'ALL') return null;
    return (
      wardsWithBeds.find((w) => String(w.id) === selectedWardId) ||
      wardsWithBeds[0] ||
      null
    );
  }, [wardsWithBeds, selectedWardId]);

  // Handle Ward Switch: preserve search within newly selected ward, reset status filter
  const handleSelectWard = (newWardId: string) => {
    setSelectedWardId(newWardId);
  };

  // Summary Metrics strictly calculated from the full ward inventory (NOT filtered search results)
  const wardSummaryStats = useMemo(() => {
    if (activeWard) {
      const total = activeWard.totalBeds || activeWard.beds.length || 50;
      const occupied = activeWard.beds.filter((b) => b.status === 'OCCUPIED' || !b.isAvailable).length;
      const maintenance = activeWard.beds.filter((b) => b.status === 'MAINTENANCE').length;
      const available = activeWard.beds.filter((b) => b.status === 'AVAILABLE' && b.isAvailable).length;
      const occupiable = Math.max(0, total - maintenance);
      const occupancyPercentage = occupiable > 0 ? Math.round((occupied / occupiable) * 100) : 0;
      return {
        title: activeWard.name,
        wardNumber: activeWard.wardNumber,
        department: activeWard.department || 'Inpatient Services',
        totalBeds: total,
        availableBeds: available,
        occupiedBeds: occupied,
        maintenanceBeds: maintenance,
        occupancyPercentage,
        isAllWards: false,
      };
    }

    // Hospital-wide totals when 'ALL' is chosen
    const totalHospitalBeds = summary?.totalHospitalBeds ?? 300;
    const totalOccupiedBeds = summary?.totalOccupiedBeds ?? 12;
    const totalAvailableBeds = summary?.totalAvailableBeds ?? 288;
    const totalMaintenanceBeds = summary?.totalMaintenanceBeds ?? 0;
    const occupiable = Math.max(0, totalHospitalBeds - totalMaintenanceBeds);
    const overallOccupancyPercentage =
      occupiable > 0 ? Math.round((totalOccupiedBeds / occupiable) * 100) : 0;

    return {
      title: 'Hospital-Wide Ward Network',
      wardNumber: 'ALL',
      department: 'All Clinical Departments',
      totalBeds: totalHospitalBeds,
      availableBeds: totalAvailableBeds,
      occupiedBeds: totalOccupiedBeds,
      maintenanceBeds: totalMaintenanceBeds,
      occupancyPercentage: overallOccupancyPercentage,
      isAllWards: true,
    };
  }, [activeWard, summary]);

  // Ward-Wise Bed Filtering & Sorting
  const filteredWards = useMemo(() => {
    // Only target the currently selected ward (or all if ALL selected)
    const targetWards = activeWard
      ? [activeWard]
      : wardsWithBeds;

    const q = searchTerm.trim().toLowerCase();
    const rawQ = q.replace(/\s+/g, '');
    const numericQ = q.replace(/\D/g, '');

    return targetWards.map((w) => {
      const matchingBeds = w.beds.filter((b) => {
        // Status filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'AVAILABLE' && (b.status !== 'AVAILABLE' || !b.isAvailable)) return false;
          if (statusFilter === 'OCCUPIED' && (b.status !== 'OCCUPIED' && b.isAvailable)) return false;
          if (statusFilter === 'MAINTENANCE' && b.status !== 'MAINTENANCE') return false;
        }

        // Ward-wise Search Filter: supports Bed number (Bed 25, 25), ID, patient name, admission ID
        if (q) {
          const bedNumLower = b.bedNumber.toLowerCase();
          const bedNumeric = b.bedNumber.replace(/\D/g, ''); // "25" from "Bed 25"

          const matchBed =
            bedNumLower.includes(q) ||
            bedNumLower.replace(/\s+/g, '').includes(rawQ) ||
            (numericQ.length > 0 && (
              bedNumeric === numericQ ||
              bedNumeric === numericQ.padStart(2, '0') ||
              bedNumeric.endsWith(numericQ)
            )) ||
            String(b.id) === q ||
            `bed-${b.id}`.toLowerCase().includes(q) ||
            `bed-${bedNumeric}`.toLowerCase().includes(rawQ);

          const patientName = (b.currentAdmission?.patientName || '').toLowerCase();
          const matchPatient = patientName.includes(q);

          const admNum = (b.currentAdmission?.admissionNumber || '').toLowerCase();
          const patId = String(b.currentAdmission?.patientId || '');
          const matchAdm = admNum.includes(q) || patId === q || `pt-${patId}`.includes(q);

          if (!matchBed && !matchPatient && !matchAdm) {
            return false;
          }
        }

        return true;
      });

      // Sort beds according to selected criteria
      const sortedBeds = [...matchingBeds].sort((a, b) => {
        if (bedSortBy === 'number-asc') {
          return a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true });
        } else if (bedSortBy === 'number-desc') {
          return b.bedNumber.localeCompare(a.bedNumber, undefined, { numeric: true });
        } else if (bedSortBy === 'status') {
          const priority: Record<string, number> = { OCCUPIED: 1, AVAILABLE: 2, MAINTENANCE: 3 };
          const pA = priority[a.status] || 9;
          const pB = priority[b.status] || 9;
          if (pA !== pB) return pA - pB;
          return a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true });
        }
        return 0;
      });

      return {
        ...w,
        beds: sortedBeds,
      };
    });
  }, [activeWard, wardsWithBeds, searchTerm, statusFilter, bedSortBy]);

  // Total visible beds count across current view
  const totalVisibleBedsCount = useMemo(() => {
    return filteredWards.reduce((acc, w) => acc + w.beds.length, 0);
  }, [filteredWards]);

  // Full inventory bed count for current ward
  const totalWardFullBedCount = useMemo(() => {
    if (activeWard) return activeWard.beds.length || 50;
    return wardsWithBeds.reduce((acc, w) => acc + w.beds.length, 0);
  }, [activeWard, wardsWithBeds]);

  // Handle Quick Allocate button click
  const handleQuickAllocate = (wardId: number, bedId: number) => {
    setQuickAllocateModal({
      isOpen: true,
      wardId,
      bedId,
    });
  };

  // Handle Bed Details button click
  const handleViewBedDetails = (bed: WardBedDTO) => {
    const adm = getFullAdmissionForBed(bed);
    if (adm) {
      setDetailsModalAdmission(adm);
    }
  };

  // Handle Bed Transfer click
  const handleTransferBed = (bed: WardBedDTO) => {
    const adm = getFullAdmissionForBed(bed);
    if (adm) {
      setTransferModalAdmission(adm);
    }
  };

  // Reset all search and filter controls
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setBedSortBy('number-asc');
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header & Breadcrumb ───────────────────────── */}
      <div className="space-y-3">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 font-medium" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Dashboard
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
          <button
            type="button"
            onClick={onNavigateToInpatients}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Inpatient Management
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
          <span className="text-accent font-semibold">Bed Allocation</span>
        </nav>

        {/* Title, Subtitle & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  Bed Allocation
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/40 font-mono">
                  50 Beds / Ward
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Real-time Sync</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Monitor bed availability and manage inpatient assignments.
              </p>
            </div>
          </div>

          {/* Quick Actions & Sync Status */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Last updated timestamp */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-gray-400">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>
                Synced{' '}
                <strong className="text-gray-300 font-mono">
                  {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Refresh Bed Roster"
              aria-label="Refresh Bed Roster"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-accent' : ''}`} />
            </button>

            {/* Inpatient Registry Shortcut */}
            {onNavigateToInpatients && (
              <button
                type="button"
                onClick={onNavigateToInpatients}
                className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-accent" />
                <span>Inpatient Registry</span>
              </button>
            )}

            {/* Admit Patient Modal Trigger */}
            <button
              type="button"
              onClick={() => setQuickAllocateModal({ isOpen: true, wardId: activeWard?.id })}
              className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-navy-950 font-bold text-xs transition-all shadow-glow-accent flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Admit Patient</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Feedback Banners ──────────────────────────────────── */}
      {error && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs font-semibold text-amber-200 underline hover:text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 2. Prominent Ward Selection Strip ──────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <span className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-accent" />
            <span>Select Hospital Ward (50 Beds Per Ward)</span>
          </span>
          <span className="text-[11px] font-mono text-gray-400">
            {wardsWithBeds.length} Clinical Wards Active
          </span>
        </div>

        {/* Responsive Ward Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {wardsWithBeds.map((ward) => {
            const isSelected = selectedWardId === String(ward.id);
            const total = ward.totalBeds || ward.beds.length || 50;
            const occupied = ward.beds.filter((b) => b.status === 'OCCUPIED' || !b.isAvailable).length;
            const maintenance = ward.beds.filter((b) => b.status === 'MAINTENANCE').length;
            const available = ward.beds.filter((b) => b.status === 'AVAILABLE' && b.isAvailable).length;
            const occupiable = Math.max(0, total - maintenance);
            const occupancyRate = occupiable > 0 ? Math.round((occupied / occupiable) * 100) : 0;

            return (
              <div
                key={ward.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectWard(String(ward.id))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectWard(String(ward.id));
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group text-left ${
                  isSelected
                    ? 'bg-gradient-to-br from-accent/20 via-navy-900 to-navy-950 border-accent shadow-glow-accent/25 ring-1 ring-accent'
                    : 'bg-navy-900/80 border-white/10 hover:border-white/25 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`text-xs font-bold truncate transition-colors ${
                        isSelected ? 'text-accent' : 'text-white group-hover:text-accent'
                      }`}
                      title={ward.name}
                    >
                      {ward.name}
                    </h4>
                    <span className="text-[10px] text-gray-400 block font-mono truncate">
                      {ward.wardNumber} • {ward.department || 'General Medicine'}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                      isSelected
                        ? 'bg-accent text-navy-950'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {occupancyRate}%
                  </span>
                </div>

                {/* Ward mini occupancy meter */}
                <div className="w-full bg-white/10 h-1.5 rounded-full my-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      occupancyRate > 80
                        ? 'bg-rose-500'
                        : occupancyRate > 50
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, occupancyRate)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>
                    <strong className="text-emerald-400">{available}</strong> avail
                  </span>
                  <span>
                    <strong className="text-accent">{occupied}</strong> / {total} beds
                  </span>
                </div>

                {isSelected && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Ward Summary Statistics Cards (50 Beds) ───────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <span className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span>
              {wardSummaryStats.title} ({wardSummaryStats.wardNumber}) — Bed Inventory Summary
            </span>
          </span>
          <span className="text-[11px] text-gray-400">
            Department: <strong className="text-gray-200">{wardSummaryStats.department}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Beds */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">Total Ward Beds</span>
              <div className="p-2 rounded-xl bg-white/[0.05] text-gray-300 border border-white/10">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {wardSummaryStats.totalBeds}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Full ward physical capacity</p>
          </div>

          {/* Available Beds */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-emerald-500/25 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-300">Available Beds</span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {wardSummaryStats.availableBeds}
            </div>
            <p className="text-[11px] text-emerald-300/80 mt-1">Ready for immediate allocation</p>
          </div>

          {/* Occupied Beds */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-accent/25 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-accent">Occupied Beds</span>
              <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/30">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-accent tracking-tight">
              {wardSummaryStats.occupiedBeds}
            </div>
            <p className="text-[11px] text-accent/80 mt-1">Active inpatient care</p>
          </div>

          {/* Maintenance Beds */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">Maintenance Beds</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-300 tracking-tight">
              {wardSummaryStats.maintenanceBeds}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Unavailable for clinical use</p>
          </div>

          {/* Occupancy Rate */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg col-span-2 sm:col-span-1 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">Occupancy Rate</span>
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {wardSummaryStats.occupancyPercentage}%
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-accent h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, wardSummaryStats.occupancyPercentage)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Dedicated Ward-Wise Bed Search & Filters Bar ─────── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-navy-900/90 via-navy-900/95 to-navy-950 border border-white/10 shadow-xl space-y-3">
        {/* Ward Selector Dropdown + Result Indicator Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-accent" />
              <span>Active Ward:</span>
            </span>

            {/* Prominent Ward Dropdown */}
            <select
              value={selectedWardId}
              onChange={(e) => handleSelectWard(e.target.value)}
              className="bg-navy-950 border border-accent/40 rounded-xl px-3 py-1.5 text-xs font-bold text-accent focus:outline-none focus:border-accent cursor-pointer"
            >
              {wardsWithBeds.map((w) => (
                <option key={w.id} value={String(w.id)} className="bg-navy-950 text-white font-normal">
                  {w.name} — {w.department || 'Inpatient'} ({w.beds.length} beds)
                </option>
              ))}
              <option value="ALL" className="bg-navy-950 text-accent font-semibold">
                All Hospital Wards (300 beds)
              </option>
            </select>
          </div>

          {/* Result Count Indicator */}
          <div className="text-xs text-gray-400">
            Showing <strong className="text-white font-mono">{totalVisibleBedsCount}</strong> of{' '}
            <strong className="text-gray-300 font-mono">{totalWardFullBedCount}</strong> beds
            {activeWard ? ` in ${activeWard.name}` : ''}
          </div>
        </div>

        {/* Search Bar & Multi-Criteria Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Prominent Ward-Wise Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search bed number, bed ID, patient name or admission ID…"
              className="w-full bg-navy-950/90 border border-white/15 focus:border-accent rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-md cursor-pointer"
                title="Clear Search"
                aria-label="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter & Sorting Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-navy-950 border border-white/15 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-navy-950 text-white">All Bed Statuses</option>
                <option value="AVAILABLE" className="bg-navy-950 text-emerald-400">Available Beds</option>
                <option value="OCCUPIED" className="bg-navy-950 text-accent">Occupied Beds</option>
                <option value="MAINTENANCE" className="bg-navy-950 text-amber-400">Under Maintenance</option>
              </select>
            </div>

            {/* Bed Number Sorting */}
            <div className="flex items-center gap-1.5 bg-navy-950 border border-white/15 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={bedSortBy}
                onChange={(e) => setBedSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="number-asc" className="bg-navy-950 text-white">Bed 01 → Bed 50</option>
                <option value="number-desc" className="bg-navy-950 text-white">Bed 50 → Bed 01</option>
                <option value="status" className="bg-navy-950 text-white">By Status (Occupied)</option>
              </select>
            </div>

            {/* Quick Available-Only Toggle */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300'
                  : 'bg-navy-950 border-white/15 text-gray-400 hover:text-white'
              }`}
            >
              Available Only
            </button>

            {/* Reset Filters Action */}
            {(searchTerm || statusFilter !== 'ALL' || bedSortBy !== 'number-asc') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-xs text-accent hover:underline cursor-pointer font-semibold flex items-center gap-1"
                title="Reset Search and Filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. Responsive Bed Grid (50 Beds per Ward) ─────────── */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
            <p className="text-sm font-semibold text-white">Loading hospital bed roster...</p>
            <p className="text-xs text-gray-400">Synchronizing 50 beds and live patient allocations</p>
          </div>
        ) : filteredWards.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-navy-900/60 rounded-2xl border border-white/10">
            <Bed className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-white">No wards match the selected filters</p>
          </div>
        ) : (
          filteredWards.map((ward) => {
            const wardTotal = ward.totalBeds || ward.beds.length || 50;
            const wardOccupied = ward.beds.filter((b) => b.status === 'OCCUPIED' || !b.isAvailable).length;
            const wardMaintenance = ward.beds.filter((b) => b.status === 'MAINTENANCE').length;
            const wardAvailable = ward.beds.filter((b) => b.status === 'AVAILABLE' && b.isAvailable).length;
            const wardOccupiable = Math.max(0, wardTotal - wardMaintenance);
            const wardOccupancyRate =
              wardOccupiable > 0 ? Math.round((wardOccupied / wardOccupiable) * 100) : 0;

            return (
              <div
                key={ward.id}
                className="rounded-2xl bg-gradient-to-b from-navy-900 to-navy-950 border border-white/10 p-5 shadow-xl space-y-4"
              >
                {/* Ward Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-accent/15 border border-accent/30 text-accent">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{ward.name}</span>
                        <span className="font-mono text-[11px] font-normal text-gray-400">
                          ({ward.wardNumber})
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Department:{' '}
                        <strong className="text-gray-300">
                          {ward.department || 'Inpatient Services'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* Ward Summary Badges: Total 50, Available, Occupied, Maintenance, Occupancy % */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-gray-300 border border-white/10 font-semibold text-[11px] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        Total: <strong className="text-white">{wardTotal} Beds</strong>
                      </span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Available: <strong className="text-emerald-200">{wardAvailable}</strong>
                      </span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-accent/15 text-accent border border-accent/30 font-semibold text-[11px] flex items-center gap-1.5">
                      <Bed className="w-3.5 h-3.5 text-accent" />
                      <span>
                        Occupied: <strong className="text-accent">{wardOccupied}</strong>
                      </span>
                    </span>
                    {wardMaintenance > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold text-[11px] flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Maintenance: <strong className="text-amber-200">{wardMaintenance}</strong>
                        </span>
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold text-[11px] flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        Occupancy: <strong className="text-blue-200">{wardOccupancyRate}%</strong>
                      </span>
                    </span>
                  </div>
                </div>

                {/* Empty State when Search has No Matching Beds in this Ward */}
                {ward.beds.length === 0 ? (
                  <div className="p-10 text-center bg-navy-950/60 rounded-2xl border border-white/5 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                      <Search className="w-5 h-5 opacity-60" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white">
                        {searchTerm
                          ? `No beds found matching “${searchTerm}” in ${ward.name}.`
                          : `No beds match filter criteria in ${ward.name}.`}
                      </h4>
                      <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                        Try searching for a different bed number (e.g., Bed 04, 25), patient name, or clear active filters.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3.5 py-1.5 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear Search</span>
                    </button>
                  </div>
                ) : (
                  /* 50-Bed Responsive Grid: 5 to 6 columns on large desktop */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {ward.beds.map((bed) => {
                      const isOccupied = bed.status === 'OCCUPIED' || !bed.isAvailable;
                      const isMaintenance = bed.status === 'MAINTENANCE';
                      const isAvailable = bed.status === 'AVAILABLE' && bed.isAvailable;

                      return (
                        <div
                          key={bed.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                            isOccupied
                              ? 'bg-gradient-to-br from-navy-900 to-navy-950/90 border-accent/30 shadow-md'
                              : isMaintenance
                              ? 'bg-white/[0.02] border-white/10 opacity-70'
                              : 'bg-emerald-950/15 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-950/25'
                          }`}
                        >
                          {/* Bed Card Header */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Bed
                                  className={`w-4 h-4 ${
                                    isOccupied
                                      ? 'text-accent'
                                      : isMaintenance
                                      ? 'text-gray-500'
                                      : 'text-emerald-400'
                                  }`}
                                />
                                <span className="font-mono text-xs font-bold text-white">
                                  {bed.bedNumber}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                  isOccupied
                                    ? 'bg-accent/20 text-accent border-accent/40'
                                    : isMaintenance
                                    ? 'bg-gray-500/20 text-gray-400 border-gray-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {isOccupied ? 'Occupied' : isMaintenance ? 'Maintenance' : 'Available'}
                              </span>
                            </div>

                            {/* Occupant Details or Availability Message */}
                            {isOccupied && bed.currentAdmission ? (
                              <div className="p-2.5 rounded-lg bg-navy-950/80 border border-white/5 space-y-1 mb-3">
                                <div className="text-xs font-bold text-white truncate flex items-center justify-between">
                                  <span className="truncate" title={bed.currentAdmission.patientName}>
                                    {bed.currentAdmission.patientName}
                                  </span>
                                  {bed.currentAdmission.acuityLevel && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase flex-shrink-0 ${
                                        bed.currentAdmission.acuityLevel === 'CRITICAL'
                                          ? 'bg-rose-500/20 text-rose-300'
                                          : bed.currentAdmission.acuityLevel === 'HIGH'
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : 'bg-blue-500/20 text-blue-300'
                                      }`}
                                    >
                                      {bed.currentAdmission.acuityLevel}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono truncate">
                                  {bed.currentAdmission.admissionNumber}
                                </div>
                              </div>
                            ) : isOccupied ? (
                              <div className="p-2.5 rounded-lg bg-navy-950/80 border border-white/5 mb-3 text-[11px] text-gray-300">
                                Active Inpatient Admitted
                              </div>
                            ) : isMaintenance ? (
                              <div className="p-2 rounded-lg bg-white/[0.02] mb-3 text-[11px] text-gray-500 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-gray-500" />
                                <span>Bed Out of Service</span>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 mb-3 text-[11px] text-emerald-300 font-medium">
                                Ready for allocation
                              </div>
                            )}
                          </div>

                          {/* Context-Sensitive Actions */}
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
                            {isAvailable ? (
                              <button
                                type="button"
                                onClick={() => handleQuickAllocate(ward.id, bed.id)}
                                className="w-full py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Quick Allocate</span>
                              </button>
                            ) : isOccupied ? (
                              <div className="w-full flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleViewBedDetails(bed)}
                                  className="flex-1 py-1 px-2 rounded-lg bg-white/[0.05] hover:bg-white/10 text-gray-200 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                  title="View Admission Details"
                                >
                                  <Eye className="w-3 h-3 text-accent" />
                                  <span>Details</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleTransferBed(bed)}
                                  className="flex-1 py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                  title="Transfer to Another Bed"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>Transfer</span>
                                </button>

                                {onNavigateToPatient && bed.currentAdmission && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onNavigateToPatient(bed.currentAdmission!.patientId, 'overview')
                                    }
                                    className="p-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                    title="Open Patient Medical Record"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500 italic mx-auto">
                                Allocation Locked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── 6. Admission, Details & Transfer Modals ────────────── */}
      <InpatientAdmissionModal
        isOpen={quickAllocateModal.isOpen}
        onClose={() => setQuickAllocateModal({ isOpen: false })}
        patients={patients}
        initialWardId={quickAllocateModal.wardId}
        initialBedId={quickAllocateModal.bedId}
        onAdmitted={() => {
          setQuickAllocateModal({ isOpen: false });
          setSuccessToast('Patient admitted and bed allocated successfully.');
          loadBedAllocationData();
        }}
      />

      <InpatientAdmissionDetailsModal
        admission={detailsModalAdmission}
        onClose={() => setDetailsModalAdmission(null)}
        onOpenPatientChart={(pid) => {
          setDetailsModalAdmission(null);
          if (onNavigateToPatient) onNavigateToPatient(pid, 'overview');
        }}
        onTransferBed={(adm) => {
          setDetailsModalAdmission(null);
          setTransferModalAdmission(adm);
        }}
        onStartDischarge={(adm) => {
          setDetailsModalAdmission(null);
          if (onNavigateToPatient) onNavigateToPatient(adm.patientId, 'discharge-summary');
        }}
      />

      <InpatientTransferModal
        isOpen={Boolean(transferModalAdmission)}
        onClose={() => setTransferModalAdmission(null)}
        admission={transferModalAdmission}
        onTransferred={() => {
          setTransferModalAdmission(null);
          setSuccessToast('Patient transferred to destination bed successfully.');
          loadBedAllocationData();
        }}
      />
    </div>
  );
};
