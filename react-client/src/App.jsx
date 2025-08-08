import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import NewUserForm from './pages/NewUserForm';
import PatientHomePage from "./pages/PatientHomePage";
import ChatPage from './pages/ChatPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/new-user" element={<NewUserForm />} />
        <Route path="/chat" element={<ChatPage />} />
        {/* <Route path="/patient/:id" element={<PatientHomePage />} /> */}
        <Route path="/patient/:patientId" element={<PatientHomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
