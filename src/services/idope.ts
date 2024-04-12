import { meetsTitleConditions } from '@/utils/checks';
import { ScrapeSearchResult } from './mediasearch';
import { ScrapeBrowser } from './puppeteer';

const hostname = process.env.IDOPE ?? 'https://idope.se';

const createSearchUrl = (finalQuery: string) => {
	return `${hostname}/torrent-list/${encodeURIComponent(finalQuery)}/?c=1,2,3&o=-3`;
};

const processPage = async (
	finalQuery: string,
	targetTitle: string,
	years: string[]
): Promise<ScrapeSearchResult[]> => {
	const MAX_RETRIES = 5; // maximum number of retries

	let results: ScrapeSearchResult[] = [];
	let retries = 0; // current number of retries
	let responseData = '';
	const searchUrl = createSearchUrl(finalQuery);
	let page = 1;
	const scraper = new ScrapeBrowser();
	await scraper.launch();
	const cookiePg = await scraper.browser?.newPage();
	await cookiePg!.setCookie({
		name: 'cf_clearance',
		value: 'bs6X1CnKU8NjFuy4d_LbyzKu5AZ14MeJH94ADGbVZsM-1712929344-1.0.1.1-pPYpl9s1izi3yRZhZjCYQIbq_HsGwTH1ztIvdlxOqMCtA9GgJq6JATqHzYwyyICieWSmT.ttlQdJjZEBB2xHOg',
		domain: '.idope.se',
	});
	while (true) {
		try {
			const pg = await scraper.browser?.newPage();
			await pg!.goto(`${searchUrl}&p=${page}`, { waitUntil: 'domcontentloaded' });
			await pg!.waitForSelector('#top-banner', { timeout: 10000 });
			const response = await pg!.content();
			responseData = responseData + response;
			console.log('response', response.length);
			await pg!.close();
			// count if there are 10 instances of 'MAGNET URI' on the page
			if ((responseData.match(/MAGNET URI/g) || []).length >= 10 * page) {
				page++;
				console.log('Next page found, continuing search', page);
				continue;
			}
			break;
		} catch (error: any) {
			console.log('IDope request error:', error.message, searchUrl);
			retries++;
			if (retries >= MAX_RETRIES) {
				console.error(`Max retries reached (${MAX_RETRIES}), aborting search`);
				return results;
			}
			await new Promise((resolve) => setTimeout(resolve, 10000 * retries));
		}
	}
	await scraper.close();

	// get all titles from page by regex matching
	const titleMatches = Array.from(
		responseData.matchAll(/<div id="hidename\d+" class="hideinfohash">(.*?)<\/div>/gs)
	);
	const titles = titleMatches.map((match) => match[1]).map((title) => title.trim());

	// get all magnet links
	const hashMatches = Array.from(
		responseData.matchAll(/<div id="hideinfohash\d+" class="hideinfohash">([A-Fa-f0-9]{40})/gs)
	);
	const hashes = hashMatches
		.map((match) => match[1])
		.map((title) => title.trim().toLocaleLowerCase());

	// <div class="resultdivbottonlength">3.9&nbsp;GB</div>
	const sizeMatches = Array.from(
		responseData.matchAll(/<div class="resultdivbottonlength">(.*?)<\/div>/gs)
	);
	const sizes = sizeMatches
		.map((match) => match[1])
		.map((size) => {
			// replace &nbsp; with space
			size = size.replace(/&nbsp;/g, ' ');
			const [num, unit] = size.split(' ');
			switch (unit) {
				case 'KB':
					return parseFloat(num) / 1024;
				case 'MB':
					return parseFloat(num);
				case 'GB':
					return parseFloat(num) * 1024;
				case 'TB':
					return parseFloat(num) * 1024 * 1024;
				default:
					return parseFloat(num);
			}
		});

	// combine titles and hashes into an array of objects
	results = titles
		.map((title, index) => ({
			title,
			hash: hashes[index],
			fileSize: sizes[index],
		}))
		.filter(({ fileSize }) => fileSize > 10)
		.filter(({ title }) => meetsTitleConditions(targetTitle, years, title));

	console.log(`🏳️‍🌈 IDope search returned ${results.length} for ${finalQuery}`, results);

	return results;
};

export async function scrapeIDope(
	finalQuery: string,
	targetTitle: string,
	years: string[],
	airDate: string
): Promise<ScrapeSearchResult[]> {
	console.log(`🔍 Searching IDope: ${finalQuery}`);
	try {
		return await processPage(finalQuery, targetTitle, years);
	} catch (error) {
		console.error('scrapeIDope page processing error', error);
	}
	return [];
}