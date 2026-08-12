import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, Menu, X, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from './Button';

interface NavbarProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin, onOpenRegister }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (location.pathname === '/') {
        const sections = ['home', 'about', 'features', 'modules', 'workflow', 'why-us', 'contact'];
        const scrollPosition = window.scrollY + 120;

        for (const section of sections) {
          const el = document.getElementById(section);
          if (el) {
            const top = el.offsetTop;
            const height = el.offsetHeight;
            if (scrollPosition >= top && scrollPosition < top + height) {
              setActiveSection(section);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', href: '#home', id: 'home' },
    { name: 'About', href: '#about', id: 'about' },
    { name: 'Features', href: '#features', id: 'features' },
    { name: 'Modules', href: '#modules', id: 'modules' },
    { name: 'Workflow', href: '#workflow', id: 'workflow' },
    { name: 'Contact', href: '#contact', id: 'contact' },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/' + href);
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLoginBtnClick = () => {
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      navigate('/login');
    }
  };

  const handleRegisterBtnClick = () => {
    if (onOpenRegister) {
      onOpenRegister();
    } else {
      navigate('/register');
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || isLoginPage || isRegisterPage ? 'py-3 glass-nav shadow-2xl' : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Left: Brand Logo & Icon */}
          <Link
            to="/"
            onClick={() => {
              if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-accent group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-white">MediTwin</span>
                <span className="text-xl font-black text-accent">AI</span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide block -mt-1">
                Healthcare Multi-Agent Assistant
              </span>
            </div>
          </Link>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-glass">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  location.pathname === '/' && activeSection === link.id
                    ? 'bg-primary text-white shadow-glow-primary font-semibold'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Right: Auth Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant={isLoginPage ? 'primary' : 'outline'}
              size="sm"
              onClick={handleLoginBtnClick}
              icon={<UserCheck className="w-4 h-4 text-accent" />}
              className={isLoginPage ? 'shadow-glow-primary border-primary' : ''}
            >
              Login
            </Button>
            <Button
              variant={isRegisterPage ? 'primary' : 'primary'}
              size="sm"
              onClick={handleRegisterBtnClick}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass-nav border-b border-white/10 overflow-hidden"
          >
            <div className="px-4 pt-3 pb-6 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  className={`block px-4 py-2.5 rounded-xl text-base font-medium transition-colors ${
                    location.pathname === '/' && activeSection === link.id
                      ? 'bg-primary text-white font-semibold'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                <Button variant="outline" size="md" className="w-full" onClick={handleLoginBtnClick}>
                  Login
                </Button>
                <Button variant="primary" size="md" className="w-full" onClick={handleRegisterBtnClick}>
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
