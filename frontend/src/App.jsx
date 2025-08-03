import { useEffect } from 'react'
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import './styles/index.css'
import Home from './pages/Home'
import ScheduleList from './pages/ScheduleList'
import Schedule from './pages/Schedule'
import Error from './pages/Error'
import Landing from './pages/Landing'
import ProtectedRoute from './auth/ProtectedRoutes'
import Layout from './components/Layout'
import { PopupProvider } from './context/PopupContext'
import { AuthProvider, useAuth } from './auth/AuthContext'

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
              <Route path='/' element={<Landing />}/>
              <Route path='/logout' element={<Logout />}/>
              <Route path='*' element={<Error />}/>
              <Route path='/home' element={<ProtectedRoute><Home /></ProtectedRoute>}/>
              <Route path='/schedules' element={<ProtectedRoute><ScheduleList /></ProtectedRoute>}/>
              <Route path="/schedules/:id" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PopupProvider>
    </AuthProvider>
  )
}

export default App
