import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowLeft,
    FaUpload,
    FaFileUpload,
    FaDownload,
    FaCheckCircle,
    FaExclamationTriangle,
    FaSpinner,
    FaTimes,
    FaCheck,
    FaExclamationCircle,
    FaInfoCircle,
} from "react-icons/fa";
import Alert from "../pages/Alert"; // Import the custom Alert component
import "../styles/DataImport.css";

// Alert Banner Component
const AlertBanner = ({ type, message, onClose, isVisible }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 6000); // Longer auto dismiss for complex messages
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <FaCheck className="alert-banner-icon success" />;
            case 'error':
                return <FaExclamationCircle className="alert-banner-icon error" />;
            case 'warning':
                return <FaExclamationTriangle className="alert-banner-icon warning" />;
            case 'info':
                return <FaInfoCircle className="alert-banner-icon info" />;
            default:
                return <FaExclamationTriangle className="alert-banner-icon" />;
        }
    };

    return (
        <div className={`alert-banner alert-${type}`}>
            <div className="alert-banner-content">
                <div className="alert-banner-icon-container">
                    {getIcon()}
                </div>
                <div className="alert-banner-message">
                    <span>{message}</span>
                </div>
                <button onClick={onClose} className="alert-banner-close">
                    <FaTimes />
                </button>
            </div>
        </div>
    );
};

// Import Results Component
const ImportResults = ({ results, onNewUpload }) => {
    if (!results) return null;

    // Ensure we have the right property names
    const totalProcessed = (results.newPatients || 0) + (results.updatedPatients || 0);
    const hasFailures = (results.failedRecords || 0) > 0;
    const hasSuccesses = totalProcessed > 0;

    console.log('ImportResults - results:', results); // Debug log
    console.log('ImportResults - hasFailures:', hasFailures, 'failedRecords:', results.failedRecords); // Debug log

    return (
        <div className="import-results-section">
            <h3>Import Results</h3>
            <div className="import-results-grid">
                <div className="import-result-card success">
                    <div className="result-icon">
                        <FaCheckCircle />
                    </div>
                    <div className="result-content">
                        <div className="result-number">{totalProcessed}</div>
                        <div className="result-label">Successfully Processed</div>
                        <div className="result-breakdown">
                            {results.newPatients || 0} new • {results.updatedPatients || 0} updated
                        </div>
                    </div>
                </div>

                {hasFailures && (
                    <div className="import-result-card error">
                        <div className="result-icon">
                            <FaExclamationCircle />
                        </div>
                        <div className="result-content">
                            <div className="result-number">{results.failedRecords || 0}</div>
                            <div className="result-label">Failed Records</div>
                            <div className="result-breakdown">
                                Data validation or processing errors
                            </div>
                        </div>
                    </div>
                )}

                <div className="import-result-card info">
                    <div className="result-icon">
                        <FaInfoCircle />
                    </div>
                    <div className="result-content">
                        <div className="result-number">{results.totalRecords || 0}</div>
                        <div className="result-label">Total Records</div>
                        <div className="result-breakdown">
                            Processed in {results.processingTime || results.processingTimeMs || 0}ms
                        </div>
                    </div>
                </div>
            </div>

            {hasFailures && (
                <div className="import-failure-guidance">
                    <div className="failure-guidance-header">
                        <FaExclamationTriangle className="warning-icon" />
                        <h4>Action Required - Import Failures Detected</h4>
                    </div>
                    <div className="failure-guidance-content">
                        <p>
                            {hasSuccesses
                                ? `${results.failedRecords} patient records could not be imported due to data issues. The ${totalProcessed} successful records have been saved.`
                                : `All ${results.failedRecords} patient records failed to import due to data issues.`
                            }
                        </p>
                        <div className="failure-steps">
                            <h5>To resolve the failed imports:</h5>
                            <ol>
                                <li>Check the server logs for specific error details about each failed patient</li>
                                <li>Verify that failed records have valid NOAHPatientGUID values (proper GUID format)</li>
                                <li>Ensure patient names (FirstName or LastName) are present and not empty</li>
                                <li>Validate date formats (use YYYY-MM-DD or MM/DD/YYYY format)</li>
                                <li>Check for invalid characters or malformed XML in patient data</li>
                                <li>Correct the data issues and upload the file again</li>
                            </ol>
                        </div>
                        <div className="failure-warning">
                            <strong>⚠️ Important:</strong> Please fix the data issues and re-upload the entire file to ensure all patient records are imported correctly.
                        </div>
                    </div>
                </div>
            )}

            <div className="import-results-actions">
                <button
                    className="import-upload-button"
                    onClick={onNewUpload}
                >
                    <FaUpload /> {hasFailures ? 'Fix Data & Re-upload' : 'Upload Another File'}
                </button>
            </div>
        </div>
    );
};

// Progress Overlay Component
const ProgressOverlay = ({ isVisible, progress = 0 }) => {
    if (!isVisible) return null;

    return (
        <div className="progress-overlay">
            <div className="progress-modal">
                <div className="progress-spinner-container">
                    <FaSpinner className="progress-spinner" />
                </div>
                <h3 className="progress-title">Importing Data...</h3>
                <p className="progress-description">Please wait while we process your XML file</p>

                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="progress-text">Processing... {Math.round(progress)}%</p>
            </div>
        </div>
    );
};

const DataImport = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(""); // 'uploading', 'success', 'partial', 'error', or ''
    const [uploadProgress, setUploadProgress] = useState(0);
    const [importResults, setImportResults] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);
    const [alertBanner, setAlertBanner] = useState({ visible: false, type: '', message: '' });
    const navigate = useNavigate();

    // Show alert banner
    const showAlert = (type, message) => {
        setAlertBanner({ visible: true, type, message });
    };

    // Hide alert banner
    const hideAlert = () => {
        setAlertBanner(prev => ({ ...prev, visible: false }));
    };

    // File validation function (same as before)
    const validateXmlFile = async (file) => {
        const errors = [];

        // Check file type
        if (!file.name.toLowerCase().endsWith('.xml')) {
            errors.push('File must be an XML file with .xml extension');
        }

        // Check file size (50MB limit)
        const maxSize = 50 * 1024 * 1024; // 50MB in bytes
        if (file.size > maxSize) {
            errors.push('File size must be less than 50MB');
        }

        // Basic XML structure validation
        try {
            const text = await file.text();

            // Check if it's valid XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const parseError = xmlDoc.getElementsByTagName("parsererror");

            if (parseError.length > 0) {
                errors.push('Invalid XML format - file contains syntax errors');
            } else {
                // Check for required patient structure - handle both flat and nested structures
                let patientElements = [];

                // Try different ways to find Patient elements
                const directPatients = xmlDoc.getElementsByTagName("Patient");
                const namespacedPatients = xmlDoc.querySelectorAll("[*|Patient]");
                const ptPatients = xmlDoc.getElementsByTagName("pt:Patient");

                // Combine all found patient elements
                patientElements = [...directPatients, ...namespacedPatients, ...ptPatients];

                if (patientElements.length === 0) {
                    errors.push('XML file must contain Patient elements with valid patient data');
                } else {
                    // Check for minimum required patient fields in actual patient data
                    let hasValidPatient = false;

                    for (let i = 0; i < patientElements.length; i++) {
                        const patient = patientElements[i];

                        // Look for required fields in current element and nested elements
                        const hasGUID = patient.getElementsByTagName("NOAHPatientGUID").length > 0 ||
                            patient.getElementsByTagName("pt:NOAHPatientGUID").length > 0 ||
                            patient.querySelector("[*|NOAHPatientGUID]");

                        const hasFirstName = patient.getElementsByTagName("FirstName").length > 0 ||
                            patient.getElementsByTagName("pt:FirstName").length > 0 ||
                            patient.querySelector("[*|FirstName]");

                        const hasLastName = patient.getElementsByTagName("LastName").length > 0 ||
                            patient.getElementsByTagName("pt:LastName").length > 0 ||
                            patient.querySelector("[*|LastName]");

                        // If this patient element has actual data (not just a wrapper)
                        if (hasGUID && (hasFirstName || hasLastName)) {
                            hasValidPatient = true;
                            break;
                        }

                        // Also check if this is a wrapper element with nested patient data
                        const nestedPatients = patient.getElementsByTagName("Patient");
                        const nestedPtPatients = patient.getElementsByTagName("pt:Patient");

                        for (let j = 0; j < nestedPatients.length; j++) {
                            const nested = nestedPatients[j];
                            const nestedGUID = nested.getElementsByTagName("NOAHPatientGUID").length > 0 ||
                                nested.getElementsByTagName("pt:NOAHPatientGUID").length > 0;
                            const nestedFirstName = nested.getElementsByTagName("FirstName").length > 0 ||
                                nested.getElementsByTagName("pt:FirstName").length > 0;
                            const nestedLastName = nested.getElementsByTagName("LastName").length > 0 ||
                                nested.getElementsByTagName("pt:LastName").length > 0;

                            if (nestedGUID && (nestedFirstName || nestedLastName)) {
                                hasValidPatient = true;
                                break;
                            }
                        }

                        for (let j = 0; j < nestedPtPatients.length; j++) {
                            const nested = nestedPtPatients[j];
                            const nestedGUID = nested.getElementsByTagName("NOAHPatientGUID").length > 0 ||
                                nested.getElementsByTagName("pt:NOAHPatientGUID").length > 0;
                            const nestedFirstName = nested.getElementsByTagName("FirstName").length > 0 ||
                                nested.getElementsByTagName("pt:FirstName").length > 0;
                            const nestedLastName = nested.getElementsByTagName("LastName").length > 0 ||
                                nested.getElementsByTagName("pt:LastName").length > 0;

                            if (nestedGUID && (nestedFirstName || nestedLastName)) {
                                hasValidPatient = true;
                                break;
                            }
                        }

                        if (hasValidPatient) break;
                    }

                    if (!hasValidPatient) {
                        errors.push('No valid patient records found. Each patient must have at least NOAHPatientGUID and either FirstName or LastName');
                    }
                }
            }
        } catch (error) {
            errors.push('Unable to read file content. Please ensure the file is not corrupted');
        }

        return errors;
    };

    const handleFileSelect = async (file) => {
        if (!file) return;

        // Reset all states when new file is selected
        setValidationErrors([]);
        setUploadStatus('');
        setImportResults(null);
        setUploadProgress(0);

        // Validate the file
        const errors = await validateXmlFile(file);

        if (errors.length > 0) {
            setValidationErrors(errors);
            setSelectedFile(null);
            showAlert('error', 'File validation failed. Please check the requirements.');
        } else {
            setSelectedFile(file);
            showAlert('success', `${file.name} selected and ready for import.`);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
        // Reset the input so same file can be selected again
        e.target.value = '';
    };

    // Simulate upload progress
    const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15 + 5; // Random progress between 5-20%
            if (progress > 95) progress = 95; // Cap at 95% until actual completion
            setUploadProgress(progress);
        }, 200);
        return interval;
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            showAlert('error', 'Please select a valid file first.');
            return;
        }

        setUploadStatus('uploading');
        setUploadProgress(0);

        // Start progress simulation
        const progressInterval = simulateProgress();

        try {
            const formData = new FormData();
            formData.append('xmlFile', selectedFile);

            console.log('Uploading file:', selectedFile.name);
            console.log('File size:', selectedFile.size, 'bytes');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/dataimport/upload`, {
                method: 'POST',
                body: formData,
            });

            // Clear progress interval and set to 100%
            clearInterval(progressInterval);
            setUploadProgress(100);

            const result = await response.json();
            console.log('Upload response:', result);

            // Ensure failedRecords is set to 0 if not provided
            if (result.failedRecords === undefined || result.failedRecords === null) {
                result.failedRecords = 0;
            }

            setImportResults(result);

            // Check for failures first - this is the key fix
            const hasFailures = (result.failedRecords || 0) > 0;
            const totalSuccessful = (result.newPatients || 0) + (result.updatedPatients || 0);

            if (response.ok) {
                // Success or partial success
                if (hasFailures) {
                    // There are failures
                    setUploadStatus('partial');
                    if (totalSuccessful > 0) {
                        // Partial success - some worked, some failed
                        showAlert('warning', `Import partially completed: ${totalSuccessful} successful, ${result.failedRecords} failed. Please review and fix the failed records.`);
                    } else {
                        // All failed
                        showAlert('error', `Import failed: All ${result.failedRecords} records had errors. Please check your data and try again.`);
                    }
                } else {
                    // Full success - no failures
                    setUploadStatus('success');
                    showAlert('success', `Data imported successfully! ${result.newPatients || 0} new patients added, ${result.updatedPatients || 0} updated.`);
                }
            } else {
                // Server returned error
                setUploadStatus('error');
                const errorMessage = result.message || 'Upload failed. Please try again.';
                showAlert('error', errorMessage);
            }
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Upload error:', error);
            setUploadStatus('error');
            showAlert('error', 'Network error occurred. Please check your connection.');
        }
    };

    const cancelFileSelection = () => {
        setSelectedFile(null);
        setUploadStatus('');
        setImportResults(null);
        setValidationErrors([]);
        setUploadProgress(0);
        showAlert('info', 'File selection cancelled.');
    };

    const resetForNewUpload = () => {
        setSelectedFile(null);
        setUploadStatus('');
        setImportResults(null);
        setValidationErrors([]);
        setUploadProgress(0);
    };

    const shouldShowUploadArea = !importResults || uploadStatus === 'error';

    return (
        <div className="data-import-page">
            {/* Progress Overlay */}
            <ProgressOverlay
                isVisible={uploadStatus === 'uploading'}
                progress={uploadProgress}
            />

            {/* Header */}
            <div className="import-page-header">
                <div className="import-header-content">
                    <h1>Data Import</h1>
                    <p>Import patient data from XML files</p>
                </div>
                <button className="import-back-button" onClick={() => navigate(-1)}>
                    <FaArrowLeft /> Back
                </button>
            </div>

            {/* Alert Banner - Positioned below header */}
            <AlertBanner
                type={alertBanner.type}
                message={alertBanner.message}
                isVisible={alertBanner.visible}
                onClose={hideAlert}
            />

            {/* Main Content */}
            <div className="import-main-content">
                {/* Upload Section */}
                {shouldShowUploadArea && (
                    <div className="import-upload-section">
                        <div className="import-section-title">
                            <FaUpload className="import-title-icon" />
                            <h2>Upload XML File</h2>
                        </div>
                        <p className="import-section-subtitle">
                            Select an XML file containing patient data to import into the system
                        </p>

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <div className="import-validation-errors">
                                <Alert
                                    type="error"
                                    title="File Validation Failed"
                                    message={
                                        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                                            {validationErrors.map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                        </ul>
                                    }
                                />
                            </div>
                        )}

                        <div
                            className={`import-upload-area ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="import-upload-icon">
                                <FaFileUpload />
                            </div>
                            <h3>Choose XML file to upload</h3>
                            <p>Drag and drop your XML file here, or click to browse</p>

                            {/* File Input and Browse Button - Only show if no file selected */}
                            {!selectedFile && (
                                <>
                                    <input
                                        type="file"
                                        accept=".xml"
                                        onChange={handleFileInput}
                                        className="import-file-input"
                                        id="import-file-input"
                                        disabled={uploadStatus === 'uploading'}
                                    />
                                    <label
                                        htmlFor="import-file-input"
                                        className={`import-browse-button ${uploadStatus === 'uploading' ? 'disabled' : ''}`}
                                    >
                                        <FaUpload /> Browse Files
                                    </label>
                                </>
                            )}

                            {/* Selected File Info */}
                            {selectedFile && (
                                <div className="import-selected-file">
                                    <div className="selected-file-info">
                                        <div className="file-details">
                                            <p>Selected: <strong>{selectedFile.name}</strong></p>
                                            <p className="file-size">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <FaCheckCircle className="file-check-icon" />
                                    </div>

                                    <div className="import-action-buttons">
                                        {(uploadStatus !== 'success' && uploadStatus !== 'partial') && (
                                            <button
                                                className="import-upload-button"
                                                onClick={handleUpload}
                                                disabled={uploadStatus === 'uploading'}
                                            >
                                                <FaUpload /> Import Data
                                            </button>
                                        )}

                                        <button
                                            className="import-reset-button"
                                            onClick={cancelFileSelection}
                                            disabled={uploadStatus === 'uploading'}
                                        >
                                            <FaTimes /> Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Results Section */}
                {importResults && (uploadStatus === 'success' || uploadStatus === 'partial') && (
                    <div className="import-upload-section">
                        <ImportResults
                            results={importResults}
                            onNewUpload={resetForNewUpload}
                        />
                    </div>
                )}

                {/* Instructions Section */}
                <div className="import-instructions-section">
                    <h2>Import Instructions</h2>

                    <div className="import-instruction-steps">
                        <div className="import-step">
                            <div className="import-step-number">1</div>
                            <div className="import-step-content">
                                <h3>Prepare XML File</h3>
                                <p>Ensure your XML file follows the required schema with valid patient data</p>
                            </div>
                        </div>

                        <div className="import-step">
                            <div className="import-step-number">2</div>
                            <div className="import-step-content">
                                <h3>Upload File</h3>
                                <p>Select and upload your XML file - validation will occur automatically</p>
                            </div>
                        </div>

                        <div className="import-step">
                            <div className="import-step-number">3</div>
                            <div className="import-step-content">
                                <h3>Review Results</h3>
                                <p>Check import status and review the number of records processed</p>
                            </div>
                        </div>
                    </div>

                    {/* File Requirements */}
                    <div className="import-requirements-inline">
                        <h3>File Requirements</h3>
                        <div className="import-requirements-grid">
                            <div className="import-requirement-item">
                                <FaCheckCircle className="import-req-icon success" />
                                <span>XML format only (.xml extension)</span>
                            </div>
                            <div className="import-requirement-item">
                                <FaCheckCircle className="import-req-icon success" />
                                <span>Maximum file size: 50MB</span>
                            </div>
                            <div className="import-requirement-item">
                                <FaCheckCircle className="import-req-icon success" />
                                <span>UTF-8 encoding required</span>
                            </div>
                            <div className="import-requirement-item">
                                <FaCheckCircle className="import-req-icon success" />
                                <span>Must contain valid Patient elements</span>
                            </div>
                            <div className="import-requirement-item">
                                <FaCheckCircle className="import-req-icon success" />
                                <span>NOAHPatientGUID and patient name required</span>
                            </div>
                            <div className="import-requirement-item warning">
                                <FaExclamationTriangle className="import-req-icon warning" />
                                <span>Existing patient records will be updated with new data</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataImport;