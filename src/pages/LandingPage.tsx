import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { About } from '../components/About';
import { Features } from '../components/Features';
import { Modules } from '../components/Modules';
import { Workflow } from '../components/Workflow';
import { WhyChooseUs } from '../components/WhyChooseUs';
import { Statistics } from '../components/Statistics';
import { Testimonials } from '../components/Testimonials';
import { Contact } from '../components/Contact';
import { Footer } from '../components/Footer';
import { AuthModal } from '../components/AuthModals';

interface LandingPageProps {
  initialAuthModalOpen?: boolean;
  initialAuthMode?: 'login' | 'register';
}

export const LandingPage: React.FC<LandingPageProps> = ({
  initialAuthModalOpen,
  initialAuthMode,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isLoginRoute = location.pathname === '/login';
  const isRegisterRoute = location.pathname === '/register';

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(() => {
    if (initialAuthModalOpen !== undefined) return initialAuthModalOpen;
    return isLoginRoute || isRegisterRoute;
  });

  const [authMode, setAuthMode] = useState<'login' | 'register'>(() => {
    if (initialAuthMode) return initialAuthMode;
    return isRegisterRoute ? 'register' : 'login';
  });

  useEffect(() => {
    if (isLoginRoute) {
      setAuthModalOpen(true);
      setAuthMode('login');
    } else if (isRegisterRoute) {
      setAuthModalOpen(true);
      setAuthMode('register');
    } else if (initialAuthModalOpen === undefined) {
      setAuthModalOpen(false);
    }
  }, [location.pathname, isLoginRoute, isRegisterRoute, initialAuthModalOpen]);

  const handleOpenLogin = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
    if (location.pathname !== '/login') {
      navigate('/login');
    }
  };

  const handleOpenRegister = () => {
    setAuthMode('register');
    setAuthModalOpen(true);
    if (location.pathname !== '/register') {
      navigate('/register');
    }
  };

  const handleCloseModal = () => {
    setAuthModalOpen(false);
    if (location.pathname === '/login' || location.pathname === '/register') {
      navigate('/');
    }
  };

  const handleSwitchMode = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    if (mode === 'login') {
      navigate('/login', { replace: true });
    } else {
      navigate('/register', { replace: true });
    }
  };

  const handleExploreFeatures = () => {
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white selection:bg-accent selection:text-navy-950 flex flex-col">
      {/* Glass Navigation Bar */}
      <Navbar onOpenLogin={handleOpenLogin} onOpenRegister={handleOpenRegister} />

      {/* Hero Section */}
      <main className="flex-grow">
        <Hero onOpenRegister={handleOpenRegister} onExploreFeatures={handleExploreFeatures} />

        {/* About Section */}
        <About />

        {/* Key Features Grid Section */}
        <Features />

        {/* Tailored Modules Section */}
        <Modules />

        {/* Clinical Workflow Timeline Section */}
        <Workflow />

        {/* Why Choose MediTwin AI Section */}
        <WhyChooseUs />

        {/* Statistics Section */}
        <Statistics />

        {/* Testimonials Section */}
        <Testimonials />

        {/* Contact Section */}
        <Contact />
      </main>

      {/* Footer */}
      <Footer />

      {/* Login & Register Modal Dialog */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={handleCloseModal}
        mode={authMode}
        onSwitchMode={handleSwitchMode}
      />
    </div>
  );
};

