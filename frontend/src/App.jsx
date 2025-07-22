import React from 'react'
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import './styles/index.css'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ScheduleList from './pages/ScheduleList'
import Schedule from './pages/Schedule'
import Error from './pages/Error'
import Landing from './pages/Landing'
import ProtectedRoute from './auth/ProtectedRoutes'
import PublicLayout from './components/PublicLayout'
import ProtectedLayout from './components/ProtectedLayout'

function Logout() {
  localStorage.clear()
  return <Navigate to='/login' />
}

function RegisterAndLogout() {
  localStorage.clear()
  return <Register />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path='/' element={<Landing />}/>
          <Route path='/login' element={<Login />}/>
          <Route path='/logout' element={<Logout />}/>
          <Route path='/register' element={<RegisterAndLogout />}/>
          <Route path='*' element={<Error />}/>
        </Route>
        <Route element={<ProtectedLayout />}>
          <Route path='/home' element={<ProtectedRoute><Home /></ProtectedRoute>}/>
          <Route path='/schedules' element={<ProtectedRoute><ScheduleList /></ProtectedRoute>}/>
          <Route path="/schedules/:id" element={<Schedule />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
