import { getMdbInfo } from '@/utils/mdblist';
import { cleanSearchQuery } from '@/utils/search';
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import {
	createAxiosInstance,
	flattenAndRemoveDuplicates,
	groupByParsedTitle,
	scrapeResults,
} from './btdigg-v2';
import { ScrapeSearchResult } from './mediasearch';
import { PlanetScaleCache } from './planetscale';

type MovieScrapeJob = {
	title: string;
	originalTitle?: string;
	cleanedTitle?: string;
	year?: string;
};

const getMovieSearchResults = async (job: MovieScrapeJob) => {
	const http = createAxiosInstance(
		new SocksProxyAgent(process.env.PROXY!, { timeout: parseInt(process.env.REQUEST_TIMEOUT!) })
	);

	let sets: ScrapeSearchResult[][] = [];

	sets.push(await scrapeResults(http, `"${job.title}" ${job.year ?? ''}`, job.title, [], false));
	if (job.title.includes('&')) {
		sets.push(
			await scrapeResults(
				http,
				`"${job.title.replaceAll('&', 'and')}" ${job.year ?? ''}`,
				job.title,
				[],
				false
			)
		);
	}

	if (job.title.split(/\s/).length > 3) {
		sets.push(await scrapeResults(http, `"${job.title}"`, job.title, [], false));
	}

	if (job.originalTitle) {
		sets.push(
			await scrapeResults(
				http,
				`"${job.originalTitle}" ${job.year ?? ''}`,
				job.originalTitle,
				[],
				false
			)
		);
	}

	if (job.cleanedTitle) {
		sets.push(
			await scrapeResults(
				http,
				`"${job.cleanedTitle}" ${job.year ?? ''}`,
				job.cleanedTitle,
				[],
				false
			)
		);
	}

	return sets;
};

export async function scrapeMovies(
	imdbId: string,
	tmdbItem: any,
	db: PlanetScaleCache
): Promise<number> {
	console.log(`Scraping movie: ${tmdbItem.title} (${imdbId})...`);
	const cleanTitle = cleanSearchQuery(tmdbItem.title);
	const year = tmdbItem.release_date?.substring(0, 4);

	let originalTitle, cleanedTitle;
	if (tmdbItem.original_title && tmdbItem.original_title !== tmdbItem.title) {
		originalTitle = tmdbItem.original_title.toLowerCase();
		const mdbItem = await axios.get(getMdbInfo(imdbId));
		for (let rating of mdbItem.data.ratings) {
			if (rating.source === 'tomatoes') {
				if (!rating.url) continue;
				const tomatoTitle = (
					rating.url.includes('/m/')
						? rating.url.split('/m/')[1]
						: rating.url.split('/tv/')[1]
				).replaceAll('_', ' ');
				if (tomatoTitle.match(/^\d{6,}/)) continue;
				cleanedTitle = tomatoTitle
					.replaceAll(/[\W]+/g, ' ')
					.split(' ')
					.join(' ')
					.trim()
					.toLowerCase();
			}
		}
	}

	await db.saveScrapedResults(`processing:${imdbId}`, []);

	const searchResults = await getMovieSearchResults({
		title: cleanTitle,
		originalTitle,
		cleanedTitle,
		year,
	});
	let processedResults = flattenAndRemoveDuplicates(searchResults);
	if (processedResults.length) processedResults = groupByParsedTitle(processedResults);

	await db.saveScrapedResults<ScrapeSearchResult[]>(`movie:${imdbId}`, processedResults);
	console.log(`Saved ${processedResults.length} results for ${cleanTitle}`);

	await db.markAsDone(imdbId);

	return processedResults.length;
}
