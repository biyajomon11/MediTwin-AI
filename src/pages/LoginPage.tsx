import React from 'react';
import { LandingPage } from './LandingPage';

export const LoginPage: React.FC = () => {
  return <LandingPage initialAuthModalOpen={true} initialAuthMode="login" />;
};

