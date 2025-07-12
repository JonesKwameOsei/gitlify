// langVizModule.js
import languageService from './languageService.js';

export default {
	renderLanguageCharts(langStats) {
		this._renderPieChart(langStats);
		this._renderTimelineChart(langStats);
	},

	_renderPieChart(langStats) {
		// Add guard clause
		if (!langStats || langStats.length === 0) {
			console.warn("No language data available for pie chart");
			return;
		}

		const ctx = document.getElementById('lang-pie-chart');
		if (!ctx) {
			console.error("Canvas element 'lang-pie-chart' not found");
			return;
		}

		// Destroy previous chart if exists
		if (this.pieChart) this.pieChart.destroy();

		this.pieChart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: langStats.map((lang) => lang.name),
				datasets: [
					{
						data: langStats.map((lang) => lang.count),
						backgroundColor: langStats.map((lang) =>
							languageService.getLanguageBackgroundColor(lang.name)
						),
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false, // Add this
				plugins: {
					legend: {
						position: 'right',
						labels: {
							font: {
								size: 12,
							},
						},
					},
					tooltip: {
						callbacks: {
							label: (ctx) => {
								const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
								const percentage = ((ctx.raw / total) * 100).toFixed(1);
								return `${ctx.label}: ${ctx.raw} repos (${percentage}%)`;
							},
						},
					},
				},
			},
		});
	},

	_renderTimelineChart(langStats) {
		// Implementation for language evolution over time
	},

	renderTimelineChart(timelineData) {
		// Add guard clause
		if (!timelineData || Object.keys(timelineData).length === 0) {
			console.warn("No timeline data available for chart");
			return;
		}

		const ctx = document.getElementById('lang-timeline-chart');
		if (!ctx) {
			console.error("Canvas element 'lang-timeline-chart' not found");
			return;
		}

		// Destroy previous chart if exists
		if (this.timelineChart) {
			this.timelineChart.destroy();
		}

		const years = Object.keys(timelineData).sort();
		const allLanguages = new Set();

		// Collect all languages from all years
		years.forEach((year) => {
			Object.keys(timelineData[year]).forEach((lang) => {
				allLanguages.add(lang);
			});
		});

		// Prepare datasets
		const datasets = Array.from(allLanguages).map((lang) => {
			return {
				label: lang,
				data: years.map((year) => timelineData[year][lang] || 0),
				backgroundColor: languageService.getLanguageBackgroundColor(lang),
				borderWidth: 1,
			};
		});

		// Create chart and store instance
		this.timelineChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: years,
				datasets: datasets,
			},
			options: {
				responsive: true,
				scales: {
					x: { stacked: true },
					y: { stacked: true },
				},
				plugins: {
					title: {
						display: true,
						text: 'Language Adoption Over Time',
					},
				},
			},
		});

		return this.timelineChart;
	},

	// Analyze language distribution from repositories
	_analyzeLanguages(repos) {
		const langMap = {};
		const languageBytes = {};
		const totalRepos = repos.length;
		
		// Count repositories by language
		repos.forEach(repo => {
			// Use pre-normalized language if available, otherwise normalize
			const lang = repo.normalizedLanguage || 
						 (repo.language ? languageService.normalizeLanguage(repo.language) : 'Other');
			
			langMap[lang] = (langMap[lang] || 0) + 1;
			languageBytes[lang] = (languageBytes[lang] || 0) + (repo.size || 0);
		});
		
		// Convert to array format and calculate percentages
		const allLanguages = Object.entries(langMap)
			.map(([name, count]) => ({
				name,
				count,
				bytes: languageBytes[name] || 0,
				percentage: Math.round((count / totalRepos) * 100)
			}))
			.sort((a, b) => b.count - a.count);

		return { allLanguages, languageCounts: langMap, languageBytes };
	},

	// Update renderLanguageCharts to include timeline
	async renderLanguageCharts(username, repos) {
		// Add guard clause for main function
		if (!repos || repos.length === 0) {
			console.warn("No repositories data available for language analysis");
			return;
		}

		const langStats = this._analyzeLanguages(repos);
		this._renderPieChart(langStats.allLanguages);

		// Simple timeline based on repository creation dates
		const timelineData = this._analyzeLanguageTrends(repos);
		this.renderTimelineChart(timelineData);
	},

	// Analyze language trends over time
	_analyzeLanguageTrends(repos) {
		const yearData = {};

		repos.forEach((repo) => {
			if ((repo.language || repo.normalizedLanguage) && repo.created_at) {
				const year = new Date(repo.created_at).getFullYear();
				const normalizedLang = repo.normalizedLanguage || 
									   languageService.normalizeLanguage(repo.language) || 
									   'Other';

				if (!yearData[year]) {
					yearData[year] = {};
				}
				yearData[year][normalizedLang] =
					(yearData[year][normalizedLang] || 0) + 1;
			}
		});

		return yearData;
	},
};
