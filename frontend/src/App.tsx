import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, matchPath, useNavigate } from 'react-router-dom';
import Navbar from './components/navbar';
import Sidebar from './components/sidebar';
import Chat from './components/chat';
import Home from './components/home';
import AuthPhoneNumber from './components/auth/phone-number';
import ToggleButton from './components/sidebar/toggleButton';
import AuthPhoneOTP from './components/auth/phone-otp';
import { getCookies } from './helpers/storage'; // Adjust path if necessary

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const accessToken = getCookies('accessToken');
  const refreshToken = getCookies('refreshToken');

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      navigate('/auth');
    }
  }, [accessToken, refreshToken, navigate]);

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const showNavbarAndSidebar = ['/', '/chat/:chatId'].some((path) =>
    matchPath(path, location.pathname)
  );

  return (
    <div className='flex flex-col bg-gray-100 h-screen overflow-hidden'>
  {showNavbarAndSidebar && <Navbar />}
  <div className={`flex flex-row ${showNavbarAndSidebar ? 'mt-20' : ''} overflow-hidden`}>
    {showNavbarAndSidebar && (
      <>
        <div className='md:sticky absolute'>
          <Sidebar />
        </div>
        <ToggleButton />
      </>
    )}
    <Routes>
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/chat/:chatId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/auth" element={<AuthPhoneNumber />} />
      <Route path="/auth-otp/:phone" element={<AuthPhoneOTP />} />
    </Routes>
  </div>
</div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
