import React, { useState, useEffect } from "react";
import { FaClipboardList, FaBullseye, FaClock, FaComments } from "react-icons/fa";

const HearingAssessmentTab = ({
    patientId,
    assessmentData,
    assessmentLoading,
    hearingAidRecommendations,
    fetchAssessmentData,
    fetchHearingAidRecommendations,
    handleViewRecommendations,
    handleRestartAssessment  // Receive restart handler from parent
}) => {
    // State for dynamic questionnaire
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionHistory, setQuestionHistory] = useState([]);
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const [assessmentStarted, setAssessmentStarted] = useState(false);

    // Commentary-related state
    const [savedCommentaries, setSavedCommentaries] = useState({});
    const [commentaryHistory, setCommentaryHistory] = useState([]);

    // Effect to handle textarea value when currentNodeId changes
    useEffect(() => {
        const textarea = document.querySelector('.commentary-textarea');
        if (textarea && currentNodeId) {
            // Always clear the textarea when navigating to any question
            textarea.value = '';
        }
    }, [currentNodeId]);

    // Function to start assessment
    const handleStartAssessment = async () => {
        try {
            setAssessmentStarted(true);
            await fetchNextQuestion('root');
        } catch (err) {
            console.error("Error starting assessment:", err);
            alert("Error starting assessment. Please try again.");
        }
    };

    // Function to fetch next question with automatic node type handling
    const fetchNextQuestion = async (nodeId) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/assessment/question/${nodeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const questionData = await response.json();
                console.log(`Processing node ${nodeId} of type: ${questionData.nodeType}`);

                // Handle different node types
                switch (questionData.nodeType) {
                    case 'root':
                        if (questionData.next) {
                            console.log(`Root node ${nodeId}, proceeding to: ${questionData.next}`);
                            await fetchNextQuestion(questionData.next);
                        } else {
                            console.error("Root node has no next node");
                            alert("Assessment configuration error. Please contact support.");
                        }
                        break;

                    case 'flag':
                        await handleFlagNode(nodeId, questionData);
                        break;

                    case 'question':
                        setCurrentQuestion(questionData);
                        setCurrentNodeId(nodeId);
                        break;

                    case 'terminal':
                        await handleFlagNode(nodeId, questionData);
                        break;

                    default:
                        console.warn(`Unknown node type: ${questionData.nodeType}`);
                        setCurrentQuestion(questionData);
                        setCurrentNodeId(nodeId);
                        break;
                }
            } else {
                console.error("Failed to fetch question");
                alert("Failed to load question. Please try again.");
            }
        } catch (err) {
            console.error("Error fetching question:", err);
            alert("Error loading question. Please try again.");
        }
    };

    // Function to extract database filters from decision tree node
    const extractDatabaseFilters = (questionNode) => {
        if (!questionNode) {
            return null;
        }

        try {
            let filters = null;

            if (questionNode.database_filters?.filters) {
                filters = questionNode.database_filters.filters;
            }

            if (!filters || filters.length === 0) {
                return null;
            }

            console.log('Extracting database filters from node:', questionNode.nodeId || currentNodeId);
            console.log('Filters found:', filters);

            return filters;
        } catch (error) {
            console.error('Error extracting database filters:', error);
            return null;
        }
    };

    // Function to handle flag/action nodes automatically
    const handleFlagNode = async (nodeId, questionData) => {
        try {
            console.log(`Auto-processing flag node: ${nodeId}`);

            const databaseFilters = extractDatabaseFilters(questionData);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId: parseInt(patientId),
                    questionId: nodeId,
                    answer: "Auto-processed flag node",
                    questionText: questionData.description || questionData.action || "Flag/Action node",
                    commentary: null,
                    databaseFilters: databaseFilters,
                    nodeType: "flag"
                })
            });

            if (response.ok) {
                console.log(`Flag node ${nodeId} auto-saved successfully`);

                setQuestionHistory(prev => [...prev, {
                    nodeId: nodeId,
                    question: questionData.description || "Auto-processed flag node",
                    answer: "Auto-processed flag node",
                    questionData: questionData,
                    commentary: null,
                    databaseFilters: databaseFilters,
                    isAutoSaved: true,
                    nodeType: "flag"
                }]);

                if (questionData.next) {
                    await fetchNextQuestion(questionData.next);
                } else {
                    setCurrentQuestion({
                        ...questionData,
                        isEndNode: true,
                        selectedAnswer: null,
                        endReason: "Flag node processed - end of assessment path"
                    });
                    setCurrentNodeId(nodeId);
                }
            } else {
                const errorText = await response.text();
                console.error("Failed to auto-save flag node:", errorText);
                alert("Error processing assessment step. Please try again.");
            }
        } catch (err) {
            console.error("Error handling flag node:", err);
            alert("Error processing assessment step. Please try again.");
        }
    };

    // Function to handle answer submission for question nodes
    const handleAnswerSubmit = async (selectedOption) => {
        try {
            const textarea = document.querySelector('.commentary-textarea');
            const commentaryText = textarea ? textarea.value.trim() : '';
            const databaseFilters = extractDatabaseFilters(currentQuestion);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId: parseInt(patientId),
                    questionId: currentNodeId,
                    answer: selectedOption,
                    questionText: currentQuestion.question,
                    commentary: commentaryText || null,
                    databaseFilters: databaseFilters,
                    nodeType: currentQuestion.nodeType || "question"
                })
            });

            if (response.ok) {
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
                    commentary: commentaryText || null,
                    databaseFilters: databaseFilters,
                    nodeType: "question"
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
                const errorText = await response.text();
                console.error("Failed to save answer:", errorText);
                alert("Failed to save answer. Please try again.");
            }
        } catch (err) {
            console.error("Error submitting answer:", err);
            alert("Error submitting answer. Please try again.");
        }
    };

    // Function to go back to previous question
    const handleGoBack = async () => {
        if (questionHistory.length > 0) {
            try {
                let entriesToDelete = [];
                let targetQuestionEntry = null;

                for (let i = questionHistory.length - 1; i >= 0; i--) {
                    const entry = questionHistory[i];
                    entriesToDelete.push(entry);

                    if (!entry.isAutoSaved && (entry.nodeType === "question" || !entry.nodeType)) {
                        targetQuestionEntry = entry;
                        break;
                    }
                }

                // Delete entries from backend
                for (const entry of entriesToDelete) {
                    try {
                        const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment/answer/${entry.nodeId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        });

                        if (response.ok) {
                            console.log(`Deleted answer for node: ${entry.nodeId}`);
                        } else {
                            console.warn(`Failed to delete answer for node: ${entry.nodeId}`);
                        }
                    } catch (deleteError) {
                        console.error(`Error deleting answer for node ${entry.nodeId}:`, deleteError);
                    }
                }

                // Update question history by removing deleted entries
                const newQuestionHistory = questionHistory.slice(0, questionHistory.length - entriesToDelete.length);
                setQuestionHistory(newQuestionHistory);

                // Clean up commentary history - remove entries for deleted questions
                setCommentaryHistory(prev => {
                    const deletedNodeIds = new Set(entriesToDelete.map(entry => entry.nodeId));
                    return prev.filter(commentaryEntry => !deletedNodeIds.has(commentaryEntry.nodeId));
                });

                // Clean up saved commentaries for deleted questions
                setSavedCommentaries(prev => {
                    const newSavedCommentaries = { ...prev };
                    entriesToDelete.forEach(entry => {
                        delete newSavedCommentaries[entry.nodeId];
                    });
                    return newSavedCommentaries;
                });

                // Navigate to the target question
                if (targetQuestionEntry) {
                    // Set the current question to the target question node
                    setCurrentQuestion(targetQuestionEntry.questionData);
                    setCurrentNodeId(targetQuestionEntry.nodeId);
                    // useEffect will handle setting the textarea value
                } else {
                    // If no valid target found, go to start
                    setCurrentQuestion(null);
                    setCurrentNodeId(null);
                    setQuestionHistory([]);
                    setAssessmentStarted(false);
                    setSavedCommentaries({});
                    setCommentaryHistory([]);
                }
            } catch (err) {
                console.error("Error during go back operation:", err);
                alert("Error going back. Please try again.");
            }
        }
    };

    // Function to handle proceeding from commentary-only nodes
    const handleProceedFromCommentary = async () => {
        try {
            const textarea = document.querySelector('.commentary-textarea');
            const commentaryText = textarea ? textarea.value.trim() : '';
            const databaseFilters = extractDatabaseFilters(currentQuestion);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId: parseInt(patientId),
                    questionId: currentNodeId,
                    answer: "Commentary provided",
                    questionText: currentQuestion.question,
                    commentary: commentaryText || null,
                    databaseFilters: databaseFilters,
                    nodeType: "question"
                })
            });

            if (response.ok) {
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
                    commentary: commentaryText || null,
                    databaseFilters: databaseFilters,
                    nodeType: "question"
                }]);

                if (currentQuestion.next) {
                    await fetchNextQuestion(currentQuestion.next);
                } else {
                    setCurrentQuestion({
                        ...currentQuestion,
                        isEndNode: true,
                        selectedAnswer: null,
                        endReason: "Commentary provided - end of assessment path"
                    });
                }
            } else {
                const errorText = await response.text();
                console.error("Failed to save commentary:", errorText);
                alert("Failed to save commentary. Please try again.");
            }
        } catch (err) {
            console.error("Error proceeding from commentary:", err);
            alert("Error proceeding. Please try again.");
        }
    };

    // Function to complete assessment
    const completeAssessment = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}/assessment/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId: parseInt(patientId),
                    totalQuestions: questionHistory.length + (currentQuestion?.isEndNode ? 1 : 0),
                    finalNodeId: currentNodeId,
                    finalAction: currentQuestion?.action || null
                })
            });

            if (response.ok) {
                await fetchAssessmentData(patientId);
                await fetchHearingAidRecommendations(patientId);

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
        }
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

    // Commentary Panel Component
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

                    {hearingAidRecommendations && (
                        <div className="assessment-section">
                            <h4>Hearing Aid Recommendations</h4>
                            <p>Based on your assessment, we found {hearingAidRecommendations.filterInfo?.recommendedCount} suitable hearing aids.</p>
                            <button
                                className="view-recommendations-btn"
                                onClick={handleViewRecommendations}
                            >
                                View Personalized Recommendations
                            </button>
                        </div>
                    )}

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
                                ) : currentQuestion.question && !currentQuestion.conditions ? (
                                    // Commentary-only node (has question but no answer options)
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
                                ) : (
                                    // This should not happen if auto-processing is working correctly
                                    <div className="error-section">
                                        <p>Error: Invalid question node. Please contact support.</p>
                                        <button
                                            className="back-btn"
                                            onClick={handleGoBack}
                                            disabled={assessmentLoading}
                                        >
                                            ← Go Back
                                        </button>
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
};

export default HearingAssessmentTab;