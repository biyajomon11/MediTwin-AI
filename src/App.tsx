import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DoctorRegisterPage } from './pages/DoctorRegisterPage';
import { NurseRegisterPage } from './pages/NurseRegisterPage';
import { PatientRegisterPage } from './pages/PatientRegisterPage';
import { AdminRegisterPage } from './pages/AdminRegisterPage';
import { DashboardPage } from './pages/DashboardPage';

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/doctor" element={<DoctorRegisterPage />} />
        <Route path="/doctor-register" element={<DoctorRegisterPage />} />
        <Route path="/register/nurse" element={<NurseRegisterPage />} />
        <Route path="/nurse-register" element={<NurseRegisterPage />} />
        <Route path="/register/patient" element={<PatientRegisterPage />} />
        <Route path="/patient-register" element={<PatientRegisterPage />} />
        <Route path="/register/admin" element={<AdminRegisterPage />} />
        <Route path="/admin-register" element={<AdminRegisterPage />} />
        <Route path="/dashboard/:role" element={<DashboardPage />} />
        <Route path="/dashboard" element={<Navigate to="/dashboard/doctor" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
