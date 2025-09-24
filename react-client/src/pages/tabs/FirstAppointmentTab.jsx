import React from "react";

const FirstAppointmentTab = () => {
    return (
        <div className="journey-box">
            <h3>First Appointment</h3>
            <p className="subtitle">Initial consultation and hearing aid selection</p>

            <div className="appointment-content">
                <div className="appointment-section">
                    <h4>Status: Pending</h4>
                    <p>Appointment will be scheduled after hearing assessment completion</p>
                </div>

                <div className="appointment-section">
                    <h4>What to Expect</h4>
                    <ul>
                        <li>Comprehensive review of hearing assessment results</li>
                        <li>Discussion of lifestyle and hearing needs</li>
                        <li>Explanation of different hearing aid options</li>
                        <li>Demonstration of hearing aid features and technology</li>
                        <li>Professional fitting and initial adjustments</li>
                    </ul>
                </div>

                <div className="appointment-section">
                    <h4>Appointment Duration</h4>
                    <p>Typically 60-90 minutes for comprehensive consultation and fitting.</p>
                </div>

                <div className="appointment-section">
                    <h4>What We'll Discuss</h4>
                    <ul>
                        <li>Your specific hearing challenges and goals</li>
                        <li>Hearing aid styles and technology levels</li>
                        <li>Connectivity features and smartphone integration</li>
                        <li>Maintenance and care instructions</li>
                        <li>Trial period options and next steps</li>
                    </ul>
                </div>

                <div className="appointment-section">
                    <h4>Preparation Tips</h4>
                    <p>Bring a list of situations where you experience hearing difficulties and any questions about hearing aid features or lifestyle integration.</p>
                </div>
            </div>
        </div>
    );
};

export default FirstAppointmentTab;