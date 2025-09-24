import React, { useState } from "react";
import { FaFilter, FaTimes } from "react-icons/fa";

const HearingAidRecommendationsTab = ({
    assessmentData,
    hearingAidRecommendations,
    recommendationsLoading
}) => {
    // State for filters popup
    const [showFiltersPopup, setShowFiltersPopup] = useState(false);
    const [filtersData, setFiltersData] = useState(null);

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

    // Check if we have assessment data with filters to show the View Filters button
    const hasFiltersData = assessmentData && assessmentData.answers &&
        assessmentData.answers.some(answer => answer.databaseFilters && answer.databaseFilters !== null);

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
                                            <th>Filters</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtersData.map((item, index) => (
                                            <tr key={index}>
                                                <td className="question-cell">
                                                    <div className="question-text">{item.questionText}</div>
                                                </td>
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

    return (
        <>
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

            {/* Filters Popup */}
            <FiltersPopup />
        </>
    );
};

export default HearingAidRecommendationsTab;