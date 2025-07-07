import React from 'react'
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Error from './pages/Error'
import ProtectedRoute from './components/ProtectedRoutes'

function Logout() {
  localStorage.clear()
  return <Navigate to='/login'/>
}

function RegisterAndLogout() {
  localStorage.clear()
  return <Register />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<ProtectedRoute><Home /></ProtectedRoute>}/>
        <Route path='/login' element={<Login />}/>
        <Route path='/register' element={<RegisterAndLogout />}/>
        <Route path='*' element={<Error />}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
