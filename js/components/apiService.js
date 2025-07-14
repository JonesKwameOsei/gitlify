// apiService.js
const GITHUB_API = 'https://api.github.com';

// Cache for API responses to reduce requests
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(url) {
	return url;
}

function isCacheValid(timestamp) {
	return Date.now() - timestamp < CACHE_DURATION;
}

function getCachedResponse(url) {
	const cacheKey = getCacheKey(url);
	const cached = apiCache.get(cacheKey);
	
	if (cached && isCacheValid(cached.timestamp)) {
		return cached.data;
	}
	
	return null;
}

function setCachedResponse(url, data) {
	const cacheKey = getCacheKey(url);
	apiCache.set(cacheKey, {
		data: data,
		timestamp: Date.now()
	});
}

// GitHub token management
class GitHubAuth {
	constructor() {
		this.token = localStorage.getItem('github_token') || '';
	}
	
	setToken(token) {
		this.token = token;
		if (token) {
			localStorage.setItem('github_token', token);
		} else {
			localStorage.removeItem('github_token');
		}
	}
	
	getHeaders() {
		const headers = {
			'Accept': 'application/vnd.github.v3+json',
		};
		
		if (this.token) {
			headers['Authorization'] = `token ${this.token}`;
		}
		
		return headers;
	}
	
	hasToken() {
		return !!this.token;
	}
	
	clearToken() {
		this.token = '';
		localStorage.removeItem('github_token');
	}
}

const githubAuth = new GitHubAuth();

// Fetch user
export default {
	async getUser(username) {
		try {
			const response = await fetch(`${GITHUB_API}/users/${username}`, {
				headers: githubAuth.getHeaders()
			});
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
				`${GITHUB_API}/users/${username}/repos?per_page=100&page=${page}`,
				{
					headers: githubAuth.getHeaders()
				}
			);
			
			if (!response.ok) {
				if (response.status === 403) {
					const resetTime = response.headers.get('X-RateLimit-Reset');
					const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
					
					if (rateLimitRemaining === '0') {
						const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
						const resetTimeString = resetDate ? resetDate.toLocaleTimeString() : 'unknown';
						throw new Error(`GitHub API rate limit exceeded. Limit resets at ${resetTimeString}. Consider using a GitHub token for higher limits.`);
					} else {
						throw new Error('GitHub API access forbidden. This may require authentication or the user may not exist.');
					}
				}
				if (response.status === 404) {
					throw new Error(`User "${username}" not found`);
				}
				throw new Error(`GitHub API error: ${response.status}`);
			}
			
			return response.json();
		} catch (error) {
			console.error('Error fetching repositories:', error);
			throw error;
		}
	},

	// Fetch user followers
	async getFollowers(username) {
		try {
			const response = await fetch(`${GITHUB_API}/users/${username}/followers`, {
				headers: githubAuth.getHeaders()
			});
			return response.json();
		} catch (error) {
			console.error('Error fetching followers:', error);
			throw error;
		}
	},

	// Fetch user following
	async getFollowing(username) {
		try {
			const response = await fetch(`${GITHUB_API}/users/${username}/following`, {
				headers: githubAuth.getHeaders()
			});
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
				`${GITHUB_API}/users/${username}/events/public`,
				{
					headers: githubAuth.getHeaders()
				}
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
			// Check cache first
			const cacheKey = `repos_${username}`;
			const cached = getCachedResponse(cacheKey);
			if (cached) {
				return cached;
			}

			let page = 1;
			let allRepos = [];
			let hasMore = true;

			while (hasMore) {
				const url = `${GITHUB_API}/users/${username}/repos?per_page=100&page=${page}`;
				const response = await fetch(url, {
					headers: githubAuth.getHeaders()
				});
				
				if (!response.ok) {
					if (response.status === 403) {
						const resetTime = response.headers.get('X-RateLimit-Reset');
						const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
						
						if (rateLimitRemaining === '0') {
							const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
							const resetTimeString = resetDate ? resetDate.toLocaleTimeString() : 'unknown';
							throw new Error(`GitHub API rate limit exceeded. Limit resets at ${resetTimeString}. Consider using a GitHub token for higher limits.`);
						} else {
							throw new Error('GitHub API access forbidden. This may require authentication or the user may not exist.');
						}
					}
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
			
			// Cache the result
			setCachedResponse(cacheKey, allRepos);
			return allRepos;
		} catch (error) {
			throw error;
		}
	},

	async getContributions(username) {
		const url = `https://github-contributions-api.deno.dev/${username}.json`;
		try {
			const response = await fetch(url);
			
			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unknown error');
				throw new Error(`Contributions API returned ${response.status}: ${errorText}`);
			}
			
			const data = await response.json();
			return data;
		} catch (error) {
			if (error.name === 'TypeError' && error.message.includes('fetch')) {
				throw new Error('Network error: Could not connect to contributions API');
			}
			throw error;
		}
	},
	
	// Auth methods
	setGitHubToken(token) {
		githubAuth.setToken(token);
	},
	
	hasToken() {
		return githubAuth.hasToken();
	},
	
	clearToken() {
		githubAuth.clearToken();
	},
	
	getAuthStatus() {
		return {
			hasToken: githubAuth.hasToken(),
			rateLimit: githubAuth.hasToken() ? '5,000/hour' : '60/hour'
		};
	}
};
