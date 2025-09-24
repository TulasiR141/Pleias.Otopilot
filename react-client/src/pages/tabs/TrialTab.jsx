import React from "react";

const TrialTab = () => {
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
};

export default TrialTab;