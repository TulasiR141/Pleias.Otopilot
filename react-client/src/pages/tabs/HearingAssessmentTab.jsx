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
    handleRestartAssessment
}) => {
    // State for dynamic questionnaire
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionHistory, setQuestionHistory] = useState([]);
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const [assessmentStarted, setAssessmentStarted] = useState(false);

    // Commentary-related state
    const [savedCommentaries, setSavedCommentaries] = useState({});
    const [commentaryHistory, setCommentaryHistory] = useState([]);
    const [isClinicalAnalysisExpanded, setIsClinicalAnalysisExpanded] = useState(false);
    const [isCommentaryExpanded, setIsCommentaryExpanded] = useState(false);
    const [patientWithTestData, setPatientWithTestData] = useState(null);
    const [patientDataLoading, setPatientDataLoading] = useState(false);
    const [patientDataError, setPatientDataError] = useState(null);

    // Effect to handle textarea value when currentNodeId changes
    useEffect(() => {
        const textarea = document.querySelector('.commentary-textarea');
        if (textarea && currentNodeId) {
            // Always clear the textarea when navigating to any question
            textarea.value = '';
        }
    }, [currentNodeId]);

    const fetchPatientWithTestData = async () => {
        if (!patientId) {
            setPatientDataError("Patient ID is missing");
            return null;
        }

        try {
            setPatientDataLoading(true);
            setPatientDataError(null);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/${patientId}?allTestData=true`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Patient not found");
                }
                throw new Error("Failed to fetch patient details with test data");
            }

            const data = await response.json();
            setPatientWithTestData(data.data);
            console.log('Patient data with test data loaded:', data);
            return data;
        } catch (err) {
            console.error("Error fetching patient with test data:", err);
            setPatientDataError(err.message);
            return null;
        } finally {
            setPatientDataLoading(false);
        }
    };
    // Function to start assessment
    const handleStartAssessment = async () => {
        try {
            setAssessmentStarted(true);
            console.log('Fetching patient data for assessment...');
            const patientData = await fetchPatientWithTestData();

            if (!patientData) {
                console.error("Could not load patient data for assessment");
            }

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
                setPatientWithTestData(null);
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

    // ============================================================================
    // EXTRACTION FUNCTIONS
    // ============================================================================

    const extractAirConductionThresholds = (patientData) => {
        const thresholds = { left: {}, right: {} };

        if (!patientData || !patientData.actions) {
            return thresholds;
        }

        const audiograms = [];
        patientData.actions.forEach(action => {
            if (action.audiograms && action.audiograms.length > 0) {
                audiograms.push(...action.audiograms);
            }
        });

        if (audiograms.length === 0) {
            return thresholds;
        }

        audiograms.forEach(audiogram => {
            if (audiogram.stimulusSignalOutput &&
                audiogram.stimulusSignalOutput.toLowerCase().includes('airconductor')) {

                const ear = audiogram.ear ? audiogram.ear.toLowerCase() : '';
                let targetEar = '';

                if (ear.includes('left')) {
                    targetEar = 'left';
                } else if (ear.includes('right')) {
                    targetEar = 'right';
                } else {
                    return;
                }

                if (audiogram.tonePoints && audiogram.tonePoints.length > 0) {
                    audiogram.tonePoints.forEach(tonePoint => {
                        try {
                            const freq = parseInt(tonePoint.stimulusFrequency);
                            const status = tonePoint.tonePointStatus || 'Normal';

                            if (status === 'NoResponse') {
                                thresholds[targetEar][freq] = 'NoResponse';
                            } else {
                                const level = parseInt(tonePoint.stimulusLevel);
                                thresholds[targetEar][freq] = level;
                            }
                        } catch (error) {
                            console.warn('Error processing tone point:', error);
                        }
                    });
                }
            }
        });

        return thresholds;
    };

    const extractBoneConductionThresholds = (patientData) => {
        const thresholds = { left: {}, right: {} };

        if (!patientData || !patientData.actions) return thresholds;

        const audiograms = [];
        patientData.actions.forEach(action => {
            if (action.audiograms && action.audiograms.length > 0) {
                audiograms.push(...action.audiograms);
            }
        });

        audiograms.forEach(audiogram => {
            if (audiogram.stimulusSignalOutput &&
                audiogram.stimulusSignalOutput.toLowerCase().includes('boneconductor')) {

                const ear = audiogram.ear?.toLowerCase() || '';
                let targetEar = '';

                if (ear.includes('left')) targetEar = 'left';
                else if (ear.includes('right')) targetEar = 'right';
                else return;

                if (audiogram.tonePoints && audiogram.tonePoints.length > 0) {
                    audiogram.tonePoints.forEach(tonePoint => {
                        try {
                            const freq = parseInt(tonePoint.stimulusFrequency);
                            const status = tonePoint.tonePointStatus || 'Normal';

                            if (status === 'NoResponse') {
                                thresholds[targetEar][freq] = 'NoResponse';
                            } else {
                                const level = parseInt(tonePoint.stimulusLevel);
                                thresholds[targetEar][freq] = level;
                            }
                        } catch (error) {
                            console.warn('Error processing BC tone point:', error);
                        }
                    });
                }
            }
        });

        return thresholds;
    };

    // ============================================================================
    // CLINICAL ANALYSIS FUNCTIONS
    // ============================================================================

    const evaluateAirConductionResults = (patientData) => {
        const acThresholds = extractAirConductionThresholds(patientData);

        const hasLeftData = Object.keys(acThresholds.left).length > 0;
        const hasRightData = Object.keys(acThresholds.right).length > 0;

        if (!hasLeftData && !hasRightData) {
            return {
                boneConduction: null,
                error: 'No air conduction data available',
                dataSufficiency: false,
                thresholds: acThresholds
            };
        }

        const indicators = {
            elevatedThresholds: false,
            asymmetricLoss: false,
            elevatedDetails: [],
            asymmetryDetails: []
        };

        const speechFrequencies = [500, 1000, 2000, 4000];
        const normalThresholdLimit = 25;

        ['left', 'right'].forEach(ear => {
            speechFrequencies.forEach(freq => {
                if (freq in acThresholds[ear]) {
                    const threshold = acThresholds[ear][freq];
                    const thresholdValue = threshold === "NoResponse" ? 120 : threshold;

                    if (thresholdValue > normalThresholdLimit) {
                        indicators.elevatedThresholds = true;
                        indicators.elevatedDetails.push({
                            ear,
                            frequency: freq,
                            threshold,
                            thresholdValue
                        });
                    }
                }
            });
        });

        const asymmetryThreshold = 15;
        const commonFrequencies = Object.keys(acThresholds.left)
            .filter(freq => freq in acThresholds.right)
            .map(freq => parseInt(freq));

        commonFrequencies.forEach(freq => {
            const leftVal = acThresholds.left[freq];
            const rightVal = acThresholds.right[freq];

            const leftNumeric = leftVal === "NoResponse" ? 120 : leftVal;
            const rightNumeric = rightVal === "NoResponse" ? 120 : rightVal;

            const interauralDifference = Math.abs(leftNumeric - rightNumeric);

            if (interauralDifference > asymmetryThreshold) {
                indicators.asymmetricLoss = true;
                indicators.asymmetryDetails.push({
                    frequency: freq,
                    leftThreshold: leftVal,
                    rightThreshold: rightVal,
                    interauralDifference
                });
            }
        });

        const boneConditionRecommended = indicators.elevatedThresholds || indicators.asymmetricLoss;

        let reason = '';
        const reasons = [];

        if (indicators.elevatedThresholds) {
            const elevatedCount = indicators.elevatedDetails.length;
            reasons.push(`Elevated air conduction thresholds (>25 dB HL) at ${elevatedCount} frequencies require bone conduction testing to determine hearing loss type`);
        }

        if (indicators.asymmetricLoss) {
            const asymmetricCount = indicators.asymmetryDetails.length;
            reasons.push(`Significant interaural differences (>15 dB) at ${asymmetricCount} frequencies require bone conduction testing to rule out conductive component`);
        }

        if (reasons.length === 0) {
            reason = "Normal bilateral air conduction thresholds (≤25 dB HL) with symmetric hearing - bone conduction testing not clinically indicated";
        } else {
            reason = reasons.join('; ');
        }

        let clinicalSignificance = "ROUTINE_PRIORITY: Standard bone conduction testing indicated";

        if (indicators.asymmetricLoss) {
            const maxAsymmetry = Math.max(...indicators.asymmetryDetails.map(d => d.interauralDifference));
            if (maxAsymmetry >= 30) {
                clinicalSignificance = "HIGH_PRIORITY: Significant asymmetry warrants urgent bone conduction testing";
            }
        }

        if (indicators.elevatedThresholds) {
            const severeElevations = indicators.elevatedDetails.filter(d => d.thresholdValue >= 70);
            if (severeElevations.length > 0) {
                clinicalSignificance = "MODERATE_PRIORITY: Severe threshold elevations present";
            }
        }

        return {
            boneConduction: boneConditionRecommended,
            indicators,
            reason,
            clinicalSignificance,
            dataSufficiency: true,
            thresholds: acThresholds
        };
    };

    const evaluateMaskingNeed = (patientData) => {
        const acThresholds = extractAirConductionThresholds(patientData);
        const bcThresholds = extractBoneConductionThresholds(patientData);

        const requirements = {
            airMaskingNeeded: false,
            boneMaskingNeeded: false,
            affectedFrequencies: []
        };

        const commonACFreqs = Object.keys(acThresholds.left)
            .filter(freq => freq in acThresholds.right)
            .map(freq => parseInt(freq));

        commonACFreqs.forEach(freq => {
            const leftAC = acThresholds.left[freq] === 'NoResponse' ? 120 : acThresholds.left[freq];
            const rightAC = acThresholds.right[freq] === 'NoResponse' ? 120 : acThresholds.right[freq];
            const interauralDiff = Math.abs(leftAC - rightAC);

            if (interauralDiff >= 40) {
                requirements.airMaskingNeeded = true;
                requirements.affectedFrequencies.push({
                    frequency: freq,
                    type: 'air_conduction',
                    interauralDifference: interauralDiff,
                    leftThreshold: leftAC,
                    rightThreshold: rightAC
                });
            }
        });

        if (Object.keys(bcThresholds.left).length > 0 || Object.keys(bcThresholds.right).length > 0) {
            ['left', 'right'].forEach(ear => {
                const commonFreqs = Object.keys(acThresholds[ear])
                    .filter(freq => freq in bcThresholds[ear])
                    .map(freq => parseInt(freq));

                commonFreqs.forEach(freq => {
                    const acVal = acThresholds[ear][freq] === 'NoResponse' ? 120 : acThresholds[ear][freq];
                    const bcVal = bcThresholds[ear][freq] === 'NoResponse' ? 120 : bcThresholds[ear][freq];
                    const abg = acVal - bcVal;

                    if (abg >= 10) {
                        requirements.boneMaskingNeeded = true;
                        requirements.affectedFrequencies.push({
                            frequency: freq,
                            ear: ear,
                            type: 'bone_conduction',
                            airBoneGap: abg,
                            acThreshold: acVal,
                            bcThreshold: bcVal
                        });
                    }
                });
            });
        }

        return {
            ...requirements,
            dataSufficiency: true
        };
    };

    const determineLossType = (patientData) => {
        const acThresholds = extractAirConductionThresholds(patientData);
        const bcThresholds = extractBoneConductionThresholds(patientData);

        if (!Object.keys(bcThresholds.left).length && !Object.keys(bcThresholds.right).length) {
            return {
                error: 'Bone conduction data required for loss type classification',
                dataSufficiency: false
            };
        }

        const results = {};
        const speechFrequencies = [500, 1000, 2000, 4000];

        ['left', 'right'].forEach(ear => {
            let significantGaps = 0;
            const gapDetails = [];

            speechFrequencies.forEach(freq => {
                if (freq in acThresholds[ear] && freq in bcThresholds[ear]) {
                    const acVal = acThresholds[ear][freq] === 'NoResponse' ? 120 : acThresholds[ear][freq];
                    const bcVal = bcThresholds[ear][freq] === 'NoResponse' ? 120 : bcThresholds[ear][freq];
                    const abg = acVal - bcVal;

                    if (abg >= 15) {
                        significantGaps++;
                        gapDetails.push({
                            frequency: freq,
                            gapSize: abg,
                            acThreshold: acVal,
                            bcThreshold: bcVal
                        });
                    }
                }
            });

            let lossType;
            if (significantGaps >= 2) {
                const bcElevated = speechFrequencies.some(f =>
                    f in bcThresholds[ear] &&
                    (bcThresholds[ear][f] === 'NoResponse' ? 120 : bcThresholds[ear][f]) > 25
                );
                lossType = bcElevated ? 'MIXED' : 'CONDUCTIVE';
            } else {
                lossType = 'SENSORINEURAL';
            }

            results[ear] = {
                lossType,
                significantGaps,
                gapDetails
            };
        });

        return { ...results, dataSufficiency: true };
    };

    const classifyABGType = (patientData) => {
        const bcThresholds = extractBoneConductionThresholds(patientData);

        if (!Object.keys(bcThresholds.left).length && !Object.keys(bcThresholds.right).length) {
            return {
                error: 'Bone conduction data required for ABG classification',
                dataSufficiency: false
            };
        }

        const results = {};
        const normalBCLimit = 25;

        ['left', 'right'].forEach(ear => {
            const elevatedFrequencies = [];

            Object.entries(bcThresholds[ear]).forEach(([freq, threshold]) => {
                const thresholdValue = threshold === 'NoResponse' ? 120 : threshold;

                if (thresholdValue > normalBCLimit) {
                    elevatedFrequencies.push({
                        frequency: parseInt(freq),
                        bcThreshold: thresholdValue,
                        elevationAmount: thresholdValue - normalBCLimit
                    });
                }
            });

            if (elevatedFrequencies.length > 0) {
                const maxBC = Math.max(...elevatedFrequencies.map(f => f.bcThreshold));
                let snSeverity;

                if (maxBC < 40) snSeverity = 'MILD';
                else if (maxBC < 70) snSeverity = 'MODERATE';
                else snSeverity = 'SEVERE';

                results[ear] = {
                    classification: 'MIXED_LOSS',
                    sensorineuralComponent: snSeverity,
                    elevatedFrequencies
                };
            } else {
                results[ear] = {
                    classification: 'PURE_CONDUCTIVE',
                    note: 'Normal BC thresholds with conductive component'
                };
            }
        });

        return { ...results, dataSufficiency: true };
    };

    const classifyHearingLossDegree = (pta) => {
        if (pta < 20) return 'NORMAL';
        if (pta < 40) return 'MILD';
        if (pta < 70) return 'MODERATE';
        if (pta < 90) return 'SEVERE';
        return 'PROFOUND';
    };

    const calculatePTAForDegree = (patientData) => {
        const acThresholds = extractAirConductionThresholds(patientData);
        const ptaFrequencies = [500, 1000, 2000, 4000];

        const calculateEarPTA = (earThresholds) => {
            const validThresholds = [];
            const missingFrequencies = [];

            ptaFrequencies.forEach(freq => {
                if (freq in earThresholds) {
                    const threshold = earThresholds[freq] === 'NoResponse' ? 120 : earThresholds[freq];
                    validThresholds.push(threshold);
                } else {
                    missingFrequencies.push(freq);
                }
            });

            if (validThresholds.length >= 3) {
                const ptaValue = validThresholds.reduce((a, b) => a + b, 0) / validThresholds.length;
                return {
                    pta: Math.round(ptaValue * 10) / 10,
                    valid: true,
                    frequenciesUsed: validThresholds.length,
                    missingFrequencies
                };
            }

            return {
                pta: null,
                valid: false,
                error: 'Insufficient frequency data',
                frequenciesAvailable: validThresholds.length
            };
        };

        const leftResult = calculateEarPTA(acThresholds.left);
        const rightResult = calculateEarPTA(acThresholds.right);

        let betterEar, betterPTA;

        if (leftResult.valid && rightResult.valid) {
            if (leftResult.pta <= rightResult.pta) {
                betterEar = 'LEFT';
                betterPTA = leftResult.pta;
            } else {
                betterEar = 'RIGHT';
                betterPTA = rightResult.pta;
            }
        } else if (leftResult.valid) {
            betterEar = 'LEFT';
            betterPTA = leftResult.pta;
        } else if (rightResult.valid) {
            betterEar = 'RIGHT';
            betterPTA = rightResult.pta;
        } else {
            return {
                ptaValue: null,
                betterEar: null,
                error: 'Cannot calculate PTA for either ear',
                leftEarResult: leftResult,
                rightEarResult: rightResult,
                dataSufficiency: false
            };
        }

        return {
            ptaValue: betterPTA,
            betterEar,
            leftEarResult: leftResult,
            rightEarResult: rightResult,
            dataSufficiency: true
        };
    };

    const evaluateEligibilityThreshold = (ptaResult) => {
        if (!ptaResult || ptaResult.ptaValue === null) {
            return {
                eligible: null,
                reason: 'PTA calculation failed',
                recommendation: 'Complete audiometric assessment required',
                dataSufficiency: false
            };
        }

        const ptaValue = ptaResult.ptaValue;
        const degree = classifyHearingLossDegree(ptaValue);

        if (ptaValue > 30) {
            return {
                eligible: true,
                hearingLossDegree: degree,
                ptaValue,
                recommendation: 'Proceed with hearing aid evaluation',
                reimbursementEligible: true,
                dataSufficiency: true
            };
        } else if (ptaValue >= 20) {
            return {
                eligible: false,
                borderlineCase: true,
                ptaValue,
                hearingLossDegree: 'MILD',
                recommendation: 'ENT evaluation for borderline eligibility',
                dataSufficiency: true
            };
        } else {
            return {
                eligible: false,
                ptaValue,
                hearingLossDegree: 'NORMAL',
                recommendation: 'No hearing aid needed',
                dataSufficiency: true
            };
        }
    };

    const checkOcclusionRisk = (patientData) => {
        const acThresholds = extractAirConductionThresholds(patientData);
        const lowFreqAnalysis = {};

        ['left', 'right'].forEach(ear => {
            const lowFreqThresholds = [];

            [250, 500].forEach(freq => {
                if (freq in acThresholds[ear]) {
                    const threshold = acThresholds[ear][freq] === 'NoResponse' ? 120 : acThresholds[ear][freq];
                    lowFreqThresholds.push(threshold);
                }
            });

            if (lowFreqThresholds.length > 0) {
                const avgLowFreq = lowFreqThresholds.reduce((a, b) => a + b, 0) / lowFreqThresholds.length;

                let riskLevel, management;
                if (avgLowFreq <= 15) {
                    riskLevel = 'HIGH';
                    management = 'Open-fit or large vent (≥3mm) required';
                } else if (avgLowFreq <= 25) {
                    riskLevel = 'MODERATE';
                    management = 'Consider moderate vent (2-3mm)';
                } else {
                    riskLevel = 'LOW';
                    management = 'Standard fitting approaches appropriate';
                }

                lowFreqAnalysis[ear] = {
                    riskLevel,
                    avgLowFreqThreshold: Math.round(avgLowFreq * 10) / 10,
                    managementRecommendation: management,
                    thresholdsUsed: lowFreqThresholds
                };
            } else {
                lowFreqAnalysis[ear] = {
                    riskLevel: 'UNKNOWN',
                    error: 'Low frequency thresholds not available'
                };
            }
        });

        return {
            occlusionAssessment: lowFreqAnalysis,
            requiresManagement: Object.values(lowFreqAnalysis).some(
                result => ['HIGH', 'MODERATE'].includes(result.riskLevel)
            ),
            dataSufficiency: Object.values(lowFreqAnalysis).some(result => result.riskLevel !== 'UNKNOWN')
        };
    };

    const determinePowerLevel = (ptaResult) => {
        if (!ptaResult || ptaResult.ptaValue === null) {
            return {
                powerLevel: null,
                error: 'PTA calculation required for power determination',
                dataSufficiency: false
            };
        }

        const ptaValue = ptaResult.ptaValue;
        let powerClassification;

        if (ptaValue < 30) {
            powerClassification = {
                powerLevel: 'STANDARD',
                maxGainRequired: 'BASIC',
                suitableStyles: ['CIC', 'ITC', 'ITE', 'RIC', 'BTE'],
                gainRangeDB: 'Up to 50 dB',
                styleLimitations: null
            };
        } else if (ptaValue < 70) {
            powerClassification = {
                powerLevel: 'HIGH_POWER',
                maxGainRequired: 'MODERATE_TO_SEVERE',
                suitableStyles: ['ITE', 'RIC', 'BTE'],
                gainRangeDB: '50-70 dB',
                styleLimitations: 'CIC insufficient for this loss level'
            };
        } else {
            powerClassification = {
                powerLevel: 'SUPER_POWER',
                maxGainRequired: 'SEVERE_TO_PROFOUND',
                suitableStyles: ['BTE'],
                gainRangeDB: '70+ dB',
                styleLimitations: 'BTE required - only style with sufficient power',
                specialFeatures: ['Telecoil recommended', 'Direct audio input beneficial']
            };
        }

        return {
            ...powerClassification,
            ptaReference: ptaValue,
            betterEarUsed: ptaResult.betterEar,
            hearingLossDegree: classifyHearingLossDegree(ptaValue),
            dataSufficiency: true
        };
    };

    // ============================================================================
    // CLINICAL ANALYSIS RENDERING FUNCTIONS
    // ============================================================================

    const shouldShowClinicalAnalysis = () => {
        const clinicalAnalysisNodes = [
            'evaluate_air_conduction_results',
            'evaluate_masking_need',
            'determine_loss_type',
            'classify_abg_type',
            'calculate_pta_for_degree',
            'check_occlusion_risk',
            'determine_power_level',
            'threshold_20_to_39dB'
        ];
        return currentNodeId && clinicalAnalysisNodes.includes(currentNodeId);
    };

    const renderClinicalAnalysisContent = () => {
        if (!currentNodeId || !patientWithTestData) {
            return null;
        }

        switch (currentNodeId) {
            case 'evaluate_air_conduction_results':
                return renderAirConductionAnalysis();
            case 'evaluate_masking_need':
                return renderMaskingNeedAnalysis();
            case 'determine_loss_type':
                return renderLossTypeAnalysis();
            case 'classify_abg_type':
                return renderABGTypeAnalysis();
            case 'calculate_pta_for_degree':
                return renderPTAAnalysis();
            case 'threshold_20_to_39dB':
                return renderEligibilityAnalysis();
            case 'check_occlusion_risk':
                return renderOcclusionRiskAnalysis();
            case 'determine_power_level':
                return renderPowerLevelAnalysis();
            default:
                return null;
        }
    };

    const renderAirConductionAnalysis = () => {
        if (!patientWithTestData || !patientWithTestData.actions) {
            return (
                <div className="analysis-content">
                    <div className="no-data-message">
                        <p>No audiological data available for air conduction analysis.</p>
                    </div>
                </div>
            );
        }

        const analysis = evaluateAirConductionResults(patientWithTestData);

        if (!analysis.dataSufficiency) {
            return (
                <div className="analysis-content">
                    <div className="analysis-error">
                        <h6>Data Insufficiency</h6>
                        <p>{analysis.error}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="analysis-content">
                <div className="analysis-recommendation">
                    <h6>Bone Conduction Testing Recommendation</h6>
                    <div className={`recommendation-result ${analysis.boneConduction ? 'recommended' : 'not-recommended'}`}>
                        {analysis.boneConduction ? 'RECOMMENDED' : 'NOT INDICATED'}
                    </div>
                </div>

                <div className="analysis-rationale">
                    <h6>Clinical Rationale</h6>
                    <p className="rationale-text">{analysis.reason}</p>
                </div>

                {analysis.boneConduction && (
                    <div className="analysis-priority">
                        <h6>Clinical Priority</h6>
                        <div className={`priority-level ${analysis.clinicalSignificance.includes('HIGH') ? 'high' :
                            analysis.clinicalSignificance.includes('MODERATE') ? 'moderate' : 'routine'}`}>
                            {analysis.clinicalSignificance}
                        </div>
                    </div>
                )}

                <div className="analysis-details">
                    <h6>Clinical Indicators</h6>
                    <div className="indicators-grid">
                        <div className="indicator-item">
                            <span className="indicator-label">Elevated Thresholds (&gt;25 dB):</span>
                            <span className={`indicator-value ${analysis.indicators.elevatedThresholds ? 'positive' : 'negative'}`}>
                                {analysis.indicators.elevatedThresholds ? 'PRESENT' : 'ABSENT'}
                            </span>
                        </div>
                        <div className="indicator-item">
                            <span className="indicator-label">Asymmetric Loss (&gt;15 dB):</span>
                            <span className={`indicator-value ${analysis.indicators.asymmetricLoss ? 'positive' : 'negative'}`}>
                                {analysis.indicators.asymmetricLoss ? 'PRESENT' : 'ABSENT'}
                            </span>
                        </div>
                    </div>
                </div>

                {(analysis.indicators.elevatedDetails.length > 0 || analysis.indicators.asymmetryDetails.length > 0) && (
                    <div className="analysis-findings">
                        <h6>Detailed Findings</h6>

                        {analysis.indicators.elevatedDetails.length > 0 && (
                            <div className="finding-section">
                                <strong>Elevated Thresholds ({analysis.indicators.elevatedDetails.length} frequencies):</strong>
                                <ul className="findings-list">
                                    {analysis.indicators.elevatedDetails.map((detail, index) => (
                                        <li key={index}>
                                            {detail.frequency} Hz ({detail.ear}): {detail.threshold === 'NoResponse' ? 'No Response (&gt;120 dB)' : `${detail.threshold} dB HL`}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {analysis.indicators.asymmetryDetails.length > 0 && (
                            <div className="finding-section">
                                <strong>Asymmetric Losses ({analysis.indicators.asymmetryDetails.length} frequencies):</strong>
                                <ul className="findings-list">
                                    {analysis.indicators.asymmetryDetails.map((detail, index) => (
                                        <li key={index}>
                                            {detail.frequency} Hz: {detail.interauralDifference} dB difference (L: {detail.leftThreshold}, R: {detail.rightThreshold})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="threshold-summary">
                    <h6>Air Conduction Thresholds Summary</h6>
                    <div className="threshold-grid">
                        {['left', 'right'].map(ear => {
                            const earData = analysis.thresholds[ear];
                            const frequencies = Object.keys(earData).map(f => parseInt(f)).sort((a, b) => a - b);

                            if (frequencies.length === 0) {
                                return (
                                    <div key={ear} className="ear-summary">
                                        <strong>{ear.charAt(0).toUpperCase() + ear.slice(1)} Ear:</strong>
                                        <span className="no-data">No data available</span>
                                    </div>
                                );
                            }

                            return (
                                <div key={ear} className="ear-summary">
                                    <strong>{ear.charAt(0).toUpperCase() + ear.slice(1)} Ear:</strong>
                                    <div className="frequency-data">
                                        {frequencies.map(freq => (
                                            <span key={freq} className="frequency-point">
                                                {freq}Hz: {earData[freq] === 'NoResponse' ? 'NR' : `${earData[freq]}dB`}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderMaskingNeedAnalysis = () => {
        if (!patientWithTestData || !patientWithTestData.actions) {
            return (
                <div className="analysis-content">
                    <div className="no-data-message">
                        <p>No audiological data available for masking analysis.</p>
                    </div>
                </div>
            );
        }

        const analysis = evaluateMaskingNeed(patientWithTestData);

        if (!analysis.dataSufficiency) {
            return (
                <div className="analysis-content">
                    <div className="analysis-error">
                        <h6>Data Insufficiency</h6>
                        <p>Insufficient audiometric data for masking analysis</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="analysis-content">
                <div className="analysis-recommendation">
                    <h6>Masking Requirements</h6>
                    <div className="masking-results">
                        <div className={`masking-type ${analysis.airMaskingNeeded ? 'needed' : 'not-needed'}`}>
                            <strong>Air Conduction Masking:</strong> {analysis.airMaskingNeeded ? 'REQUIRED' : 'NOT REQUIRED'}
                        </div>
                        <div className={`masking-type ${analysis.boneMaskingNeeded ? 'needed' : 'not-needed'}`}>
                            <strong>Bone Conduction Masking:</strong> {analysis.boneMaskingNeeded ? 'REQUIRED' : 'NOT REQUIRED'}
                        </div>
                    </div>
                </div>

                {analysis.affectedFrequencies.length > 0 && (
                    <div className="analysis-findings">
                        <h6>Affected Frequencies ({analysis.affectedFrequencies.length})</h6>
                        <ul className="findings-list">
                            {analysis.affectedFrequencies.map((freq, index) => (
                                <li key={index}>
                                    {freq.frequency} Hz ({freq.type === 'air_conduction' ? 'AC' : 'BC'}):
                                    {freq.type === 'air_conduction' ?
                                        ` ${freq.interauralDifference} dB interaural difference (L: ${freq.leftThreshold}, R: ${freq.rightThreshold})` :
                                        ` ${freq.airBoneGap} dB air-bone gap (${freq.ear} ear, AC: ${freq.acThreshold}, BC: ${freq.bcThreshold})`
                                    }
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="analysis-rationale">
                    <h6>Clinical Guidance</h6>
                    <p className="rationale-text">
                        {analysis.airMaskingNeeded && 'Air conduction masking required due to interaural differences ≥40 dB. '}
                        {analysis.boneMaskingNeeded && 'Bone conduction masking required due to air-bone gaps ≥10 dB. '}
                        {!analysis.airMaskingNeeded && !analysis.boneMaskingNeeded && 'No masking requirements identified based on current thresholds.'}
                    </p>
                </div>
            </div>
        );
    };

    const renderLossTypeAnalysis = () => {
        if (!patientWithTestData || !patientWithTestData.actions) {
            return (
                <div className="analysis-content">
                    <div className="no-data-message">
                        <p>No audiological data available for loss type analysis.</p>
                    </div>
                </div>
            );
        }

        const analysis = determineLossType(patientWithTestData);

        if (!analysis.dataSufficiency) {
            return (
                <div className="analysis-content">
                    <div className="analysis-error">
                        <h6>Data Insufficiency</h6>
                        <p>{analysis.error}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="analysis-content">
                <div className="analysis-recommendation">
                    <h6>Hearing Loss Classification</h6>
                    <div className="loss-type-results">
                        {['left', 'right'].map(ear => (
                            <div key={ear} className="ear-classification">
                                <strong>{ear.charAt(0).toUpperCase() + ear.slice(1)} Ear:</strong>
                                <span className={`loss-type ${analysis[ear].lossType.toLowerCase()}`}>
                                    {analysis[ear].lossType}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {(['left', 'right'].some(ear => analysis[ear].gapDetails.length > 0)) && (
                    <div className="analysis-findings">
                        <h6>Air-Bone Gap Analysis</h6>
                        {['left', 'right'].map(ear => {
                            if (analysis[ear].gapDetails.length === 0) return null;
                            return (
                                <div key={ear} className="finding-section">
                                    <strong>{ear.charAt(0).toUpperCase() + ear.slice(1)} Ear ({analysis[ear].significantGaps} significant gaps):</strong>
                                    <ul className="findings-list">
                                        {analysis[ear].gapDetails.map((detail, index) => (
                                            <li key={index}>
                                                {detail.frequency} Hz: {detail.gapSize} dB gap (AC: {detail.acThreshold} dB, BC: {detail.bcThreshold} dB)
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="analysis-rationale">
                    <h6>Clinical Interpretation</h6>
                    <p className="rationale-text">
                        Classification based on air-bone gaps ≥15 dB at speech frequencies (500-4000 Hz).
                        SENSORINEURAL: No significant gaps.
                        CONDUCTIVE: Significant gaps with normal BC.
                        MIXED: Significant gaps with elevated BC thresholds.
                    </p>
                </div>
            </div>
        );
    };

    const renderABGTypeAnalysis = () => {
        if (!patientWithTestData || !patientWithTestData.actions) {
            return (
                <div className="analysis-content">
                    <div className="no-data-message">
                        <p>No audiological data available for ABG classification.</p>
                    </div>
                </div>
            );
        }

        const analysis = classifyABGType(patientWithTestData);

        if (!analysis.dataSufficiency) {
            return (
                <div className="analysis-content">
                    <div className="analysis-error">
                        <h6>Data Insufficiency</h6>
                        <p>{analysis.error}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="analysis-content">
                <div className="analysis-recommendation">
                    <h6>Air-Bone Gap Classification</h6>
                    <div className="abg-classification-results">
                        {['left', 'right'].map(ear => (
                            <div key={ear} className="ear-abg-classification">
                                <strong>{ear.charAt(0).toUpperCase() + ear.slice(1)} Ear:</strong>
                                <span className={`abg-classification ${analysis[ear].classification.toLowerCase().replace('_', '-')}`}>
                                    {analysis[ear].classification}
                                </span>
                                {analysis[ear].sensorineuralComponent && (
                                    <span className="sn-component">
                                        SN Component: {analysis[ear].sensorineuralComponent}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {(['left', 'right'].some(ear => analysis[ear].elevatedFrequencies && analysis[ear].elevatedFrequencies.length > 0)) && (
                    <div className="analysis-findings">
                        <h6>Bone Conduction Elevation Details</h6>
                        {['left', 'right'].map(ear => {
                            if (!analysis[ear].elevatedFrequencies || analysis[ear].elevatedFrequencies.length === 0) return null;
                            return (
                                <div key={ear} className="finding-section">
                                    <strong>{ear.charAt(0).toUpperCase() + ear.slice(1)} Ear ({analysis[ear].elevatedFrequencies.length} elevated frequencies):</strong>
                                    <ul className="findings-list">
                                        {analysis[ear].elevatedFrequencies.map((detail, index) => (
                                            <li key={index}>
                                                {detail.frequency} Hz: {detail.bcThreshold} dB HL ({detail.elevationAmount} dB above normal)
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="analysis-rationale">
                    <h6>Clinical Interpretation</h6>
                    <p className="rationale-text">
                        PURE CONDUCTIVE: BC thresholds ≤25 dB HL (normal cochlear function with middle ear pathology).
                        MIXED LOSS: Elevated BC thresholds indicate both conductive and sensorineural components.
                        Severity based on maximum BC elevation: Mild (&lt;40 dB), Moderate (40-69 dB), Severe (≥70 dB).
                    </p>
                </div>
            </div>
        );
    };

    const renderPTAAnalysis = () => {
        if (!patientWithTestData || !patientWithTestData.actions) {
            return (
                <div className="analysis-content">
                    <div className="no-data-message">
                        <p>No audiological data available for PTA calculation.</p>
                    </div>
                </div>
            );
        }

        const analysis = calculatePTAForDegree(patientWithTestData);

        if (!analysis.dataSufficiency) {
            return (
                <div className="analysis-content">
                    <div className="analysis-error">
                        <h6>Data Insufficiency</h6>
                        <p>{analysis.error}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="analysis-content">
                <div className="analysis-recommendation">
                    <h6>Pure Tone Average (PTA)</h6>
                    <div className="pta-result">
                        <div className="pta-value">
                            <strong>Better Ear PTA:</strong>
                            <span className="pta-number">{analysis.ptaValue} dB HL</span>
                        </div>
                        <div className="better-ear">
                            <strong>Better Ear:</strong> {analysis.betterEar}
                        </div>
                    </div>
                </div>

                <div className="analysis-details">
                    <h6>Individual Ear Results</h6>
                    <div className="ear-pta-details">
                        {['left', 'right'].map(ear => {
                            const earResult = analysis[`${ear}EarResult`];
                            return (
                                <div key={ear} className="ear-pta-item">
                                    <strong>{ear.charAt(0).toUpperCase() + ear.slice(1)} Ear:</strong>
                                    {earResult.valid ? (
                                        <div>
                                            <span className="pta-value">{earResult.pta} dB HL</span>
                                            <span className="frequencies-used">
                                                ({earResult.frequenciesUsed}/4 frequencies)
                                            </span>
                                            {earResult.missingFrequencies.length > 0 && (
                                                <span className="missing-freqs">
                                                    Missing: {earResult.missingFrequencies.join(', ')} Hz
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="invalid-pta">{earResult.error}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="analysis-rationale">
                    <h6>Calculation Method</h6>
                    <p className="rationale-text">
                        PTA calculated using four-frequency average (500, 1000, 2000, 4000 Hz) of air conduction thresholds.
                        Minimum 3 frequencies required for valid PTA. Better ear (lower PTA) used for clinical decisions.
                    </p>
                </div>
            </div>
        );
    };

    const renderEligibilityAnalysis = () => {
        if (!patientWithTestData || !patientWithTestData.actions) {
            return (
                <div className="analysis-content">
                    <div className="no-data-message">
                        <p>No audiological data available for eligibility assessment.</p>
                    </div>
                </div>
            );
        }

        const ptaAnalysis = calculatePTAForDegree(patientWithTestData);
        const analysis = evaluateEligibilityThreshold(ptaAnalysis);

        if (!analysis.dataSufficiency) {
            return (
                <div className="analysis-content">
                    <div className="analysis-error">
                        <h6>Data Insufficiency</h6>
                        <p>{analysis.reason}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="analysis-content">
                <div className="analysis-recommendation">
                    <h6>Hearing Aid Eligibility</h6>
                    <div className={`eligibility-result ${analysis.eligible ? 'eligible' : analysis.borderlineCase ? 'borderline' : 'not-eligible'}`}>
                        {analysis.eligible ? 'ELIGIBLE' : analysis.borderlineCase ? 'BORDERLINE' : 'NOT ELIGIBLE'}
                    </div>
                </div>

                <div className="analysis-details">
                    <h6>Assessment Details</h6>
                    <div className="eligibility-details">
                        <div className="detail-item">
                            <strong>PTA Value:</strong> {analysis.ptaValue} dB HL
                        </div>
                        <div className="detail-item">
                            <strong>Hearing Loss Degree:</strong> {analysis.hearingLossDegree}
                        </div>
                        {analysis.reimbursementEligible !== undefined && (
                            <div className="detail-item">
                                <strong>Reimbursement Eligible:</strong> {analysis.reimbursementEligible ? 'YES' : 'NO'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="analysis-rationale">
                    <h6>Recommendation</h6>
                    <p className="rationale-text">{analysis.recommendation}</p>
                </div>

                {analysis.borderlineCase && (
                    <div className="analysis-warning">
                        <h6>⚠️ Borderline Case</h6>
                        <p>PTA between 20-30 dB HL requires ENT evaluation for final eligibility determination based on French audiological standards.</p>
                    </div>
                )}

                <div className="analysis-criteria">
                    <h6>Eligibility Criteria (French Standards)</h6>
                    <ul className="criteria-list">
                        <li>PTA &gt; 30 dB HL: Eligible for hearing aid with reimbursement</li>
                        <li>PTA 20-30 dB HL: Borderline - requires ENT evaluation</li>
                        <li>PTA &lt; 20 dB HL: Not eligible - normal hearing</li>
                    </ul>
                </div>
            </div>
        );
    };

    const renderOcclusionRiskAnalysis = () => {
        if (!patientWithTestData || !patientWithTestData.actions) {
            return (
                <div className="analysis-content">
                    <div className="no-data-message">
                        <p>No audiological data available for occlusion risk assessment.</p>
                    </div>
                </div>
            );
        }

        const analysis = checkOcclusionRisk(patientWithTestData);

        if (!analysis.dataSufficiency) {
            return (
                <div className="analysis-content">
                    <div className="analysis-error">
                        <h6>Data Insufficiency</h6>
                        <p>Insufficient low-frequency threshold data for occlusion risk assessment</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="analysis-content">
                <div className="analysis-recommendation">
                    <h6>Occlusion Effect Risk Assessment</h6>
                    <div className={`occlusion-alert ${analysis.requiresManagement ? 'management-required' : 'standard'}`}>
                        {analysis.requiresManagement ? 'SPECIAL MANAGEMENT REQUIRED' : 'STANDARD FITTING APPROPRIATE'}
                    </div>
                </div>

                <div className="analysis-details">
                    <h6>Ear-Specific Risk Levels</h6>
                    <div className="occlusion-details">
                        {['left', 'right'].map(ear => {
                            const earData = analysis.occlusionAssessment[ear];
                            return (
                                <div key={ear} className="ear-occlusion-item">
                                    <strong>{ear.charAt(0).toUpperCase() + ear.slice(1)} Ear:</strong>
                                    {earData.error ? (
                                        <span className="no-data">{earData.error}</span>
                                    ) : (
                                        <div className="occlusion-info">
                                            <span className={`risk-badge ${earData.riskLevel.toLowerCase()}`}>
                                                {earData.riskLevel} RISK
                                            </span>
                                            <span className="avg-threshold">
                                                Avg Low-Freq: {earData.avgLowFreqThreshold} dB HL
                                            </span>
                                            <div className="management-note">
                                                {earData.managementRecommendation}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="analysis-rationale">
                    <h6>Clinical Guidance</h6>
                    <p className="rationale-text">
                        Occlusion effect occurs when low-frequency sounds are trapped in the ear canal by hearing aid.
                        Risk increases with better low-frequency hearing (≤25 dB HL at 250-500 Hz).
                    </p>
                </div>

                <div className="analysis-criteria">
                    <h6>Risk Classification</h6>
                    <ul className="criteria-list">
                        <li><strong>HIGH RISK (≤15 dB HL):</strong> Open-fit or large vent (≥3mm) required to prevent occlusion complaints</li>
                        <li><strong>MODERATE RISK (16-25 dB HL):</strong> Consider moderate vent (2-3mm) for comfort</li>
                        <li><strong>LOW RISK (&gt;25 dB HL):</strong> Standard fitting approaches appropriate</li>
                    </ul>
                </div>
            </div>
        );
    };

    const renderPowerLevelAnalysis = () => {
        if (!patientWithTestData || !patientWithTestData.actions) {
            return (
                <div className="analysis-content">
                    <div className="no-data-message">
                        <p>No audiological data available for power level determination.</p>
                    </div>
                </div>
            );
        }

        const ptaAnalysis = calculatePTAForDegree(patientWithTestData);
        const analysis = determinePowerLevel(ptaAnalysis);

        if (!analysis.dataSufficiency) {
            return (
                <div className="analysis-content">
                    <div className="analysis-error">
                        <h6>Data Insufficiency</h6>
                        <p>{analysis.error}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="analysis-content">
                <div className="analysis-recommendation">
                    <h6>Required Power Level</h6>
                    <div className={`power-level-result ${analysis.powerLevel.toLowerCase().replace('_', '-')}`}>
                        {analysis.powerLevel.replace('_', ' ')}
                    </div>
                    <div className="gain-requirement">
                        <strong>Gain Requirement:</strong> {analysis.gainRangeDB}
                    </div>
                </div>

                <div className="analysis-details">
                    <h6>Reference Data</h6>
                    <div className="power-details">
                        <div className="detail-item">
                            <strong>PTA:</strong> {analysis.ptaReference} dB HL
                        </div>
                        <div className="detail-item">
                            <strong>Better Ear:</strong> {analysis.betterEarUsed}
                        </div>
                        <div className="detail-item">
                            <strong>Loss Degree:</strong> {analysis.hearingLossDegree}
                        </div>
                    </div>
                </div>

                <div className="analysis-styles">
                    <h6>Suitable Hearing Aid Styles</h6>
                    <div className="styles-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                        {analysis.suitableStyles.map((style, index) => (
                            <span key={index} className="style-badge" style={{
                                padding: '6px 12px',
                                backgroundColor: '#e3f2fd',
                                border: '1px solid #2196f3',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}>{style}</span>
                        ))}
                    </div>
                    {analysis.styleLimitations && (
                        <div className="style-limitations">
                            <strong>⚠️ Limitations:</strong> {analysis.styleLimitations}
                        </div>
                    )}
                </div>

                {analysis.specialFeatures && (
                    <div className="special-features">
                        <h6>Recommended Special Features</h6>
                        <ul className="features-list">
                            {analysis.specialFeatures.map((feature, index) => (
                                <li key={index}>{feature}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="analysis-criteria">
                    <h6>Power Classification Standards</h6>
                    <ul className="criteria-list">
                        <li><strong>STANDARD (PTA &lt;30 dB):</strong> Basic amplification, all styles suitable</li>
                        <li><strong>HIGH POWER (PTA 30-69 dB):</strong> Moderate-severe loss, ITE/RIC/BTE recommended</li>
                        <li><strong>SUPER POWER (PTA ≥70 dB):</strong> Severe-profound loss, BTE required for adequate gain</li>
                    </ul>
                </div>
            </div>
        );
    };

    // ============================================================================
    // COMPONENT RENDERING
    // ============================================================================

    // Commentary Panel Component
    const CommentaryPanel = () => {
        return (
            <div className={`commentary-panel ${isCommentaryExpanded ? 'expanded' : ''}`}>
                <div className="commentary-header">
                    <h4><FaComments /> Notes & Commentary</h4>
                    <button
                        className="expand-panel-btn"
                        onClick={() => setIsCommentaryExpanded(!isCommentaryExpanded)}
                        title={isCommentaryExpanded ? "Collapse" : "Expand"}
                    >
                        {isCommentaryExpanded ? '−' : '+'}
                    </button>
                </div>

                <div className="commentary-content">
                    <div className="current-commentary">
                        <label>Notes for this question:</label>
                        <textarea
                            placeholder="Add your notes here... (will be saved automatically when you proceed)"
                            rows={isCommentaryExpanded ? 8 : 4}
                            className="commentary-textarea"
                        />
                    </div>

                    {commentaryHistory.length > 0 && (
                        <div className="commentary-history">
                            <h5>Previous Notes ({commentaryHistory.length}):</h5>
                            <div className="commentary-list">
                                {commentaryHistory.slice(isCommentaryExpanded ? 0 : -3).map((entry, index) => {
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

    const ClinicalAnalysisPanel = () => {
        if (!shouldShowClinicalAnalysis()) {
            return null;
        }

        return (
            <div className={`clinical-analysis-panel ${isClinicalAnalysisExpanded ? 'expanded' : ''}`}>
                <div className="analysis-header">
                    <h4>Clinical Data Analysis</h4>
                    <button
                        className="expand-panel-btn"
                        onClick={() => setIsClinicalAnalysisExpanded(!isClinicalAnalysisExpanded)}
                        title={isClinicalAnalysisExpanded ? "Collapse" : "Expand"}
                    >
                        {isClinicalAnalysisExpanded ? '−' : '+'}
                    </button>
                </div>
                {renderClinicalAnalysisContent()}
            </div>
        );
    };

    return (
        <div className="journey-box">
            <h3>Hearing Assessment</h3>
            <p className="subtitle">
                {assessmentData ? "Detailed hearing assessment results and analysis" : "Interactive hearing assessment questionnaire"}
            </p>

            {patientDataLoading && (
                <div className="patient-data-loading">
                    <p>Loading patient test data for assessment...</p>
                </div>
            )}

            {patientDataError && (
                <div className="patient-data-error">
                    <p>Warning: Could not load patient test data - {patientDataError}</p>
                </div>
            )}

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
                                <ClinicalAnalysisPanel />
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
                                disabled={assessmentLoading || patientDataLoading}
                            >
                                {assessmentLoading || patientDataLoading ? "Starting Assessment..." : "Start Assessment"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HearingAssessmentTab;