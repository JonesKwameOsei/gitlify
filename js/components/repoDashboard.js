import apiService from './apiService.js';
import languageService from './languageService.js';
import HeatmapModule from './heatmapModule.js';

export default {
	filterRepositories(repos, filters) {
		const filtered = repos.filter((repo) => {
			// Search filter
			if (filters.search) {
				const searchTerm = filters.search.toLowerCase();
				const nameMatch = repo.name.toLowerCase().includes(searchTerm);
				const descMatch = repo.description?.toLowerCase().includes(searchTerm) || false;
				const topicMatch = repo.topics?.some(topic => topic.toLowerCase().includes(searchTerm)) || false;
				
				if (!nameMatch && !descMatch && !topicMatch) return false;
			}

			// Use normalized language for consistent filtering
			const normalizedLang = languageService.normalizeLanguage(repo.language);

			// Language filter
			if (filters.language && normalizedLang !== filters.language) return false;

			// License filter
			if (filters.license) {
				const licenseKey = repo.license?.spdx_id || 'none';
				if (licenseKey !== filters.license) return false;
			}

			// Fork status filter
			if (filters.forks === 'exclude' && repo.fork) return false;
			if (filters.forks === 'only' && !repo.fork) return false;

			return true;
		});
		
		// Filtering complete
		
		return filtered;
	},

	sortRepositories(repos, criteria = 'updated_at') {
		return [...repos].sort((a, b) => {
			switch (criteria) {
				case 'stargazers_count':
					return b.stargazers_count - a.stargazers_count;
				case 'forks_count':
					return b.forks_count - a.forks_count;
				case 'name':
					return a.name.localeCompare(b.name);
				case 'created_at':
					return new Date(b.created_at) - new Date(a.created_at);
				default: // 'updated_at'
					return new Date(b.updated_at) - new Date(a.updated_at);
			}
		});
	},

	async render(username) {
		try {
			// Show loading state
			document.getElementById('app').innerHTML = `
        <div class="skeleton-loader">
          <div class="skeleton-header"></div>
          <div class="skeleton-grid">
            ${Array(6).fill('<div class="skeleton-card"></div>').join('')}
          </div>
        </div>
      `;

			// Fetch and process data
			let allRepos = await apiService.getAllRepos(username);

			// Add normalized language to each repo
			allRepos = allRepos.map((repo) => ({
				...repo,
				normalizedLanguage: languageService.normalizeLanguage(repo.language),
			}));

			const langStats = this._analyzeLanguages(allRepos);
			const filteredRepos = this.filterRepositories(allRepos, {});
			const sortedRepos = this.sortRepositories(
				filteredRepos,
				'stargazers_count'
			);

			// Set up event delegation for repo cards (handled by global event delegation in app.js)
			
			// Debug: Log language distribution
			console.log('Repository language breakdown:');
			const langDebug = {};
			allRepos.forEach(repo => {
				const lang = repo.language || 'null';
				const normalized = repo.normalizedLanguage || 'null';
				langDebug[`${lang} → ${normalized}`] = (langDebug[`${lang} → ${normalized}`] || 0) + 1;
			});
			console.table(langDebug);

			return `
        <section class="repository-dashboard">
          <header class="dashboard-header">
            <div class="header-top">
              <h2>${allRepos.length} Repositories</h2>
              <div class="search-container">
                <div class="repo-search-wrapper">
                  <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  <input type="text" id="repo-search" placeholder="Search repositories..." autocomplete="off">
                  <button type="button" id="clear-search" class="clear-search hidden">×</button>
                </div>
              </div>
            </div>
            <div class="controls">
              <select id="sort-control" aria-label="Sort repositories">
                <option value="stargazers_count">Most Stars</option>
                <option value="forks_count">Most Forks</option>
                <option value="updated_at">Recently Updated</option>
                <option value="created_at">Newest</option>
                <option value="name">Alphabetical</option>
              </select>
              
              <select id="language-filter" aria-label="Filter by language">
                <option value="">All Languages</option>
                ${langStats.uniqueLanguages
									.map(
										(lang) => `
                  <option value="${lang}">${lang}</option>
                `
									)
									.join('')}
              </select>
              
              <select id="license-filter" aria-label="Filter by license">
                <option value="">All Licenses</option>
                ${[
									...new Set(
										allRepos.map((r) => r.license?.spdx_id).filter(Boolean)
									),
								]
									.map(
										(license) =>
											`<option value="${license}">${license}</option>`
									)
									.join('')}
              </select>
              
              <select id="fork-filter" aria-label="Filter forks">
                <option value="all">Include Forks</option>
                <option value="exclude">Exclude Forks</option>
                <option value="only">Only Forks</option>
              </select>
            </div>
          </header>


          
          <div class="language-summary">
            <div class="summary-header">
              <h3>📊 Language Distribution</h3>
              <button id="show-lang-chart" class="modern-btn secondary">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                View Full Analysis
              </button>
            </div>
            <div class="lang-stats-grid">
              ${langStats.topLanguages
								.map(
									(lang) => `
                <div class="lang-stat-item" data-lang="${lang.name}" data-percentage="${lang.percentage}">
                  <div class="lang-color-indicator" style="background-color:${languageService.getLanguageBackgroundColor(
									lang.name
								)}"></div>
                  <div class="lang-info">
                    <span class="lang-name">${lang.name}</span>
                    <span class="lang-percentage">${lang.percentage}%</span>
                  </div>
                </div>
              `
								)
								.join('')}
            </div>
          </div>
          
          <div class="lang-viz-container hidden" id="lang-viz">
            <div class="viz-header">
              <h3>📊 Language Analysis</h3>
              <button id="close-viz" class="close-viz-btn" title="Close visualization">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div class="viz-row">
              <div class="chart-wrapper">
            <canvas id="lang-pie-chart"></canvas>
            </div>
            <div class="chart-wrapper">
            <canvas id="lang-timeline-chart"></canvas>
            </div>
        </div>
      </div>
          
          <div class="repo-grid">
            ${sortedRepos.map((repo) => this._repoCard(repo)).join('')}
          </div>
          
          <!-- HEATMAP INTEGRATION -->
          ${await HeatmapModule.render(username)}
          
          <div class="repo-stats">
            <p class="total-stars">
              ${this._generateStarDisplay(sortedRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0))}
            </p>
            <p>Primary Language: ${this._getTopLanguage(allRepos)}</p>
          </div>
        </section>
      `;
		} catch (error) {
			return this._renderErrorState(error);
		}
	},

	_analyzeLanguages(repos) {
		const langMap = {};
		const totalRepos = repos.length;

		// Collect language data using normalizedLanguage and fallback to repo.language
		repos.forEach((repo) => {
			let normalizedLang = repo.normalizedLanguage;
			
			// If no normalizedLanguage, try to normalize the raw language
			if (!normalizedLang || normalizedLang === 'Other') {
				if (repo.language) {
					normalizedLang = languageService.normalizeLanguage(repo.language);
				} else {
					normalizedLang = 'Other';
				}
			}
			
			langMap[normalizedLang] = (langMap[normalizedLang] || 0) + 1;
		});
		
		// Language map processing complete

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

	// New method to update language stats display with detailed language data
	async updateLanguageStats(filteredRepos) {
		// Show loading state
		const langStatsContainer = document.querySelector('.lang-stats-grid');
		if (langStatsContainer) {
			langStatsContainer.innerHTML = `
				<div class="lang-stat-item">
					<div class="loading-spinner"></div>
					<div class="lang-info">
						<span class="lang-name">Analyzing languages...</span>
					</div>
				</div>
			`;
		}
		
		// Fetch detailed language data for filtered repositories
		const detailedLangStats = await this._getDetailedLanguageStats(filteredRepos);
		
		if (langStatsContainer) {
			let statusMessage = '';
			if (detailedLangStats.fallbackMode) {
				statusMessage = '<div class="lang-status-message">⚠️ Using estimated data (API limit reached)</div>';
			} else if (detailedLangStats.failedCalls > 0) {
				statusMessage = `<div class="lang-status-message">ℹ️ ${detailedLangStats.failedCalls} repos using estimated data</div>`;
			}
			
			langStatsContainer.innerHTML = statusMessage + detailedLangStats.topLanguages
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
	},

	// Method to fetch detailed language statistics from individual repositories
	async _getDetailedLanguageStats(repos) {
		const langBytesMap = {};
		let totalBytes = 0;
		let apiCallsMade = 0;
		let failedCalls = 0;
		
		// Rate limiting configuration
		const MAX_CONCURRENT_REQUESTS = 3;
		const DELAY_BETWEEN_BATCHES = 500; // ms
		
		// Process repos in small batches to avoid rate limiting
		for (let i = 0; i < repos.length; i += MAX_CONCURRENT_REQUESTS) {
			const batch = repos.slice(i, i + MAX_CONCURRENT_REQUESTS);
			
			const batchPromises = batch.map(async (repo) => {
				try {
					apiCallsMade++;
					const response = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/languages`, {
						headers: apiService.hasToken() ? {
							'Authorization': `token ${localStorage.getItem('github_token')}`,
							'Accept': 'application/vnd.github.v3+json'
						} : {
							'Accept': 'application/vnd.github.v3+json'
						}
					});
					
					if (response.status === 429) {
						// Rate limited - fall back to primary language
						failedCalls++;
						return this._getFallbackLanguageData(repo);
					}
					
					if (response.status === 403) {
						// Forbidden - likely authentication required, fall back
						failedCalls++;
						return this._getFallbackLanguageData(repo);
					}
					
					if (!response.ok) {
						failedCalls++;
						return this._getFallbackLanguageData(repo);
					}
					
					const languages = await response.json();
					return { repo: repo.name, languages, source: 'api' };
				} catch (error) {
					failedCalls++;
					return this._getFallbackLanguageData(repo);
				}
			});
			
			const batchResults = await Promise.all(batchPromises);
			
			// Process batch results
			batchResults.forEach(result => {
				if (result && result.languages) {
					Object.entries(result.languages).forEach(([lang, bytes]) => {
						const normalizedLang = languageService.normalizeLanguage(lang);
						langBytesMap[normalizedLang] = (langBytesMap[normalizedLang] || 0) + bytes;
						totalBytes += bytes;
					});
				}
			});
			
			// Add delay between batches to respect rate limits
			if (i + MAX_CONCURRENT_REQUESTS < repos.length) {
				await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
			}
		}
		
		// If we have no data from APIs, fall back to primary language analysis
		if (totalBytes === 0) {
			return this._getFallbackLanguageStats(repos);
		}
		
		// Convert to percentages
		const languageStats = Object.entries(langBytesMap)
			.map(([name, bytes]) => ({
				name,
				bytes,
				percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
			}))
			.filter(lang => lang.percentage > 0)
			.sort((a, b) => b.bytes - a.bytes);
		
		return {
			allLanguages: languageStats,
			topLanguages: languageStats.slice(0, 5),
			uniqueLanguages: [...new Set(languageStats.map((lang) => lang.name))],
			apiCallsMade,
			failedCalls
		};
	},

	// Fallback method when API calls fail
	_getFallbackLanguageData(repo) {
		if (repo.language) {
			// Use a reasonable byte estimate based on repository size
			const estimatedBytes = Math.max(1000, repo.size * 10); // Rough estimate
			return {
				repo: repo.name,
				languages: { [repo.language]: estimatedBytes },
				source: 'fallback'
			};
		}
		return null;
	},

	// Fallback to primary language analysis when detailed data completely fails
	_getFallbackLanguageStats(repos) {
		const langMap = {};
		const totalRepos = repos.length;

		repos.forEach((repo) => {
			const normalizedLang = repo.normalizedLanguage || languageService.normalizeLanguage(repo.language) || 'Other';
			langMap[normalizedLang] = (langMap[normalizedLang] || 0) + 1;
		});

		const languageStats = Object.entries(langMap)
			.map(([name, count]) => ({
				name,
				bytes: count * 1000, // Fake bytes for consistency
				percentage: Math.round((count / totalRepos) * 100),
			}))
			.sort((a, b) => b.percentage - a.percentage);

		return {
			allLanguages: languageStats,
			topLanguages: languageStats.slice(0, 5),
			uniqueLanguages: [...new Set(languageStats.map((lang) => lang.name))],
			fallbackMode: true
		};
	},

	_getTopLanguage(repos) {
		const langCount = repos.reduce((acc, repo) => {
			const lang = repo.normalizedLanguage || 'Other';
			acc[lang] = (acc[lang] || 0) + 1;
			return acc;
		}, {});

		const topLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0];

		return topLang ? `${topLang[0]} (${topLang[1]} repos)` : 'N/A';
	},

	_generateStarDisplay(totalStars) {
		const formattedStars = totalStars.toLocaleString();
		
		// Determine number of golden stars to show based on star count
		let starCount = 1; // Default 1 star
		if (totalStars >= 10000) starCount = 5;
		else if (totalStars >= 5000) starCount = 4;
		else if (totalStars >= 1000) starCount = 3;
		else if (totalStars >= 100) starCount = 2;
		
		const goldStars = '⭐'.repeat(starCount);
		
		return `Total Stars: ${goldStars} ${formattedStars}`;
	},

	_repoCard(repo) {
		const langColor = languageService.getLanguageBackgroundColor(repo.normalizedLanguage);

		return `
      <article class="repo-card" data-repo="${repo.name}" data-lang-color="${langColor}">
        <header>
          <h3>
            <a href="${repo.html_url}" target="_blank" rel="noopener">
              ${repo.name} ${
			repo.fork ? '<span class="fork-tag">Fork</span>' : ''
		}
            </a>
          </h3>
          <div class="lang-indicator"></div>
          <p class="repo-description">${
						repo.description || 'No description available'
					}</p>
        </header>
        
        <div class="repo-meta">
          <span class="meta-item" aria-label="Stars">
            ⭐ ${repo.stargazers_count.toLocaleString()}
          </span>
          <span class="meta-item" aria-label="Forks">
            🍴 ${repo.forks_count.toLocaleString()}
          </span>
          <span class="meta-item" aria-label="Language">
            ${repo.normalizedLanguage ? '📦 ' + repo.normalizedLanguage : 'N/A'}
          </span>
          <span class="meta-item" aria-label="License">
            ${repo.license?.spdx_id || 'No license'}
          </span>
        </div>

        <div class="repo-actions">
          <button class="show-languages modern-btn tertiary" aria-label="Show language breakdown">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.01-4.65.63-6.86l-.22-.35c-.54-.86-1.31-1.49-2.24-1.8l-.44-.15c-.49-.15-1.02-.22-1.54-.22-.36 0-.73.03-1.09.1l-.41.08c-.84.17-1.63.51-2.3 1.01l-.35.26c-.7.54-1.28 1.22-1.68 2l-.17.35c-.31.67-.47 1.39-.47 2.12 0 .36.04.72.11 1.07l.09.4c.17.83.51 1.61 1 2.27l.26.35c.54.7 1.22 1.28 2 1.68l.35.17c.67.31 1.39.47 2.12.47.36 0 .72-.04 1.07-.11l.4-.09c.83-.17 1.61-.51 2.27-1l.35-.26c.7-.54 1.28-1.22 1.68-2l.17-.35c.31-.67.47-1.39.47-2.12 0-.36-.04-.72-.11-1.07l-.09-.4c-.17-.83-.51-1.61-1-2.27l-.26-.35z"/>
            </svg>
            Languages
          </button>
        </div>
        
        <footer class="repo-footer">
          Updated ${new Date(repo.updated_at).toLocaleDateString()}
        </footer>
      </article>
    `;
	},

	async _showRepoLanguageBreakdown(repo) {
		try {
			// Show loading state
			const modal = this._createModal(`
        <div class="modal-loading">
          <div class="spinner"></div>
          <p>Analyzing ${repo.name} languages...</p>
        </div>
      `);

			// Fetch detailed language data
			const languages = await this._fetchRepoLanguages(repo.languages_url);
			const totalBytes = Object.values(languages).reduce(
				(sum, bytes) => sum + bytes,
				0
			);

			// Prepare data for chart
			const langData = Object.entries(languages)
				.map(([lang, bytes]) => ({
					name: languageService.normalizeLanguage(lang),
					bytes,
					percentage: Math.round((bytes / totalBytes) * 100),
				}))
				.sort((a, b) => b.bytes - a.bytes);

			// Update modal with results
			modal.innerHTML = this._createRepoLanguageModal(repo, langData);

			// Render chart inside modal
			this._renderRepoLanguageChart(langData);
		} catch (error) {
			console.error('Failed to load language data:', error);
			this._createModal(`
        <div class="modal-error">
          <h3>⚠️ Language Data Unavailable</h3>
          <p>Failed to load language breakdown for ${repo.name}</p>
          <button class="close-modal">OK</button>
        </div>
      `);
		}
	},

	_createRepoLanguageModal(repo, langData) {
		return `
      <div class="repo-language-modal">
        <header>
          <h3>${repo.name} Language Breakdown</h3>
          <button class="close-modal" aria-label="Close">&times;</button>
        </header>
        
        <div class="modal-content">
          <div class="chart-container">
            <canvas id="repo-lang-chart"></canvas>
          </div>
          
          <div class="lang-details">
            <h4>Language Distribution:</h4>
            <ul class="lang-list">
              ${langData
								.map(
									(lang) => `
                <li>
                  <span class="lang-color" style="background-color:${languageService.getLanguageColor(
										lang.name
									)}"></span>
                  ${lang.name}: ${lang.percentage}%
                  <span class="lang-bytes">(${(lang.bytes / 1000).toFixed(
										1
									)} KB)</span>
                </li>
              `
								)
								.join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
	},

	_renderRepoLanguageChart(langData) {
		const ctx = document.getElementById('repo-lang-chart');
		return new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: langData.map((lang) => lang.name),
				datasets: [
					{
						data: langData.map((lang) => lang.bytes),
						backgroundColor: langData.map((lang) =>
							languageService.getLanguageColor(lang.name)
						),
					},
				],
			},
			options: {
				responsive: true,
				plugins: {
					legend: { position: 'right' },
					tooltip: {
						callbacks: {
							label: (ctx) => {
								const lang = langData[ctx.dataIndex];
								return `${lang.name}: ${lang.percentage}% (${(
									lang.bytes / 1000
								).toFixed(1)} KB)`;
							},
						},
					},
				},
			},
		});
	},

	_createModal(content) {
		const modalOverlay = document.createElement('div');
		modalOverlay.className = 'modal-overlay';
		modalOverlay.innerHTML = content;

		document.body.appendChild(modalOverlay);

		// Add close handler
		modalOverlay.querySelector('.close-modal').addEventListener('click', () => {
			document.body.removeChild(modalOverlay);
		});

		return modalOverlay.querySelector('.modal-content') || modalOverlay;
	},

	_renderErrorState(error) {
		return `
      <div class="error-state">
        <h2>⚠️ Repository Data Unavailable</h2>
        <p>${error.message || 'Failed to load repository data'}</p>
        <button id="retry-button">Retry</button>
      </div>
    `;
	},

	async _analyzeLanguageTrends(repos) {
		const timeline = {};

		for (const repo of repos) {
			const year = new Date(repo.created_at).getFullYear();
			if (!timeline[year]) timeline[year] = {};

			const languages = repo.languages_url
				? await this._fetchRepoLanguages(repo.languages_url)
				: [repo.normalizedLanguage || 'Other'];

			languages.forEach((lang) => {
				timeline[year][lang] = (timeline[year][lang] || 0) + 1;
			});
		}

		return timeline;
	},

	async _fetchRepoLanguages(url) {
		try {
			const response = await fetch(url);
			if (!response.ok) return [];
			const langData = await response.json();
			return Object.keys(langData).map((lang) =>
				languageService.normalizeLanguage(lang)
			);
		} catch (error) {
			return [];
		}
	},
};
