import React, { useState, useEffect } from 'react';
import Chatbot from './Chatbot';
import { Chart, ChartModal } from './Chart';
import ApiService from '../api';

const DashboardView = () => {
    const [charts, setCharts] = useState([]);
    const [selectedChart, setSelectedChart] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load saved charts on component mount
    useEffect(() => {
        loadSavedCharts();
    }, []);

    const loadSavedCharts = async () => {
        try {
            const dashboardData = await ApiService.getDashboardData();
            const savedCharts = dashboardData.map(item => ({
                id: item.id,
                title: item.chart_data.title || `Chart ${item.id}`,
                data: item.chart_data
            }));
            setCharts(savedCharts);
        } catch (error) {
            console.error('Failed to load saved charts:', error);
        } finally {
            setLoading(false);
        }
    };

    const addChart = async (newChart) => {
        try {
            // Save chart to backend
            const chartData = {
                title: newChart.title,
                type: 'analysis',
                data: newChart.data || {},
                timestamp: new Date().toISOString()
            };
            
            const response = await ApiService.createDashboardData(chartData);
            
            // Add to local state
            const savedChart = {
                id: response.id,
                title: newChart.title,
                data: chartData
            };
            
            setCharts(prev => [...prev, savedChart]);
        } catch (error) {
            console.error('Failed to save chart:', error);
        }
    };

    const handleChartClick = (chartData) => setSelectedChart(chartData);
    const handleCloseModal = () => setSelectedChart(null);

    if (loading) {
        return <div className="loading">Loading charts...</div>;
    }

    return (
        <>
            <ChartModal chart={selectedChart} onClose={handleCloseModal} />
            <div className="dashboard-view">
                <div className="dashboard-chatbot">
                    <Chatbot onNewChartRequest={addChart} isDashboard={true} />
                </div>
                <div className="charts-area">
                    {charts.map(chart => (
                        <Chart 
                            key={chart.id} 
                            id={chart.id} 
                            title={chart.title} 
                            data={chart.data}
                            onClick={handleChartClick} 
                        />
                    ))}
                    {charts.length === 0 && (
                        <div className="chart-placeholder" style={{gridColumn: "1 / -1", height: "100%"}}>
                            Your generated charts will appear here. Ask the chatbot to create a chart!
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default DashboardView;