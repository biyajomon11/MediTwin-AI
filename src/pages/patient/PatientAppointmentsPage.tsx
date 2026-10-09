import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, User, Stethoscope, CheckCircle2, AlertTriangle,
  X, Video, MapPin, Search, ShieldCheck, RefreshCw, ArrowRight, Building
} from 'lucide-react';
import { Button } from '../../components/Button';
import {
  getHospitalDepartments,
  getDoctorsForBooking,
  getDoctorAvailability,
  getPatientAppointments,
  bookPatientAppointment,
  cancelPatientAppointment,
  reschedulePatientAppointment,
} from '../../services/patientService';
import type {
  DepartmentOption,
  DoctorOption,
  DoctorAvailabilityInfo,
  PatientBookedAppointment,
} from '../../types';

interface PatientAppointmentsPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const PatientAppointmentsPage: React.FC<PatientAppointmentsPageProps> = ({ onNavigateTab: _onNavigateTab }) => {
  // Navigation tabs: 'book' | 'my-appointments'
  const [activeTab, setActiveTab] = useState<'book' | 'my-appointments'>('book');

  // Loading & error states
  const [_loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Departments & Doctors
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [searchDoctor, setSearchDoctor] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);

  // Helper to format local Date object to YYYY-MM-DD
  const formatLocalDate = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Date range: strictly from today's date to next coming 5 days
  const { minDateStr, maxDateStr, datePresets } = useMemo(() => {
    const today = new Date();
    const minStr = formatLocalDate(today);

    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 5);
    const maxStr = formatLocalDate(maxDate);

    // Generate quick selection options: Today + next coming 5 days (6 days total)
    const presets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dateStr = formatLocalDate(d);
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = String(d.getDate()).padStart(2, '0');
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        date: dateStr,
        label: i === 0 ? `Today (${monthShort} ${dayNum})` : `${monthShort} ${dayNum}`,
        fullLabel: i === 0 ? `Today, ${monthShort} ${dayNum}` : `${weekday}, ${monthShort} ${dayNum}`,
      };
    });

    return { minDateStr: minStr, maxDateStr: maxStr, datePresets: presets };
  }, []);

  // Date & Slot Selection (defaults dynamically to today's date)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [availability, setAvailability] = useState<DoctorAvailabilityInfo | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);

  // Confirmation Modal
  const [confirmedAppointment, setConfirmedAppointment] = useState<PatientBookedAppointment | null>(null);

  // My Appointments state
  const [appointments, setAppointments] = useState<PatientBookedAppointment[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');

  // Reschedule Modal state
  const [rescheduleTarget, setRescheduleTarget] = useState<PatientBookedAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('11:00 AM');

  // Cancel Modal state
  const [cancelTarget, setCancelTarget] = useState<PatientBookedAppointment | null>(null);

  // 1. Initial Load: Departments, Doctors, Appointments
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [deptsData, apptsData] = await Promise.all([
        getHospitalDepartments(),
        getPatientAppointments(),
      ]);

      setDepartments(deptsData);
      setAppointments(apptsData);

      // Load all doctors initially
      const docs = await getDoctorsForBooking({ date: selectedDate });
      setDoctors(docs);

      // Select first doctor by default
      if (docs.length > 0 && !selectedDoctor) {
        setSelectedDoctor(docs[0]);
      }
    } catch (err: any) {
      console.error('[PatientAppointmentsPage] Initial load error:', err);
      setErrorMsg('Failed to load clinic schedules. Please refresh or try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Availability when Selected Doctor or Selected Date changes
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchDoctorSchedule(selectedDoctor.id, selectedDate);
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctorSchedule = async (doctorId: number, date: string) => {
    setLoadingAvailability(true);
    setSelectedSlot(null);
    try {
      const avail = await getDoctorAvailability(doctorId, date);
      setAvailability(avail);

      // If available and has open slots, pick the first unbooked slot
      if (avail.isAvailable && avail.slots.length > 0) {
        const firstOpen = avail.slots.find((s) => !s.isBooked);
        if (firstOpen) {
          setSelectedSlot(firstOpen.time12);
        }
      }
    } catch (err) {
      console.error('[PatientAppointmentsPage] Availability check error:', err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Filtered doctors list
  const filteredDoctors = doctors.filter((doc) => {
    const matchesDept = selectedDeptId ? doc.departmentId === selectedDeptId : true;
    const matchesSearch = searchDoctor.trim()
      ? doc.name.toLowerCase().includes(searchDoctor.toLowerCase()) ||
        doc.specialization.toLowerCase().includes(searchDoctor.toLowerCase())
      : true;
    return matchesDept && matchesSearch;
  });

  // Handle department change
  const handleDepartmentSelect = async (deptId: number | null) => {
    setSelectedDeptId(deptId);
    const docs = await getDoctorsForBooking({
      departmentId: deptId || undefined,
      date: selectedDate,
    });
    setDoctors(docs);
    if (docs.length > 0) {
      setSelectedDoctor(docs[0]);
    } else {
      setSelectedDoctor(null);
      setAvailability(null);
    }
  };

  // Handle Booking Submit
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setErrorMsg('Please select a doctor, consultation date, and an available time slot.');
      return;
    }

    if (selectedDate < minDateStr || selectedDate > maxDateStr) {
      setErrorMsg(`Consultation date must be between today (${minDateStr}) and the next 5 days (${maxDateStr}).`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const newAppt = await bookPatientAppointment({
        doctorId: selectedDoctor.id,
        date: selectedDate,
        time: selectedSlot,
        reason: 'General Follow-up / Consultation',
        consultationType: 'in-person',
        notes: '',
      });

      setConfirmedAppointment(newAppt);
      setAppointments((prev) => [newAppt, ...prev]);
      setSuccessMsg(`Appointment booked successfully with ${selectedDoctor.name}!`);

      // Refresh schedule to update slot occupancy
      fetchDoctorSchedule(selectedDoctor.id, selectedDate);
    } catch (err: any) {
      console.error('[PatientAppointmentsPage] Booking error:', err);
      setErrorMsg(err.message || 'Failed to book appointment. Please check availability.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setSubmitting(true);
    try {
      await cancelPatientAppointment(cancelTarget.id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === cancelTarget.id ? { ...a, status: 'cancelled' } : a))
      );
      setSuccessMsg('Appointment cancelled successfully.');
      setCancelTarget(null);
      if (selectedDoctor) {
        fetchDoctorSchedule(selectedDoctor.id, selectedDate);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Rescheduling
  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleSlot) return;
    if (rescheduleDate < minDateStr || rescheduleDate > maxDateStr) {
      setErrorMsg(`Rescheduled date must be between today (${minDateStr}) and the next 5 days (${maxDateStr}).`);
      return;
    }
    setSubmitting(true);
    try {
      await reschedulePatientAppointment(rescheduleTarget.id, rescheduleDate, rescheduleSlot);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === rescheduleTarget.id
            ? { ...a, date: rescheduleDate, time: rescheduleSlot, status: 'scheduled' }
            : a
        )
      );
      setSuccessMsg(`Appointment rescheduled to ${rescheduleDate} at ${rescheduleSlot}.`);
      setRescheduleTarget(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reschedule appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((a) => {
    if (appointmentFilter === 'all') return true;
    return a.status === appointmentFilter;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto" id="patient-appointments-module">
      {/* ── Top Header & Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-accent" />
            <span>Outpatient Scheduling & Clinical Consultations</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Doctor Appointments</h1>
          <p className="text-sm text-gray-300 mt-1 max-w-2xl">
            Book in-person hospital visits or HD virtual consultations with board-certified specialists. View real-time doctor availability and hospital schedules.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1.5 rounded-2xl bg-white/5 border border-white/10 self-start sm:self-auto shadow-inner">
          <button
            id="tab-book-appointment"
            onClick={() => { setActiveTab('book'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'book'
                ? 'bg-primary text-white shadow-glow-primary border border-primary-light/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Book Consultation</span>
          </button>

          <button
            id="tab-my-appointments"
            onClick={() => { setActiveTab('my-appointments'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'my-appointments'
                ? 'bg-primary text-white shadow-glow-primary border border-primary-light/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>My Appointments</span>
            {appointments.filter((a) => a.status === 'scheduled').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent text-navy-950 text-[10px] font-black">
                {appointments.filter((a) => a.status === 'scheduled').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300 text-sm"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-sm"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="p-1 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: BOOK NEW CONSULTATION WIZARD                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'book' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Doctor Selection & Department Filter */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Department Filter Pills */}
            <div className="glass-card p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                  <Building className="w-4 h-4 text-accent" /> 1. Select Specialty / Department
                </span>
                <span className="text-[11px] text-gray-400">
                  {departments.length} Clinical Departments
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  id="filter-dept-all"
                  onClick={() => handleDepartmentSelect(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedDeptId === null
                      ? 'bg-accent text-navy-950 shadow-md font-extrabold'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                  }`}
                >
                  All Specialties
                </button>
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    id={`filter-dept-${dept.id}`}
                    onClick={() => handleDepartmentSelect(dept.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedDeptId === dept.id
                        ? 'bg-accent text-navy-950 shadow-md font-extrabold'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                    }`}
                  >
                    {dept.name.replace(' Department', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Doctor Selection Grid */}
            <div className="glass-card p-5 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                  <User className="w-4 h-4 text-accent" /> 2. Choose Attending Specialist
                </span>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search doctor or specialty..."
                    value={searchDoctor}
                    onChange={(e) => setSearchDoctor(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {filteredDoctors.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-sm">No specialists found matching your filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {filteredDoctors.map((doc) => {
                    const isSelected = selectedDoctor?.id === doc.id;
                    const isCardio = doc.specialization.includes('Cardiology');

                    return (
                      <div
                        key={doc.id}
                        id={`select-doctor-${doc.id}`}
                        onClick={() => setSelectedDoctor(doc)}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all relative group ${
                          isSelected
                            ? 'bg-primary/20 border-accent shadow-glow-primary'
                            : 'bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 shadow-md ${
                            isCardio
                              ? 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white'
                              : 'bg-gradient-to-tr from-primary to-accent text-white'
                          }`}>
                            {doc.firstName[0]}{doc.lastName[0]}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-extrabold text-white truncate">{doc.name}</h4>
                            <p className="text-xs font-semibold text-accent truncate mt-0.5">{doc.specialization}</p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
                              {doc.yearsOfExperience} yrs exp • {doc.departmentName || 'General OPD'}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent text-navy-950 flex items-center justify-center shadow-md">
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Schedule Calendar, Real-Time Availability & Slot Booking */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card p-6 border border-white/10 space-y-5 sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" /> 3. Date & Real-Time Availability
                </span>
                {loadingAvailability && (
                  <RefreshCw className="w-4 h-4 text-accent animate-spin" />
                )}
              </div>

              {/* Selected Doctor Summary Card */}
              {selectedDoctor && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-xs font-extrabold">
                    {selectedDoctor.firstName[0]}{selectedDoctor.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{selectedDoctor.name}</p>
                    <p className="text-[11px] text-accent font-medium truncate">{selectedDoctor.specialization}</p>
                    <p className="text-[10px] text-gray-400 truncate">{selectedDoctor.departmentName || 'General OPD'}</p>
                  </div>
                </div>
              )}

              {/* Date Picker Input & Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-200">
                    Select Consultation Date
                  </label>
                  <span className="text-[10px] text-accent font-semibold">
                    Today to next 5 days
                  </span>
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-accent pointer-events-none" />
                  <input
                    type="date"
                    id="input-consultation-date"
                    value={selectedDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      if (val < minDateStr) {
                        setSelectedDate(minDateStr);
                      } else if (val > maxDateStr) {
                        setSelectedDate(maxDateStr);
                      } else {
                        setSelectedDate(val);
                      }
                    }}
                    min={minDateStr}
                    max={maxDateStr}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Quick Date Shortcuts (Today + Next 5 Days) */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
                  <span className="text-[10px] text-gray-400 font-semibold mr-1">Quick:</span>
                  {datePresets.map((item) => (
                    <button
                      key={item.date}
                      type="button"
                      id={`date-preset-${item.date}`}
                      onClick={() => setSelectedDate(item.date)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                        selectedDate === item.date
                          ? 'bg-accent text-navy-950 shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                      }`}
                      title={item.fullLabel}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── REAL-TIME AVAILABILITY NOTIFICATION BANNER ── */}
              {availability && (
                <div>
                  {availability.status === 'AVAILABLE' ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">Doctor is Available</p>
                          <p className="text-[10px] text-emerald-300/80">Working hours: {availability.workingHours}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">
                        Available
                      </span>
                    </div>
                  ) : (
                    /* DOCTOR IS ABSENT OR ON LEAVE */
                    <div
                      id="doctor-absence-alert"
                      className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 to-amber-950/80 border border-rose-500/40 text-rose-200 space-y-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] uppercase tracking-wider">
                              {availability.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs font-bold text-white">
                              Doctor Not Available on this Date
                            </span>
                          </div>
                          {availability.reason && (
                            <p className="text-xs text-rose-200/90 font-medium">
                              Reason: {availability.reason}
                            </p>
                          )}
                          {availability.nextAvailableDate && (
                            <p className="text-xs text-amber-300 font-bold">
                              Next Available Date: {availability.nextAvailableDate}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Jump to Next Available Date Button */}
                      {availability.nextAvailableDate && (
                        <button
                          type="button"
                          id="btn-jump-next-date"
                          onClick={() => setSelectedDate(availability.nextAvailableDate!)}
                          className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-navy-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <span>Select Next Available Date ({availability.nextAvailableDate})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Time Slots Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-200">
                    Select Consultation Slot
                  </label>
                  <span className="text-[10px] text-gray-400">30 min consultation</span>
                </div>

                {availability?.isAvailable ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1" id="available-slots-grid">
                    {availability.slots.map((slot) => {
                      const isSelected = selectedSlot === slot.time12;

                      return (
                        <button
                          key={slot.time24}
                          type="button"
                          id={`slot-${slot.time24}`}
                          disabled={slot.isBooked}
                          onClick={() => setSelectedSlot(slot.time12)}
                          className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition-all relative ${
                            slot.isBooked
                              ? 'bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed line-through opacity-60'
                              : isSelected
                              ? 'bg-accent text-navy-950 border-2 border-white shadow-glow-primary font-black'
                              : 'bg-black/40 hover:bg-white/10 text-white border border-white/10'
                          }`}
                        >
                          <span>{slot.time12.replace(':00', '').replace(' ', '')}</span>
                          {slot.isBooked && (
                            <span className="block text-[8px] text-rose-400 font-normal no-underline">
                              Booked
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center text-xs text-gray-400">
                    No consultation slots available on this date.
                  </div>
                )}
              </div>

              {/* Booking Action Button */}
              <div className="pt-3 border-t border-white/10">
                <Button
                  id="confirm-booking-btn"
                  variant="primary"
                  className="w-full py-3.5 text-sm font-extrabold flex items-center justify-center gap-2"
                  disabled={
                    submitting ||
                    !availability?.isAvailable ||
                    !selectedSlot ||
                    !selectedDoctor
                  }
                  onClick={handleBookAppointment}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scheduling Consultation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Book Consultation</span>
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  HIPAA-Compliant Instant Hospital Verification
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: MY APPOINTMENTS LIST                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'my-appointments' && (
        <div className="space-y-6">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All Appointments' },
                { id: 'scheduled', label: 'Upcoming / Scheduled' },
                { id: 'completed', label: 'Completed' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map((f) => (
                <button
                  key={f.id}
                  id={`filter-apt-${f.id}`}
                  onClick={() => setAppointmentFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    appointmentFilter === f.id
                      ? 'bg-accent text-navy-950 shadow-md font-extrabold'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('book')}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold flex items-center gap-1.5 shadow-glow-primary transition-all"
            >
              <Stethoscope className="w-3.5 h-3.5 text-accent" />
              <span>Book Another Doctor</span>
            </button>
          </div>

          {/* Appointments Grid */}
          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center space-y-4 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <Calendar className="w-12 h-12 text-gray-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Appointments Recorded</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                You have no consultations under the selected filter. Book an appointment with a specialist to review your digital twin health records.
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('book')}>
                Book a Consultation
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="appointments-cards-container">
              {filteredAppointments.map((appt) => {
                const isScheduled = appt.status === 'scheduled';
                const isCompleted = appt.status === 'completed';
                const isCancelled = appt.status === 'cancelled';

                return (
                  <motion.div
                    key={appt.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isScheduled
                        ? 'bg-gradient-to-b from-navy-900/90 to-navy-950/90 border-white/15 shadow-md'
                        : isCancelled
                        ? 'bg-black/30 border-white/5 opacity-75'
                        : 'bg-black/40 border-white/10'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header: ID & Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                          {appt.appointmentId}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isScheduled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isCompleted
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {appt.status}
                        </span>
                      </div>

                      {/* Doctor Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-xs font-black shadow-md flex-shrink-0">
                          {appt.doctor.firstName ? appt.doctor.firstName[0] : 'D'}
                          {appt.doctor.lastName ? appt.doctor.lastName[0] : 'R'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-white truncate">{appt.doctor.name}</h4>
                          <p className="text-xs text-accent font-semibold truncate">{appt.doctor.specialization}</p>
                          <p className="text-[11px] text-gray-400 truncate">{appt.doctor.department}</p>
                        </div>
                      </div>

                      {/* Date & Time Highlights */}
                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <span className="font-bold text-white truncate">{appt.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <span className="font-bold text-white truncate">{appt.time}</span>
                        </div>
                      </div>

                      {/* Reason & Type */}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-300 font-medium line-clamp-2">
                          <span className="font-bold text-white">Reason:</span> {appt.reason}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-1">
                          {appt.type === 'video' ? (
                            <span className="flex items-center gap-1 text-sky-300">
                              <Video className="w-3 h-3" /> Virtual Video Consultation
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-300">
                              <MapPin className="w-3 h-3" /> Hospital OPD Clinic Visit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {isScheduled && (
                      <div className="pt-4 mt-4 border-t border-white/10 flex items-center gap-2">
                        <button
                          id={`btn-reschedule-${appt.id}`}
                          onClick={() => {
                            setRescheduleTarget(appt);
                            const initialRescheduleDate =
                              appt.date >= minDateStr && appt.date <= maxDateStr ? appt.date : minDateStr;
                            setRescheduleDate(initialRescheduleDate);
                            setRescheduleSlot(appt.time);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition-all text-center"
                        >
                          Reschedule
                        </button>
                        <button
                          id={`btn-cancel-${appt.id}`}
                          onClick={() => setCancelTarget(appt)}
                          className="py-1.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all text-center"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUCCESS CONFIRMATION MODAL                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 sm:p-8 max-w-md w-full border border-emerald-500/40 shadow-2xl rounded-3xl text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider">
                  Confirmed & Verified
                </span>
                <h3 className="text-xl font-extrabold text-white mt-2">Appointment Scheduled</h3>
                <p className="text-xs text-gray-300 mt-1">
                  Your consultation has been recorded into the hospital database.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Appointment ID:</span>
                  <span className="font-mono font-bold text-accent">{confirmedAppointment.appointmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Attending Doctor:</span>
                  <span className="font-bold text-white">{confirmedAppointment.doctor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Specialty:</span>
                  <span className="text-gray-200">{confirmedAppointment.doctor.specialization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Scheduled Date:</span>
                  <span className="font-bold text-white">{confirmedAppointment.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time Slot:</span>
                  <span className="font-bold text-accent">{confirmedAppointment.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Format:</span>
                  <span className="text-gray-200 capitalize">{confirmedAppointment.type} Consultation</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="w-full py-2.5 text-xs font-bold"
                  onClick={() => {
                    setConfirmedAppointment(null);
                    setActiveTab('my-appointments');
                  }}
                >
                  View My Appointments
                </Button>
                <Button
                  variant="outline"
                  className="py-2.5 text-xs font-bold"
                  onClick={() => setConfirmedAppointment(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CANCEL CONFIRMATION MODAL                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {cancelTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-sm w-full border border-rose-500/40 rounded-3xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Cancel Appointment?</h3>
                <p className="text-xs text-gray-300 mt-1">
                  Are you sure you want to cancel your consultation with <span className="font-bold text-white">{cancelTarget.doctor.name}</span> on <span className="font-bold text-white">{cancelTarget.date} at {cancelTarget.time}</span>?
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-1/2 py-2 text-xs font-bold"
                  onClick={() => setCancelTarget(null)}
                >
                  Keep Appointment
                </Button>
                <Button
                  variant="outline"
                  className="w-1/2 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white border-rose-600"
                  disabled={submitting}
                  onClick={handleConfirmCancel}
                >
                  {submitting ? 'Cancelling...' : 'Yes, Cancel'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RESCHEDULE MODAL                                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {rescheduleTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-md w-full border border-accent/40 rounded-3xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" /> Reschedule Appointment
                </h3>
                <button onClick={() => setRescheduleTarget(null)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                <p className="font-bold text-white">{rescheduleTarget.doctor.name}</p>
                <p className="text-[11px] text-accent">{rescheduleTarget.doctor.specialization}</p>
                <p className="text-[10px] text-gray-400 mt-1">Current: {rescheduleTarget.date} at {rescheduleTarget.time}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-300">
                    Select New Date
                  </label>
                  <span className="text-[10px] text-accent font-semibold">
                    Today to next 5 days
                  </span>
                </div>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val < minDateStr) {
                      setRescheduleDate(minDateStr);
                    } else if (val > maxDateStr) {
                      setRescheduleDate(maxDateStr);
                    } else {
                      setRescheduleDate(val);
                    }
                  }}
                  min={minDateStr}
                  max={maxDateStr}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">
                  Select New Time Slot
                </label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-accent"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="09:30 AM">09:30 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-1/2 py-2 text-xs font-bold"
                  onClick={() => setRescheduleTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="w-1/2 py-2 text-xs font-bold"
                  disabled={submitting}
                  onClick={handleConfirmReschedule}
                >
                  {submitting ? 'Saving...' : 'Confirm Reschedule'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
