import React from 'react';

// This component is for the small chart previews in the dashboard
export const Chart = ({ id, title, data, onClick }) => (
    <div className="chart-container" onClick={() => onClick({ id, title, data })}>
        <h3>{title}</h3>
        <div className="chart-preview">
            {data && data.type && (
                <div className="chart-info">
                    <p><strong>Type:</strong> {data.type}</p>
                    <p><strong>Created:</strong> {new Date(data.timestamp).toLocaleDateString()}</p>
                    {data.description && <p><strong>Description:</strong> {data.description}</p>}
                </div>
            )}
            <div className="chart-visualization">
                {/* This would be replaced with actual chart rendering */}
                <div className="chart-placeholder">
                    Chart Visualization
                    {data && Object.keys(data).length > 0 && (
                        <div style={{fontSize: '12px', marginTop: '10px'}}>
                            Data points: {Object.keys(data).length}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

// This component is for the enlarged chart modal
export const ChartModal = ({ chart, onClose }) => {
    if (!chart) return null;

    return (
        <div className="chart-modal-overlay" onClick={onClose}>
            <div className="chart-modal-content" onClick={e => e.stopPropagation()}>
                <button className="chart-modal-close-btn" onClick={onClose}>&times;</button>
                <h2>{chart.title}</h2>
                <div className="chart-modal-details">
                    {chart.data && (
                        <>
                            <div className="chart-metadata">
                                <p><strong>Chart ID:</strong> {chart.id}</p>
                                <p><strong>Type:</strong> {chart.data.type || 'N/A'}</p>
                                <p><strong>Created:</strong> {new Date(chart.data.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="chart-data-preview">
                                <h4>Data Preview:</h4>
                                <pre>{JSON.stringify(chart.data, null, 2)}</pre>
                            </div>
                        </>
                    )}
                    <div className="full-chart-visualization">
                        Full chart visualization would be displayed here
                    </div>
                </div>
            </div>
        </div>
    );
};