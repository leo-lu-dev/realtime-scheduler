import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PopupProvider } from './popup/PopupContext';
import PopupRenderer from './popup/PopupRenderer';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoutes';
import './styles/index.css';
import './styles/rbcOverrides.css'
import Home from './pages/Home';
import Error from './pages/Error';
import ScheduleList from './pages/ScheduleList';
import Schedule from './pages/Schedule';
import Landing from './pages/Landing';
import Layout from './components/Layout';
import GroupList from './pages/GroupList';
import Group from './pages/Group'

function Logout() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to='/?popup=login' />;
}

function App() {
  return (
    <AuthProvider>
      <PopupProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path='/' element={<Landing />} />
              <Route path='/logout' element={<Logout />} />
              <Route path='*' element={<Error />} />
              <Route path='/home' element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path='/schedules' element={<ProtectedRoute><ScheduleList /></ProtectedRoute>} />
              <Route path='/schedules/:id' element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
              <Route path='/groups' element={<ProtectedRoute><GroupList /></ProtectedRoute>} />
              <Route path='/groups/:id' element={<ProtectedRoute><Group /></ProtectedRoute>} />
            </Route>
          </Routes>
          <PopupRenderer />
        </BrowserRouter>
      </PopupProvider>
    </AuthProvider>
  );
}

export default App;
