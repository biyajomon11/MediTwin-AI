export interface Feature {
  id: string;
  iconName: string;
  title: string;
  description: string;
  category: 'clinical' | 'administrative' | 'patient' | 'system';
}

export interface ModuleRole {
  id: string;
  role: string;
  title: string;
  description: string;
  features: string[];
  icon: string;
  badge: string;
  previewMetrics: { label: string; value: string }[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  organization: string;
  comment: string;
  rating: number;
  avatarUrl: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  numericTarget: number;
  suffix?: string;
  icon: string;
  description: string;
}

export interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  icon: string;
  actor: string;
}

export interface WhyChooseItem {
  title: string;
  description: string;
  icon: string;
  highlight: string;
}
