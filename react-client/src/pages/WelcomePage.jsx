import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import {
  FaPhone,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUserPlus,
  FaUser,
  FaTimes,
} from "react-icons/fa";
import "../styles/App.css";



const WelcomePage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "",
    phone: "",
    address: "",
  });
  const navigate = useNavigate();
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch("http://localhost:5154/api/patient");
        if (!response.ok) {
          throw new Error("Failed to fetch patient data");
        }
        const data = await response.json();
        setPatients(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((patient) =>
    patient.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    patient.phone?.includes(search) ||
    patient.address?.toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = (e) => {
    const { fullName, value } = e.target;
    setFormData((prev) => ({ ...prev, [fullName]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newPatient = {
      fullName: formData.fullName,
      age: parseInt(formData.age),
      gender: formData.gender,
      phone: formData.phone,
      address: formData.address,
    };

    try {
      const res = await fetch("http://localhost:5000/api/patient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPatient),
      });

      if (!res.ok) throw new Error("Failed to add patient");
      const added = await res.json();
      setPatients((prev) => [...prev, added]);
      alert("Patient added successfully");
      setFormData({
        fullName: "",
        age: "",
        gender: "",
        phone: "",
        address: "",
      });
      setModalOpen(false);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };


  return (
    <div className="container">
      <header>
        <div>
          <h1>OtoPilot</h1>
          <p>Patient Management System</p>
        </div>
        <button className="add-button" onClick={() => setModalOpen(true)}>
          <FaUserPlus /> Add New Patient
        </button>
      </header>

      <hr className="separator" />

      <main className="main-content">
        <input
          className="search-box"
          type="text"
          placeholder="Search patients by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="cards">
          {filteredPatients.map((patient, index) => (
            <div className="card" key={index} onClick={() => navigate(`/patient/${patient.id}`)}>
               
              <div className="avatar">
                <FaUser />
              </div>
              <div className="info">
                <h2>{patient.fullName}</h2>
                <p className="age">Age {patient.age}</p>
                <p><FaPhone /> {patient.phone}</p>
                <p><FaCalendarAlt /> Last visit: {patient.lastVisit}</p>
                <p><FaMapMarkerAlt /> {patient.address}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Patient</h2>
              <button className="close-btn" onClick={() => setModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <form className="form" onSubmit={handleSubmit} >
              <div className="form-row">
                <label>
                  Full Name *
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Enter patient name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label>
                  Age *
                  <input
                    type="number"
                    name="age"
                    placeholder="Enter age"
                    value={formData.age}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Phone Number *
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label>
                  Gender
                  <select
                    name="gender"
                    placeholder="Select gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <label>
                Address
                <textarea
                  name="address"
                  placeholder="Enter patient address"
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                />
              </label>

              <div className="form-actions">
                <button type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="add-button">
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomePage;
