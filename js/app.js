// Event handling with proper DOM readiness checks
import apiService from './components/apiService.js';
import RepoDashboard from './components/repoDashboard.js';
import ComparisonModule from './components/comparisonModule.js';
import LangVizModule from './components/langVizModule.js';
import languageService from './components/languageService.js';

// Global state
let currentRepos = [];
let allRepos = [];
let currentSort = 'stargazers_count';
let currentUsername = '';

// Initialize application after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	init();
	setupGlobalEventDelegation();
	setupLandingPageInteractions();
});

function init() {
	// Safely set up search form if it exists
	const searchForm = document.getElementById('search-form');
	if (searchForm) {
		searchForm.addEventListener('submit', handleSearchSubmit);
	} else {
		console.warn('Search form not found');
	}

	// Safely set up comparison button if it exists
	const compareBtn = document.getElementById('compare-btn');
	if (compareBtn) {
		compareBtn.addEventListener('click', () => {
			ComparisonModule.init();
		});
	}

	// Navigation buttons will be set up dynamically in setupDashboardEvents()
}

function setupGlobalEventDelegation() {
	// Event delegation for dynamically created elements
	document.addEventListener('click', async (e) => {
		// Language visualization toggle
		if (e.target.id === 'show-lang-chart') {
			const vizContainer = document.getElementById('lang-viz');
			if (vizContainer) {
				vizContainer.classList.remove('hidden');
				
				// Use cached data instead of re-fetching
				if (currentUsername && allRepos.length > 0) {
					LangVizModule.renderLanguageCharts(currentUsername, allRepos);
				}
			}
		}

		// Retry button in error state
		if (e.target.id === 'retry-button') {
			const username = document.getElementById('search-input')?.value.trim();
			if (username) {
				// Show loading state
				document.getElementById('app').innerHTML = `
					<div class="loading-state">
						<div class="spinner"></div>
						<p>Loading GitHub data for ${username}...</p>
					</div>
				`;
				
				try {
					allRepos = await apiService.getAllRepos(username);
					currentRepos = allRepos;
					const dashboardContent = await RepoDashboard.render(username);
					document.getElementById('app').innerHTML = `
						<nav class="dashboard-nav">
							<div class="nav-brand">
								<svg class="github-icon" viewBox="0 0 24 24" width="24" height="24">
									<path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
								</svg>
								<span>Gitlify</span>
							</div>
							<div class="nav-actions">
								<button id="new-search-btn" class="nav-btn">New Search</button>
								<button id="compare-btn" class="nav-btn">Compare Users</button>
							</div>
						</nav>
						${dashboardContent}
					`;
					setupDashboardEvents();
				} catch (error) {
					document.getElementById('app').innerHTML = `
						<div class="error-state">
							<h2>⚠️ Failed to Load Data</h2>
							<p>${error.message || 'Error loading GitHub data'}</p>
							<button id="retry-button">Try Again</button>
						</div>
					`;
				}
			}
		}

		// Close modal buttons
		if (e.target.classList.contains('close-modal')) {
			const modal = e.target.closest('.modal-overlay');
			if (modal) {
				document.body.removeChild(modal);
			}
		}

		// Show individual repo languages button
		if (e.target.closest('.show-languages')) {
			e.preventDefault();
			const repoCard = e.target.closest('.repo-card');
			const repoName = repoCard.dataset.repo;
			const repo = allRepos.find(r => r.name === repoName);
			if (repo) {
				showRepoLanguageModal(repo);
			}
		}
	});
}

async function handleSearchSubmit(e) {
	e.preventDefault();
	const usernameInput = document.getElementById('search-input');
	if (!usernameInput) return;

	const username = usernameInput.value.trim();
	if (!username) return;

	// Show loading button state
	const submitBtn = e.target.querySelector('.search-btn');
	const btnText = submitBtn.querySelector('.btn-text');
	const btnLoading = submitBtn.querySelector('.btn-loading');
	
	btnText.classList.add('hidden');
	btnLoading.classList.remove('hidden');
	submitBtn.disabled = true;

	try {
		currentUsername = username;
		allRepos = await apiService.getAllRepos(username);
		currentRepos = allRepos;
		
		// Hide landing page and show dashboard
		document.getElementById('landing-page').classList.add('hidden');
		document.getElementById('app').classList.remove('hidden');
		
		// Update body background for dashboard
		document.body.style.background = '#f8f9fa';
		
		const dashboardContent = await RepoDashboard.render(username);
		document.getElementById('app').innerHTML = `
			<nav class="dashboard-nav">
				<div class="nav-brand">
					<svg class="github-icon" viewBox="0 0 24 24" width="24" height="24">
						<path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					<span>Gitlify</span>
				</div>
				<div class="nav-actions">
					<button id="new-search-btn" class="nav-btn">New Search</button>
					<button id="compare-btn" class="nav-btn">Compare Users</button>
				</div>
			</nav>
			${dashboardContent}
		`;
		setupDashboardEvents();
	} catch (error) {
		console.error('Failed to load dashboard:', error);
		
		// Show error in dashboard area
		document.getElementById('landing-page').classList.add('hidden');
		document.getElementById('app').classList.remove('hidden');
		
		// Update body background for dashboard
		document.body.style.background = '#f8f9fa';
		document.getElementById('app').innerHTML = `
      <div class="error-state">
        <h2>⚠️ Failed to Load Data</h2>
        <p>${error.message || 'Error loading GitHub data'}</p>
        <button id="retry-button">Try Again</button>
      </div>
    `;
	} finally {
		// Reset button state
		btnText.classList.remove('hidden');
		btnLoading.classList.add('hidden');
		submitBtn.disabled = false;
	}
}

// Setup dashboard controls after rendering
function setupDashboardEvents() {
	// Navigation buttons
	const newSearchBtn = document.getElementById('new-search-btn');
	if (newSearchBtn) {
		newSearchBtn.addEventListener('click', () => {
			showLandingPage();
		});
	}
	
	const compareBtn = document.getElementById('compare-btn');
	if (compareBtn) {
		compareBtn.addEventListener('click', () => {
			ComparisonModule.init();
		});
	}

	// Sort control
	const sortControl = document.getElementById('sort-control');
	if (sortControl) {
		sortControl.addEventListener('change', (e) => {
			currentSort = e.target.value;
			const sorted = RepoDashboard.sortRepositories(currentRepos, currentSort);
			renderRepoGrid(sorted);
		});
	}

	// Filter controls
	const filterIds = ['language-filter', 'license-filter', 'fork-filter'];
	filterIds.forEach((id) => {
		const filter = document.getElementById(id);
		if (filter) {
			filter.addEventListener('change', applyFilters);
		}
	});

	// Setup repo card language indicators
	setupRepoCardEffects();

	// Setup heatmap tooltips
	setupHeatmapTooltips();
}

function applyFilters() {
	const filters = {
		language: document.getElementById('language-filter')?.value || '',
		license: document.getElementById('license-filter')?.value || '',
		forks: document.getElementById('fork-filter')?.value || 'all',
	};

	const filtered = RepoDashboard.filterRepositories(allRepos, filters);
	currentRepos = filtered;
	const sorted = RepoDashboard.sortRepositories(filtered, currentSort);
	renderRepoGrid(sorted);
}

function renderRepoGrid(repos) {
	const grid = document.querySelector('.repo-grid');
	if (grid) {
		grid.innerHTML = repos.map(RepoDashboard._repoCard).join('');
		setupRepoCardEffects(); // Re-setup effects after re-rendering
	}
}

// Setup repo card hover effects and language button clicks
function setupRepoCardEffects() {
	// Set CSS custom properties for language colors
	document.querySelectorAll('.repo-card').forEach(card => {
		const langColor = card.dataset.langColor;
		if (langColor) {
			card.style.setProperty('--lang-color', langColor);
		}
	});
}

// Show language breakdown modal for individual repository
async function showRepoLanguageModal(repo) {
	try {
		// Fetch detailed language data for this specific repository
		const response = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/languages`);
		
		if (!response.ok) {
			throw new Error('Failed to fetch repository languages');
		}
		
		const languages = await response.json();
		const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
		
		// Convert to percentages and get colors
		const languageData = Object.entries(languages)
			.map(([name, bytes]) => ({
				name: languageService.normalizeLanguage(name),
				bytes,
				percentage: ((bytes / totalBytes) * 100).toFixed(1),
				color: languageService.getLanguageBackgroundColor(languageService.normalizeLanguage(name))
			}))
			.sort((a, b) => b.bytes - a.bytes);

		// Create modal
		const modal = document.createElement('div');
		modal.className = 'modal-overlay';
		modal.innerHTML = `
			<div class="modal-content">
				<div class="modal-header">
					<h3>📊 ${repo.name} - Language Breakdown</h3>
					<button class="close-modal" aria-label="Close modal">&times;</button>
				</div>
				<div class="modal-body">
					<div class="language-breakdown">
						${languageData.map(lang => `
							<div class="language-item">
								<div class="language-bar">
									<div class="language-fill" 
										 style="width: ${lang.percentage}%; background-color: ${lang.color};">
									</div>
								</div>
								<div class="language-info">
									<span class="language-name">${lang.name}</span>
									<span class="language-percentage">${lang.percentage}%</span>
								</div>
							</div>
						`).join('')}
					</div>
					<div class="repo-link">
						<a href="${repo.html_url}" target="_blank" rel="noopener">
							🔗 View on GitHub
						</a>
					</div>
				</div>
			</div>
		`;

		document.body.appendChild(modal);
	} catch (error) {
		console.error('Error fetching repository languages:', error);
		
		// Show error modal
		const errorModal = document.createElement('div');
		errorModal.className = 'modal-overlay';
		errorModal.innerHTML = `
			<div class="modal-content">
				<div class="modal-header">
					<h3>⚠️ Error</h3>
					<button class="close-modal" aria-label="Close modal">&times;</button>
				</div>
				<div class="modal-body">
					<p>Failed to load language data for ${repo.name}</p>
					<small>${error.message}</small>
				</div>
			</div>
		`;
		document.body.appendChild(errorModal);
	}
}

// Landing page interactions
function setupLandingPageInteractions() {
	// Suggestion button clicks
	document.addEventListener('click', (e) => {
		if (e.target.classList.contains('suggestion-btn')) {
			const username = e.target.dataset.username;
			const searchInput = document.getElementById('search-input');
			if (searchInput && username) {
				searchInput.value = username;
				searchInput.focus();
			}
		}
		
		// Compare users button click
		if (e.target.id === 'compare-users-btn' || e.target.closest('#compare-users-btn')) {
			ComparisonModule.init();
		}
	});
}

// Show landing page function
function showLandingPage() {
	document.getElementById('landing-page').classList.remove('hidden');
	document.getElementById('app').classList.add('hidden');
	
	// Update body background for landing page
	document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
	
	// Clear the search input
	const searchInput = document.getElementById('search-input');
	if (searchInput) {
		searchInput.value = '';
		searchInput.focus();
	}
	
	// Reset global state
	currentUsername = '';
	allRepos = [];
	currentRepos = [];
}

// Heatmap tooltip setup
function setupHeatmapTooltips() {
	const heatmapContainer = document.querySelector('.heatmap-grid');
	if (!heatmapContainer) return;

	let tooltip = document.querySelector('.heatmap-tooltip');
	if (!tooltip) {
		tooltip = document.createElement('div');
		tooltip.className = 'heatmap-tooltip';
		document.body.appendChild(tooltip);
	}

	heatmapContainer.addEventListener('mousemove', (e) => {
		const day = e.target.closest('.heatmap-day');
		if (!day) {
			tooltip.style.display = 'none';
			return;
		}

		const date = day.dataset.date;
		const count = day.dataset.count;
		tooltip.innerHTML = `
      <div>${new Date(date).toLocaleDateString()}</div>
      <strong>${count} contribution${count != 1 ? 's' : ''}</strong>
    `;
		tooltip.style.display = 'block';
		tooltip.style.left = `${e.pageX + 10}px`;
		tooltip.style.top = `${e.pageY - 30}px`;
	});

	heatmapContainer.addEventListener('mouseleave', () => {
		tooltip.style.display = 'none';
	});
}
