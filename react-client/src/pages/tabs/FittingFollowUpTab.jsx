import React from "react";

const FittingFollowUpTab = () => {
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
};

export default FittingFollowUpTab;