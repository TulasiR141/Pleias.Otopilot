import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/PatientProfile.css";
import { FaUser, FaSave, FaArrowLeft, FaEdit, FaUserCircle } from "react-icons/fa";

const PatientProfile = () => {
    const { patientId } = useParams();
    const navigate = useNavigate();

    const [patient, setPatient] = useState({
        id: 0,
        fullName: "",
        gender: "",
        age: 0,
        address: "",
        phone: "",
        email: "",
        lastVisit: ""
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [originalPatient, setOriginalPatient] = useState(null);

    useEffect(() => {
        fetchPatientDetails();
    }, [patientId]);

    const fetchPatientDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Patient not found");
                }
                throw new Error("Failed to fetch patient details");
            }

            const data = await response.json();
            setPatient(data);
            setOriginalPatient(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPatient(prev => ({
            ...prev,
            [name]: name === 'age' ? parseInt(value) || 0 : value
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            if (!patient.fullName.trim() || !patient.phone.trim()) {
                throw new Error("Full Name and Phone are required fields");
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(patient)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update patient: ${errorText}`);
            }

            const updatedPatient = await response.json();
            setPatient(updatedPatient);
            setOriginalPatient(updatedPatient);
            setIsEditing(false);
            alert("Patient profile updated successfully!");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setPatient(originalPatient);
        setIsEditing(false);
        setError(null);
    };

    const handleBack = () => {
        navigate(`/patient/${patientId}`);
    };

    // Generate initials for avatar
    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (loading) {
        return (
            <div className="patient-profile-page">
                <div className="loading-container">Loading patient profile...</div>
            </div>
        );
    }

    if (error && !patient.id) {
        return (
            <div className="patient-profile-page">
                <div className="error-container">
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button onClick={handleBack} className="back-btn">
                        <FaArrowLeft /> Back to Patient Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="patient-profile-page">
            <div className="profile-header">
                <div className="header-content">
                    <h1>Profile Details</h1>
                </div>
                <button onClick={handleBack} className="back-btn-header">
                    <FaArrowLeft /> Back
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="profile-content">
                <div className="profile-sidebar">
                    <div className="avatar-circle">
                        {getInitials(patient.fullName || "Unknown")}
                    </div>
                    <h2>{patient.fullName}</h2>
                    <p className="age">Age {patient.age}</p>

                    <div className="profile-info">
                        <div className="info-row">
                            <span className="info-label">Patient ID:</span>
                            <span className="info-value">{patient.id}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Last Visit:</span>
                            <span className="info-value">{patient.lastVisit || "Not recorded"}</span>
                        </div>
                    </div>

                    {/* Action buttons in sidebar - only Edit button */}
                    <div className="sidebar-actions">
                        {!isEditing ? (
                            <button onClick={() => setIsEditing(true)} className="edit-btn">
                                <FaEdit /> Edit Profile
                            </button>
                        ) : (
                            <div className="edit-actions">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="save-btn"
                                >
                                    <FaSave /> {saving ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="profile-main">
                    <div className="section-header">
                        <FaUserCircle size={24} />
                        <h3>Personal Information</h3>
                    </div>

                    <div className="profile-grid">
                        <div className="field-group">
                            <label className="field-label" data-required="true">Full Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="fullName"
                                    value={patient.fullName}
                                    onChange={handleInputChange}
                                    className="field-input"
                                    required
                                />
                            ) : (
                                <div className="field-value">{patient.fullName}</div>
                            )}
                        </div>

                        <div className="field-group">
                            <label className="field-label" data-required="true">Phone Number</label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    name="phone"
                                    value={patient.phone}
                                    onChange={handleInputChange}
                                    className="field-input"
                                    required
                                />
                            ) : (
                                <div className="field-value">{patient.phone}</div>
                            )}
                        </div>

                        <div className="field-group">
                            <label className="field-label">Gender</label>
                            {isEditing ? (
                                <select
                                    name="gender"
                                    value={patient.gender}
                                    onChange={handleInputChange}
                                    className="field-select"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                            ) : (
                                <div className="field-value">{patient.gender || "Not specified"}</div>
                            )}
                        </div>

                        <div className="field-group">
                            <label className="field-label">Email Address</label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={patient.email}
                                    onChange={handleInputChange}
                                    className="field-input"
                                />
                            ) : (
                                <div className="field-value">{patient.email || "Not provided"}</div>
                            )}
                        </div>

                        <div className="field-group">
                            <label className="field-label">Age</label>
                            {isEditing ? (
                                <input
                                    type="number"
                                    name="age"
                                    value={patient.age}
                                    onChange={handleInputChange}
                                    className="field-input"
                                    min="0"
                                    max="150"
                                />
                            ) : (
                                <div className="field-value">{patient.age} years old</div>
                            )}
                        </div>

                        <div className="field-group">
                            <label className="field-label">Last Visit</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="lastVisit"
                                    value={patient.lastVisit}
                                    onChange={handleInputChange}
                                    className="field-input"
                                    placeholder="e.g., 2024-01-15"
                                />
                            ) : (
                                <div className="field-value">{patient.lastVisit || "Not recorded"}</div>
                            )}
                        </div>

                        <div className="field-group full-width">
                            <label className="field-label">Address</label>
                            {isEditing ? (
                                <textarea
                                    name="address"
                                    value={patient.address}
                                    onChange={handleInputChange}
                                    className="field-textarea"
                                    rows="3"
                                    placeholder="Enter full address"
                                />
                            ) : (
                                <div className="field-value">{patient.address || "Not provided"}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientProfile;