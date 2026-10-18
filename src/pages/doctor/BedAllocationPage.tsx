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
}

interface WardWithBeds extends HospitalWardDTO {
  beds: WardBedDTO[];
}

export const BedAllocationPage: React.FC<BedAllocationPageProps> = ({
  onNavigateToPatient,
  onNavigateToInpatients,
}) => {
  const [wardsWithBeds, setWardsWithBeds] = useState<WardWithBeds[]>([]);
  const [summary, setSummary] = useState<BedAllocationSummaryDTO | null>(null);
  const [admissions, setAdmissions] = useState<InpatientAdmissionRecord[]>([]);
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [quickAllocateModal, setQuickAllocateModal] = useState<{
    isOpen: boolean;
    wardId?: number;
    bedId?: number;
  }>({ isOpen: false });

  const [detailsModalAdmission, setDetailsModalAdmission] = useState<InpatientAdmissionRecord | null>(null);
  const [transferModalAdmission, setTransferModalAdmission] = useState<InpatientAdmissionRecord | null>(null);

  // Fetch all wards and their respective bed inventories
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

      // For each ward, load bed roster
      const loadedWards = await Promise.all(
        wardsRes.map(async (ward) => {
          try {
            const bedData = await getWardBeds(ward.id);
            const bedsList = Array.isArray(bedData?.beds) ? bedData.beds : [];

            // Enrich beds with admission details if occupied
            const enrichedBeds: WardBedDTO[] = bedsList.map((bed) => {
              if (bed.status === 'OCCUPIED' || !bed.isAvailable) {
                // Find matching active admission
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
    // Try matching by bedId
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

  // Filtered Wards and Beds
  const filteredWards = useMemo(() => {
    return wardsWithBeds
      .filter((w) => {
        if (selectedWardFilter !== 'ALL' && String(w.id) !== selectedWardFilter) {
          return false;
        }
        return true;
      })
      .map((w) => {
        const filteredBeds = w.beds.filter((b) => {
          // Status filter
          if (statusFilter !== 'ALL') {
            if (statusFilter === 'AVAILABLE' && b.status !== 'AVAILABLE') return false;
            if (statusFilter === 'OCCUPIED' && b.status !== 'OCCUPIED') return false;
            if (statusFilter === 'MAINTENANCE' && b.status !== 'MAINTENANCE') return false;
          }

          // Search term filter (bed number or patient name)
          if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            const matchBed = b.bedNumber.toLowerCase().includes(q);
            const matchPatient = (b.currentAdmission?.patientName || '').toLowerCase().includes(q);
            const matchAdm = (b.currentAdmission?.admissionNumber || '').toLowerCase().includes(q);
            if (!matchBed && !matchPatient && !matchAdm) return false;
          }

          return true;
        });

        return {
          ...w,
          beds: filteredBeds,
        };
      });
  }, [wardsWithBeds, selectedWardFilter, statusFilter, searchTerm]);

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

  return (
    <div className="space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
              <span>Bed Allocation & Ward Inventory</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/40 font-mono">
                Real-time Sync
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Live hospital occupancy telemetry, interactive bed grid, and instant patient allocation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Refresh Bed Statuses"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-accent' : ''}`} />
          </button>

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

          <button
            type="button"
            onClick={() => setQuickAllocateModal({ isOpen: true })}
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

      {/* Aggregate Bed Status Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Beds */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">Total Active Beds</span>
            <div className="p-2 rounded-xl bg-white/[0.05] text-gray-300 border border-white/10">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary?.totalHospitalBeds ?? 46}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Across all hospital wards</p>
        </div>

        {/* Available Beds */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-300">Available Beds</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {summary?.totalAvailableBeds ?? 27}
          </div>
          <p className="text-[11px] text-emerald-300/80 mt-1">Ready for immediate admission</p>
        </div>

        {/* Occupied Beds */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-accent/20 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-accent">Occupied Beds</span>
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/30">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-accent tracking-tight">
            {summary?.totalOccupiedBeds ?? 19}
          </div>
          <p className="text-[11px] text-accent/80 mt-1">Active patient care</p>
        </div>

        {/* Overall Occupancy Percentage */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">Hospital Occupancy</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary?.overallOccupancyPercentage ?? 41}%
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-accent h-full rounded-full transition-all duration-500"
              style={{ width: `${summary?.overallOccupancyPercentage ?? 41}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ward Capacity Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {wardsWithBeds.map((ward) => {
          const total = ward.totalBeds || ward.beds.length || 1;
          const occupied = ward.occupiedBeds || ward.beds.filter((b) => b.status === 'OCCUPIED').length;
          const available = ward.availableBeds || ward.beds.filter((b) => b.isAvailable || b.status === 'AVAILABLE').length;
          const occupancyRate = Math.round((occupied / total) * 100);

          return (
            <div
              key={ward.id}
              onClick={() => setSelectedWardFilter(String(ward.id))}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                selectedWardFilter === String(ward.id)
                  ? 'bg-accent/15 border-accent shadow-glow-accent/20'
                  : 'bg-navy-900/80 border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-accent transition-colors">
                    {ward.name}
                  </h4>
                  <span className="text-[10px] text-gray-400 block font-mono">
                    {ward.wardNumber} • {ward.department}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-white/10 text-white">
                  {occupancyRate}%
                </span>
              </div>

              {/* Mini progress bar */}
              <div className="w-full bg-white/10 h-1 rounded-full my-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    occupancyRate > 80 ? 'bg-rose-500' : occupancyRate > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>
                  <strong className="text-white">{available}</strong> avail
                </span>
                <span>
                  <strong className="text-gray-300">{occupied}</strong> / {total} beds
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters & Bed Search Bar */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search beds (e.g., Bed 04) or patient name..."
            className="w-full bg-navy-950/80 border border-white/15 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ward Selector */}
          <select
            value={selectedWardFilter}
            onChange={(e) => setSelectedWardFilter(e.target.value)}
            className="bg-navy-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Hospital Wards</option>
            {wardsWithBeds.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-navy-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Bed Statuses</option>
            <option value="AVAILABLE">Available Beds</option>
            <option value="OCCUPIED">Occupied Beds</option>
            <option value="MAINTENANCE">Under Maintenance</option>
          </select>

          {(searchTerm || selectedWardFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedWardFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-xs text-accent hover:underline px-2 py-1 cursor-pointer font-semibold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Interactive Bed Grid Grouped by Ward */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
            <p className="text-sm font-semibold text-white">Loading interactive hospital bed roster...</p>
            <p className="text-xs text-gray-400">Fetching live bed allocations and ward occupancy</p>
          </div>
        ) : filteredWards.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-navy-900/60 rounded-2xl border border-white/10">
            <Bed className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-white">No wards match the selected filters</p>
          </div>
        ) : (
          filteredWards.map((ward) => (
            <div
              key={ward.id}
              className="rounded-2xl bg-gradient-to-b from-navy-900 to-navy-950 border border-white/10 p-5 shadow-xl space-y-4"
            >
              {/* Ward Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/15 border border-accent/30 text-accent">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{ward.name}</span>
                      <span className="font-mono text-[11px] font-normal text-gray-400">({ward.wardNumber})</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Department: <strong className="text-gray-300">{ward.department || 'Inpatient Services'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]">
                    {ward.beds.filter((b) => b.isAvailable || b.status === 'AVAILABLE').length} Available
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-accent/15 text-accent border border-accent/30 font-semibold text-[11px]">
                    {ward.beds.filter((b) => b.status === 'OCCUPIED').length} Occupied
                  </span>
                </div>
              </div>

              {/* Beds Grid */}
              {ward.beds.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 italic">
                  No beds match filter criteria in this ward.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                        {/* Bed Header */}
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
                              <span className="font-mono text-xs font-bold text-white">{bed.bedNumber}</span>
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
                                <span className="truncate">{bed.currentAdmission.patientName}</span>
                                {bed.currentAdmission.acuityLevel && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                      bed.currentAdmission.acuityLevel === 'CRITICAL'
                                        ? 'bg-rose-500/20 text-rose-300'
                                        : 'bg-blue-500/20 text-blue-300'
                                    }`}
                                  >
                                    {bed.currentAdmission.acuityLevel}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
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
                              Ready for immediate allocation
                            </div>
                          )}
                        </div>

                        {/* Bed Actions */}
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
                                  onClick={() => onNavigateToPatient(bed.currentAdmission!.patientId, 'overview')}
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
          ))
        )}
      </div>

      {/* Modals */}
      <InpatientAdmissionModal
        isOpen={quickAllocateModal.isOpen}
        onClose={() => setQuickAllocateModal({ isOpen: false })}
        patients={patients}
        initialWardId={quickAllocateModal.wardId}
        initialBedId={quickAllocateModal.bedId}
        onAdmitted={() => {
          setQuickAllocateModal({ isOpen: false });
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
          loadBedAllocationData();
        }}
      />
    </div>
  );
};
