// apiService.js
const GITHUB_API = 'https://api.github.com';

// Fetch user
export default {
	async getUser(username) {
		try {
			const response = await fetch(`${GITHUB_API}/users/${username}`);
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error(`User "${username}" not found`);
				}
				throw new Error(`GitHub API error: ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			console.error('Error fetching user:', error);
			throw error;
		}
	},

	// Fetch user repositories
	async getRepos(username, page = 1) {
		try {
			const response = await fetch(
				`${GITHUB_API}/users/${username}/repos?per_page=100&page=${page}`
			);
			return response.json();
		} catch (error) {
			console.error('Error fetching repositories:', error);
			throw error;
		}
	},

	// Fetch user followers
	async getFollowers(username) {
		try {
			const response = await fetch(`${GITHUB_API}/users/${username}/followers`);
			return response.json();
		} catch (error) {
			console.error('Error fetching followers:', error);
			throw error;
		}
	},

	// Fetch user following
	async getFollowing(username) {
		try {
			const response = await fetch(`${GITHUB_API}/users/${username}/following`);
			return response.json();
		} catch (error) {
			console.error('Error fetching following:', error);
			throw error;
		}
	},

	async getActivity(username) {
		// Implementation of event data fetching
		try {
			const response = await fetch(
				`${GITHUB_API}/users/${username}/events/public`
			);
			return response.json();
		} catch (error) {
			console.error('Error fetching activity:', error);
			throw error;
		}
	},

	// Pagination logic implementation
	async getAllRepos(username) {
		try {
			let page = 1;
			let allRepos = [];
			let hasMore = true;

			while (hasMore) {
				const response = await fetch(
					`${GITHUB_API}/users/${username}/repos?per_page=100&page=${page}`
				);
				
				if (!response.ok) {
					if (response.status === 404) {
						throw new Error(`User "${username}" not found`);
					}
					throw new Error(`GitHub API error: ${response.status}`);
				}
				
				const repos = await response.json();

				if (!Array.isArray(repos) || repos.length === 0) {
					hasMore = false;
				} else {
					allRepos = [...allRepos, ...repos];
					page++;

					// Respect GitHub rate per limits (5000 req/hr = ~1 req/720ms)
					await new Promise((resolve) => setTimeout(resolve, 750));
				}
			}
			return allRepos;
		} catch (error) {
			console.error('Error fetching repositories:', error);
			throw error;
		}
	},

	async getContributions(username) {
		const url = `https://github-contributions-api.deno.dev/${username}.json`;
		try {
			console.log(`Fetching contributions from: ${url}`);
			const response = await fetch(url);
			
			console.log(`Contributions API response status: ${response.status}`);
			
			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unknown error');
				console.error(`Contributions API error (${response.status}):`, errorText);
				throw new Error(`Contributions API returned ${response.status}: ${errorText}`);
			}
			
			const data = await response.json();
			console.log('Contributions API response:', data);
			return data;
		} catch (error) {
			console.error('Error fetching contributions:', error);
			if (error.name === 'TypeError' && error.message.includes('fetch')) {
				throw new Error('Network error: Could not connect to contributions API');
			}
			throw error;
		}
	},
};
