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
  Stethoscope,
  Calendar,
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

  // Ward Selection (defaults to first active ward in DB)
  const [selectedWardId, setSelectedWardId] = useState<string>('');

  // Ward-Wise Search & Toolbar Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'>('ALL');
  const [bedSortBy, setBedSortBy] = useState<'number-asc' | 'number-desc' | 'status'>('number-asc');

  // Selected Bed for the Side Drawer
  const [selectedBed, setSelectedBed] = useState<WardBedDTO | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
        setSelectedBed(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

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

      // If a bed is currently selected in drawer, update its reference
      if (selectedBed) {
        for (const w of loadedWards) {
          const match = w.beds.find((b) => b.id === selectedBed.id);
          if (match) {
            setSelectedBed(match);
            break;
          }
        }
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

  // Handle Ward Switch: closes drawer, resets search/filters, and scopes to new ward
  const handleSelectWard = (newWardId: string) => {
    setSelectedWardId(newWardId);
    setSelectedBed(null);
    setIsDrawerOpen(false);
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
      title: 'Hospital-Wide Bed Inventory',
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
  const filteredBeds = useMemo(() => {
    const targetWards = activeWard ? [activeWard] : wardsWithBeds;
    const q = searchTerm.trim().toLowerCase();
    const rawQ = q.replace(/\s+/g, '');
    const numericQ = q.replace(/\D/g, '');

    const result: WardBedDTO[] = [];

    targetWards.forEach((w) => {
      w.beds.forEach((b) => {
        // 1. Status Filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'AVAILABLE' && (b.status !== 'AVAILABLE' || !b.isAvailable)) return;
          if (statusFilter === 'OCCUPIED' && (b.status !== 'OCCUPIED' && b.isAvailable)) return;
          if (statusFilter === 'MAINTENANCE' && b.status !== 'MAINTENANCE') return;
        }

        // 2. Ward-Wise Search Filter: matches Bed number (Bed 25, 25), ID, patient name, admission ID
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
            return;
          }
        }

        result.push(b);
      });
    });

    // 3. Sorting
    return result.sort((a, b) => {
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
  }, [activeWard, wardsWithBeds, searchTerm, statusFilter, bedSortBy]);

  // Full inventory bed count for current ward
  const totalWardFullBedCount = useMemo(() => {
    if (activeWard) return activeWard.beds.length || 50;
    return wardsWithBeds.reduce((acc, w) => acc + w.beds.length, 0);
  }, [activeWard, wardsWithBeds]);

  // Handle tile selection: opens the Side Drawer
  const handleSelectBed = (bed: WardBedDTO) => {
    setSelectedBed(bed);
    setIsDrawerOpen(true);
  };

  // Close the Side Drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedBed(null);
  };

  // Reset all search and filter controls
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setBedSortBy('number-asc');
  };

  // Details for currently selected bed in drawer
  const selectedBedAdmission = useMemo(() => {
    if (!selectedBed) return null;
    return getFullAdmissionForBed(selectedBed);
  }, [selectedBed, admissions]);

  const selectedBedWard = useMemo(() => {
    if (!selectedBed) return null;
    return wardsWithBeds.find((w) => w.id === selectedBed.wardId) || null;
  }, [selectedBed, wardsWithBeds]);

  return (
    <div className="space-y-5">
      {/* ── 1. Compact Header & Breadcrumbs ───────────────────────── */}
      <div className="space-y-2">
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

        {/* Title, Subtitle & Compact Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/15 border border-accent/30 text-accent shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  Bed Allocation
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-mono">
                  50 Beds
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Real-time</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage ward capacity and inpatient bed assignments.
              </p>
            </div>
          </div>

          {/* Quick Actions & Header Ward Dropdown */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Header Ward Selector */}
            <div className="flex items-center gap-1.5 bg-navy-950 border border-accent/40 rounded-xl px-2.5 py-1.5 shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              <select
                value={selectedWardId}
                onChange={(e) => handleSelectWard(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
                aria-label="Select Hospital Ward"
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

            {/* Last updated timestamp */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-gray-400">
              <Clock className="w-3 h-3 text-gray-400" />
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
              className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Refresh Bed Data"
              aria-label="Refresh Bed Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-accent' : ''}`} />
            </button>

            {/* Admit Patient Quick Action */}
            <button
              type="button"
              onClick={() => setQuickAllocateModal({ isOpen: true, wardId: activeWard?.id })}
              className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-light text-navy-950 font-bold text-xs transition-all shadow-glow-accent flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Admit Patient</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Feedback Banners ──────────────────────────────────── */}
      {error && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2.5">
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
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 2. Segmented Ward Switcher Strip ───────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {wardsWithBeds.map((ward) => {
          const isSelected = selectedWardId === String(ward.id);
          const total = ward.totalBeds || ward.beds.length || 50;
          const occupied = ward.beds.filter((b) => b.status === 'OCCUPIED' || !b.isAvailable).length;

          return (
            <button
              key={ward.id}
              type="button"
              onClick={() => handleSelectWard(String(ward.id))}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-accent/20 border-accent text-accent shadow-glow-accent/20'
                  : 'bg-navy-900/80 border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>{ward.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  isSelected ? 'bg-accent text-navy-950 font-bold' : 'bg-white/10 text-gray-400'
                }`}
              >
                {occupied}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Five Compact Summary Cards ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Total Beds */}
        <div className="p-3 rounded-xl bg-navy-900/80 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-medium">Total Beds</span>
            <Layers className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {wardSummaryStats.totalBeds}
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5">Physical bed capacity</span>
        </div>

        {/* Available Beds */}
        <div className="p-3 rounded-xl bg-navy-900/80 border border-emerald-500/25 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-300 mb-1">
            <span className="font-medium">Available</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {wardSummaryStats.availableBeds}
          </div>
          <span className="text-[10px] text-emerald-400/70 mt-0.5">Ready for allocation</span>
        </div>

        {/* Occupied Beds */}
        <div className="p-3 rounded-xl bg-navy-900/80 border border-accent/25 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-accent mb-1">
            <span className="font-medium">Occupied</span>
            <Bed className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="text-xl font-bold text-accent tracking-tight">
            {wardSummaryStats.occupiedBeds}
          </div>
          <span className="text-[10px] text-accent/70 mt-0.5">Active admissions</span>
        </div>

        {/* Maintenance Beds */}
        <div className="p-3 rounded-xl bg-navy-900/80 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
            <span className="font-medium">Maintenance</span>
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-gray-300 tracking-tight">
            {wardSummaryStats.maintenanceBeds}
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5">Out of service</span>
        </div>

        {/* Occupancy Rate */}
        <div className="p-3 rounded-xl bg-navy-900/80 border border-white/10 col-span-2 sm:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-medium">Occupancy</span>
            <Percent className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {wardSummaryStats.occupancyPercentage}%
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-accent h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, wardSummaryStats.occupancyPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 4. Unified Search & Filtering Toolbar ──────────────── */}
      <div className="p-3 rounded-xl bg-navy-900/90 border border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Prominent Wide Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search bed number, bed ID, patient name or admission ID..."
            className="w-full bg-navy-950 border border-white/15 focus:border-accent rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Sorting Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-navy-950 border border-white/15 rounded-lg px-2 py-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-navy-950 text-white">All Beds</option>
              <option value="AVAILABLE" className="bg-navy-950 text-emerald-400">Available</option>
              <option value="OCCUPIED" className="bg-navy-950 text-accent">Occupied</option>
              <option value="MAINTENANCE" className="bg-navy-950 text-amber-400">Maintenance</option>
            </select>
          </div>

          {/* Bed Sorting */}
          <div className="flex items-center gap-1 bg-navy-950 border border-white/15 rounded-lg px-2 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={bedSortBy}
              onChange={(e) => setBedSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="number-asc" className="bg-navy-950 text-white">Bed 01 → 50</option>
              <option value="number-desc" className="bg-navy-950 text-white">Bed 50 → 01</option>
              <option value="status" className="bg-navy-950 text-white">By Status</option>
            </select>
          </div>

          {/* Quick Available-Only Toggle */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              statusFilter === 'AVAILABLE'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
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
              className="px-2 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-xs text-accent cursor-pointer flex items-center gap-1 font-semibold"
              title="Reset search and filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Matching Result Count */}
          <div className="text-xs text-gray-400 pl-1">
            Showing <strong className="text-white font-mono">{filteredBeds.length}</strong> of{' '}
            <span className="text-gray-400 font-mono">{totalWardFullBedCount}</span> beds
          </div>
        </div>
      </div>

      {/* ── 5. Compact Bed Map & Map Legend ─────────────────────── */}
      <div className="space-y-3">
        {/* Map Legend */}
        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-300">Legend:</span>
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-md bg-emerald-500/30 border border-emerald-400/80" />
              <span className="text-emerald-300">Available</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-md bg-accent/25 border border-accent/80" />
              <span className="text-accent">Occupied</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-md bg-amber-500/20 border border-amber-400/70" />
              <span className="text-amber-300">Maintenance</span>
            </span>
          </div>

          <span className="text-[11px] text-gray-500 italic hidden sm:inline">
            Select any bed tile to open details & management actions
          </span>
        </div>

        {/* Bed Grid (50 Compact Tiles: 8–10 per row on desktop) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin text-accent mb-2" />
            <p className="text-xs font-semibold text-white">Loading bed map...</p>
          </div>
        ) : filteredBeds.length === 0 ? (
          /* Empty Search Results State */
          <div className="p-10 text-center bg-navy-900/60 rounded-2xl border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
              <Search className="w-5 h-5 opacity-60" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">
                {searchTerm
                  ? `No beds found matching “${searchTerm}” in ${activeWard?.name || 'this ward'}.`
                  : `No beds match the selected filters.`}
              </h4>
              <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                Check for typos, or clear filters to view all 50 beds in this ward.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Search</span>
            </button>
          </div>
        ) : (
          /* 50 Compact Bed Tiles Grid */
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-2.5">
            {filteredBeds.map((bed) => {
              const isOccupied = bed.status === 'OCCUPIED' || !bed.isAvailable;
              const isMaintenance = bed.status === 'MAINTENANCE';
              const isSelected = selectedBed?.id === bed.id;

              return (
                <button
                  key={bed.id}
                  type="button"
                  onClick={() => handleSelectBed(bed)}
                  aria-label={`${bed.bedNumber}, ${bed.status}${
                    isOccupied && bed.currentAdmission ? `, Patient: ${bed.currentAdmission.patientName}` : ''
                  }`}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[68px] relative group outline-none ${
                    isSelected
                      ? 'ring-2 ring-accent border-accent shadow-glow-accent/30 bg-accent/15'
                      : isOccupied
                      ? 'bg-blue-950/20 border-accent/30 hover:border-accent/70 hover:bg-accent/10 text-accent'
                      : isMaintenance
                      ? 'bg-white/[0.02] border-white/10 hover:border-white/25 text-gray-400'
                      : 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/35 text-emerald-300'
                  }`}
                >
                  {/* Tile Top Row: Bed Icon + Bed Number */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <Bed
                        className={`w-3.5 h-3.5 ${
                          isOccupied
                            ? 'text-accent'
                            : isMaintenance
                            ? 'text-gray-500'
                            : 'text-emerald-400'
                        }`}
                      />
                      <span className="font-mono text-xs font-bold text-white tracking-tight">
                        {bed.bedNumber}
                      </span>
                    </div>

                    {/* Acuity Dot or Indicator for Occupied Bed */}
                    {isOccupied && bed.currentAdmission?.acuityLevel && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          bed.currentAdmission.acuityLevel === 'CRITICAL'
                            ? 'bg-rose-500 animate-pulse'
                            : bed.currentAdmission.acuityLevel === 'HIGH'
                            ? 'bg-amber-400'
                            : 'bg-blue-400'
                        }`}
                        title={`Acuity: ${bed.currentAdmission.acuityLevel}`}
                      />
                    )}
                  </div>

                  {/* Tile Bottom Row: Accessible Status Label & Occupant Hint */}
                  <div className="mt-1 w-full">
                    {isOccupied && bed.currentAdmission ? (
                      <div className="text-[10px] font-semibold text-accent truncate" title={bed.currentAdmission.patientName}>
                        {bed.currentAdmission.patientName}
                      </div>
                    ) : isOccupied ? (
                      <div className="text-[10px] font-medium text-accent">Occupied</div>
                    ) : isMaintenance ? (
                      <div className="text-[10px] font-medium text-amber-300/80">Maint.</div>
                    ) : (
                      <div className="text-[10px] font-medium text-emerald-400">Available</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 6. Bed Details Side Drawer ─────────────────────────── */}
      {isDrawerOpen && selectedBed && (
        <>
          {/* Backdrop (mobile/desktop click-outside) */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={handleCloseDrawer}
          />

          {/* Right Slide-Over Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bed-drawer-title"
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-gradient-to-b from-navy-900 to-navy-950 border-l border-white/15 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
          >
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      selectedBed.status === 'AVAILABLE'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : selectedBed.status === 'OCCUPIED'
                        ? 'bg-accent/15 border-accent/30 text-accent'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <Bed className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="bed-drawer-title" className="text-base font-bold text-white flex items-center gap-2">
                      <span>{selectedBed.bedNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          selectedBed.status === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : selectedBed.status === 'OCCUPIED'
                            ? 'bg-accent/20 text-accent border-accent/40'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/40'
                        }`}
                      >
                        {selectedBed.status}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      {selectedBedWard?.name || 'Hospital Ward'} ({selectedBedWard?.wardNumber}) •{' '}
                      {selectedBedWard?.department || 'Inpatient'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Bed Details"
                  aria-label="Close Bed Details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content: AVAILABLE BED */}
              {selectedBed.status === 'AVAILABLE' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ready for Immediate Patient Admission</span>
                    </div>
                    <p className="text-xs text-emerald-200/80 leading-relaxed">
                      This bed is disinfected, inspected, and fully prepped for inpatient allocation in{' '}
                      <strong>{selectedBedWard?.name}</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-navy-950/80 border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Physical Bed ID:</span>
                      <span className="font-mono text-white font-bold">#{selectedBed.id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Assigned Ward:</span>
                      <span className="text-white">{selectedBedWard?.name}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-400">Department:</span>
                      <span className="text-white">{selectedBedWard?.department}</span>
                    </div>
                  </div>

                  {/* Primary Quick Allocate Action */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseDrawer();
                      setQuickAllocateModal({
                        isOpen: true,
                        wardId: selectedBed.wardId,
                        bedId: selectedBed.id,
                      });
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold text-xs transition-colors shadow-glow-emerald flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Quick Allocate This Bed</span>
                  </button>
                </div>
              )}

              {/* Drawer Content: OCCUPIED BED */}
              {selectedBed.status === 'OCCUPIED' && (
                <div className="space-y-4">
                  {/* Patient Info Card */}
                  <div className="p-4 rounded-xl bg-navy-950/90 border border-accent/30 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {selectedBed.currentAdmission?.patientName || 'Admitted Patient'}
                          </h4>
                          <span className="text-[11px] font-mono text-gray-400">
                            {selectedBedAdmission?.patientCode || `PT-${selectedBed.currentAdmission?.patientId || ''}`}
                          </span>
                        </div>
                      </div>

                      {selectedBed.currentAdmission?.acuityLevel && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            selectedBed.currentAdmission.acuityLevel === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : selectedBed.currentAdmission.acuityLevel === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}
                        >
                          {selectedBed.currentAdmission.acuityLevel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Clinical Admission Summary */}
                  <div className="p-3.5 rounded-xl bg-navy-950/80 border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Admission Code:</span>
                      <span className="font-mono text-accent font-semibold">
                        {selectedBed.currentAdmission?.admissionNumber || 'ADM-RECORD'}
                      </span>
                    </div>

                    {selectedBedAdmission?.admissionDiagnosis && (
                      <div className="py-1 border-b border-white/5">
                        <span className="text-gray-400 block mb-0.5">Admission Diagnosis:</span>
                        <span className="text-white font-medium">
                          {selectedBedAdmission.admissionDiagnosis}
                        </span>
                      </div>
                    )}

                    {selectedBedAdmission?.chiefComplaint && (
                      <div className="py-1 border-b border-white/5">
                        <span className="text-gray-400 block mb-0.5">Chief Complaint:</span>
                        <span className="text-gray-200">
                          {selectedBedAdmission.chiefComplaint}
                        </span>
                      </div>
                    )}

                    {selectedBedAdmission?.doctorName && (
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-400">Attending Doctor:</span>
                        <span className="text-white font-medium flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-accent" />
                          <span>{selectedBedAdmission.doctorName}</span>
                        </span>
                      </div>
                    )}

                    {selectedBedAdmission?.admissionDateTime && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-400">Admission Time:</span>
                        <span className="text-gray-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {new Date(selectedBedAdmission.admissionDateTime).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Occupied Bed */}
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const adm = getFullAdmissionForBed(selectedBed);
                          if (adm) {
                            handleCloseDrawer();
                            setDetailsModalAdmission(adm);
                          }
                        }}
                        className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-accent" />
                        <span>View Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const adm = getFullAdmissionForBed(selectedBed);
                          if (adm) {
                            handleCloseDrawer();
                            setTransferModalAdmission(adm);
                          }
                        }}
                        className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Transfer Bed</span>
                      </button>
                    </div>

                    {onNavigateToPatient && selectedBed.currentAdmission && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseDrawer();
                          onNavigateToPatient(selectedBed.currentAdmission!.patientId, 'overview');
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-navy-950 hover:bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-accent" />
                        <span>Open Patient Medical Record</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Drawer Content: MAINTENANCE BED */}
              {selectedBed.status === 'MAINTENANCE' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                      <Wrench className="w-4 h-4" />
                      <span>Bed Out of Service</span>
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      This bed is temporarily locked for clinical sanitization or medical device inspection.
                      Allocation is currently disabled.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-navy-950/80 border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Physical Bed ID:</span>
                      <span className="font-mono text-white">#{selectedBed.id}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-amber-300 font-semibold">Under Maintenance</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Reference */}
            <div className="pt-4 border-t border-white/10 text-center">
              <span className="text-[11px] text-gray-500">
                Hospital Telemetry System • MediTwin AI
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── 7. Inpatient Management Modals ───────────────────────── */}
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
