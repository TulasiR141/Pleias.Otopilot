import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowLeft,
    FaUpload,
    FaFileUpload,
    FaDownload,
    FaCheckCircle,
    FaExclamationTriangle,
} from "react-icons/fa";
import "../styles/DataImport.css";

const DataImport = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(""); // 'success', 'error', or ''
    const [importResults, setImportResults] = useState(null);
    const navigate = useNavigate();

    const handleFileSelect = (file) => {
        if (file && file.name.endsWith('.xml')) {
            setSelectedFile(file);
            setUploadStatus('');
            setImportResults(null);
        } else {
            alert('Please select a valid XML file');
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
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('Please select a file first');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('xmlFile', selectedFile);
            console.log('Sending file:', selectedFile);
            console.log('FormData entries:', [...formData.entries()]);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/dataimport/upload`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                setImportResults(result);
                setUploadStatus('success');
            } else {
                const errorText = await response.text();
                console.error('Backend error:', errorText);
                setUploadStatus('error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus('error');
        }
    };

    return (
        <div className="data-import-page">
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

            {/* Main Content */}
            <div className="import-main-content">
                {/* Upload Section */}
                <div className="import-upload-section">
                    <div className="import-section-title">
                        <FaUpload className="import-title-icon" />
                        <h2>Upload XML File</h2>
                    </div>
                    <p className="import-section-subtitle">
                        Select an XML file containing patient data to import into the system
                    </p>

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

                        <input
                            type="file"
                            accept=".xml"
                            onChange={handleFileInput}
                            className="import-file-input"
                            id="import-file-input"
                        />
                        <label htmlFor="import-file-input" className="import-browse-button">
                            <FaUpload /> Browse Files
                        </label>

                        {selectedFile && (
                            <div className="import-selected-file">
                                <p>Selected: <strong>{selectedFile.name}</strong></p>
                                <button className="import-upload-button" onClick={handleUpload}>
                                    <FaUpload /> Import Data
                                </button>
                            </div>
                        )}
                    </div>

                    {uploadStatus === 'success' && (
                        <div className="import-status-message success">
                            <FaCheckCircle /> File uploaded successfully!
                        </div>
                    )}

                    {uploadStatus === 'error' && (
                        <div className="import-status-message error">
                            <FaExclamationTriangle /> Error uploading file. Please try again.
                        </div>
                    )}

                    {/* Results Section */}
                    {/*{importResults && (*/}
                    {/*    <div className='import-results'>*/}
                    {/*        <h3>Import Results</h3>*/}
                    {/*        <pre>{JSON.stringify(importResults, null, 2)}</pre>*/}
                    {/*    </div>*/}
                    {/*)}*/}
                </div>

                {/* Instructions Section */}
                <div className="import-instructions-section">
                    <h2>Import Instructions</h2>

                    <div className="import-instruction-steps">
                        <div className="import-step">
                            <div className="import-step-number">1</div>
                            <div className="import-step-content">
                                <h3>Prepare XML File</h3>
                                <p>Ensure your XML file follows the required schema</p>
                            </div>
                        </div>

                        <div className="import-step">
                            <div className="import-step-number">2</div>
                            <div className="import-step-content">
                                <h3>Upload File</h3>
                                <p>Select and upload your XML file</p>
                            </div>
                        </div>

                        <div className="import-step">
                            <div className="import-step-number">3</div>
                            <div className="import-step-content">
                                <h3>Review Results</h3>
                                <p>Check import status and resolve any issues</p>
                            </div>
                        </div>
                    </div>

                    {/* File Requirements */}
                    <div className="import-requirements-inline">
                        <h3>File Requirements</h3>
                        <div className="import-requirements-grid">
                            <div className="import-requirement-item">
                                <FaCheckCircle className="import-req-icon success" />
                                <span>XML format only</span>
                            </div>
                            <div className="import-requirement-item">
                                <FaCheckCircle className="import-req-icon success" />
                                <span>Maximum file size: 50MB</span>
                            </div>
                            <div className="import-requirement-item">
                                <FaCheckCircle className="import-req-icon success" />
                                <span>UTF-8 encoding required</span>
                            </div>
                            <div className="import-requirement-item warning">
                                <FaExclamationTriangle className="import-req-icon warning" />
                                <span>Duplicate records will be replaced with new data</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataImport;