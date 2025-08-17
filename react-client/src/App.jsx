import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import PatientHomePage from "./pages/PatientHomePage";
import PatientProfile from "./pages/PatientProfile";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/patient/:patientId" element={<PatientHomePage />} />
        <Route path="/patient/:patientId/profile" element={<PatientProfile />} />
      </Routes>
    </Router>
  );
}

export default App;
