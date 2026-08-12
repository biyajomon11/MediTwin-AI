import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, MessageSquare, CheckCircle } from 'lucide-react';
import { Testimonial } from '../types';

export const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      id: 't1',
      name: 'Dr. Robert Chen, MD',
      role: 'Chief Medical Officer',
      organization: 'St. Jude Health System',
      comment: 'MediTwin AI has radically transformed our diagnostic workflow. The RAG medical search saves our attending physicians over 1.5 hours daily on clinical literature lookups.',
      rating: 5,
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 't2',
      name: 'Elena Rostova, RN',
      role: 'Head Nurse & Triage Director',
      organization: 'Metropolitan General Hospital',
      comment: 'The nursing module and automated medication schedules have reduced shift handover confusion to zero. Emergency bed allocation is smoother than ever.',
      rating: 5,
      avatarUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78905?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 't3',
      name: 'Marcus Vance',
      role: 'Hospital Chief Administrator',
      organization: 'Apex Healthcare Network',
      comment: 'From a financial and operational standpoint, MediTwin AI boosted our bed occupancy efficiency by 30% while maintaining flawless HIPAA audit logs.',
      rating: 5,
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 't4',
      name: 'Sarah Jenkins',
      role: 'Patient & Digital Twin User',
      organization: 'Outpatient Care Network',
      comment: 'Having instant access to plain-language AI summaries of my lab reports and direct appointment scheduling gives me complete peace of mind over my health.',
      rating: 5,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" /> Trusted Voices
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Loved by Doctors, Admins & <span className="gradient-text">Patients</span>
          </h2>
          <p className="text-gray-300 text-base sm:text-lg">
            Hear how MediTwin AI elevates clinical accuracy, operational throughput, and patient experience.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              className="glass-card-interactive p-6 sm:p-8 flex flex-col justify-between border border-white/10 relative overflow-hidden group"
            >
              <Quote className="absolute top-4 right-4 w-12 h-12 text-white/5 group-hover:text-accent/10 transition-colors pointer-events-none" />

              <div className="space-y-4">
                {/* Rating Stars */}
                <div className="flex items-center gap-1">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs text-gray-400 ml-2 font-medium">5.0 Star Verified Review</span>
                </div>

                {/* Comment */}
                <p className="text-gray-200 text-sm sm:text-base leading-relaxed italic">
                  "{t.comment}"
                </p>
              </div>

              {/* Author Details & Avatar */}
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-4">
                <img
                  src={t.avatarUrl}
                  alt={t.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-accent/40 shadow-glow-accent"
                />
                <div>
                  <div className="text-base font-bold text-white flex items-center gap-1.5">
                    {t.name}
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs text-accent font-medium">{t.role}</div>
                  <div className="text-[11px] text-gray-400">{t.organization}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
