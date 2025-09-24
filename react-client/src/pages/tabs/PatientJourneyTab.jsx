import React from "react";

const PatientJourneyTab = ({ assessmentData }) => {
    const steps = [
        {
            title: "Hearing Assessment",
            date: assessmentData ? new Date(assessmentData.completedDate || assessmentData.date).toLocaleDateString() : null,
            status: assessmentData ? "completed" : "pending"
        },
        {
            title: "First Appointment",
            date: null, // No date since it's pending
            status: "pending" // Changed from "completed" to "pending"
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
                                        : `Scheduled for: ${step.date}`
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
};

export default PatientJourneyTab;