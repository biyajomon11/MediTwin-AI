import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill,
  Search,
  Printer,
  Eye,
  User,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Info,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as patientService from '../../services/patientService';
import type { PatientPrescriptionItem, PrescriptionStatus } from '../../types';
import { getTallManName } from '../../utils/medicationSafety';

export const PrescriptionsPage: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<PatientPrescriptionItem[]>([]);
  const [patientInfo, setPatientInfo] = useState<{ name: string; id: string }>({ name: 'Patient', id: 'PAT-2024-101' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PrescriptionStatus | 'All'>('All');

  // View modal
  const [viewPrescription, setViewPrescription] = useState<PatientPrescriptionItem | null>(null);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [data, profile] = await Promise.all([
        patientService.getPrescriptions(),
        patientService.getPatientProfile(),
      ]);
      setPrescriptions(data);
      if (profile) {
        setPatientInfo({
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          id: profile.patientId || 'PAT-2024-101',
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load your prescriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const handlePrint = (rx: PatientPrescriptionItem) => {
    const printWindow = window.open('', '_blank', 'width=800,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MediTwin AI - Official Prescription #${rx.prescriptionId}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; }
            .rx-title { font-size: 16px; font-weight: 600; color: #2563eb; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; font-size: 14px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
            .med-name { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 8px; }
            .dosage-badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 13px; }
            .section-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-top: 15px; margin-bottom: 4px; }
            .instructions { background: #fff; border-left: 4px solid #3b82f6; padding: 12px 16px; font-style: italic; margin-top: 10px; }
            .footer { border-top: 1px solid #cbd5e1; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center; margin-top: 40px; }
            .signature { margin-top: 30px; text-align: right; }
            @media print {
              body { padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">MediTwin AI Health System</div>
              <div style="font-size: 12px; color: #64748b;">Clinical Care & Patient Management Platform</div>
            </div>
            <div style="text-align: right;">
              <div class="rx-title">OFFICIAL PRESCRIPTION</div>
              <div style="font-size: 13px; font-weight: bold;">ID: ${rx.prescriptionId}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div>
              <div class="section-label">Prescribing Physician</div>
              <div style="font-weight: bold; font-size: 15px;">${rx.doctorName}</div>
              <div>Department: ${rx.department}</div>
              <div>Date Issued: ${rx.prescriptionDate}</div>
            </div>
            <div>
              <div class="section-label">Patient Information</div>
              <div style="font-weight: bold; font-size: 15px;">${patientInfo.name} (ID: ${patientInfo.id})</div>
              <div>Status: ${rx.status}</div>
              <div>Course: ${rx.startDate} to ${rx.endDate} (${rx.duration})</div>
            </div>
          </div>

          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div class="med-name">${rx.medicineName}</div>
                <div class="dosage-badge">${rx.dosage} • ${rx.route}</div>
              </div>
            </div>

            <div class="section-label">Administration Frequency</div>
            <div style="font-weight: 600; font-size: 15px;">${rx.frequency}</div>

            <div class="section-label">Prescription Instructions</div>
            <div class="instructions">${rx.instructions}</div>
          </div>

          <div class="signature">
            <div style="font-weight: bold;">${rx.doctorName}</div>
            <div style="font-size: 12px; color: #64748b;">Certified Attending Specialist • ${rx.department}</div>
            <div style="font-size: 11px; color: #94a3b8;">Digitally Verified via MediTwin EHR</div>
          </div>

          <div class="footer">
            This is a computer-generated medical record verified under HIPAA guidelines. Please present this document to your licensed pharmacist.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const matchesSearch =
      rx.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.prescriptionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || rx.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border border-accent/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-bold border border-accent/40">
                  Doctor Prescriptions
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Certified Prescriptions
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">My Prescriptions</h2>
              <p className="text-xs sm:text-sm text-gray-300">
                View active and historical prescriptions provided by your attending healthcare providers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={loadPrescriptions}
            >
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Read-only Notice Banner ── */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-accent/10 border border-accent/25 text-accent text-xs font-medium">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>Patient Read-Only Notice:</strong> Prescriptions are physician-authored. You may view and print your
          prescriptions. Do not adjust dosage or frequency without consulting your doctor.
        </span>
      </div>

      {/* ── Error Banner ── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Filters & Search ── */}
      <div className="glass-card p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine, doctor, ID..."
            className="w-full py-2.5 pl-10 pr-9 text-xs sm:text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {(['All', 'Active', 'Upcoming', 'Completed'] as const).map((status) => {
            const count =
              status === 'All'
                ? prescriptions.length
                : prescriptions.filter((p) => p.status === status).length;
            const isSelected = selectedStatus === status;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold'
                    : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>{status}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Prescriptions Grid / List ── */}
      {loading ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading your prescriptions...</p>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
            <Pill className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-white">No prescriptions available.</p>
          <p className="text-xs text-gray-400 max-w-sm">
            {searchQuery || selectedStatus !== 'All'
              ? 'No prescriptions match your current search or status filter.'
              : 'You do not have any prescriptions filed in your record at this time.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPrescriptions.map((rx) => (
            <motion.div
              key={rx.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card-interactive p-5 border border-white/10 flex flex-col justify-between space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-accent font-semibold">{rx.prescriptionId}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        rx.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : rx.status === 'Upcoming'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {rx.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1 font-mono">{getTallManName(rx.medicineName)}</h3>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg bg-accent/15 text-accent text-xs font-bold border border-accent/30">
                    {rx.dosage}
                  </span>
                </div>
              </div>

              {/* Medicine details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 rounded-xl p-2.5">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Frequency & Route</span>
                  <span className="text-white font-medium">
                    {rx.frequency} ({rx.route})
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Duration</span>
                  <span className="text-white font-medium">
                    {rx.duration} (Until {rx.endDate})
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wider block">
                  Doctor Instructions:
                </span>
                <p className="text-gray-200 line-clamp-2">{rx.instructions}</p>
              </div>

              {/* Doctor and Actions */}
              <div className="border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-white font-medium block">{rx.doctorName}</span>
                    <span className="text-gray-400 text-[11px]">{rx.department}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setViewPrescription(rx)}
                  >
                    Details
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    icon={<Printer className="w-3.5 h-3.5" />}
                    onClick={() => handlePrint(rx)}
                  >
                    Print
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Prescription Detail Modal ── */}
      <AnimatePresence>
        {viewPrescription && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setViewPrescription(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-lg w-full p-6 border border-white/20 bg-navy-900/98 max-h-[90vh] overflow-y-auto rounded-2xl space-y-5"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-accent font-semibold">
                      {viewPrescription.prescriptionId}
                    </span>
                    <h3 className="text-lg font-bold text-white">{viewPrescription.medicineName}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setViewPrescription(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Details table */}
              <div className="space-y-2.5 text-xs">
                {[
                  ['Dosage', viewPrescription.dosage],
                  ['Administration Route', viewPrescription.route],
                  ['Frequency', viewPrescription.frequency],
                  ['Duration', `${viewPrescription.duration} (${viewPrescription.startDate} to ${viewPrescription.endDate})`],
                  ['Prescribing Doctor', viewPrescription.doctorName],
                  ['Clinical Department', viewPrescription.department],
                  ['Date Prescribed', viewPrescription.prescriptionDate],
                  ['Prescription Status', viewPrescription.status],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-white/5 gap-4">
                    <span className="text-gray-400 flex-shrink-0">{label}</span>
                    <span className="text-white font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* Instructions Callout */}
              <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 space-y-1">
                <span className="text-accent text-[11px] font-bold uppercase tracking-wider block">
                  Special Instructions
                </span>
                <p className="text-gray-200 text-xs">{viewPrescription.instructions}</p>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 justify-center"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={() => handlePrint(viewPrescription)}
                >
                  Print Prescription
                </Button>
                <Button
                  variant="glass"
                  size="sm"
                  className="justify-center"
                  onClick={() => setViewPrescription(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrescriptionsPage;
