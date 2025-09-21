import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import '../styles/Alert.css';

const Alert = ({
    type = 'info',
    message,
    title,
    onClose,
    className = '',
    showIcon = true,
    closable = false
}) => {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return <FaCheckCircle className="alert-icon" />;
            case 'error':
                return <FaExclamationTriangle className="alert-icon" />;
            case 'warning':
                return <FaExclamationTriangle className="alert-icon" />;
            case 'info':
            default:
                return <FaInfoCircle className="alert-icon" />;
        }
    };

    return (
        <div className={`custom-alert custom-alert-${type} ${className}`}>
            <div className="custom-alert-content">
                {showIcon && (
                    <div className="custom-alert-icon-wrapper">
                        {getIcon()}
                    </div>
                )}
                <div className="custom-alert-message-wrapper">
                    {title && <div className="custom-alert-title">{title}</div>}
                    <div className="custom-alert-message">{message}</div>
                </div>
                {closable && onClose && (
                    <button
                        className="custom-alert-close-btn"
                        onClick={onClose}
                        aria-label="Close alert"
                    >
                        <FaTimes />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Alert;