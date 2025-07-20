import React from 'react'
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Schedule from './pages/Schedule'
import Error from './pages/Error'
import Landing from './pages/Landing'
import ProtectedRoute from './auth/ProtectedRoutes'
import { AuthProvider, useAuth } from './auth/AuthContext'
import './styles/index.css'
import PublicLayout from './components/PublicLayout'
import ProtectedLayout from './components/ProtectedLayout'
import { useEffect } from 'react'

function Logout() {
  const { logout } = useAuth()
  useEffect(() => {
    logout()
  }, [logout])
  return <Navigate to='/' />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path='/' element={<Landing />}/>
            <Route path='/login' element={<Login />}/>
            <Route path='/logout' element={<Logout />}/>
            <Route path='/register' element={<Register />}/>
            <Route path='*' element={<Error />}/>
          </Route>
          <Route element={<ProtectedLayout />}>
            <Route path='/home' element={<ProtectedRoute><Home /></ProtectedRoute>}/>
            <Route path='/schedules' element={<Schedule />}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
