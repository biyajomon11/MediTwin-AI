import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from './Button';

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <section id="contact" className="py-24 relative bg-navy-950/80">
      
      {/* Background Orbs */}
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" /> Get in Touch
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Contact <span className="gradient-text">MediTwin AI</span>
          </h2>
          <p className="text-gray-300 text-base sm:text-lg">
            Connect with our enterprise clinical solutions team to schedule a custom demonstration for your hospital or health system.
          </p>
        </div>

        {/* Dual Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 glass-card p-6 sm:p-8 space-y-8 border border-white/15"
          >
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Enterprise Sales & Support</h3>
              <p className="text-sm text-gray-300">
                Our clinical AI architects are available to assist with integration, HIPAA compliance documentation, and platform onboarding.
              </p>
            </div>

            <div className="space-y-6">
              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-accent border border-primary/30 flex-shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Us</div>
                  <div className="text-base font-bold text-white">enterprise@meditwin.ai</div>
                  <div className="text-xs text-gray-400">24h SLA for medical organization queries</div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Call Our Support</div>
                  <div className="text-base font-bold text-white">+1 (800) 555-TWIN</div>
                  <div className="text-xs text-gray-400">Toll-free dedicated clinical hotline</div>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-300 border border-purple-500/30 flex-shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Headquarters Address</div>
                  <div className="text-base font-bold text-white">100 Innovation Way, Suite 500</div>
                  <div className="text-xs text-gray-400">Boston, MA 02110, USA</div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-300 border border-amber-500/30 flex-shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Working Hours</div>
                  <div className="text-base font-bold text-white">Mon – Fri: 8:00 AM – 8:00 PM EST</div>
                  <div className="text-xs text-gray-400">24/7 Critical System Monitoring active</div>
                </div>
              </div>
            </div>

            {/* Compliance Badge */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-accent flex-shrink-0" />
              <div className="text-xs text-gray-300">
                All communications protected under encrypted HIPAA zero-knowledge standard.
              </div>
            </div>
          </motion.div>

          {/* Right Column: Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 glass-card p-6 sm:p-8 border border-white/15 relative"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-glow-accent">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-white">Message Delivered Successfully!</h3>
                <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed">
                  Thank you, <span className="text-white font-semibold">{formData.name}</span>. A MediTwin AI clinical specialist will review your request and contact you at <span className="text-accent">{formData.email}</span> shortly.
                </p>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', subject: '', message: '' });
                  }}
                >
                  Send Another Inquiry
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Send Us a Direct Message</h3>
                  <p className="text-xs text-gray-400">Fill in your information below and our team will get back to you promptly.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. Alexander Wright"
                      className="w-full px-4 py-3 glass-input text-sm"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                      Work / Organization Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="awright@hospital.org"
                      className="w-full px-4 py-3 glass-input text-sm"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Inquiry Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Enterprise Hospital Deployment Inquiry"
                    className="w-full px-4 py-3 glass-input text-sm"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Detailed Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your organization size, current EHR system, and specific clinical AI goals..."
                    className="w-full px-4 py-3 glass-input text-sm resize-none"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full justify-center"
                  icon={loading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  iconPosition="right"
                >
                  {loading ? 'Transmitting Request...' : 'Send Message'}
                </Button>
              </form>
            )}
          </motion.div>

        </div>

      </div>
    </section>
  );
};
