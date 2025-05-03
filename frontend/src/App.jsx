import { useState } from 'react'
import {BrowserRouter, Routes, Route} from "react-router-dom"
import Home from "./pages/Home"
import Notes from "./pages/Notes"
import Error from "./pages/Error"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/notes" element={<Notes />}/>
        <Route path="*" element={<Error />}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
