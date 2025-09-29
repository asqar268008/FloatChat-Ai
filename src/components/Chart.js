import React from 'react';

export const Chart = ({ id, title, data, query, onDoubleClick }) => (
    <div className="chart-container" onDoubleClick={() => onDoubleClick({ id, title, data, query })}>
        <div className="chart-header">
            <h3>{title}</h3>
            {query && <div className="chart-query">Query: {query}</div>}
        </div>
        <div className="chart-preview">
            {data && data.data ? (
                <div className="chart-info">
                    <p><strong>Type:</strong> {data.type || 'Visualization'}</p>
                    {data.timestamp && (
                        <p><strong>Created:</strong> {new Date(data.timestamp).toLocaleDateString()}</p>
                    )}
                    <div className="chart-preview-visual">
                        <div className="preview-message">
                            Chart ready - Double click to view details
                        </div>
                    </div>
                </div>
            ) : (
                <div className="chart-error">
                    <p>No chart data available</p>
                </div>
            )}
        </div>
    </div>
);

export const ChartModal = ({ chart, onClose }) => {
    if (!chart) return null;

    return (
        <div className="chart-modal-overlay" onClick={onClose}>
            <div className="chart-modal-content" onClick={e => e.stopPropagation()}>
                <div className="chart-modal-header">
                    <h2>{chart.title}</h2>
                    <button className="chart-modal-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="chart-modal-body">
                    {chart.query && (
                        <div className="chart-query-section">
                            <h4>Original Query:</h4>
                            <p>{chart.query}</p>
                        </div>
                    )}
                    
                    <div className="chart-data-section">
                        <h4>Chart Data:</h4>
                        {chart.data && chart.data.data ? (
                            <div className="chart-visualization-area">
                                {/* This would be replaced with actual Plotly chart */}
                                <div className="full-chart-placeholder">
                                    <h4>Full Chart Visualization</h4>
                                    <p>This area would display the interactive chart</p>
                                    <div className="chart-stats">
                                        <p><strong>Data Points:</strong> {chart.data.data.length || 'N/A'}</p>
                                        <p><strong>Chart Type:</strong> {chart.data.type || 'Analysis'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="no-data-message">
                                No chart data available to display.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};