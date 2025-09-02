import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChatbotProvider } from './contexts/ChatbotContext';
import Chatbot from './pages/Chatbot';
import WelcomePage from './pages/WelcomePage';
import PatientHomePage from "./pages/PatientHomePage";
import PatientProfile from "./pages/PatientProfile";
import DataImport from "./pages/DataImport";

function App() {
  return (
    <ChatbotProvider>
      <Router>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/patient/:patientId" element={<PatientHomePage />} />
          <Route path="/patient/:patientId/profile" element={<PatientProfile />} />
                  <Route path="/import" element={<DataImport />} />
        </Routes>
        
        {/* Chatbot will appear on all pages */}
        <Chatbot />
      </Router>
    </ChatbotProvider>
  );
}

export default App;