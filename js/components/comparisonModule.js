// Module for language comparison
import apiService from './apiService.js';
import languageService from './languageService.js';

export default {
	init() {
		this.comparisonUsers = [];
		this.renderComparisonUI();
	},

	renderComparisonUI() {
		// Hide landing page and show app
		document.getElementById('landing-page').classList.add('hidden');
		document.getElementById('app').classList.remove('hidden');
		
		// Update body background for dashboard
		document.body.style.background = '#f8f9fa';

		const comparisonContainer = document.createElement('div');
		comparisonContainer.id = 'comparison-container';
		comparisonContainer.innerHTML = `
      <div class="comparison-header">
        <h2>👥 Language Comparison</h2>
        <div class="comparison-actions">
          <button id="add-user-btn" class="add-user-btn">+ Add User</button>
          <button id="back-to-landing" class="nav-btn">← Back to Home</button>
        </div>
      </div>
      
      <div class="user-selection">
        <div class="user-inputs">
          <!-- Will be populated dynamically -->
        </div>
      </div>
      
      <div class="comparison-charts">
        <canvas id="comparison-chart"></canvas>
      </div>
    `;

		document.getElementById('app').innerHTML = '';
		document.getElementById('app').appendChild(comparisonContainer);

		// Add event listeners
		document.getElementById('add-user-btn').addEventListener('click', () => {
			this.addUserInput();
		});

		document.getElementById('back-to-landing').addEventListener('click', () => {
			this.showLandingPage();
		});

		// Add initial user input
		this.addUserInput();
	},
	
	showLandingPage() {
		document.getElementById('landing-page').classList.remove('hidden');
		document.getElementById('app').classList.add('hidden');
		
		// Update body background for landing page
		document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
		
		// Clear the search input and focus
		const searchInput = document.getElementById('search-input');
		if (searchInput) {
			searchInput.value = '';
			searchInput.focus();
		}
	},

	addUserInput() {
		const index = this.comparisonUsers.length;
		const inputContainer = document.createElement('div');
		inputContainer.className = 'user-input';
		inputContainer.innerHTML = `
      <input type="text" class="username-input" 
             placeholder="GitHub username" 
             data-index="${index}">
      <button class="remove-user" data-index="${index}">&times;</button>
    `;

		document.querySelector('.user-inputs').appendChild(inputContainer);

		// Add event listeners
		inputContainer
			.querySelector('.username-input')
			.addEventListener('blur', (e) => {
				this.handleUserInput(e.target.value, index);
			});

		inputContainer
			.querySelector('.remove-user')
			.addEventListener('click', (e) => {
				const index = e.target.dataset.index;
				this.removeUser(index);
			});
	},

	async handleUserInput(username, index) {
		if (!username) return;

		try {
			// Show loading state
			const input = document.querySelector(
				`.username-input[data-index="${index}"]`
			);
			input.disabled = true;

			// Fetch user data
			const repos = await apiService.getAllRepos(username);
			const langStats = this._analyzeLanguages(repos);

			// Store user data
			this.comparisonUsers[index] = {
				username,
				langStats: langStats.allLanguages,
			};

			// Update comparison chart
			this.renderComparisonChart();
		} catch (error) {
			console.error(`Failed to load data for ${username}:`, error);
			alert(`Could not load data for ${username}: ${error.message}`);
		} finally {
			const input = document.querySelector(
				`.username-input[data-index="${index}"]`
			);
			if (input) input.disabled = false;
		}
	},

	removeUser(index) {
		this.comparisonUsers.splice(index, 1);

		// Re-render inputs
		document.querySelector('.user-inputs').innerHTML = '';
		this.comparisonUsers.forEach((user, idx) => {
			this.addUserInput();
			const input = document.querySelector(
				`.username-input[data-index="${idx}"]`
			);
			if (input) input.value = user.username;
		});

		// Add empty input if needed
		if (this.comparisonUsers.length === 0) {
			this.addUserInput();
		}

		// Update chart
		this.renderComparisonChart();
	},

	renderComparisonChart() {
		if (this.comparisonUsers.length === 0) {
			document.getElementById('comparison-chart').innerHTML = '';
			return;
		}

		// Get all unique languages across all users
		const allLanguages = new Set();
		this.comparisonUsers.forEach((user) => {
			user.langStats.forEach((lang) => {
				allLanguages.add(lang.name);
			});
		});

		// Prepare datasets
		const datasets = this.comparisonUsers.map((user) => {
			const data = Array.from(allLanguages).map((lang) => {
				const langStat = user.langStats.find((l) => l.name === lang);
				return langStat ? langStat.percentage : 0;
			});

			return {
				label: user.username,
				data,
				backgroundColor: this._getUserColor(user.username),
			};
		});

		// Create chart
		const ctx = document.getElementById('comparison-chart');
		if (this.comparisonChart) this.comparisonChart.destroy();

		this.comparisonChart = new Chart(ctx, {
			type: 'radar',
			data: {
				labels: Array.from(allLanguages),
				datasets,
			},
			options: {
				responsive: true,
				scales: {
					r: {
						min: 0,
						max: 100,
						ticks: {
							stepSize: 20,
							callback: (value) => value + '%',
						},
					},
				},
				plugins: {
					title: {
						display: true,
						text: 'Language Distribution Comparison',
					},
				},
			},
		});
	},

	_analyzeLanguages(repos) {
		const langMap = {};
		const totalRepos = repos.length;

		// Collect language data using normalizedLanguage
		repos.forEach((repo) => {
			const lang = languageService.normalizeLanguage(repo.language) || 'Other';
			langMap[lang] = (langMap[lang] || 0) + 1;
		});

		const languageStats = Object.entries(langMap)
			.map(([name, count]) => ({
				name,
				count,
				percentage: Math.round((count / totalRepos) * 100),
			}))
			.sort((a, b) => b.count - a.count);

		return {
			allLanguages: languageStats,
			topLanguages: languageStats.slice(0, 5),
			uniqueLanguages: [...new Set(languageStats.map((lang) => lang.name))],
		};
	},

	_getUserColor(username) {
		const colors = [
			'#FF6384',
			'#36A2EB',
			'#FFCE56',
			'#4BC0C0',
			'#9966FF',
			'#FF9F40',
			'#8AC926',
			'#1982C4',
		];
		const index = this.comparisonUsers.findIndex(
			(u) => u.username === username
		);
		return colors[index % colors.length];
	},
};
