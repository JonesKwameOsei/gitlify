// Module for contribution heatmap
import apiService from './apiService.js';

export default {
	async render(username) {
		try {
			console.log(`Fetching contributions for: ${username}`);
			const data = await apiService.getContributions(username);
			console.log('Raw heatmap data received:', data);
			
			if (!data) {
				throw new Error('No contribution data received from API');
			}
			
			// Handle different API response structures
			let contributionsWeeks = data.contributions || data.data || [];
			if (!Array.isArray(contributionsWeeks)) {
				console.error('Contributions is not an array:', contributionsWeeks);
				throw new Error('Invalid contribution data format');
			}
			
			// Flatten the weeks array into individual days
			const contributions = contributionsWeeks.flat();
			console.log(`Flattened ${contributionsWeeks.length} weeks into ${contributions.length} days`);
			console.log('Sample day data:', contributions[0]);
			
			const totalContributions = data.total || data.totalContributions || 
				contributions.reduce((sum, day) => sum + (day.contributionCount || day.count || 0), 0);
			
			console.log(`Total contributions: ${totalContributions}`);
			
			// Hide heatmap if no contributions
			if (totalContributions === 0) {
				console.log('No contributions found, hiding heatmap');
				return ''; // Return empty string to hide the heatmap
			}
			
			return `
        <div class="heatmap-container">
          <h2>📊 Contribution Activity (Last 365 days)</h2>
          <div class="heatmap-header">
            <div class="streak-info">
              <span>🔥 Current Streak: ${this._calculateCurrentStreak(contributions)} days</span>
              <span>📈 Longest Streak: ${this._calculateLongestStreak(contributions)} days</span>
            </div>
            <div class="heatmap-legend">
              <span>Less</span>
              ${[0, 1, 2, 3, 4]
								.map((i) => `<div class="intensity-level level-${i}"></div>`)
								.join('')}
              <span>More</span>
            </div>
          </div>
          <div class="heatmap-grid">
            ${this._renderCalendarGrid(contributionsWeeks)}
          </div>
          <div class="heatmap-footer">
            <span>📋 Total Contributions: ${totalContributions.toLocaleString()}</span>
            <span>📊 Daily Average: ${(totalContributions / 365).toFixed(1)}</span>
          </div>
        </div>
      `;
		} catch (error) {
			console.error('Heatmap rendering error:', error);
			console.error('Error details:', {
				message: error.message,
				stack: error.stack,
				username: username
			});
			return `
        <div class="heatmap-error">
          <h3>⚠️ Contribution data unavailable</h3>
          <p>${error.message || 'Failed to load activity data'}</p>
          <small>This could be due to API rate limits, network issues, or the external service being unavailable.</small>
          <details style="margin-top: 1rem;">
            <summary>Debug Info</summary>
            <pre style="font-size: 0.8rem; margin-top: 0.5rem;">Username: ${username}
API URL: https://github-contributions-api.deno.dev/${username}.json</pre>
          </details>
        </div>
      `;
		}
	},

	_renderCalendarGrid(weeksData) {
		if (!weeksData || weeksData.length === 0) {
			return '<p>No contribution data available</p>';
		}

		console.log(`Rendering ${weeksData.length} weeks of contribution data`);
		console.log('Sample week data:', weeksData[0]);
		
		// Debug: Check what contribution levels we have
		const allDays = weeksData.flat();
		const levelCounts = allDays.reduce((acc, day) => {
			const level = day.contributionLevel || 'UNKNOWN';
			acc[level] = (acc[level] || 0) + 1;
			return acc;
		}, {});
		console.log('Contribution level distribution:', levelCounts);

		return weeksData
			.map((week, weekIndex) => {
				if (!Array.isArray(week)) {
					console.warn(`Week ${weekIndex} is not an array:`, week);
					return '';
				}
				
				return `
      <div class="heatmap-week">
        ${week
					.map((day, dayIndex) => {
						// Normalize day data
						const date = day.date;
						const count = day.contributionCount || day.count || 0;
						const contributionLevel = day.contributionLevel || 'NONE';
						const color = day.color || this._getColorFromLevel(contributionLevel);
						
						// Map string levels to numeric for CSS classes
						const numericLevel = this._mapLevelToNumber(contributionLevel);
						
						if (!date) {
							console.warn(`Day ${dayIndex} in week ${weekIndex} has no date:`, day);
							return '';
						}
						
						const formattedDate = new Date(date).toLocaleDateString();
						const pluralS = count !== 1 ? 's' : '';
						
						return `
          <div class="heatmap-day level-${numericLevel}" 
               data-date="${date}"
               data-count="${count}"
               data-level="${contributionLevel}"
               style="background-color: ${color};"
               title="${formattedDate}: ${count} contribution${pluralS}">
          </div>
        `;
					})
					.join('')}
      </div>
    `;
			})
			.join('');
	},

	// Helper method to calculate contribution level if not provided
	_getContributionLevel(count) {
		if (count === 0) return 0;
		if (count < 3) return 1;
		if (count < 6) return 2;
		if (count < 10) return 3;
		return 4;
	},

	// Map GitHub string levels to numbers for CSS classes
	_mapLevelToNumber(levelString) {
		const levelMap = {
			'NONE': 0,
			'FIRST_QUARTILE': 1,
			'SECOND_QUARTILE': 2,
			'THIRD_QUARTILE': 3,
			'FOURTH_QUARTILE': 4
		};
		return levelMap[levelString] || 0;
	},

	// Get color from contribution level if color field is missing
	_getColorFromLevel(level) {
		const colorMap = {
			'NONE': '#ebedf0',
			'FIRST_QUARTILE': '#9be9a8',
			'SECOND_QUARTILE': '#40c463',
			'THIRD_QUARTILE': '#30a14e',
			'FOURTH_QUARTILE': '#216e39'
		};
		return colorMap[level] || '#ebedf0';
	},

	_calculateCurrentStreak(contributions) {
		if (!contributions || contributions.length === 0) return 0;
		
		let streak = 0;
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (let i = contributions.length - 1; i >= 0; i--) {
			const day = contributions[i];
			if (new Date(day.date) > today) continue;

			const count = day.contributionCount || day.count || 0;
			if (count > 0) {
				streak++;
			} else {
				break;
			}
		}
		return streak;
	},

	_calculateLongestStreak(contributions) {
		if (!contributions || contributions.length === 0) return 0;
		
		let longest = 0;
		let current = 0;

		contributions.forEach((day) => {
			const count = day.contributionCount || day.count || 0;
			if (count > 0) {
				current++;
				if (current > longest) longest = current;
			} else {
				current = 0;
			}
		});

		return longest;
	},
};
