// languageService.js
const LANGUAGE_ALIASES = {
	TS: 'TypeScript',
	JS: 'JavaScript',
	PY: 'Python',
	TF: 'Terraform',
	CS: 'C#',
	CPP: 'C++',
	RB: 'Ruby',
	GO: 'Go',
	RS: 'Rust',
	KT: 'Kotlin',
	SWIFT: 'Swift',
};

export default {
	normalizeLanguage(lang) {
		if (!lang) return 'Other';

		// First check exact matches for special cases
		const specialCases = {
			'javascript': 'JavaScript',
			'typescript': 'TypeScript',
			'hcl': 'HCL',
			'html': 'HTML',
			'css': 'CSS',
			'scss': 'SCSS',
			'php': 'PHP',
			'sql': 'SQL',
			'xml': 'XML',
			'json': 'JSON',
			'yaml': 'YAML',
			'api': 'API',
			'c#': 'C#',
			'c++': 'C++',
		};
		
		const lowerLang = lang.toLowerCase().trim();
		if (specialCases[lowerLang]) {
			return specialCases[lowerLang];
		}

		// Handle GitHub edge cases
		const cleanLang = lang
			.replace(/\s*\(.*?\)/g, '') // Remove parentheses content
			.replace(/\.\w+/g, '') // Remove file extensions
			.trim()
			.toUpperCase();

		// Match against known aliases (exact match only to avoid CSS->C# bug)
		for (const [key, value] of Object.entries(LANGUAGE_ALIASES)) {
			if (cleanLang === key) return value;
		}
		
		// Title case for other languages
		return lang.replace(
			/\w\S*/g,
			(txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
		);
	},

	getLanguageColor(lang) {
		if (!lang || lang === 'Other') return { bg: '#cccccc', text: '#000000' };
		
		// Enhanced color palette with background and text color pairs
		const colors = {
			JavaScript: { bg: '#f7df1e', text: '#000000' }, // Bright yellow with black text
			Python: { bg: '#3776ab', text: '#ffffff' }, // Blue with white text
			Java: { bg: '#f89820', text: '#000000' }, // Orange with black text
			TypeScript: { bg: '#007acc', text: '#ffffff' }, // Blue with white text
			'C#': { bg: '#239120', text: '#ffffff' }, // Green with white text
			'C++': { bg: '#00599c', text: '#ffffff' }, // Blue with white text
			PHP: { bg: '#777bb4', text: '#ffffff' }, // Purple with white text
			Ruby: { bg: '#cc342d', text: '#ffffff' }, // Red with white text
			CSS: { bg: '#1572b6', text: '#ffffff' }, // Blue with white text
			HTML: { bg: '#e34f26', text: '#ffffff' }, // Orange-red with white text
			Go: { bg: '#00add8', text: '#ffffff' }, // Cyan with white text
			Rust: { bg: '#ce422b', text: '#ffffff' }, // Red-brown with white text
			Terraform: { bg: '#623ce4', text: '#ffffff' }, // Purple with white text
			HCL: { bg: '#623ce4', text: '#ffffff' }, // Purple with white text
			Kotlin: { bg: '#7f52ff', text: '#ffffff' }, // Purple with white text
			Swift: { bg: '#fa7343', text: '#ffffff' }, // Orange with white text
			Shell: { bg: '#89e051', text: '#000000' }, // Light green with black text
			Dockerfile: { bg: '#2496ed', text: '#ffffff' }, // Blue with white text
			Makefile: { bg: '#427819', text: '#ffffff' }, // Dark green with white text
			C: { bg: '#a8b9cc', text: '#000000' }, // Light gray with black text
			'Objective-C': { bg: '#438eff', text: '#ffffff' }, // Blue with white text
			Vue: { bg: '#4fc08d', text: '#ffffff' }, // Green with white text
			SCSS: { bg: '#cf649a', text: '#ffffff' }, // Pink with white text
			Sass: { bg: '#cf649a', text: '#ffffff' }, // Pink with white text
			Markdown: { bg: '#083fa1', text: '#ffffff' }, // Dark blue with white text
			JSON: { bg: '#000000', text: '#ffffff' }, // Black with white text
			YAML: { bg: '#cb4b16', text: '#ffffff' }, // Red-orange with white text
			XML: { bg: '#0060ac', text: '#ffffff' }, // Blue with white text
			SQL: { bg: '#e38c00', text: '#000000' }, // Orange with black text
			'Jupyter Notebook': { bg: '#da5b0b', text: '#ffffff' }, // Orange with white text
		};
		
		const colorInfo = colors[lang];
		if (!colorInfo) {
			return { bg: '#cccccc', text: '#000000' };
		}
		
		return colorInfo;
	},

	// Helper method to get just the background color (for backwards compatibility)
	getLanguageBackgroundColor(lang) {
		return this.getLanguageColor(lang).bg;
	},

	// Helper method to get just the text color
	getLanguageTextColor(lang) {
		return this.getLanguageColor(lang).text;
	},
};
