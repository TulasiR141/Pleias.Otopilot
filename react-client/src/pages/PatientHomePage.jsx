import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatBot from "react-chatbotify";
import "../styles/PatientHomePage.css";
import { FaUser, FaClipboardList, FaBullseye, FaClock, FaCalendarAlt, FaComments, FaEdit, FaEye, FaArrowLeft, FaFilter, FaTimes } from "react-icons/fa";

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

    // State for First Appointment (static UI only - no backend)
    const [firstAppointment] = useState({
        appointmentDate: new Date().toLocaleDateString(),
        status: "completed"
    });

    // State for dynamic questionnaire
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionHistory, setQuestionHistory] = useState([]);
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const [assessmentStarted, setAssessmentStarted] = useState(false);

    // Commentary-related state
    const [savedCommentaries, setSavedCommentaries] = useState({});
    const [commentaryHistory, setCommentaryHistory] = useState([]);

    // State for hearing aid recommendations
    const [hearingAidRecommendations, setHearingAidRecommendations] = useState(null);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);

    // State for filters popup
    const [showFiltersPopup, setShowFiltersPopup] = useState(false);
    const [filtersData, setFiltersData] = useState(null);

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
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getPatientDetails();
    }, [patientId]);

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

    // Function to extract filters data from assessment data locally
    const extractFiltersFromAssessmentData = (assessmentData) => {
        if (!assessmentData || !assessmentData.answers) {
            return null;
        }

        const filtersData = assessmentData.answers
            .filter(answer => answer.databaseFilters && answer.databaseFilters !== null)
            .map(answer => {
                let parsedFilters = null;

                // Handle case where databaseFilters is a string (needs parsing)
                if (typeof answer.databaseFilters === 'string') {
                    try {
                        parsedFilters = JSON.parse(answer.databaseFilters);
                    } catch (e) {
                        console.error('Failed to parse databaseFilters:', answer.databaseFilters);
                        return null;
                    }
                } else {
                    parsedFilters = answer.databaseFilters;
                }

                // Extract filters array from the parsed data
                let filters = [];
                if (parsedFilters && parsedFilters.filters) {
                    filters = parsedFilters.filters;
                } else if (Array.isArray(parsedFilters)) {
                    filters = parsedFilters;
                }

                return {
                    questionText: answer.questionText,
                    answer: answer.answer,
                    filters: filters.map(filter => ({
                        ...filter,
                        field: filter.field?.replaceAll('_', ' '),
                        operator: filter.operator?.replaceAll('_', ' ')
                    })),
                    questionId: answer.questionId,
                    sequenceNumber: answer.sequenceNumber
                };
            })
            .filter(item => item !== null && item.filters.length > 0);

        return filtersData.length > 0 ? filtersData : null;
    };

    // Function to handle View Filters button click
    const handleViewFilters = () => {
        const filters = extractFiltersFromAssessmentData(assessmentData);
        setFiltersData(filters);
        setShowFiltersPopup(true);
    };

    // Function to close filters popup
    const closeFiltersPopup = () => {
        setShowFiltersPopup(false);
        setFiltersData(null);
    };

    // Function to fetch assessment data with recommendations
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

    // Function to start assessment
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

    // UPDATED: Function to fetch next question with automatic node type handling
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
                console.log(`Processing node ${nodeId} of type: ${questionData.nodeType}`);

                // Handle different node types
                switch (questionData.nodeType) {
                    case 'root':
                        // Root node: skip directly to next without UI or saving
                        if (questionData.next) {
                            console.log(`Root node ${nodeId}, proceeding to: ${questionData.next}`);
                            await fetchNextQuestion(questionData.next);
                        } else {
                            console.error("Root node has no next node");
                            alert("Assessment configuration error. Please contact support.");
                        }
                        break;

                    case 'flag':
                        // Flag/Action node: auto-save and proceed to next
                        await handleFlagNode(nodeId, questionData);
                        break;

                    case 'question':
                        // Question node: display in UI
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
        } finally {
            setAssessmentLoading(false);
        }
    };

    // FIXED: Function to extract database filters from decision tree node
    const extractDatabaseFilters = (questionNode) => {
        if (!questionNode) {
            return null;
        }

        try {
            // Check for database_filters property (this matches your JSON structure)
            let filters = null;

            if (questionNode.database_filters?.filters) {
                filters = questionNode.database_filters.filters;
            }

            if (!filters || filters.length === 0) {
                return null;
            }

            // Log for debugging
            console.log('Extracting database filters from node:', questionNode.nodeId || currentNodeId);
            console.log('Filters found:', filters);

            return filters;
        } catch (error) {
            console.error('Error extracting database filters:', error);
            return null;
        }
    };

    // FIXED: Function to handle flag/action nodes automatically
    const handleFlagNode = async (nodeId, questionData) => {
        try {
            console.log(`Auto-processing flag node: ${nodeId}`);

            // Extract database filters if present
            const databaseFilters = extractDatabaseFilters(questionData);

            // Auto-save the flag node using the existing answer endpoint
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

                // Add to question history for tracking
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

                // Proceed to next node if available
                if (questionData.next) {
                    await fetchNextQuestion(questionData.next);
                } else {
                    // Flag node with no next - treat as terminal
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

    // FIXED: Function to handle answer submission for question nodes
    const handleAnswerSubmit = async (selectedOption) => {
        try {
            setAssessmentLoading(true);

            // Get commentary from textarea when submitting answer
            const textarea = document.querySelector('.commentary-textarea');
            const commentaryText = textarea ? textarea.value.trim() : '';

            // Extract database filters from current question node
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
        } finally {
            setAssessmentLoading(false);
        }
    };

    // ENHANCED: Function to go back to previous question with proper flag node handling
    const handleGoBack = async () => {
        if (questionHistory.length > 0) {
            try {
                setAssessmentLoading(true);

                // Start from the last entry and work backwards, deleting all entries until we find a question node
                let entriesToDelete = [];
                let targetQuestionEntry = null;

                // Collect all entries that need to be deleted (working backwards)
                for (let i = questionHistory.length - 1; i >= 0; i--) {
                    const entry = questionHistory[i];
                    entriesToDelete.push(entry);

                    // If this is a question node (not auto-saved flag), this is our target to go back to
                    if (!entry.isAutoSaved && (entry.nodeType === "question" || !entry.nodeType)) {
                        targetQuestionEntry = entry; // THIS is the question we want to display
                        break;
                    }
                }

                // Delete all collected entries from database
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
                        // Continue with other deletions even if one fails
                    }
                }

                // Update question history by removing deleted entries
                const newQuestionHistory = questionHistory.slice(0, questionHistory.length - entriesToDelete.length);
                setQuestionHistory(newQuestionHistory);

                // Navigate to the target question
                if (targetQuestionEntry) {
                    // Set the current question to the last deleted question node
                    setCurrentQuestion(targetQuestionEntry.questionData);
                    setCurrentNodeId(targetQuestionEntry.nodeId);

                    // Restore commentary if it exists
                    if (targetQuestionEntry.commentary) {
                        setSavedCommentaries(prev => ({
                            ...prev,
                            [targetQuestionEntry.nodeId]: targetQuestionEntry.commentary
                        }));
                    }

                    // Update the commentary textarea with saved commentary
                    setTimeout(() => {
                        const textarea = document.querySelector('.commentary-textarea');
                        if (textarea && targetQuestionEntry.commentary) {
                            textarea.value = targetQuestionEntry.commentary;
                        }
                    }, 100);

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
            } finally {
                setAssessmentLoading(false);
            }
        }
    };

    // FIXED: Function to handle proceeding from commentary-only nodes
    const handleProceedFromCommentary = async () => {
        try {
            setAssessmentLoading(true);

            // Get commentary from textarea when proceeding
            const textarea = document.querySelector('.commentary-textarea');
            const commentaryText = textarea ? textarea.value.trim() : '';

            // Extract database filters from current question node if present
            const databaseFilters = extractDatabaseFilters(currentQuestion);

            // Save the commentary with a dummy answer for commentary-only nodes
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
                    commentary: commentaryText || null,
                    databaseFilters: databaseFilters,
                    nodeType: "question"
                }]);

                // Check if the current node has a 'next' property to continue the flow
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
                const errorText = await response.text();
                console.error("Failed to save commentary:", errorText);
                alert("Failed to save commentary. Please try again.");
            }
        } catch (err) {
            console.error("Error proceeding from commentary:", err);
            alert("Error proceeding. Please try again.");
        } finally {
            setAssessmentLoading(false);
        }
    };

    // Function to complete assessment and fetch recommendations
    const completeAssessment = async () => {
        try {
            setAssessmentLoading(true);

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
                const completedAssessment = await response.json();

                // Fetch the complete assessment data with answers to ensure we have all the filter data
                await fetchAssessmentData(patientId);

                // Fetch hearing aid recommendations after completion
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
        setHearingAidRecommendations(null);
    };

    // Function to handle viewing hearing aid recommendations
    const handleViewRecommendations = async () => {
        if (!hearingAidRecommendations) {
            await fetchHearingAidRecommendations(patientId);
        }
        setActiveTab("Hearing Aid Recommendations");
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

    // Filters Popup Component
    const FiltersPopup = () => {
        if (!showFiltersPopup) return null;

        return (
            <div className="filters-popup-overlay">
                <div className="filters-popup">
                    <div className="filters-popup-header">
                        <h3>Assessment Filters Applied</h3>
                        <button
                            className="close-popup-btn"
                            onClick={closeFiltersPopup}
                            aria-label="Close filters popup"
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="filters-popup-content">
                        {filtersData ? (
                            <div className="filters-table-container">
                                <table className="filters-table">
                                    <thead>
                                        <tr>
                                            <th>Question</th>
                                            {/*<th>Answer</th>*/}
                                            <th>Filters</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtersData.map((item, index) => (
                                            <tr key={index}>
                                                <td className="question-cell">
                                                    {/*<div className="question-number">Q{item.sequenceNumber || index + 1}</div>*/}
                                                    <div className="question-text">{item.questionText}</div>
                                                </td>
                                                {/*<td className="answer-cell">*/}
                                                {/*    <div className="answer-text">{item.answer}</div>*/}
                                                {/*</td>*/}
                                                <td className="filters-cell">
                                                    <div className="filters-list">
                                                        {item.filters.map((filter, filterIndex) => (
                                                            <div key={filterIndex} className="filter-item">
                                                                <div className="filter-detail">
                                                                    <span className="filter-field">{filter.field}:</span>
                                                                    <span className="filter-operation"> {filter.operator} </span>
                                                                    <span className="filter-values">{filter.values?.join(', ')}</span>
                                                                </div>
                                                                {filter.reason && (
                                                                    <div className="filter-reason">
                                                                        <em>Reason: {filter.reason}</em>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-filters-data">
                                <p>No filters data available.</p>
                                <p>Complete the hearing assessment to see applied filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Component to display hearing aid recommendations
    const HearingAidRecommendations = () => {
        const [expandedCards, setExpandedCards] = useState(new Set());

        const toggleExpanded = (cardId) => {
            const newExpanded = new Set(expandedCards);
            if (newExpanded.has(cardId)) {
                newExpanded.delete(cardId);
            } else {
                newExpanded.add(cardId);
            }
            setExpandedCards(newExpanded);
        };

        const truncateText = (text, maxLength = 100) => {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        };

        if (recommendationsLoading) {
            return (
                <div className="loading-container">
                    <p>Loading hearing aid recommendations...</p>
                </div>
            );
        }

        if (!hearingAidRecommendations) {
            return (
                <div className="recommendations-container">
                    <h4>No Recommendations Available</h4>
                    <p>Complete the hearing assessment to receive personalized hearing aid recommendations.</p>
                </div>
            );
        }

        const { assessment, hearingAidRecommendations: recommendations, filterInfo } = hearingAidRecommendations;

        return (
            <div className="recommendations-container">
                {recommendations.length > 0 ? (
                    <div className="hearing-aids-scrollable-grid">
                        {recommendations.map((hearingAid, index) => {
                            const cardId = hearingAid.id || index;
                            const isExpanded = expandedCards.has(cardId);
                            const hasLongDescription = hearingAid.description && hearingAid.description.length > 100;

                            return (
                                <div key={cardId} className="hearing-aid-grid-card">
                                    <div className="hearing-aid-grid-header">
                                        <h6>{hearingAid.manufacturer}</h6>
                                        <p className="model-name">{hearingAid.hearingAidName}</p>
                                        {hearingAid.descriptionProductLine && (
                                            <span className="product-line">{hearingAid.descriptionProductLine}</span>
                                        )}
                                    </div>

                                    <div className="hearing-aid-grid-details">
                                        {hearingAid.description && (
                                            <div className="grid-detail-row description-row">
                                                <span className="grid-label">Description</span>
                                                <div className="grid-value description-value">
                                                    <span className="description-text">
                                                        {isExpanded ? hearingAid.description : truncateText(hearingAid.description)}
                                                    </span>
                                                    {hasLongDescription && (
                                                        <button
                                                            className="expand-btn"
                                                            onClick={() => toggleExpanded(cardId)}
                                                        >
                                                            {isExpanded ? 'Show Less' : 'Show More'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid-detail-row">
                                            <span className="grid-label">Style</span>
                                            <span className="grid-value">{hearingAid.hearingAidStyle}</span>
                                        </div>

                                        <div className="grid-detail-row">
                                            <span className="grid-label">Form Factor</span>
                                            <span className="grid-value">{hearingAid.styleFormFactor}</span>
                                        </div>

                                        <div className="grid-detail-row">
                                            <span className="grid-label">Suitable For</span>
                                            <span className="grid-value">{hearingAid.maxGainHearingLossCompatibility}</span>
                                        </div>

                                        {hearingAid.batterySize && (
                                            <div className="grid-detail-row">
                                                <span className="grid-label">Battery</span>
                                                <span className="grid-value">Size {hearingAid.batterySize}</span>
                                            </div>
                                        )}

                                        {hearingAid.maxOutputDbSpl && (
                                            <div className="grid-detail-row">
                                                <span className="grid-label">Max Output</span>
                                                <span className="grid-value">{hearingAid.maxOutputDbSpl} dB SPL</span>
                                            </div>
                                        )}

                                        {hearingAid.tinnitusManagementFeatures && (
                                            <div className="grid-detail-row">
                                                <span className="grid-label">Tinnitus Support</span>
                                                <span className="grid-value">{hearingAid.tinnitusManagementFeatures}</span>
                                            </div>
                                        )}

                                        {hearingAid.cochlearImplantCompatible === 'yes' && (
                                            <div className="grid-detail-row">
                                                <span className="grid-label">CI Compatible</span>
                                                <span className="grid-value">Yes</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="no-recommendations">
                        <p>No hearing aids match the specific criteria from your assessment.</p>
                        <p>Please consult with your audiologist for alternative options.</p>
                    </div>
                )}
            </div>
        );
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
            date: new Date().toLocaleDateString(), // Static date since backend is not ready
            status: "completed" // Static status
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
        "Hearing Aid Recommendations",
        "First Appointment",
        "Trial",
        "Fitting Follow Up"
    ];

    // Function to handle tab click
    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    // Check if we have assessment data with filters to show the View Filters button
    const hasFiltersData = assessmentData && assessmentData.answers &&
        assessmentData.answers.some(answer => answer.databaseFilters && answer.databaseFilters !== null);

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
                                                {
                                                    //step.status === "completed"
                                                    //? `Completed on: ${step.date}`
                                                    //    : `Scheduled for: ${step.date}`
                                                    `Completed on: ${step.date}`
                                                }

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

                                {hearingAidRecommendations && (
                                    <div className="assessment-section">
                                        <h4>Hearing Aid Recommendations</h4>
                                        <p>Based on your assessment, we found {hearingAidRecommendations.filterInfo.recommendedCount} suitable hearing aids.</p>
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

            case "Hearing Aid Recommendations":
                return (
                    <div className="journey-box">
                        <div className="recommendations-header">
                            <div className="recommendations-title">
                                <h3>Hearing Aid Recommendations</h3>
                                <p className="subtitle">
                                    Personalized hearing aid recommendations based on your assessment
                                </p>
                            </div>
                            {hasFiltersData && (
                                <button
                                    className="view-filters-btn"
                                    onClick={handleViewFilters}
                                >
                                    <FaFilter />
                                    View Filters
                                </button>
                            )}
                        </div>
                        <HearingAidRecommendations />
                    </div>
                );

            case "First Appointment":
                return (
                    <div className="journey-box">
                        <h3>First Appointment</h3>

                        <div className="appointment-content">
                            <div className="appointment-section">
                                <h4>Appointment Date:{new Date().toLocaleDateString()}</h4>
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

            {/* Filters Popup */}
            <FiltersPopup />
        </div>
    );
};

export default PatientHomePage;