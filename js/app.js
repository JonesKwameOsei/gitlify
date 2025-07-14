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

// Search memory functionality with FIFO and pattern matching
const SearchMemory = {
	save(username) {
		if (username && username.trim()) {
			const trimmedUsername = username.trim();
			localStorage.setItem('gitlify_last_search', trimmedUsername);
			this.addToHistory(trimmedUsername);
		}
	},
	
	load() {
		return localStorage.getItem('gitlify_last_search') || '';
	},
	
	clear() {
		localStorage.removeItem('gitlify_last_search');
	},
	
	addToHistory(username) {
		let history = this.getHistory();
		
		// Remove if already exists to avoid duplicates (case-insensitive)
		history = history.filter(item => item.toLowerCase() !== username.toLowerCase());
		
		// Add to beginning (FIFO - newest first)
		history.unshift(username);
		
		// Keep only last 5 (FIFO - remove oldest)
		history = history.slice(0, 5);
		
		localStorage.setItem('gitlify_search_history', JSON.stringify(history));
	},
	
	getHistory() {
		try {
			return JSON.parse(localStorage.getItem('gitlify_search_history') || '[]');
		} catch {
			return [];
		}
	},
	
	// Get filtered history based on search pattern
	getFilteredHistory(pattern) {
		if (!pattern || pattern.trim() === '') {
			return this.getHistory(); // Return all if no pattern
		}
		
		const searchPattern = pattern.toLowerCase().trim();
		const history = this.getHistory();
		
		return history.filter(username => 
			username.toLowerCase().includes(searchPattern)
		);
	},
	
	clearHistory() {
		localStorage.removeItem('gitlify_search_history');
	},
	
	saveRepoSearch(searchTerm) {
		localStorage.setItem('gitlify_last_repo_search', searchTerm);
	},
	
	loadRepoSearch() {
		return localStorage.getItem('gitlify_last_repo_search') || '';
	},
	
	clearRepoSearch() {
		localStorage.removeItem('gitlify_last_repo_search');
	}
};

// Initialize application after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	init();
	setupGlobalEventDelegation();
	setupLandingPageInteractions();
	loadSavedSearch();
});

function loadSavedSearch() {
	const savedSearch = SearchMemory.load();
	const searchInput = document.getElementById('search-input');
	if (searchInput && savedSearch) {
		searchInput.value = savedSearch;
		searchInput.placeholder = `Last search: ${savedSearch}`;
	}
	
	// Setup search history dropdown
	setupSearchHistory();
}

function setupSearchHistory() {
	const historyToggle = document.getElementById('history-toggle');
	const historyDropdown = document.getElementById('search-history-dropdown');
	const clearHistoryBtn = document.getElementById('clear-history');
	const searchInput = document.getElementById('search-input');
	
	if (!historyToggle || !historyDropdown || !searchInput) return;
	
	// Show/hide history toggle based on history availability
	const history = SearchMemory.getHistory();
	if (history.length > 0) {
		historyToggle.classList.remove('hidden');
	}
	
	// Toggle dropdown
	historyToggle.addEventListener('click', (e) => {
		e.stopPropagation();
		historyDropdown.classList.toggle('hidden');
		if (!historyDropdown.classList.contains('hidden')) {
			populateSearchHistory(searchInput.value);
		}
	});
	
	// Show/hide dropdown based on input and filter history
	searchInput.addEventListener('input', (e) => {
		const inputValue = e.target.value.trim();
		const filteredHistory = SearchMemory.getFilteredHistory(inputValue);
		
		if (inputValue.length > 0 && filteredHistory.length > 0) {
			populateSearchHistory(inputValue);
			historyDropdown.classList.remove('hidden');
			selectedIndex = -1; // Reset selection when content changes
		} else {
			historyDropdown.classList.add('hidden');
			selectedIndex = -1;
		}
	});
	
	// Show dropdown on focus if there's history
	searchInput.addEventListener('focus', () => {
		const inputValue = searchInput.value.trim();
		const filteredHistory = SearchMemory.getFilteredHistory(inputValue);
		
		if (filteredHistory.length > 0) {
			populateSearchHistory(inputValue);
			historyDropdown.classList.remove('hidden');
		}
	});
	
	// Keyboard navigation for dropdown
	let selectedIndex = -1;
	searchInput.addEventListener('keydown', (e) => {
		const isDropdownVisible = !historyDropdown.classList.contains('hidden');
		const historyItems = historyDropdown.querySelectorAll('.history-item[data-username]');
		
		if (!isDropdownVisible || historyItems.length === 0) return;
		
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, historyItems.length - 1);
				updateHighlight(historyItems);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				updateHighlight(historyItems);
				break;
			case 'Enter':
				if (selectedIndex >= 0 && selectedIndex < historyItems.length) {
					e.preventDefault();
					const selectedItem = historyItems[selectedIndex];
					const username = selectedItem.dataset.username;
					searchInput.value = username;
					historyDropdown.classList.add('hidden');
					selectedIndex = -1;
				}
				break;
			case 'Escape':
				historyDropdown.classList.add('hidden');
				selectedIndex = -1;
				break;
		}
	});
	
	function updateHighlight(items) {
		items.forEach((item, index) => {
			if (index === selectedIndex) {
				item.classList.add('highlighted');
			} else {
				item.classList.remove('highlighted');
			}
		});
	}
	
	// Close dropdown when clicking outside
	document.addEventListener('click', (e) => {
		if (!historyDropdown.contains(e.target) && !historyToggle.contains(e.target) && !searchInput.contains(e.target)) {
			historyDropdown.classList.add('hidden');
		}
	});
	
	// Clear history
	if (clearHistoryBtn) {
		clearHistoryBtn.addEventListener('click', () => {
			SearchMemory.clearHistory();
			historyToggle.classList.add('hidden');
			historyDropdown.classList.add('hidden');
		});
	}
}

function populateSearchHistory(pattern = '') {
	const historyList = document.getElementById('history-list');
	const filteredHistory = SearchMemory.getFilteredHistory(pattern);
	
	if (!historyList) return;
	
	if (filteredHistory.length === 0) {
		if (pattern) {
			historyList.innerHTML = '<div class="history-item">No matching searches found</div>';
		} else {
			historyList.innerHTML = '<div class="history-item">No recent searches</div>';
		}
		return;
	}
	
	historyList.innerHTML = filteredHistory.map(username => {
		// Highlight matching pattern
		const highlightedUsername = pattern ? 
			username.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>') : 
			username;
		
		return `
			<div class="history-item" data-username="${username}">
				<svg viewBox="0 0 24 24" width="16" height="16">
					<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.52 0 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
				</svg>
				${highlightedUsername}
			</div>
		`;
	}).join('');
	
	// Add click handlers for history items
	historyList.querySelectorAll('.history-item[data-username]').forEach(item => {
		item.addEventListener('click', () => {
			const username = item.dataset.username;
			const searchInput = document.getElementById('search-input');
			if (searchInput) {
				searchInput.value = username;
				searchInput.focus();
			}
			document.getElementById('search-history-dropdown').classList.add('hidden');
		});
	});
}

function init() {
	// Safely set up search form if it exists
	const searchForm = document.getElementById('search-form');
	if (searchForm) {
		searchForm.addEventListener('submit', handleSearchSubmit);
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
				
				// Use the centralized chart update function
				updateChartsForCurrentFilter();
			}
		}

		// Close visualization
		if (e.target.id === 'close-viz' || e.target.closest('#close-viz')) {
			const vizContainer = document.getElementById('lang-viz');
			if (vizContainer) {
				vizContainer.classList.add('hidden');
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
					// Enhanced error message for retry attempts too
					const isRateLimitError = error.message.includes('rate limit');
					const isForbiddenError = error.message.includes('forbidden') || error.message.includes('403');
					
					let errorContent = `
						<div class="error-state">
							<h2>⚠️ Failed to Load Data</h2>
							<p>${error.message || 'Error loading GitHub data'}</p>`;
					
					if (isRateLimitError) {
						errorContent += `
							<div class="error-suggestions">
								<h3>💡 Suggestions:</h3>
								<ul>
									<li>Wait for the rate limit to reset (time shown above)</li>
									<li>GitHub allows 60 requests per hour for unauthenticated users</li>
									<li>Consider implementing GitHub token authentication for 5,000 requests per hour</li>
								</ul>
							</div>`;
					} else if (isForbiddenError) {
						errorContent += `
							<div class="error-suggestions">
								<h3>💡 Possible Solutions:</h3>
								<ul>
									<li>Check if the username is spelled correctly</li>
									<li>The user's repositories might be private</li>
									<li>GitHub API rate limit may have been exceeded</li>
									<li>Try again in a few minutes</li>
								</ul>
							</div>`;
					}
					
					errorContent += `
							<div class="error-actions">
								<button id="retry-button" class="modern-btn">Try Again</button>
								<button id="back-to-search" class="modern-btn secondary">Back to Search</button>
							</div>
						</div>`;
					
					document.getElementById('app').innerHTML = errorContent;
				}
			}
		}

		// Back to search button in error state
		if (e.target.id === 'back-to-search') {
			showLandingPage();
		}

		// Close modal buttons
		if (e.target.classList.contains('close-modal')) {
			const modal = e.target.closest('.modal-overlay');
			if (modal) {
				// Check if it's the token modal (has an ID) or a dynamically created modal
				if (modal.id === 'token-modal') {
					modal.classList.add('hidden');
				} else {
					// For dynamically created modals, remove from DOM
					document.body.removeChild(modal);
				}
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
		SearchMemory.save(username); // Save search to memory
		
		// Show history toggle since we now have history
		const historyToggle = document.getElementById('history-toggle');
		if (historyToggle) {
			historyToggle.classList.remove('hidden');
		}
		
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
		
		// Show error in dashboard area
		document.getElementById('landing-page').classList.add('hidden');
		document.getElementById('app').classList.remove('hidden');
		
		// Update body background for dashboard
		document.body.style.background = '#f8f9fa';
		
		// Enhanced error message for better user guidance
		const isRateLimitError = error.message.includes('rate limit');
		const isForbiddenError = error.message.includes('forbidden') || error.message.includes('403');
		
		let errorContent = `
			<div class="error-state">
				<h2>⚠️ Failed to Load Data</h2>
				<p>${error.message || 'Error loading GitHub data'}</p>`;
		
		if (isRateLimitError) {
			errorContent += `
				<div class="error-suggestions">
					<h3>💡 Suggestions:</h3>
					<ul>
						<li>Wait for the rate limit to reset (time shown above)</li>
						<li>GitHub allows 60 requests per hour for unauthenticated users</li>
						<li>Consider implementing GitHub token authentication for 5,000 requests per hour</li>
					</ul>
				</div>`;
		} else if (isForbiddenError) {
			errorContent += `
				<div class="error-suggestions">
					<h3>💡 Possible Solutions:</h3>
					<ul>
						<li>Check if the username is spelled correctly</li>
						<li>The user's repositories might be private</li>
						<li>GitHub API rate limit may have been exceeded</li>
						<li>Try again in a few minutes</li>
					</ul>
				</div>`;
		}
		
		errorContent += `
				<div class="error-actions">
					<button id="retry-button" class="modern-btn">Try Again</button>
					<button id="back-to-search" class="modern-btn secondary">Back to Search</button>
				</div>
			</div>`;
		
		document.getElementById('app').innerHTML = errorContent;
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

	// Repository search
	const repoSearch = document.getElementById('repo-search');
	const clearSearch = document.getElementById('clear-search');
	
	if (repoSearch) {
		// Restore saved repository search
		const savedRepoSearch = SearchMemory.loadRepoSearch();
		if (savedRepoSearch) {
			repoSearch.value = savedRepoSearch;
			clearSearch.classList.remove('hidden');
			applyFilters(); // Apply the restored filter
		}
		
		repoSearch.addEventListener('input', (e) => {
			const searchTerm = e.target.value.trim();
			SearchMemory.saveRepoSearch(searchTerm); // Save repo search
			if (searchTerm) {
				clearSearch.classList.remove('hidden');
			} else {
				clearSearch.classList.add('hidden');
			}
			applyFilters();
		});
	}
	
	if (clearSearch) {
		clearSearch.addEventListener('click', () => {
			repoSearch.value = '';
			SearchMemory.clearRepoSearch(); // Clear saved repo search
			clearSearch.classList.add('hidden');
			applyFilters();
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

async function applyFilters() {
	const filters = {
		search: document.getElementById('repo-search')?.value || '',
		language: document.getElementById('language-filter')?.value || '',
		license: document.getElementById('license-filter')?.value || '',
		forks: document.getElementById('fork-filter')?.value || 'all',
	};

	const filtered = RepoDashboard.filterRepositories(allRepos, filters);
	currentRepos = filtered;
	const sorted = RepoDashboard.sortRepositories(filtered, currentSort);
	renderRepoGrid(sorted);
	
	// Update repository count
	const headerTitle = document.querySelector('.dashboard-header h2');
	if (headerTitle) {
		const totalRepos = allRepos.length;
		const filteredCount = filtered.length;
		if (filteredCount === totalRepos) {
			headerTitle.textContent = `${totalRepos} Repositories`;
		} else {
			headerTitle.textContent = `${filteredCount} of ${totalRepos} Repositories`;
		}
	}
	
	// Update language stats based on filtered repositories
	// For detailed analysis when filtering to few repositories, use API data
	if (filtered.length <= 5 && filters.search) {
		// Use detailed language analysis for small sets of repositories
		await RepoDashboard.updateLanguageStats(filtered);
	} else {
		// Use cached data for large sets or no filtering
		updateLanguageStatsFromCache(filtered);
	}
	
	// Update charts if they're currently visible and search changed
	const vizContainer = document.getElementById('lang-viz');
	if (vizContainer && !vizContainer.classList.contains('hidden')) {
		updateChartsForCurrentFilter();
	}
}

// Update charts for current filter state
async function updateChartsForCurrentFilter() {
	if (currentUsername && currentRepos.length > 0) {
		// Get current search filter to determine if we need detailed analysis
		const searchFilter = document.getElementById('repo-search')?.value || '';
		
		// If searching for few repositories, get detailed data first
		if (currentRepos.length <= 5 && searchFilter) {
			await RepoDashboard.updateLanguageStats(currentRepos);
		}
		
		// Wait a moment for DOM updates, then render charts
		setTimeout(() => {
			const langItems = document.querySelectorAll('.lang-stat-item');
			const chartLangStats = Array.from(langItems)
				.filter(item => {
					// Ensure both elements exist before trying to read them
					const nameEl = item.querySelector('.lang-name');
					const percentEl = item.querySelector('.lang-percentage');
					return nameEl && percentEl && nameEl.textContent && percentEl.textContent;
				})
				.map(item => ({
					name: item.querySelector('.lang-name').textContent,
					percentage: parseFloat(item.querySelector('.lang-percentage').textContent.replace('%', '')),
					count: parseFloat(item.querySelector('.lang-percentage').textContent.replace('%', ''))
				}));
			
			// Charts updated successfully
			
			// Render updated charts
			if (chartLangStats.length > 0) {
				// Update pie chart with current language data
				LangVizModule._renderPieChart(chartLangStats);
				
				// Update timeline with current repositories
				const timelineData = createTimelineDataFromRepos(currentRepos);
				if (timelineData) {
					LangVizModule.renderTimelineChart(timelineData);
				}
			}
		}, 100);
	}
}

// Create timeline data that includes detailed language information
function createTimelineDataFromRepos(repos) {
	const yearData = {};
	
	repos.forEach((repo) => {
		if (repo.created_at) {
			const year = new Date(repo.created_at).getFullYear();
			if (!yearData[year]) {
				yearData[year] = {};
			}
			
			// Use the detailed language data from DOM if available for small sets
			if (repos.length <= 5) {
				const langItems = document.querySelectorAll('.lang-stat-item');
				langItems.forEach(item => {
					const langName = item.querySelector('.lang-name').textContent;
					const percentage = parseFloat(item.querySelector('.lang-percentage').textContent.replace('%', ''));
					
					// Distribute the languages proportionally to this year
					yearData[year][langName] = (yearData[year][langName] || 0) + (percentage / 100);
				});
			} else {
				// For larger sets, use basic repository language
				const normalizedLang = repo.normalizedLanguage || 
									   languageService.normalizeLanguage(repo.language) || 
									   'Other';
				yearData[year][normalizedLang] = (yearData[year][normalizedLang] || 0) + 1;
			}
		}
	});
	
	return yearData;
}

// Update language stats using only cached data (no API calls)
function updateLanguageStatsFromCache(filteredRepos) {
	const langStatsContainer = document.querySelector('.lang-stats-grid');
	if (!langStatsContainer) return;
	
	// Use the same analysis method but with filtered repos
	const langStats = RepoDashboard._analyzeLanguages(filteredRepos);
	
	langStatsContainer.innerHTML = langStats.topLanguages
		.map((lang) => `
			<div class="lang-stat-item" data-lang="${lang.name}" data-percentage="${lang.percentage}">
				<div class="lang-color-indicator" style="background-color:${languageService.getLanguageBackgroundColor(lang.name)}"></div>
				<div class="lang-info">
					<span class="lang-name">${lang.name}</span>
					<span class="lang-percentage">${lang.percentage}%</span>
				</div>
			</div>
		`)
		.join('');
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
		const response = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/languages`, {
			headers: apiService.hasToken() ? {
				'Authorization': `token ${localStorage.getItem('github_token')}`,
				'Accept': 'application/vnd.github.v3+json'
			} : {
				'Accept': 'application/vnd.github.v3+json'
			}
		});
		
		if (response.status === 429) {
			throw new Error('Rate limit exceeded. Please try again in a moment.');
		}
		
		if (response.status === 403) {
			throw new Error('Access forbidden. This repository may be private or require authentication.');
		}
		
		if (!response.ok) {
			throw new Error(`Failed to fetch repository languages: ${response.status} ${response.statusText}`);
		}
		
		const languages = await response.json();
		
		// If no language data available, fall back to primary language
		if (!languages || Object.keys(languages).length === 0) {
			if (repo.language) {
				languages[repo.language] = 1000; // Fake bytes for display
			} else {
				throw new Error('No language data available for this repository.');
			}
		}
		
		const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
		
		// Convert to percentages and get colors
		const languageData = Object.entries(languages)
			.map(([name, bytes]) => {
				const normalizedName = languageService.normalizeLanguage(name);
				const percentage = ((bytes / totalBytes) * 100).toFixed(1);
				
				return {
					name: normalizedName,
					originalName: name,
					bytes,
					percentage: percentage,
					color: languageService.getLanguageBackgroundColor(normalizedName)
				};
			})
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
		// Show fallback modal with primary language if available
		showFallbackLanguageModal(repo, error);
	}
}

// Fallback function to show basic language info without API calls
function showFallbackLanguageModal(repo, originalError) {
	const modal = document.createElement('div');
	modal.className = 'modal-overlay';
	
	// Use primary language if available
	if (repo.language || repo.normalizedLanguage) {
		const primaryLang = repo.normalizedLanguage || languageService.normalizeLanguage(repo.language);
		const langColor = languageService.getLanguageBackgroundColor(primaryLang);
		
		modal.innerHTML = `
			<div class="modal-content">
				<div class="modal-header">
					<h3>📊 ${repo.name} - Language Info</h3>
					<button class="close-modal" aria-label="Close modal">&times;</button>
				</div>
				<div class="modal-body">
					<div class="api-limit-notice">
						<p><strong>⚠️ Detailed language data unavailable</strong></p>
						<small>${originalError.message}</small>
					</div>
					<div class="language-breakdown">
						<div class="language-item">
							<div class="language-bar">
								<div class="language-fill" 
									 style="width: 100%; background-color: ${langColor};">
								</div>
							</div>
							<div class="language-info">
								<span class="language-name">${primaryLang}</span>
								<span class="language-percentage">Primary Language</span>
							</div>
						</div>
					</div>
					<div class="repo-link">
						<a href="${repo.html_url}" target="_blank" rel="noopener">
							🔗 View on GitHub
						</a>
					</div>
				</div>
			</div>
		`;
	} else {
		// No language information available at all
		modal.innerHTML = `
			<div class="modal-content">
				<div class="modal-header">
					<h3>⚠️ Language Data Unavailable</h3>
					<button class="close-modal" aria-label="Close modal">&times;</button>
				</div>
				<div class="modal-body">
					<div class="api-limit-notice">
						<p><strong>No language data available for ${repo.name}</strong></p>
						<small>${originalError.message}</small>
						<br><br>
						<small>This could be due to API rate limits or the repository having no detectable programming languages.</small>
					</div>
					<div class="repo-link">
						<a href="${repo.html_url}" target="_blank" rel="noopener">
							🔗 View on GitHub
						</a>
					</div>
				</div>
			</div>
		`;
	}
	
	document.body.appendChild(modal);
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
		
		// GitHub token setup button click
		if (e.target.id === 'token-setup-btn' || e.target.closest('#token-setup-btn')) {
			showTokenModal();
		}
		
		// Close token modal when clicking outside
		if (e.target.id === 'token-modal') {
			document.getElementById('token-modal').classList.add('hidden');
		}
	});
	
	// Setup token modal interactions
	setupTokenModal();
}

// GitHub Token Modal Functions
function showTokenModal() {
	const modal = document.getElementById('token-modal');
	if (modal) {
		modal.classList.remove('hidden');
		updateTokenStatus();
	}
}

function setupTokenModal() {
	const modal = document.getElementById('token-modal');
	const tokenInput = document.getElementById('token-input');
	const toggleVisibility = document.getElementById('toggle-token-visibility');
	const saveBtn = document.getElementById('save-token-btn');
	const testBtn = document.getElementById('test-token-btn');
	const clearBtn = document.getElementById('clear-token-btn');
	
	if (!modal) return;
	
	// Toggle password visibility
	if (toggleVisibility && tokenInput) {
		toggleVisibility.addEventListener('click', () => {
			const isPassword = tokenInput.type === 'password';
			tokenInput.type = isPassword ? 'text' : 'password';
			toggleVisibility.textContent = isPassword ? '🙈' : '👁️';
		});
	}
	
	// Save token
	if (saveBtn && tokenInput) {
		saveBtn.addEventListener('click', async () => {
			const token = tokenInput.value.trim();
			if (!token) {
				alert('Please enter a GitHub token');
				return;
			}
			
			// Basic token format validation
			if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
				const confirmed = confirm('This doesn\'t look like a valid GitHub token format. Save anyway?');
				if (!confirmed) return;
			}
			
			saveBtn.disabled = true;
			saveBtn.textContent = 'Saving...';
			
			try {
				apiService.setGitHubToken(token);
				updateTokenStatus();
				tokenInput.value = '';
				alert('✅ GitHub token saved successfully!');
			} catch (error) {
				alert('❌ Error saving token: ' + error.message);
			} finally {
				saveBtn.disabled = false;
				saveBtn.textContent = 'Save Token';
			}
		});
	}
	
	// Test token
	if (testBtn) {
		testBtn.addEventListener('click', async () => {
			testBtn.disabled = true;
			testBtn.textContent = 'Testing...';
			
			try {
				// Test with a simple API call
				const response = await fetch('https://api.github.com/user', {
					headers: {
						'Authorization': `token ${localStorage.getItem('github_token')}`,
						'Accept': 'application/vnd.github.v3+json'
					}
				});
				
				if (response.ok) {
					const userData = await response.json();
					alert(`✅ Token is valid! Authenticated as: ${userData.login}`);
				} else if (response.status === 401) {
					alert('❌ Token is invalid or expired');
				} else {
					alert(`❌ Token test failed: ${response.status} ${response.statusText}`);
				}
			} catch (error) {
				alert('❌ Error testing token: ' + error.message);
			} finally {
				testBtn.disabled = false;
				testBtn.textContent = 'Test Token';
			}
		});
	}
	
	// Clear token
	if (clearBtn) {
		clearBtn.addEventListener('click', () => {
			const confirmed = confirm('Are you sure you want to remove the GitHub token?');
			if (confirmed) {
				apiService.clearToken();
				updateTokenStatus();
				if (tokenInput) tokenInput.value = '';
				alert('🗑️ GitHub token removed');
			}
		});
	}
}

function updateTokenStatus() {
	const statusElement = document.getElementById('token-status');
	if (!statusElement) return;
	
	const authStatus = apiService.getAuthStatus();
	
	if (authStatus.hasToken) {
		statusElement.className = 'token-status has-token';
		statusElement.innerHTML = `
			<strong>✅ GitHub token is configured</strong><br>
			Rate limit: ${authStatus.rateLimit}
		`;
	} else {
		statusElement.className = 'token-status no-token';
		statusElement.innerHTML = `
			<strong>⚠️ No GitHub token configured</strong><br>
			Current rate limit: ${authStatus.rateLimit}
		`;
	}
}

// Show landing page function
function showLandingPage() {
	document.getElementById('landing-page').classList.remove('hidden');
	document.getElementById('app').classList.add('hidden');
	
	// Update body background for landing page
	document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
	
	// Restore saved search or clear
	const searchInput = document.getElementById('search-input');
	if (searchInput) {
		const savedSearch = SearchMemory.load();
		if (savedSearch) {
			searchInput.value = savedSearch;
			searchInput.placeholder = `Last search: ${savedSearch}`;
		} else {
			searchInput.value = '';
			searchInput.placeholder = 'Enter GitHub username...';
		}
		searchInput.focus();
	}
	
	// Refresh search history
	setupSearchHistory();
	
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
