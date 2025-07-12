import apiService from './apiService.js';
import languageService from './languageService.js';
import HeatmapModule from './heatmapModule.js';

export default {
	filterRepositories(repos, filters) {
		return repos.filter((repo) => {
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

			return `
        <section class="repository-dashboard">
          <header class="dashboard-header">
            <h2>${allRepos.length} Repositories</h2>
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
            <h3>Language Distribution</h3>
            <div class="lang-badges">
              ${langStats.topLanguages
								.map(
									(lang) => `
                <span class="lang-badge" style="background-color:${languageService.getLanguageBackgroundColor(
									lang.name
								)}; color:${languageService.getLanguageTextColor(lang.name)}">
                  ${lang.name} (${lang.percentage}%)
                </span>
              `
								)
								.join('')}
            </div>
            <button id="show-lang-chart">View Full Analysis</button>
          </div>
          
          <div class="lang-viz-container hidden" id="lang-viz">
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

		// Collect language data using normalizedLanguage
		repos.forEach((repo) => {
			const lang = repo.normalizedLanguage || 'Other';
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
          <button class="show-languages" aria-label="Show language breakdown">
            <i class="icon-code"></i> Languages
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
