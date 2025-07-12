// Activity Module
export default {
	renderChart(data) {
		const ctx = document.getElementById('contributions-chart');
		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: data.weeks,
				datasets: [
					{
						label: 'Contributions',
						data: data.counts,
						backgroundColor: 'rgba(56, 139, 253, 0.7)',
						borderColor: 'rgba(56, 139, 253, 1)',
						borderWidth: 1,
					},
				],
			},
			options: {
				responsive: true,
				scales: { y: { beginAtZero: true } },
			},
		});
	},
};
