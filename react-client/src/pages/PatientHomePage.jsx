import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "../styles/PatientHomePage.css";
import { FaUser } from "react-icons/fa";

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
    
    // State for dynamic questionnaire (simplified)
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionHistory, setQuestionHistory] = useState([]);
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const [assessmentStarted, setAssessmentStarted] = useState(false);

    // Use useParams to get the ID from the URL
    const { patientId } = useParams();

    useEffect(() => {
        const getPatientDetails = async () => {
            if (!patientId) {
                setError("Patient ID is missing.");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`http://localhost:5154/api/patient/${patientId}`);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Patient not found.");
                    }
                    throw new Error("Failed to fetch patient data");
                }
                
                const data = await response.json();
                setPatient(data);
                
                // Fetch assessment data when patient data is loaded
                await fetchAssessmentData(patientId);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getPatientDetails();
    }, [patientId]);

    // Function to fetch assessment data (simplified - check if completed)
    const fetchAssessmentData = async (patientId) => {
        try {
            setAssessmentLoading(true);
            const response = await fetch(`http://localhost:5154/api/patient/${patientId}/assessment`);
            
            if (response.ok) {
                const assessmentData = await response.json();
                setAssessmentData(assessmentData);
            } else if (response.status === 404) {
                // No assessment found - this is fine
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
            // Start with the first question from decision tree
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
            const response = await fetch(`http://localhost:5154/api/assessment/question/${nodeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const questionData = await response.json();
                
                // Check if this is an end node
                if (questionData.isEndNode) {
                    // This is an end node, show completion interface
                    setCurrentQuestion({
                        ...questionData,
                        isEndNode: true,
                        selectedAnswer: null // No answer selected yet for end nodes
                    });
                } else {
                    // Regular question node
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

    // Function to handle answer submission (simplified)
    const handleAnswerSubmit = async (selectedOption) => {
        try {
            setAssessmentLoading(true);
            
            // Save answer in memory (to backend list)
            const response = await fetch(`http://localhost:5154/api/patient/${patientId}/assessment/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId: patientId,
                    questionId: currentNodeId,
                    answer: selectedOption,
                    questionText: currentQuestion.question
                })
            });

            if (response.ok) {
                // Add to local history
                setQuestionHistory(prev => [...prev, {
                    nodeId: currentNodeId,
                    question: currentQuestion.question,
                    answer: selectedOption,
                    questionData: currentQuestion
                }]);

                // Check if there's a next question based on the selected answer
                if (currentQuestion.conditions && currentQuestion.conditions[selectedOption]) {
                    const nextNodeId = currentQuestion.conditions[selectedOption];
                    await fetchNextQuestion(nextNodeId);
                } else {
                    // No next question available for this answer - end of assessment path
                    console.log("End of assessment path reached - no next question for answer:", selectedOption);
                    
                    // Create an end node scenario
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

    // Function to complete assessment (simplified)
    const completeAssessment = async () => {
        try {
            setAssessmentLoading(true);
            
            const response = await fetch(`http://localhost:5154/api/patient/${patientId}/assessment/complete`, {
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
            date: "2024-01-15",
            status: "completed"
        },
        {
            title: "First Appointment",
            date: "2024-01-20",
            status: "completed"
        },
        {
            title: "Trial",
            date: "2024-01-25",
            status: "in-progress"
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
                            // Show assessment report if data exists
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
                            // Show dynamic questionnaire
                            <div className="assessment-questionnaire">
                                {(currentQuestion && assessmentStarted) ? (
                                    <div className="question-container">
                                        <div className="question-header">
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill" 
                                                    style={{width: `${(questionHistory.length / 20) * 100}%`}}
                                                ></div>
                                            </div>
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
                                            // Show completion section when reached end node
                                            <div className="assessment-completion">
                                                <div className="completion-message">
                                                    <h4>Assessment Path Complete</h4>
                                                    <p>You have reached the end of this assessment path based on your responses.</p>
                                                    
                                                    {currentQuestion.selectedAnswer && (
                                                        <p><strong>Last Answer:</strong> {formatOptionText(currentQuestion.selectedAnswer)}</p>
                                                    )}
                                                    
                                                    {/* {currentQuestion.endReason && (
                                                        <p><strong>Completion Reason:</strong> {currentQuestion.endReason}</p>
                                                    )} */}
                                                    
                                                    {currentQuestion.action && (
                                                        <div className="action-message">
                                                            <p><strong>Clinical Recommendation:</strong></p>
                                                            <p className="action-text">{currentQuestion.action}</p>
                                                        </div>
                                                    )}
                                                    
                                                    {!currentQuestion.action && (
                                                        <div className="action-message">
                                                            <p><strong>Assessment Status:</strong></p>
                                                            <p className="action-text">
                                                                Based on your responses, this assessment path has been completed. 
                                                                Your answers have been recorded for clinical review.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="completion-actions">
                                                    <button
                                                        className="complete-assessment-btn"
                                                        onClick={handleCompleteAssessment}
                                                        disabled={assessmentLoading}
                                                    >
                                                        {assessmentLoading ? "Saving Assessment..." : "Complete & Save Assessment"}
                                                    </button>
                                                    
                                                    {questionHistory.length > 0 && (
                                                        <button 
                                                            className="back-btn"
                                                            onClick={handleGoBackFromEndNode}
                                                            disabled={assessmentLoading}
                                                        >
                                                            ← Go Back to Previous Question
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            // Show answer options for regular questions
                                            <div className="answer-options">
                                                {currentQuestion.conditions && Object.keys(currentQuestion.conditions).map((option) => (
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
                                        )}
                                        
                                        {!currentQuestion.isEndNode && questionHistory.length > 0 && (
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
                                    // Initial start screen
                                    <div className="start-assessment-container">
                                        <div className="assessment-info">
                                            <h4>Interactive Hearing Assessment</h4>
                                            <p>This assessment will help us understand your hearing needs through a series of targeted questions.</p>
                                            <div className="assessment-features">
                                                <div className="feature">
                                                    <span className="feature-icon">📋</span>
                                                    <span>Personalized questionnaire</span>
                                                </div>
                                                <div className="feature">
                                                    <span className="feature-icon">🎯</span>
                                                    <span>Targeted recommendations</span>
                                                </div>
                                                <div className="feature">
                                                    <span className="feature-icon">⏱️</span>
                                                    <span>Estimated time: 10-15 minutes</span>
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
                        <p className="subtitle">Initial consultation and hearing aid selection</p>
                        
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
                                <h4>Trial Start Date: 2024-01-25</h4>
                                <p><strong>Status:</strong> In Progress</p>
                                <p><strong>Duration:</strong> 30 days trial period</p>
                                <p><strong>Days Remaining:</strong> 18 days</p>
                            </div>
                            
                            <div className="trial-section">
                                <h4>Trial Hearing Aids</h4>
                                <p><strong>Model:</strong> Premium BTE Series</p>
                                <p><strong>Serial Numbers:</strong> Right: HA001234, Left: HA001235</p>
                            </div>
                            
                            <div className="trial-section">
                                <h4>Patient Feedback Log</h4>
                                <div className="feedback-entry">
                                    <p><strong>Week 1:</strong> Adjustment period, some discomfort initially. Sound quality improved significantly.</p>
                                    <p><strong>Week 2:</strong> Getting used to the devices. Bluetooth connectivity working well with phone.</p>
                                </div>
                            </div>
                            
                            <div className="trial-section">
                                <h4>Upcoming Check-in</h4>
                                <p>Scheduled follow-up call on 2024-02-05 to discuss trial progress.</p>
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
                    <li>Personal/Profile Details</li>
                    <li>Statistics</li>
                    <li>Reports</li>
                    <li>Perspectives</li>
                    <li>Training</li>
                </ul>
            </div>

            <div className="content">
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

                {renderTabContent()}
            </div>
        </div>
    );
};

export default PatientHomePage;