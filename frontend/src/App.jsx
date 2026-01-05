import React from 'react'
import { Route, Routes } from 'react-router-dom'
import SocketTest from './SocketTest'

function App() {
  return (
    <div>
      <Routes>
        <Route path='/' element={<SocketTest />} />
      </Routes>

    </div>
  )
}

export default App