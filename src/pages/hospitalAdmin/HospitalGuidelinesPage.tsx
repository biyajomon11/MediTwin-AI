import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit3,
  Trash2,
  Eye,
  Check,
  X,
  Loader2,
  Layers,
} from 'lucide-react';
import { Button } from '../../components/Button';
import {
  getAdminGuidelines,
  createAdminGuideline,
  updateAdminGuideline,
  deleteAdminGuideline,
  type AdminClinicalGuideline,
  type CreateAdminGuidelineInput,
} from '../../services/hospitalAdminService';

const CATEGORIES = [
  'All',
  'Emergency Care',
  'Infection Control',
  'General Medicine',
  'Medication Guidelines',
  'Patient Safety',
  'Hospital Procedures',
];

const DEPARTMENTS = [
  'All Departments',
  'Cardiology',
  'Emergency Medicine',
  'Infection Control',
  'Internal Medicine',
  'Pediatrics',
  'Intensive Care Unit (ICU)',
  'Surgery',
];

export const HospitalGuidelinesPage: React.FC = () => {
  const [guidelines, setGuidelines] = useState<AdminClinicalGuideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalGuideline, setViewModalGuideline] = useState<AdminClinicalGuideline | null>(null);
  const [editingGuideline, setEditingGuideline] = useState<AdminClinicalGuideline | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateAdminGuidelineInput>({
    guidelineCode: '',
    title: '',
    category: 'Emergency Care',
    department: 'Emergency Medicine',
    version: '1.0',
    summary: '',
    content: '',
    author: 'Hospital Governance Committee',
    tags: '',
    status: 'DRAFT',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAdminGuidelines({
        search: searchQuery,
        status: selectedStatus,
        category: selectedCategory,
        department: selectedDepartment,
      });
      setGuidelines(data);
    } catch (err) {
      console.error('Failed to load guidelines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedStatus, selectedCategory, selectedDepartment]);

  const handleOpenCreateModal = () => {
    setEditingGuideline(null);
    setFormData({
      guidelineCode: `CG-${Date.now().toString().slice(-4)}`,
      title: '',
      category: 'Emergency Care',
      department: 'Emergency Medicine',
      version: '1.0',
      summary: '',
      content: '',
      author: 'Hospital Governance Committee',
      tags: '',
      status: 'DRAFT',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (g: AdminClinicalGuideline) => {
    setEditingGuideline(g);
    setFormData({
      guidelineCode: g.guidelineCode,
      title: g.title,
      category: g.category,
      department: g.department,
      version: g.version,
      summary: g.summary,
      content: g.content,
      author: g.author,
      tags: Array.isArray(g.tags) ? g.tags.join(', ') : '',
      status: g.status,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveGuideline = async (overrideStatus?: 'DRAFT' | 'PUBLISHED') => {
    try {
      setSaving(true);
      setFormError('');

      if (!formData.title.trim()) {
        setFormError('Guideline title is required.');
        setSaving(false);
        return;
      }
      if (!formData.summary.trim()) {
        setFormError('Clinical summary is required.');
        setSaving(false);
        return;
      }
      if (!formData.content.trim()) {
        setFormError('Protocol content & clinical instructions are required.');
        setSaving(false);
        return;
      }

      const payload = {
        ...formData,
        status: overrideStatus || formData.status,
      };

      if (editingGuideline) {
        await updateAdminGuideline(editingGuideline.id, payload);
        setSuccessToast(`Guideline "${formData.title}" updated successfully.`);
      } else {
        await createAdminGuideline(payload);
        setSuccessToast(
          overrideStatus === 'PUBLISHED'
            ? `Guideline "${formData.title}" published to physicians.`
            : `Draft guideline "${formData.title}" created successfully.`
        );
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save clinical guideline.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (g: AdminClinicalGuideline) => {
    const nextStatus = g.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await updateAdminGuideline(g.id, { status: nextStatus });
      setSuccessToast(
        nextStatus === 'PUBLISHED'
          ? `"${g.title}" is now published and active in Doctor workstations.`
          : `"${g.title}" moved to Draft status.`
      );
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete guideline "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteAdminGuideline(id);
      setSuccessToast(`Guideline "${title}" deleted.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete guideline.');
    }
  };

  // Metrics
  const totalCount = guidelines.length;
  const publishedCount = guidelines.filter((g) => g.status === 'PUBLISHED').length;
  const draftCount = guidelines.filter((g) => g.status === 'DRAFT').length;
  const reviewCount = guidelines.filter((g) => g.status === 'UNDER_REVIEW').length;

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
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-bold border border-accent/40">
                  Institutional Governance
                </span>
                <span className="text-xs text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  {publishedCount} Active Protocols
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Clinical Guidelines Management
              </h2>
              <p className="text-xs sm:text-sm text-gray-300">
                Draft, author, revise, and publish institutional clinical guidelines for attending doctors and clinical departments
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
          >
            Draft New Guideline
          </Button>
        </div>
      </motion.div>

      {/* ── Toast Feedback ── */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast('')} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Summary Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-card p-4 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Guidelines</p>
            <p className="text-xl font-extrabold text-white">{totalCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Published (Live for MDs)</p>
            <p className="text-xl font-extrabold text-emerald-400">{publishedCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Drafts in Progress</p>
            <p className="text-xl font-extrabold text-amber-400">{draftCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Under Review</p>
            <p className="text-xl font-extrabold text-cyan-400">{reviewCount}</p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="glass-card p-4 border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by guideline title, code (e.g. CG-INF-004), keywords..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-navy-900 border border-white/15 text-gray-300 text-xs focus:outline-none focus:border-accent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 rounded-xl bg-navy-900 border border-white/15 text-gray-300 text-xs focus:outline-none focus:border-accent"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5 flex-wrap">
          {['All', 'PUBLISHED', 'DRAFT', 'UNDER_REVIEW', 'ARCHIVED'].map((st) => {
            const isSelected = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-accent/20 text-accent border border-accent/40 font-bold'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                {st === 'All' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Guidelines List ── */}
      {loading ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading clinical guidelines repository...</p>
        </div>
      ) : guidelines.length === 0 ? (
        <div className="glass-card border border-white/10 p-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Clinical Guidelines Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            No guidelines matched your current search filters. You can draft a new guideline to publish it to medical staff.
          </p>
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
            Draft First Guideline
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guidelines.map((g) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card-interactive p-5 border border-white/10 rounded-2xl flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent bg-accent/15 px-2.5 py-0.5 rounded-md border border-accent/30">
                      {g.guidelineCode}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      v{g.version.replace(/^v+/, '')}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      g.status === 'PUBLISHED'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : g.status === 'DRAFT'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : g.status === 'UNDER_REVIEW'
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        : 'bg-gray-500/15 text-gray-300 border-gray-500/30'
                    }`}
                  >
                    {g.status === 'PUBLISHED' && <CheckCircle2 className="w-3 h-3" />}
                    {g.status === 'DRAFT' && <Clock className="w-3 h-3" />}
                    {g.status === 'UNDER_REVIEW' && <AlertCircle className="w-3 h-3" />}
                    {g.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-white leading-snug">{g.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span className="text-cyan-300 font-medium">{g.category}</span>
                    <span>•</span>
                    <span>{g.department}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                  {g.summary}
                </p>

                {g.tags && g.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {g.tags.map((t) => (
                      <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span className="text-[11px] font-mono">
                  Updated: {g.lastUpdated || 'Recent'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewModalGuideline(g)}
                    title="Read Protocol"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(g)}
                    title="Edit Protocol"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleTogglePublish(g)}
                    title={g.status === 'PUBLISHED' ? 'Revert to Draft' : 'Publish Guideline'}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 ${
                      g.status === 'PUBLISHED'
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                    }`}
                  >
                    {g.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => handleDelete(g.id, g.title)}
                    title="Delete"
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── View Detail Modal ── */}
      <AnimatePresence>
        {viewModalGuideline && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setViewModalGuideline(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 border border-white/20 bg-navy-900/98 rounded-2xl space-y-4 text-xs"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent/20">
                      {viewModalGuideline.guidelineCode}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded">
                      {viewModalGuideline.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1.5">{viewModalGuideline.title}</h3>
                  <p className="text-gray-400 text-xs">
                    {viewModalGuideline.category} • {viewModalGuideline.department} • Version v{viewModalGuideline.version}
                  </p>
                </div>
                <button
                  onClick={() => setViewModalGuideline(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-1">Clinical Summary</h4>
                <p className="text-gray-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
                  {viewModalGuideline.summary}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-1">Protocol Directives & Steps</h4>
                <pre className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed font-mono bg-black/40 p-4 rounded-xl border border-white/10">
                  {viewModalGuideline.content}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setViewModalGuideline(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Draft / Edit Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-white/20 bg-navy-900/98 rounded-2xl space-y-4 text-xs"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingGuideline ? 'Edit Clinical Guideline' : 'Draft New Clinical Guideline'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Define standardized hospital protocols for physician treatment decision pathways
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Guideline Code</label>
                    <input
                      type="text"
                      value={formData.guidelineCode}
                      onChange={(e) => setFormData({ ...formData, guidelineCode: e.target.value })}
                      placeholder="e.g. CG-CARD-006"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Version Number</label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="e.g. 1.0 or 2.1"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Guideline Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Massive Transfusion Protocol in Severe Hemorrhage"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Clinical Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/15 text-white text-xs focus:outline-none focus:border-accent"
                    >
                      {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Target Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/15 text-white text-xs focus:outline-none focus:border-accent"
                    >
                      {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Clinical Summary *</label>
                  <textarea
                    rows={2}
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Brief 2-3 sentence overview of this guideline's scope and target patient cohort..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-accent leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Guideline Protocol Content & Clinical Orders *
                  </label>
                  <textarea
                    rows={7}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="1. Immediate triage and initial stabilization...&#10;2. Diagnostic investigations and lab monitoring...&#10;3. Pharmacological interventions and escalation triggers..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-accent leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Author / Governance Body</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="e.g. Clinical Governance Committee"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/15 text-white text-xs focus:outline-none focus:border-accent"
                    >
                      <option value="DRAFT">DRAFT (Internal only)</option>
                      <option value="UNDER_REVIEW">UNDER REVIEW (Committee check)</option>
                      <option value="PUBLISHED">PUBLISHED (Live for Doctors)</option>
                      <option value="ARCHIVED">ARCHIVED (Obsolete)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Search Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags as string}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. Trauma, Resuscitation, Sepsis, Cardiology"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveGuideline('DRAFT')}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  Save as Draft
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={saving}
                  icon={saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  onClick={() => handleSaveGuideline('PUBLISHED')}
                >
                  {saving ? 'Saving...' : 'Publish Guideline'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
