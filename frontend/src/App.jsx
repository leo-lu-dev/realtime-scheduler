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
import Header from './components/Header'
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
        <Header />
        <Routes>
          <Route path='/' element={<Landing />}/>
          <Route path='/home' element={<ProtectedRoute><Home /></ProtectedRoute>}/>
          <Route path='/login' element={<Login />}/>
          <Route path='/logout' element={<Logout />}/>
          <Route path='/register' element={<Register />}/>
          <Route path='/logout' element={<Logout />}/>
          <Route path='/schedules' element={<Schedule />}/>
          <Route path='*' element={<Error />}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
