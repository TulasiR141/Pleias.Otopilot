import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatBot from "react-chatbotify";
import "../styles/PatientHomePage.css";
import { FaUser, FaArrowLeft } from "react-icons/fa";

// Import tab components
import PatientJourneyTab from "./tabs/PatientJourneyTab";
import HearingAssessmentTab from "./tabs/HearingAssessmentTab";
import HearingAidRecommendationsTab from "./tabs/HearingAidRecommendationsTab";
import FirstAppointmentTab from "./tabs/FirstAppointmentTab";
import TrialTab from "./tabs/TrialTab";
import FittingFollowUpTab from "./tabs/FittingFollowUpTab";

const PatientHomePage = () => {
    // State to hold the single patient data (basic info)
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for active tab
    const [activeTab, setActiveTab] = useState("Patient Journey");

    // State for assessment data
    const [assessmentData, setAssessmentData] = useState(null);
    const [assessmentLoading, setAssessmentLoading] = useState(false);

    // State for hearing aid recommendations
    const [hearingAidRecommendations, setHearingAidRecommendations] = useState(null);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);

    const { patientId } = useParams();
    const navigate = useNavigate();

    // Function to handle navigation to profile
    const handleProfileNavigation = () => {
        navigate(`/patient/${patientId}/profile`);
    };

    // Function to handle navigation back to welcome page
    const handleBackToWelcome = () => {
        navigate('/');
    };

    // Function to fetch patient details (basic info only)
    const fetchPatientDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch basic patient info (without test data) for main display
            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}?allTestData=false`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Patient not found");
                }
                throw new Error("Failed to fetch patient details");
            }

            const data = await response.json();
            setPatient(data);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const getPatientDetails = async () => {
            if (!patientId) {
                setError("Patient ID is missing.");
                setLoading(false);
                return;
            }

            try {
                await fetchPatientDetails();
                await fetchAssessmentData(patientId);
            } catch (err) {
                setError(err.message);
            }
        };

        getPatientDetails();
    }, [patientId]);

    // Function to fetch assessment data
    const fetchAssessmentData = async (patientId) => {
        try {
            setAssessmentLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment`);

            if (response.ok) {
                const assessmentData = await response.json();
                setAssessmentData(assessmentData);

                // If assessment is completed, also fetch hearing aid recommendations
                if (assessmentData.status === 'Completed') {
                    await fetchHearingAidRecommendations(patientId);
                }
            } else if (response.status === 404) {
                setAssessmentData(null);
            } else {
                console.error("Failed to fetch assessment data");
            }
        } catch (err) {
            console.error("Error fetching assessment:", err);
            setAssessmentData(null);
        } finally {
            setAssessmentLoading(false);
        }
    };

    // Function to fetch hearing aid recommendations
    const fetchHearingAidRecommendations = async (patientId) => {
        try {
            setRecommendationsLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment/recommendations`);

            if (response.ok) {
                const recommendationsData = await response.json();
                setHearingAidRecommendations(recommendationsData);
                console.log('Hearing aid recommendations fetched:', recommendationsData);
            } else if (response.status === 404) {
                setHearingAidRecommendations(null);
                console.log('No hearing aid recommendations found for this patient');
            } else {
                console.error("Failed to fetch hearing aid recommendations");
            }
        } catch (err) {
            console.error("Error fetching hearing aid recommendations:", err);
            setHearingAidRecommendations(null);
        } finally {
            setRecommendationsLoading(false);
        }
    };

    // Function to handle tab click
    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    // Function to handle viewing hearing aid recommendations
    const handleViewRecommendations = async () => {
        if (!hearingAidRecommendations) {
            await fetchHearingAidRecommendations(patientId);
        }
        setActiveTab("Hearing Aid Recommendations");
    };

    // Handling loading, error, and not found states
    if (loading) {
        return <div className="patient-page">Loading patient details...</div>;
    }

    if (error) {
        return <div className="patient-page error-message">Error: {error}</div>;
    }

    if (!patient) {
        return <div className="patient-page">No patient data found.</div>;
    }

    const tabs = [
        "Patient Journey",
        "Hearing Assessment",
        "Hearing Aid Recommendations",
        "First Appointment",
        "Trial",
        "Fitting Follow Up"
    ];

    // Function to restart assessment - moved back to main component
    const handleRestartAssessment = () => {
        // Clear assessment data
        setAssessmentData(null);
        setHearingAidRecommendations(null);
        console.log("Assessment restarted successfully");
    };

    // Function to render content based on active tab
    const renderTabContent = () => {
        const commonProps = {
            patientId,
            patient,
            assessmentData,
            assessmentLoading,
            hearingAidRecommendations,
            recommendationsLoading,
            fetchAssessmentData,
            fetchHearingAidRecommendations,
            handleViewRecommendations,
            setActiveTab,
            handleRestartAssessment
        };

        switch (activeTab) {
            case "Patient Journey":
                return <PatientJourneyTab {...commonProps} />;
            case "Hearing Assessment":
                return <HearingAssessmentTab {...commonProps} />;
            case "Hearing Aid Recommendations":
                return <HearingAidRecommendationsTab {...commonProps} />;
            case "First Appointment":
                return <FirstAppointmentTab {...commonProps} />;
            case "Trial":
                return <TrialTab {...commonProps} />;
            case "Fitting Follow Up":
                return <FittingFollowUpTab {...commonProps} />;
            default:
                return (
                    <div className="journey-box">
                        <h3>Content Not Available</h3>
                        <p>The selected tab content is not yet implemented.</p>
                    </div>
                );
        }
    };

    const OtoPilotChatbot = () => {
        return (
            <ChatBot />
        );
    };

    return (
        <div className="patient-page">
            <div className="sidebar">
                <div className="profile-card">
                    <div className="avatar-container">
                        <div className="avatar-circle">
                            <FaUser />
                        </div>
                    </div>
                    <h2>{patient.fullName}</h2>
                    <p>Age {patient.age}</p>
                </div>
                <ul className="sidebar-menu">
                    <li onClick={handleProfileNavigation} className="clickable-menu-item">Personal/Profile Details</li>
                    <li>Statistics</li>
                    <li>Reports</li>
                    <li>Perspectives</li>
                    <li>Training</li>
                </ul>
            </div>

            <div className="content">
                {/* Header with Back Button */}
                <div className="content-header">
                    <div className="tabs">
                        {tabs.map((tab, idx) => (
                            <button
                                key={idx}
                                className={`tab-button ${tab === activeTab ? "active" : ""}`}
                                onClick={() => handleTabClick(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <button
                        className="back-to-welcome-btn"
                        onClick={handleBackToWelcome}
                        title="Back to Welcome Page"
                    >
                        <FaArrowLeft />
                        Back
                    </button>
                </div>

                {renderTabContent()}
            </div>
        </div>
    );
};

export default PatientHomePage;