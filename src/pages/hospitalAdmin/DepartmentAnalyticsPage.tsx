import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  UserCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Search,
  BarChart3,
  PieChart,
  TrendingUp,
  Layers,
  ShieldCheck,
  Building,
  HeartPulse,
  Scale,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as hospitalAdminService from '../../services/hospitalAdminService';
import type {
  DepartmentAnalyticsData,
  DepartmentMetricItem,
  DepartmentAnalyticsFilters,
} from '../../types';

type DatePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days' | 'custom';

export const DepartmentAnalyticsPage: React.FC = () => {
  // ── State ──
  const [data, setData] = useState<DepartmentAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');

  // Department Comparison
  const [compareDeptAId, setCompareDeptAId] = useState<number | null>(null);
  const [compareDeptBId, setCompareDeptBId] = useState<number | null>(null);

  // Table Sorting
  const [sortField, setSortField] = useState<keyof DepartmentMetricItem>('appointmentCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Compute start/end dates from preset
  const computedDateRange = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (datePreset === 'today') {
      const str = toYMD(today);
      return { start: str, end: str };
    }
    if (datePreset === 'this_week') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return { start: toYMD(monday), end: toYMD(today) };
    }
    if (datePreset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toYMD(firstDay), end: toYMD(today) };
    }
    if (datePreset === 'last_7_days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      return { start: toYMD(past), end: toYMD(today) };
    }
    if (datePreset === 'last_30_days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      return { start: toYMD(past), end: toYMD(today) };
    }
    if (datePreset === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: '', end: '' };
  }, [datePreset, customStartDate, customEndDate]);

  // ── Load Analytics Data ──
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: DepartmentAnalyticsFilters = {};
      if (computedDateRange.start) filters.startDate = computedDateRange.start;
      if (computedDateRange.end) filters.endDate = computedDateRange.end;
      if (selectedDeptId && selectedDeptId !== 'all') filters.departmentId = selectedDeptId;
      if (selectedStatus && selectedStatus !== 'all') filters.appointmentStatus = selectedStatus;

      const result = await hospitalAdminService.getDepartmentAnalytics(filters);
      setData(result);

      // Default comparison departments if available
      if (result.departments.length >= 2) {
        setCompareDeptAId((prev) => (prev !== null && result.departments.some(d => d.id === prev) ? prev : result.departments[0].id));
        setCompareDeptBId((prev) => (prev !== null && result.departments.some(d => d.id === prev) ? prev : result.departments[1].id));
      } else if (result.departments.length === 1) {
        setCompareDeptAId(result.departments[0].id);
        setCompareDeptBId(result.departments[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load department analytics:', err);
      setError(err.message || 'Analytics unavailable. Database query failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [computedDateRange.start, computedDateRange.end, selectedDeptId, selectedStatus]);

  // ── Handlers ──
  const handleExportCsv = async () => {
    try {
      const filters: DepartmentAnalyticsFilters = {};
      if (computedDateRange.start) filters.startDate = computedDateRange.start;
      if (computedDateRange.end) filters.endDate = computedDateRange.end;
      if (selectedDeptId && selectedDeptId !== 'all') filters.departmentId = selectedDeptId;
      if (selectedStatus && selectedStatus !== 'all') filters.appointmentStatus = selectedStatus;

      await hospitalAdminService.exportDepartmentAnalyticsCsv(filters);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV report.');
    }
  };

  const handlePrint = () => {
    hospitalAdminService.logDepartmentAnalyticsAudit('DEPARTMENT_REPORT_GENERATED', {
      format: 'Print',
      filters: {
        startDate: computedDateRange.start || null,
        endDate: computedDateRange.end || null,
        departmentId: selectedDeptId,
        appointmentStatus: selectedStatus,
      },
    });
    window.print();
  };

  const handleResetFilters = () => {
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedDeptId('all');
    setSelectedStatus('all');
    setSearchTableQuery('');
  };

  // ── Table Filtering & Sorting ──
  const filteredDepartments = useMemo(() => {
    if (!data) return [];
    let list = [...data.departments];

    if (searchTableQuery.trim() !== '') {
      const q = searchTableQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      const numA = Number(valA ?? -1);
      const numB = Number(valB ?? -1);
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    return list;
  }, [data, searchTableQuery, sortField, sortOrder]);

  const handleSort = (field: keyof DepartmentMetricItem) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // ── Comparison Data ──
  const compareDeptA = useMemo(
    () => data?.departments.find((d) => d.id === compareDeptAId) || null,
    [data, compareDeptAId]
  );
  const compareDeptB = useMemo(
    () => data?.departments.find((d) => d.id === compareDeptBId) || null,
    [data, compareDeptBId]
  );

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border border-accent/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/40">
                  Hospital Administrator
                </span>
                {data?.hospital && (
                  <span className="text-xs text-gray-300 flex items-center gap-1 font-medium">
                    <Building className="w-3.5 h-3.5 text-accent" />
                    {data.hospital.name} {data.hospital.city ? `• ${data.hospital.city}, ${data.hospital.state}` : ''}
                  </span>
                )}
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Database Verified
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Department Analytics
              </h1>
              <p className="text-xs sm:text-sm text-gray-300">
                Hospital-wide department performance, staffing distribution, and operational appointment overview.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <Button
              variant="glass"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
              disabled={loading || !!error}
            >
              Print Report
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportCsv}
              disabled={loading || !!error || !data || data.departments.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Filter Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-4 border border-white/10 space-y-3 print:hidden"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wider uppercase">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <span>Operational Filters</span>
          </div>
          {(datePreset !== 'all' || selectedDeptId !== 'all' || selectedStatus !== 'all' || customStartDate || customEndDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-accent hover:text-accent-hover transition-colors font-medium flex items-center gap-1"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Date Preset Selector */}
          <div>
            <label className="block text-gray-400 font-medium mb-1">Time Horizon</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full bg-navy-950/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent"
            >
              <option value="all">All Available Records</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-gray-400 font-medium mb-1">Department</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-navy-950/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent"
            >
              <option value="all">All Departments</option>
              {data?.departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Appointment Status Filter */}
          <div>
            <label className="block text-gray-400 font-medium mb-1">Appointment Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-navy-950/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="scheduled">Scheduled / Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-Show</option>
            </select>
          </div>

          {/* Active Filter Summary or Custom Date Pickers */}
          {datePreset === 'custom' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-navy-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-accent text-xs"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-navy-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-accent text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-end">
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-300 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-medium">Applied Scope:</span>
                <span className="text-[11px] font-semibold text-emerald-400">
                  {selectedDeptId === 'all' ? 'Hospital-Wide' : 'Single Dept'}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Error State ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-4"
        >
          <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-white">Analytics Unavailable</h3>
            <p className="text-xs text-rose-300">{error}</p>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={() => fetchAnalytics()}>
                Retry Query
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-4 rounded-2xl border border-white/10 animate-pulse space-y-2">
              <div className="h-3 w-16 bg-white/10 rounded" />
              <div className="h-7 w-20 bg-white/20 rounded" />
              <div className="h-2 w-24 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ── Summary KPI Cards ── */}
      {data && !loading && !error && (
        <div className="space-y-3">
          {/* Main 6 Required Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Departments */}
            <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Depts</span>
                <Building2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white">
                {data.summary.totalDepartments}
              </div>
              <span className="text-[10px] text-gray-400">Hospital Scope</span>
            </div>

            {/* 2. Active Departments */}
            <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Active Depts</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                {data.summary.activeDepartments}
              </div>
              <span className="text-[10px] text-gray-400">With Staff & Volume</span>
            </div>

            {/* 3. Total Doctors */}
            <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Physicians</span>
                <HeartPulse className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white">
                {data.summary.totalDoctors}
              </div>
              <span className="text-[10px] text-gray-400">Clinical Staff</span>
            </div>

            {/* 4. Total Nurses */}
            <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Nurses</span>
                <Users className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white">
                {data.summary.totalNurses}
              </div>
              <span className="text-[10px] text-gray-400">Active Roster</span>
            </div>

            {/* 5. Total Appointments */}
            <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Appointments</span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white">
                {data.summary.totalAppointments}
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">
                {data.summary.completionRate}% Completed
              </span>
            </div>

            {/* 6. Total Patients */}
            <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Patients</span>
                <UserCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white">
                {data.summary.totalPatients}
              </div>
              <span className="text-[10px] text-gray-400">Treated in Scope</span>
            </div>
          </div>

          {/* Operational Efficiency Rates Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2">
              <span className="text-[11px] text-gray-400 block">Completion Rate</span>
              <span className="text-sm font-bold text-emerald-400">{data.summary.completionRate}%</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2">
              <span className="text-[11px] text-gray-400 block">Cancellation Rate</span>
              <span className="text-sm font-bold text-rose-400">{data.summary.cancellationRate}%</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2">
              <span className="text-[11px] text-gray-400 block">No-Show Rate</span>
              <span className="text-sm font-bold text-amber-400">{data.summary.noShowRate}%</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2">
              <span className="text-[11px] text-gray-400 block">Appts / Doctor</span>
              <span className="text-sm font-bold text-cyan-300">
                {data.summary.avgAppointmentsPerDoctor !== null ? data.summary.avgAppointmentsPerDoctor : 'Data not available'}
              </span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2">
              <span className="text-[11px] text-gray-400 block">Appts / Nurse</span>
              <span className="text-sm font-bold text-teal-300">
                {data.summary.avgAppointmentsPerNurse !== null ? data.summary.avgAppointmentsPerNurse : 'Data not available'}
              </span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2">
              <span className="text-[11px] text-gray-400 block">Patient : Staff Ratio</span>
              <span className="text-sm font-bold text-purple-300">
                {data.summary.patientToStaffRatio !== null ? `${data.summary.patientToStaffRatio} : 1` : 'Data not available'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty State Check ── */}
      {data && data.departments.length === 0 && !loading && !error && (
        <div className="glass-card p-10 text-center space-y-3 border border-white/10 rounded-2xl">
          <Building2 className="w-12 h-12 text-gray-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No departments are currently available.</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            No department records were found matching the authorized hospital scope or selected filters.
          </p>
          <Button variant="glass" size="sm" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </div>
      )}

      {/* ── Visual Analytics & Charts Grid ── */}
      {data && data.departments.length > 0 && !loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Appointments by Department (Bar Chart) */}
          <div className="glass-card p-5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Appointment Volume by Department
                </h3>
                <p className="text-[11px] text-gray-400">Total appointments handled across clinical units</p>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                Total: {data.summary.totalAppointments}
              </span>
            </div>

            {data.summary.totalAppointments === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No appointment data is available for the selected period.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {data.departments.map((dept) => {
                  const maxVal = Math.max(...data.departments.map((d) => d.appointmentCount), 1);
                  const pct = Math.round((dept.appointmentCount / maxVal) * 100);

                  return (
                    <div key={dept.id} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="font-semibold text-white truncate max-w-[200px]" title={dept.name}>
                          {dept.name}
                        </span>
                        <span className="font-mono text-[11px] text-cyan-300">
                          {dept.appointmentCount} appts ({dept.completed} completed, {dept.cancelled} cancelled)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                          title={`${dept.name}: ${dept.appointmentCount} appointments`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend & Textual values */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span>Bar represents department appointment volume</span>
              </span>
              <span>Values in raw count & completion</span>
            </div>
          </div>

          {/* Chart 2: Staff Distribution (Doctors vs Nurses) */}
          <div className="glass-card p-5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-400" />
                  Staff Distribution by Department
                </h3>
                <p className="text-[11px] text-gray-400">Physicians vs Registered Nurses ratio per unit</p>
              </div>
              <span className="text-xs font-mono text-teal-400">
                Staff: {data.summary.totalDoctors + data.summary.totalNurses}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {data.departments.map((dept) => {
                const totalDeptStaff = dept.doctorCount + dept.nurseCount;
                const docPct = totalDeptStaff > 0 ? (dept.doctorCount / totalDeptStaff) * 100 : 0;
                const nursePct = totalDeptStaff > 0 ? (dept.nurseCount / totalDeptStaff) * 100 : 0;

                return (
                  <div key={dept.id} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="font-semibold text-white truncate max-w-[200px]" title={dept.name}>
                        {dept.name}
                      </span>
                      <span className="font-mono text-[11px] text-gray-400">
                        {dept.doctorCount} Doctors • {dept.nurseCount} Nurses ({dept.totalStaff} Total)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                      <div
                        style={{ width: `${docPct}%` }}
                        className="h-full bg-sky-500 transition-all duration-500"
                        title={`Doctors: ${dept.doctorCount}`}
                      />
                      <div
                        style={{ width: `${nursePct}%` }}
                        className="h-full bg-teal-400 transition-all duration-500"
                        title={`Nurses: ${dept.nurseCount}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 border-t border-white/5 text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-sky-500" />
                <span>Doctors ({data.summary.totalDoctors})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-teal-400" />
                <span>Nurses ({data.summary.totalNurses})</span>
              </div>
            </div>
          </div>

          {/* Chart 3: Appointment Status Distribution (Segment/Donut chart) */}
          <div className="glass-card p-5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  Appointment Status Breakdown
                </h3>
                <p className="text-[11px] text-gray-400">Completion, Cancellation, and No-Show distribution</p>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                100% Normalized
              </span>
            </div>

            {data.summary.totalAppointments === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No appointment status data for this selection.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {/* Visual Multi-Segment Bar */}
                <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                  {data.statusDistribution.map((s) => {
                    if (s.percentage === 0) return null;
                    const colors: Record<string, string> = {
                      completed: 'bg-emerald-500',
                      scheduled: 'bg-blue-500',
                      cancelled: 'bg-rose-500',
                      no_show: 'bg-amber-500',
                    };
                    return (
                      <div
                        key={s.status}
                        style={{ width: `${s.percentage}%` }}
                        className={`h-full ${colors[s.status] || 'bg-gray-400'} transition-all duration-700`}
                        title={`${s.label}: ${s.count} (${s.percentage}%)`}
                      />
                    );
                  })}
                </div>

                {/* Status Detail Cards with textual values */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {data.statusDistribution.map((s) => {
                    const badgeColors: Record<string, { bg: string; text: string; dot: string }> = {
                      completed: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-500' },
                      scheduled: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-300', dot: 'bg-blue-500' },
                      cancelled: { bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-300', dot: 'bg-rose-500' },
                      no_show: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-300', dot: 'bg-amber-500' },
                    };
                    const color = badgeColors[s.status] || { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-300', dot: 'bg-gray-500' };

                    return (
                      <div key={s.status} className={`p-2.5 rounded-xl border ${color.bg} space-y-1`}>
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                          <span className="font-semibold">{s.label}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className={`text-base font-bold ${color.text}`}>{s.count}</span>
                          <span className="text-[11px] font-mono text-gray-400">{s.percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400">
              <span>Textual counts, percentages, and color legends provided simultaneously.</span>
            </div>
          </div>

          {/* Chart 4: Department Activity Trend (Timeline) */}
          <div className="glass-card p-5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Department Activity Trends
                </h3>
                <p className="text-[11px] text-gray-400">Daily appointment volume progression across hospital</p>
              </div>
              <span className="text-xs font-mono text-purple-400">
                {data.trends.length} Recorded Dates
              </span>
            </div>

            {data.trends.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No appointment activity trend data available for selected filter range.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {data.trends.map((trend) => {
                  const maxTrend = Math.max(...data.trends.map((t) => t.total), 1);
                  const pct = Math.round((trend.total / maxTrend) * 100);

                  return (
                    <div key={trend.date} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="font-semibold text-white font-mono">{trend.date}</span>
                        <span className="font-mono text-[11px] text-purple-300">
                          {trend.total} total ({trend.completed} completed, {trend.cancelled} cancelled)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                          title={`${trend.date}: ${trend.total} total`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Chronological operational progression</span>
              <span className="text-purple-400 font-mono">Real PostgreSQL dates</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Department Comparison Module ("Operational comparison") ── */}
      {data && data.departments.length >= 2 && !loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-white/10 rounded-2xl space-y-5"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-accent" />
                <h3 className="text-base font-bold text-white">Department Operational Comparison</h3>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Side-by-side operational workload and resource comparison (does not constitute clinical quality ranking).
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-semibold border border-accent/40">
              Operational comparison
            </span>
          </div>

          {/* Department Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cyan-400 mb-1">
                Department A
              </label>
              <select
                value={compareDeptAId ?? ''}
                onChange={(e) => setCompareDeptAId(Number(e.target.value))}
                className="w-full bg-navy-950/80 border border-cyan-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                {data.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-400 mb-1">
                Department B
              </label>
              <select
                value={compareDeptBId ?? ''}
                onChange={(e) => setCompareDeptBId(Number(e.target.value))}
                className="w-full bg-navy-950/80 border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
              >
                {data.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Cards & Metrics */}
          {compareDeptA && compareDeptB && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Department A Card */}
              <div className="glass-card p-4 border border-cyan-500/20 bg-cyan-950/20 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-cyan-300">{compareDeptA.name}</h4>
                    <p className="text-[11px] text-gray-400">{compareDeptA.description}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                    Dept #{compareDeptA.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Appointments</span>
                    <span className="text-sm font-bold text-white">{compareDeptA.appointmentCount}</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Total Staff</span>
                    <span className="text-sm font-bold text-white">{compareDeptA.totalStaff} ({compareDeptA.doctorCount}D / {compareDeptA.nurseCount}N)</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Patients</span>
                    <span className="text-sm font-bold text-white">{compareDeptA.patientCount}</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Completion</span>
                    <span className="text-sm font-bold text-emerald-400">{compareDeptA.completionRate}%</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Cancellation</span>
                    <span className="text-sm font-bold text-rose-400">{compareDeptA.cancellationRate}%</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Appts/Doctor</span>
                    <span className="text-sm font-bold text-cyan-300">
                      {compareDeptA.avgAppointmentsPerDoctor !== null ? compareDeptA.avgAppointmentsPerDoctor : 'Data not available'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Department B Card */}
              <div className="glass-card p-4 border border-purple-500/20 bg-purple-950/20 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-purple-300">{compareDeptB.name}</h4>
                    <p className="text-[11px] text-gray-400">{compareDeptB.description}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                    Dept #{compareDeptB.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Appointments</span>
                    <span className="text-sm font-bold text-white">{compareDeptB.appointmentCount}</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Total Staff</span>
                    <span className="text-sm font-bold text-white">{compareDeptB.totalStaff} ({compareDeptB.doctorCount}D / {compareDeptB.nurseCount}N)</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Patients</span>
                    <span className="text-sm font-bold text-white">{compareDeptB.patientCount}</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Completion</span>
                    <span className="text-sm font-bold text-emerald-400">{compareDeptB.completionRate}%</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Cancellation</span>
                    <span className="text-sm font-bold text-rose-400">{compareDeptB.cancellationRate}%</span>
                  </div>
                  <div className="bg-navy-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Appts/Doctor</span>
                    <span className="text-sm font-bold text-purple-300">
                      {compareDeptB.avgAppointmentsPerDoctor !== null ? compareDeptB.avgAppointmentsPerDoctor : 'Data not available'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Department Performance Details Table ── */}
      {data && !loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border border-white/10 rounded-2xl overflow-hidden space-y-4 p-5"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Department Performance Details
              </h3>
              <p className="text-xs text-gray-400">
                Detailed database records with real staff headcounts and appointment completion patterns.
              </p>
            </div>

            {/* Table Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full bg-navy-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 uppercase text-[10px] tracking-wider text-gray-400 font-bold border-b border-white/10">
                <tr>
                  <th
                    className="p-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort('name')}
                  >
                    Department {sortField === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort('doctorCount')}
                  >
                    Doctors {sortField === 'doctorCount' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort('nurseCount')}
                  >
                    Nurses {sortField === 'nurseCount' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort('patientCount')}
                  >
                    Patients {sortField === 'patientCount' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort('appointmentCount')}
                  >
                    Appointments {sortField === 'appointmentCount' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="p-3.5 text-emerald-400">Completed</th>
                  <th className="p-3.5 text-blue-400">Scheduled</th>
                  <th className="p-3.5 text-rose-400">Cancelled</th>
                  <th className="p-3.5 text-amber-400">No-Show</th>
                  <th
                    className="p-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort('completionRate')}
                  >
                    Completion % {sortField === 'completionRate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400">
                      No departments found matching your search query.
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{dept.name}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">{dept.description}</div>
                      </td>
                      <td className="p-3.5 font-mono">{dept.doctorCount}</td>
                      <td className="p-3.5 font-mono">{dept.nurseCount}</td>
                      <td className="p-3.5 font-mono">{dept.patientCount}</td>
                      <td className="p-3.5 font-mono font-bold text-white">{dept.appointmentCount}</td>
                      <td className="p-3.5 font-mono text-emerald-400">{dept.completed}</td>
                      <td className="p-3.5 font-mono text-blue-300">{dept.scheduled}</td>
                      <td className="p-3.5 font-mono text-rose-400">{dept.cancelled}</td>
                      <td className="p-3.5 font-mono text-amber-400">{dept.noShow}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-emerald-400">
                            {dept.completionRate}%
                          </span>
                          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${dept.completionRate}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5 gap-2">
            <span>Showing {filteredDepartments.length} of {data.departments.length} departments</span>
            <span>All values strictly aggregated from PostgreSQL database</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DepartmentAnalyticsPage;
