import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaPhone,
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaUserPlus,
    FaUser,
    FaTimes,
    FaFileImport,
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
        email: ""
    });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/patient`);
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

    // Fixed the handleChange function - was using fullName instead of name
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newPatient = {
            fullName: formData.fullName,
            age: parseInt(formData.age),
            gender: formData.gender,
            phone: formData.phone,
            address: formData.address,
            email: formData.email || "no-email@example.com", // Provide default email if empty
            lastVisit: new Date().toISOString().split('T')[0] // Backend sets current date
        };

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/patient`, {
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

            // Reset form
            setFormData({
                fullName: "",
                age: "",
                gender: "",
                phone: "",
                address: "",
                email: ""
            });
            setModalOpen(false);
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="container">
            <header>
                <div>
                    <h1>OtoPilot</h1>
                    <p>Patient Management System</p>
                </div>
                <div className="header-buttons">
                    <button className="import-button" onClick={() => navigate('/import')}>
                        <FaFileImport /> Import Patient's Data
                    </button>


                    <button className="add-button" onClick={() => setModalOpen(true)}>
                        <FaUserPlus /> Add New Patient
                    </button>
                </div>
            </header>

            <hr className="separator" />

            <main className="main-content">
                <input
                    className="search-box"
                    type="text"
                    placeholder="Search patients by name, phone, or address..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="cards">
                    {filteredPatients.map((patient, index) => (
                        <div className="card" key={patient.id || index} onClick={() => navigate(`/patient/${patient.id}`)}>
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
                        <form className="form" onSubmit={handleSubmit}>
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
                                        value={formData.gender}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select gender</option>
                                        <option value="Female">Female</option>
                                        <option value="Male">Male</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </label>
                            </div>

                            <div className="form-row">
                                <label>
                                    Email
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Enter email address"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
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
