import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

interface FeatureCardProps {
  iconName: string;
  title: string;
  description: string;
  category: string;
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  iconName,
  title,
  description,
  category,
  delay = 0,
}) => {
  // Dynamically resolve icon from Lucide React
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Icons.Activity;

  const categoryColors: Record<string, string> = {
    clinical: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    administrative: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    patient: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    system: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="glass-card-interactive p-6 flex flex-col justify-between group relative overflow-hidden"
    >
      {/* Top subtle gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-white/10 group-hover:border-accent/40 group-hover:shadow-glow-accent transition-all duration-300">
            <IconComponent className="w-6 h-6 text-accent group-hover:scale-110 transition-transform duration-300" />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${categoryColors[category] || categoryColors.clinical}`}>
            {category}
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent transition-colors duration-200">
          {title}
        </h3>

        <p className="text-sm text-gray-300 leading-relaxed font-normal">
          {description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 group-hover:text-white transition-colors">
        <span className="font-semibold text-accent flex items-center gap-1">
          Explore Module →
        </span>
        <span className="text-[10px] text-gray-400">Enterprise AI</span>
      </div>
    </motion.div>
  );
};
