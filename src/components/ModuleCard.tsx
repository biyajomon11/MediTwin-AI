import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, User, Stethoscope, HeartPulse, Building, ShieldCheck } from 'lucide-react';
import { ModuleRole } from '../types';
import { Button } from './Button';

interface ModuleCardProps {
  module: ModuleRole;
  onSelect: (module: ModuleRole) => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ module, onSelect }) => {
  const getRoleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Stethoscope': return <Stethoscope className="w-6 h-6 text-accent" />;
      case 'HeartPulse': return <HeartPulse className="w-6 h-6 text-emerald-400" />;
      case 'User': return <User className="w-6 h-6 text-amber-400" />;
      case 'Building': return <Building className="w-6 h-6 text-purple-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-rose-400" />;
      default: return <Stethoscope className="w-6 h-6 text-accent" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className="glass-card-interactive p-6 flex flex-col justify-between border border-white/10 group relative"
    >
      <div>
        {/* Card Header with Role Icon & Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 shadow-glass">
              {getRoleIcon(module.icon)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-accent transition-colors">{module.role}</h3>
              <p className="text-xs text-gray-400 font-medium">{module.title}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30">
            {module.badge}
          </span>
        </div>

        {/* Short Description */}
        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          {module.description}
        </p>

        {/* Features Checklist */}
        <div className="space-y-2.5 mb-6">
          {module.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs text-gray-200">
              <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 gap-2 bg-white/5 p-3 rounded-xl border border-white/10 mb-6">
          {module.previewMetrics.map((metric, idx) => (
            <div key={idx} className="text-center">
              <div className="text-sm font-extrabold text-white">{metric.value}</div>
              <div className="text-[10px] text-gray-400">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Learn More Button */}
      <Button
        variant="glass"
        size="sm"
        className="w-full justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all duration-300"
        onClick={() => onSelect(module)}
        icon={<ArrowRight className="w-4 h-4" />}
        iconPosition="right"
      >
        Learn More & Preview
      </Button>
    </motion.div>
  );
};
