import React from 'react';
import { Stethoscope, ArrowUp, Github, Linkedin, Twitter, Youtube, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-navy-950 text-gray-400 pt-16 pb-12 border-t border-white/10 relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50rem] h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          
          {/* Brand Col */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary">
                <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div>
                <span className="text-xl font-extrabold text-white">MediTwin</span>
                <span className="text-xl font-black text-accent">AI</span>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed max-w-sm">
              Healthcare Enterprise Multi-Agent AI Assistant empowering medical centers with intelligent decision support, digital twin modeling, and automated workflows.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a href="#twitter" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-300 hover:text-accent transition-colors border border-white/10">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#linkedin" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-300 hover:text-accent transition-colors border border-white/10">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#github" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-300 hover:text-accent transition-colors border border-white/10">
                <Github className="w-4 h-4" />
              </a>
              <a href="#youtube" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-300 hover:text-accent transition-colors border border-white/10">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Company Column */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#modules" className="hover:text-white transition-colors">Modules</a></li>
              <li><a href="#workflow" className="hover:text-white transition-colors">Clinical Workflow</a></li>
              <li><a href="#why-us" className="hover:text-white transition-colors">Why MediTwin AI</a></li>
            </ul>
          </div>

          {/* Resources & Support */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Support & Docs</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#docs" className="hover:text-white transition-colors">Developer API Documentation</a></li>
              <li><a href="#hipaa" className="hover:text-white transition-colors">HIPAA Compliance Center</a></li>
              <li><a href="#status" className="hover:text-white transition-colors flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live System Status</a></li>
              <li><a href="#help" className="hover:text-white transition-colors">Enterprise Help Desk</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Security Whitepaper</a></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Legal & Governance</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#terms" className="hover:text-white transition-colors">Terms & Conditions</a></li>
              <li><a href="#bae" className="hover:text-white transition-colors">Business Associate Agreement (BAA)</a></li>
              <li><a href="#gdpr" className="hover:text-white transition-colors">GDPR Data Processing</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <div>
            © 2026 MediTwin AI. All rights reserved. Designed for Enterprise Healthcare Systems.
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Hospitals
            </span>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white transition-colors border border-white/10 flex items-center gap-1"
              aria-label="Scroll back to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
