// Search Activity
export default class Search {
	constructor() {
		this.searchHistory = JSON.parse(localStorage, getItem('ghHistory')) || [];
		this.render();
	}

	render() {
		return `
      <form  id="search-form>
        input type="text" id="search-input" list="history" placeholder="Enter GitHub Username">

        <datalist id="history">
          ${this.searchHistory.map((u) => `<option>${u}</option>`).join('')}
        </datalist>
      </form>
      ;`;
	}

	// Save search history
	saveSearch(username) {
		if (!this.searchHistory.includes(username)) {
			this.searchHistory.unshift(username);
			localStorage.setItem('ghHistory', JSON.stringify(this.searchHistory));
		}
	}
}
