import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatBot from "react-chatbotify";
import "../styles/PatientHomePage.css";
import { FaUser, FaClipboardList, FaBullseye, FaClock, FaCalendarAlt, FaComments, FaEdit, FaEye, FaArrowLeft } from "react-icons/fa";

const PatientHomePage = () => {
    // State to hold the single patient data
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State for active tab
    const [activeTab, setActiveTab] = useState("Patient Journey");
    
    // State for assessment data
    const [assessmentData, setAssessmentData] = useState(null);
    const [assessmentLoading, setAssessmentLoading] = useState(false);
    
    // State for First Appointment
    const [firstAppointment, setFirstAppointment] = useState(null);
    const [appointmentLoading, setAppointmentLoading] = useState(false);
    const [showPreAppointmentForm, setShowPreAppointmentForm] = useState(false);
    const [preAppointmentComments, setPreAppointmentComments] = useState("");
    const [appointmentDate, setAppointmentDate] = useState("");
    
    // State for dynamic questionnaire (simplified)
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionHistory, setQuestionHistory] = useState([]);
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const [assessmentStarted, setAssessmentStarted] = useState(false);

    // Commentary-related state - simplified
    const [savedCommentaries, setSavedCommentaries] = useState({});
    const [commentaryHistory, setCommentaryHistory] = useState([]);

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

    useEffect(() => {
        const getPatientDetails = async () => {
            if (!patientId) {
                setError("Patient ID is missing.");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}`);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Patient not found.");
                    }
                    throw new Error("Failed to fetch patient data");
                }
                
                const data = await response.json();
                setPatient(data);
                
                await fetchAssessmentData(patientId);
                await fetchFirstAppointmentData(patientId);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getPatientDetails();
    }, [patientId]);

    // Function to fetch first appointment data
    const fetchFirstAppointmentData = async (patientId) => {
        try {
            setAppointmentLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/FirstAppointment/patient/${patientId}`);
            
            if (response.ok) {
                const appointmentData = await response.json();
                setFirstAppointment(appointmentData);
            } else if (response.status === 404) {
                setFirstAppointment(null);
            } else {
                console.error("Failed to fetch first appointment data");
            }
        } catch (err) {
            console.error("Error fetching first appointment:", err);
            setFirstAppointment(null);
        } finally {
            setAppointmentLoading(false);
        }
    };

    // Function to handle creating a first appointment
    const handleCreateFirstAppointment = async () => {
        try {
            setAppointmentLoading(true);
            
            const appointmentDateTime = appointmentDate 
                ? new Date(appointmentDate).toISOString()
                : new Date().toISOString();

            const response = await fetch(`${import.meta.env.VITE_API_URL}/FirstAppointment/patient/${patientId}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId: parseInt(patientId),
                    preAppointmentComments: preAppointmentComments.trim() || null,
                    appointmentDate: appointmentDateTime
                })
            });

            if (response.ok) {
                const newAppointment = await response.json();
                setFirstAppointment(newAppointment);
                setShowPreAppointmentForm(false);
                setPreAppointmentComments("");
                setAppointmentDate("");
                alert("First appointment created successfully!");
            } else {
                const errorText = await response.text();
                alert(`Failed to create appointment: ${errorText}`);
            }
        } catch (err) {
            console.error("Error creating first appointment:", err);
            alert("Error creating appointment. Please try again.");
        } finally {
            setAppointmentLoading(false);
        }
    };

    // Function to handle starting the appointment
    const handleStartAppointment = async () => {
        try {
            setAppointmentLoading(true);
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/FirstAppointment/${firstAppointment.id}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    appointmentId: firstAppointment.id,
                    appointmentNotes: "Starting appointment consultation"
                })
            });

            if (response.ok) {
                const updatedAppointment = await response.json();
                setFirstAppointment(updatedAppointment);
                alert("Appointment started successfully!");
            } else {
                const errorText = await response.text();
                alert(`Failed to start appointment: ${errorText}`);
            }
        } catch (err) {
            console.error("Error starting appointment:", err);
            alert("Error starting appointment. Please try again.");
        } finally {
            setAppointmentLoading(false);
        }
    };

    // Function to fetch assessment data (simplified - check if completed)
    const fetchAssessmentData = async (patientId) => {
        try {
            setAssessmentLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment`);
            
            if (response.ok) {
                const assessmentData = await response.json();
                setAssessmentData(assessmentData);
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

    // Function to start assessment (simplified)
    const handleStartAssessment = async () => {
        try {
            setAssessmentLoading(true);
            setAssessmentStarted(true);
            await fetchNextQuestion('root');
        } catch (err) {
            console.error("Error starting assessment:", err);
            alert("Error starting assessment. Please try again.");
        } finally {
            setAssessmentLoading(false);
        }
    };

    // Function to fetch next question from decision tree
    const fetchNextQuestion = async (nodeId) => {
        try {
            setAssessmentLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/assessment/question/${nodeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const questionData = await response.json();
                
                if (questionData.isEndNode) {
                    setCurrentQuestion({
                        ...questionData,
                        isEndNode: true,
                        selectedAnswer: null
                    });
                } else {
                    setCurrentQuestion(questionData);
                }
                
                setCurrentNodeId(nodeId);
            } else {
                console.error("Failed to fetch question");
                alert("Failed to load question. Please try again.");
            }
        } catch (err) {
            console.error("Error fetching question:", err);
            alert("Error loading question. Please try again.");
        } finally {
            setAssessmentLoading(false);
        }
    };

    // UPDATED: Function to handle answer submission with auto-save commentary
    const handleAnswerSubmit = async (selectedOption) => {
        try {
            setAssessmentLoading(true);
            
            // Get commentary from textarea when submitting answer
            const textarea = document.querySelector('.commentary-textarea');
            const commentaryText = textarea ? textarea.value.trim() : '';
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId: patientId,
                    questionId: currentNodeId,
                    answer: selectedOption,
                    questionText: currentQuestion.question,
                    commentary: commentaryText || null // AUTO-SAVE: Include commentary with answer
                })
            });

            if (response.ok) {
                // Save commentary locally for display
                if (commentaryText) {
                    setSavedCommentaries(prev => ({
                        ...prev,
                        [currentNodeId]: commentaryText
                    }));
                    
                    setCommentaryHistory(prev => [...prev, {
                        nodeId: currentNodeId,
                        question: currentQuestion.question,
                        commentary: commentaryText,
                        timestamp: new Date().toISOString()
                    }]);
                }

                setQuestionHistory(prev => [...prev, {
                    nodeId: currentNodeId,
                    question: currentQuestion.question,
                    answer: selectedOption,
                    questionData: currentQuestion,
                    commentary: commentaryText || null
                }]);

                if (currentQuestion.conditions && currentQuestion.conditions[selectedOption]) {
                    const nextNodeId = currentQuestion.conditions[selectedOption];
                    await fetchNextQuestion(nextNodeId);
                } else {
                    setCurrentQuestion({
                        ...currentQuestion,
                        isEndNode: true,
                        selectedAnswer: selectedOption,
                        endReason: "No next question available for selected answer"
                    });
                }
            } else {
                alert("Failed to save answer. Please try again.");
            }
        } catch (err) {
            console.error("Error submitting answer:", err);
            alert("Error submitting answer. Please try again.");
        } finally {
            setAssessmentLoading(false);
        }
    };

    // Function to go back to previous question from end node
    const handleGoBackFromEndNode = () => {
        if (questionHistory.length > 0) {
            const previousEntry = questionHistory[questionHistory.length - 1];
            setCurrentQuestion(previousEntry.questionData);
            setCurrentNodeId(previousEntry.nodeId);
            setQuestionHistory(prev => prev.slice(0, -1));
        }
    };

    // Function to go back to previous question
    const handleGoBack = () => {
        if (questionHistory.length > 0) {
            const previousEntry = questionHistory[questionHistory.length - 1];
            setCurrentQuestion(previousEntry.questionData);
            setCurrentNodeId(previousEntry.nodeId);
            setQuestionHistory(prev => prev.slice(0, -1));
        }
    };

    // Function to handle manual completion when reaching end node
    const handleCompleteAssessment = async () => {
        await completeAssessment();
    };

    // UPDATED: Function to handle proceeding from commentary-only nodes
   // UPDATED: Function to handle proceeding from commentary-only nodes
const handleProceedFromCommentary = async () => {
    try {
        setAssessmentLoading(true);
        
        // Get commentary from textarea when proceeding
        const textarea = document.querySelector('.commentary-textarea');
        const commentaryText = textarea ? textarea.value.trim() : '';
        
        // Save the commentary with a dummy answer for commentary-only nodes
        const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                patientId: patientId,
                questionId: currentNodeId,
                answer: "Commentary provided", // Dummy answer for commentary-only nodes
                questionText: currentQuestion.question,
                commentary: commentaryText || null // AUTO-SAVE: Include commentary
            })
        });

        if (response.ok) {
            // Save commentary locally for display
            if (commentaryText) {
                setSavedCommentaries(prev => ({
                    ...prev,
                    [currentNodeId]: commentaryText
                }));
                
                setCommentaryHistory(prev => [...prev, {
                    nodeId: currentNodeId,
                    question: currentQuestion.question,
                    commentary: commentaryText,
                    timestamp: new Date().toISOString()
                }]);
            }

            setQuestionHistory(prev => [...prev, {
                nodeId: currentNodeId,
                question: currentQuestion.question,
                answer: "Commentary provided",
                questionData: currentQuestion,
                commentary: commentaryText || null
            }]);

            // FIX: Check if the current node has a 'next' property to continue the flow
            if (currentQuestion.next) {
                // Continue to the next node in the decision tree
                await fetchNextQuestion(currentQuestion.next);
            } else {
                // If no next node, this is the end of the assessment path
                setCurrentQuestion({
                    ...currentQuestion,
                    isEndNode: true,
                    selectedAnswer: null,
                    endReason: "Commentary provided - end of assessment path"
                });
            }
        } else {
            alert("Failed to save commentary. Please try again.");
        }
    } catch (err) {
        console.error("Error proceeding from commentary:", err);
        alert("Error proceeding. Please try again.");
    } finally {
        setAssessmentLoading(false);
    }
};

    // Function to complete assessment (simplified)
    const completeAssessment = async () => {
        try {
            setAssessmentLoading(true);
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId: patientId,
                    totalQuestions: questionHistory.length + (currentQuestion?.isEndNode ? 1 : 0),
                    finalNodeId: currentNodeId,
                    finalAction: currentQuestion?.action || null
                })
            });

            if (response.ok) {
                const completedAssessment = await response.json();
                setAssessmentData(completedAssessment);
                setCurrentQuestion(null);
                setQuestionHistory([]);
                setCurrentNodeId(null);
                setAssessmentStarted(false);
                setSavedCommentaries({});
                setCommentaryHistory([]);
            } else {
                alert("Failed to complete assessment. Please try again.");
            }
        } catch (err) {
            console.error("Error completing assessment:", err);
            alert("Error completing assessment. Please try again.");
        } finally {
            setAssessmentLoading(false);
        }
    };

    // Function to restart assessment
    const handleRestartAssessment = () => {
        setAssessmentData(null);
        setCurrentQuestion(null);
        setQuestionHistory([]);
        setCurrentNodeId(null);
        setAssessmentStarted(false);
        setSavedCommentaries({});
        setCommentaryHistory([]);
    };

    // Function to format option text for better readability
    const formatOptionText = (option) => {
        const optionMap = {
            'yes': 'Yes',
            'no': 'No',
            'myself': 'Myself',
            'spouse': 'Spouse/Partner',
            'family': 'Family Member',
            'doctor': 'Doctor/Medical Professional',
            'other': 'Other',
            'hearing_aids': 'Hearing Aids',
            'cochlear_implants': 'Cochlear Implants',
            'yes_less_than_1_year': 'Yes, less than 1 year',
            'yes_less_than_5_years': 'Yes, 1-5 years',
            'yes_more_than_5_years': 'Yes, more than 5 years',
            'within_72_hours': 'Within 72 hours',
            'days_to_weeks': 'Days to weeks',
            'weeks_to_months': 'Weeks to months',
            'quiet_environment': 'Quiet environments',
            'noisy_environment': 'Noisy environments',
            'telephone': 'On the telephone',
            'multiple': 'Multiple situations',
            'left': 'Left ear',
            'right': 'Right ear',
            'equally': 'Both ears equally'
        };
        
        return optionMap[option] || option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // UPDATED: Commentary Panel Component - No Save Button
    // FIX: Update the CommentaryPanel component to show correct question numbers

const CommentaryPanel = () => {
    return (
        <div className="commentary-panel">
            <div className="commentary-header">
                <h4><FaComments /> Notes & Commentary</h4>
            </div>
            
            <div className="commentary-content">
                <div className="current-commentary">
                    <label>Notes for this question:</label>
                    <textarea
                        defaultValue={savedCommentaries[currentNodeId] || ""}
                        placeholder="Add your notes here... (will be saved automatically when you proceed)"
                        rows={4}
                        className="commentary-textarea"
                    />
                </div>
                
                {commentaryHistory.length > 0 && (
                    <div className="commentary-history">
                        <h5>Previous Notes ({commentaryHistory.length}):</h5>
                        <div className="commentary-list">
                            {commentaryHistory.slice(-3).map((entry, index) => {
                                // FIX: Find the actual question number from questionHistory
                                const actualQuestionIndex = questionHistory.findIndex(q => q.nodeId === entry.nodeId);
                                const questionNumber = actualQuestionIndex >= 0 ? actualQuestionIndex + 1 : index + 1;
                                
                                return (
                                    <div key={index} className="commentary-entry">
                                        <div className="commentary-question">Q{questionNumber}</div>
                                        <div className="commentary-text">{entry.commentary}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
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

    const steps = [
        {
            title: "Hearing Assessment",
            date: assessmentData ? new Date(assessmentData.completedDate || assessmentData.date).toLocaleDateString() : null,
            status: assessmentData ? "completed" : "pending"
        },
        {
            title: "First Appointment",
            date: firstAppointment ? new Date(firstAppointment.appointmentDate).toLocaleDateString() : null,
            status: firstAppointment 
                ? (firstAppointment.status === "Completed" ? "completed" : 
                   firstAppointment.status === "In Progress" ? "in-progress" : "scheduled")
                : "pending"
        },
        {
            title: "Trial",
            date: null,
            status: "pending"
        },
        {
            title: "Fitting Follow up",
            status: "pending"
        }
    ];

    const tabs = [
        "Patient Journey",
        "Hearing Assessment",
        "First Appointment",
        "Trial",
        "Fitting Follow Up"
    ];

    // Function to handle tab click
    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    // Function to render content based on active tab
    const renderTabContent = () => {
        switch (activeTab) {
            case "Patient Journey":
                return (
                    <div className="journey-box">
                        <h3>Patient Journey</h3>
                        <p className="subtitle">
                            Track the patient's progress through the treatment stages
                        </p>
                        <div className="timeline">
                            {steps.map((step, index) => (
                                <div key={index} className={`timeline-item ${step.status}`}>
                                    <div className="timeline-marker">
                                        {step.status === "completed" && <span className="checkmark">✓</span>}
                                        {step.status === "in-progress" && <span className="dot"></span>}
                                        {step.status === "scheduled" && <span className="clock">⏰</span>}
                                        {step.status === "pending" && <span className="circle"></span>}
                                    </div>
                                    <div className={`step-box ${step.status}`}>
                                        <strong>{step.title}</strong>
                                        {step.date && (
                                            <p>
                                                {step.status === "completed"
                                                    ? `Completed on: ${step.date}`
                                                    : `Scheduled for: ${step.date}`}
                                            </p>
                                        )}
                                        {step.status === "in-progress" && (
                                            <span className="status-tag">In Progress</span>
                                        )}
                                        {step.status === "scheduled" && (
                                            <span className="status-tag">Scheduled</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case "Hearing Assessment":
                return (
                    <div className="journey-box">
                        <h3>Hearing Assessment</h3>
                        <p className="subtitle">
                            {assessmentData ? "Detailed hearing assessment results and analysis" : "Interactive hearing assessment questionnaire"}
                        </p>
                        
                        {assessmentLoading ? (
                            <div className="loading-container">
                                <p>Loading assessment data...</p>
                            </div>
                        ) : assessmentData ? (
                            // Show assessment report
                            <div className="assessment-content">
                                <div className="assessment-section">
                                    <h4>Assessment Date: {new Date(assessmentData.date || assessmentData.completedDate).toLocaleDateString()}</h4>
                                    <p><strong>Status:</strong> {assessmentData.status || 'Completed'}</p>
                                    {assessmentData.duration && <p><strong>Duration:</strong> {assessmentData.duration} minutes</p>}
                                </div>
                                
                                <div className="assessment-section">
                                    <h4>Assessment Summary</h4>
                                    <p><strong>Questions Answered:</strong> {assessmentData.totalQuestions || 'N/A'}</p>
                                    <p><strong>Assessment Path:</strong> {assessmentData.currentModule || 'Screening'}</p>
                                    {assessmentData.finalRecommendation && (
                                        <p><strong>Recommendation:</strong> {assessmentData.finalRecommendation}</p>
                                    )}
                                </div>
                                
                                <div className="assessment-section">
                                    <h4>Key Findings</h4>
                                    {assessmentData.keyFindings ? (
                                        <ul>
                                            {assessmentData.keyFindings.map((finding, index) => (
                                                <li key={index}>{finding}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>Assessment completed successfully. Detailed analysis available in patient records.</p>
                                    )}
                                </div>
                                
                                <div className="assessment-section">
                                    <h4>Next Steps</h4>
                                    <p>{assessmentData.nextSteps || "Proceed to hearing aid consultation and fitting process."}</p>
                                </div>

                                <button 
                                    className="restart-assessment-btn"
                                    onClick={handleRestartAssessment}
                                    disabled={assessmentLoading}
                                >
                                    Restart Assessment
                                </button>
                            </div>
                        ) : (
                            // Show dynamic questionnaire with commentary
                            <div className="assessment-questionnaire">
                                {(currentQuestion && assessmentStarted) ? (
                                    <div className="assessment-layout">
                                        {/* Main Question Area */}
                                        <div className="question-main">
                                            <div className="question-header">
                                                {/*<div className="progress-bar">*/}
                                                {/*    <div */}
                                                {/*        className="progress-fill" */}
                                                {/*        style={{width: `${(questionHistory.length / 20) * 100}%`}}*/}
                                                {/*    ></div>*/}
                                                {/*</div>*/}
                                                <p className="question-counter">Question {questionHistory.length + 1}</p>
                                                <p className="current-module">Module: {currentQuestion.module || 'General'}</p>
                                            </div>
                                            
                                            <div className="question-content">
                                                <h4>{currentQuestion.question}</h4>
                                                {currentQuestion.description && (
                                                    <p className="question-description">{currentQuestion.description}</p>
                                                )}
                                            </div>
                                            
                                            {currentQuestion.isEndNode ? (
                                                // End node handling
                                                <div className="assessment-completion">
                                                    <div className="completion-message">
                                                        <h4>Assessment Path Complete</h4>
                                                        <p>You have reached the end of this assessment path based on your responses.</p>
                                                        
                                                        {currentQuestion.action && (
                                                            <div className="action-message">
                                                                <p><strong>Clinical Recommendation:</strong></p>
                                                                <p className="action-text">{currentQuestion.action}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="completion-actions">
                                                        <button
                                                            className="complete-assessment-btn"
                                                            onClick={completeAssessment}
                                                            disabled={assessmentLoading}
                                                        >
                                                            {assessmentLoading ? "Saving Assessment..." : "Complete & Save Assessment"}
                                                        </button>
                                                        
                                                        {questionHistory.length > 0 && (
                                                            <button 
                                                                className="back-btn"
                                                                onClick={handleGoBack}
                                                                disabled={assessmentLoading}
                                                            >
                                                                ← Go Back to Previous Question
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : currentQuestion.conditions && Object.keys(currentQuestion.conditions).length > 0 ? (
                                                // Regular question with answer options
                                                <div className="answer-section">
                                                    <div className="answer-options">
                                                        {Object.keys(currentQuestion.conditions).map((option) => (
                                                            <button
                                                                key={option}
                                                                className="answer-btn"
                                                                onClick={() => handleAnswerSubmit(option)}
                                                                disabled={assessmentLoading}
                                                            >
                                                                {formatOptionText(option)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    
                                                    {questionHistory.length > 0 && (
                                                        <button 
                                                            className="back-btn"
                                                            onClick={handleGoBack}
                                                            disabled={assessmentLoading}
                                                        >
                                                            ← Previous Question
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                // Commentary-only node (no answer options)
                                                <div className="commentary-only-section">
                                                    <div className="commentary-prompt">
                                                        <p className="prompt-text">
                                                            <FaComments /> This question requires additional information. 
                                                            Please provide details in the commentary section.
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="action-buttons">
                                                        <button
                                                            className="proceed-btn"
                                                            onClick={handleProceedFromCommentary}
                                                            disabled={assessmentLoading}
                                                        >
                                                            {assessmentLoading ? "Processing..." : "Proceed to Next"}
                                                        </button>
                                                        
                                                        {questionHistory.length > 0 && (
                                                            <button 
                                                                className="back-btn"
                                                                onClick={handleGoBack}
                                                                disabled={assessmentLoading}
                                                            >
                                                                ← Previous Question
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Commentary Sidebar */}
                                        <div className="commentary-sidebar">
                                            <CommentaryPanel />
                                        </div>
                                    </div>
                                ) : (
                                    // Initial start screen
                                    <div className="start-assessment-container">
                                        <div className="assessment-info">
                                            <h4>Interactive Hearing Assessment</h4>
                                            <p>This assessment will help us understand your hearing needs through a series of targeted questions.</p>
                                            <div className="assessment-features">
                                                <div className="feature">
                                                    <FaClipboardList className="feature-icon" />
                                                    <span>Personalized questionnaire</span>
                                                </div>
                                                <div className="feature">
                                                    <FaBullseye className="feature-icon" />
                                                    <span>Targeted recommendations</span>
                                                </div>
                                                <div className="feature">
                                                    <FaClock className="feature-icon" />
                                                    <span>Estimated time: 10-15 minutes</span>
                                                </div>
                                                <div className="feature">
                                                    <FaComments className="feature-icon" />
                                                    <span>Add notes and commentary</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            className="start-assessment-btn"
                                            onClick={handleStartAssessment}
                                            disabled={assessmentLoading}
                                        >
                                            {assessmentLoading ? "Starting Assessment..." : "Start Assessment"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "First Appointment":
                return (
                    <div className="journey-box">
                        <h3>First Appointment</h3>
                        
                        <div className="appointment-content">
                            <div className="appointment-section">
                                <h4>Appointment Date: 2024-01-20</h4>
                                <p><strong>Status:</strong> Completed</p>
                                <p><strong>Duration:</strong> 60 minutes</p>
                            </div>
                            
                            <div className="appointment-section">
                                <h4>Discussion Points</h4>
                                <ul>
                                    <li>Reviewed hearing assessment results</li>
                                    <li>Discussed lifestyle and hearing needs</li>
                                    <li>Explained different hearing aid options</li>
                                    <li>Demonstrated hearing aid features</li>
                                </ul>
                            </div>
                            
                            <div className="appointment-section">
                                <h4>Hearing Aid Selection</h4>
                                <p><strong>Recommended Model:</strong> Premium BTE with Bluetooth connectivity</p>
                                <p><strong>Features:</strong> Noise reduction, directional microphones, smartphone app control</p>
                            </div>
                            
                            <div className="appointment-section">
                                <h4>Next Steps</h4>
                                <p>Schedule trial period to test the recommended hearing aids in real-world situations.</p>
                            </div>
                        </div>
                    </div>
                );

            case "Trial":
                return (
                    <div className="journey-box">
                        <h3>Trial Period</h3>
                        <p className="subtitle">Testing hearing aids in real-world environments</p>
                        
                        <div className="trial-content">
                            <div className="trial-section">
                                <h4>Status: Pending</h4>
                                <p>Trial will be scheduled after first appointment completion</p>
                            </div>
                            
                            <div className="trial-section">
                                <h4>What to Expect</h4>
                                <ul>
                                    <li>30-day trial period with recommended hearing aids</li>
                                    <li>Real-world testing in various environments</li>
                                    <li>Regular check-ins and adjustments</li>
                                    <li>Patient feedback collection</li>
                                </ul>
                            </div>
                            
                            <div className="trial-section">
                                <h4>Trial Benefits</h4>
                                <p>Experience the hearing aids in your daily life before making a final decision.</p>
                            </div>
                        </div>
                    </div>
                );

            case "Fitting Follow Up":
                return (
                    <div className="journey-box">
                        <h3>Fitting Follow Up</h3>
                        <p className="subtitle">Post-fitting adjustments and support</p>
                        
                        <div className="followup-content">
                            <div className="followup-section">
                                <h4>Status: Pending</h4>
                                <p>Scheduled after successful trial completion</p>
                            </div>
                            
                            <div className="followup-section">
                                <h4>Planned Activities</h4>
                                <ul>
                                    <li>Final hearing aid adjustments based on trial feedback</li>
                                    <li>Fine-tuning of sound settings</li>
                                    <li>Patient education on maintenance and care</li>
                                    <li>Schedule regular check-up appointments</li>
                                </ul>
                            </div>
                            
                            <div className="followup-section">
                                <h4>Expected Outcomes</h4>
                                <p>Patient should be comfortable with hearing aids and confident in their daily use.</p>
                            </div>
                            
                            <div className="followup-section">
                                <h4>Long-term Care Plan</h4>
                                <p>6-month follow-up appointments for optimal performance monitoring.</p>
                            </div>
                        </div>
                    </div>
                );

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
    <ChatBot/>
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
