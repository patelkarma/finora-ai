import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import './Chart.css';

const Chart = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return <div className="no-chart-data">No data to display. Add transactions to see insights!</div>;
  }

  try {
    const categoryTotals = transactions.reduce((acc, tx) => {
      if (tx && tx.category && typeof tx.amount === 'number') {
        acc[tx.category] = (acc[tx.category] || 0) + Math.abs(tx.amount);
      }
      return acc;
    }, {});

    const data = {
      labels: Object.keys(categoryTotals),
      datasets: [{
        label: 'Spending by Category',
        data: Object.values(categoryTotals),
        backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d'],
        borderRadius: 4,
      }],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: (context) => `₹${context.parsed.y.toFixed(2)}` } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (value) => `₹${value}` } },
      },
    };

    return (
      <div className="chart-container">
        <Bar data={data} options={options} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering chart:', error); // Log for debugging
    return <div className="no-chart-data">Error loading chart. Please try again.</div>;
  }
};

export default Chart;


