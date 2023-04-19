import { useAllDebridApiKey, useRealDebridAccessToken } from '@/hooks/auth';
import useLocalStorage from '@/hooks/localStorage';
import { uploadMagnet } from '@/services/allDebrid';
import { addHashAsMagnet, deleteTorrent, getTorrentInfo, selectFiles } from '@/services/realDebrid';
import { runConcurrentFunctions } from '@/utils/batch';
import { CachedTorrentInfo } from '@/utils/cachedTorrentInfo';
import { getMediaId } from '@/utils/mediaId';
import { getMediaType } from '@/utils/mediaType';
import getReleaseTags from '@/utils/score';
import { getSelectableFiles, isVideo } from '@/utils/selectable';
import { withAuth } from '@/utils/withAuth';
import { filenameParse, ParsedFilename } from '@ctrl/video-filename-parser';
import lzString from 'lz-string';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';

const ONE_GIGABYTE = 1024 * 1024 * 1024;

interface TorrentHash {
	filename: string;
	hash: string;
	bytes: number;
}

interface UserTorrent extends TorrentHash {
	title: string;
	score: number;
	mediaType: 'movie' | 'tv';
	info: ParsedFilename;
}

interface SortBy {
	column: 'filename' | 'title' | 'bytes' | 'score';
	direction: 'asc' | 'desc';
}

function TorrentsPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [filtering, setFiltering] = useState(false);
	const [grouping, setGrouping] = useState(false);

	const [userTorrentsList, setUserTorrentsList] = useState<UserTorrent[]>([]);
	const [filteredList, setFilteredList] = useState<UserTorrent[]>([]);
	const [sortBy, setSortBy] = useState<SortBy>({ column: 'title', direction: 'asc' });

	const rdKey = useRealDebridAccessToken();
	const adKey = useAllDebridApiKey();

	const [movieCount, setMovieCount] = useState<number>(0);
	const [tvCount, setTvCount] = useState<number>(0);
	const [movieGrouping] = useState<Record<string, number>>({});
	const [tvGroupingByEpisode] = useState<Record<string, number>>({});
	const [tvGroupingByTitle] = useState<Record<string, number>>({});
	const [hasDupes] = useState<Array<string>>([]);
	const [totalBytes, setTotalBytes] = useState<number>(0);
	const [torrentCache, setTorrentCache] = useLocalStorage<Record<string, CachedTorrentInfo>>(
		'userTorrentsList',
		{}
	);

	const getUserTorrentsList = async (): Promise<TorrentHash[]> => {
		const hash = window.location.hash;
		if (!hash) return [];
		const jsonString = lzString.decompressFromEncodedURIComponent(hash.substring(1));
		return JSON.parse(jsonString) as TorrentHash[];
	};

	// fetch list from api
	useEffect(() => {
		(async () => {
			try {
				const torrents = (await getUserTorrentsList()).map((torrent) => {
					const mediaType = getMediaType(torrent.filename);
					const info =
						mediaType === 'movie'
							? filenameParse(torrent.filename)
							: filenameParse(torrent.filename, true);

					return {
						score: getReleaseTags(torrent.filename, torrent.bytes / ONE_GIGABYTE).score,
						info,
						mediaType,
						title: getMediaId(info, mediaType, false),
						...torrent,
					};
				}) as UserTorrent[];

				setUserTorrentsList(torrents);
			} catch (error) {
				setUserTorrentsList([]);
				toast.error('Error fetching user torrents list');
			} finally {
				setLoading(false);
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rdKey]);

	// aggregate metadata
	useEffect(() => {
		setGrouping(true);
		setMovieCount(0);
		setTvCount(0);
		setTotalBytes(0);

		let tmpTotalBytes = 0;
		clearGroupings(movieGrouping);
		clearGroupings(tvGroupingByEpisode);
		for (const t of userTorrentsList) {
			tmpTotalBytes += t.bytes;
			const mediaId = getMediaId(t.info, t.mediaType);
			if (mediaId in getGroupings(t.mediaType)) {
				if (getGroupings(t.mediaType)[mediaId] === 1) hasDupes.push(mediaId);
				getGroupings(t.mediaType)[mediaId]++;
			} else {
				getGroupings(t.mediaType)[mediaId] = 1;
			}
			if (t.mediaType === 'tv') {
				const title = getMediaId(t.info, t.mediaType, true, true);
				if (title in tvGroupingByTitle) {
					tvGroupingByTitle[title]++;
				} else {
					tvGroupingByTitle[title] = 1;
				}
			}
		}

		setMovieCount(Object.keys(movieGrouping).length);
		setTvCount(Object.keys(tvGroupingByTitle).length);
		setTotalBytes(tmpTotalBytes);
		setGrouping(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userTorrentsList]);

	// set the list you see
	useEffect(() => {
		setFiltering(true);
		if (Object.keys(router.query).length === 0) {
			setFilteredList(userTorrentsList);
			setFiltering(false);
			return;
		}
		const { filter: titleFilter, mediaType } = router.query;
		let tmpList = userTorrentsList;
		if (titleFilter) {
			const decodedTitleFilter = decodeURIComponent(titleFilter as string);
			tmpList = tmpList.filter((t) => decodedTitleFilter === getMediaId(t.info, t.mediaType));
			setFilteredList(tmpList);
		}
		if (mediaType) {
			tmpList = tmpList.filter((t) => mediaType === t.mediaType);
			setFilteredList(tmpList);
		}
		setFiltering(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router.query, userTorrentsList, movieGrouping, tvGroupingByEpisode]);

	function handleSort(column: typeof sortBy.column) {
		setSortBy({
			column,
			direction: sortBy.column === column && sortBy.direction === 'asc' ? 'desc' : 'asc',
		});
	}

	function sortedData() {
		if (!sortBy.column) {
			return filteredList;
		}
		filteredList.sort((a, b) => {
			const isAsc = sortBy.direction === 'asc';
			let comparison = 0;
			if (a[sortBy.column] > b[sortBy.column]) {
				comparison = 1;
			} else if (a[sortBy.column] < b[sortBy.column]) {
				comparison = -1;
			}
			return isAsc ? comparison : comparison * -1;
		});
		return filteredList;
	}

	const getGroupings = (mediaType: UserTorrent['mediaType']) =>
		mediaType === 'tv' ? tvGroupingByEpisode : movieGrouping;

	function clearGroupings(frequencyMap: { [x: string]: number }) {
		for (let key in frequencyMap) {
			delete frequencyMap[key];
		}
	}

	const handleAddAsMagnetInRd = async (hash: string, disableToast: boolean = false) => {
		try {
			if (!rdKey) throw new Error('no_rd_key');
			const id = await addHashAsMagnet(rdKey, hash);
			if (!disableToast) toast.success('Successfully added as magnet!');
			setTorrentCache(
				(prev) =>
					({ ...prev, [hash]: { hash, status: 'downloading' } } as Record<
						string,
						CachedTorrentInfo
					>)
			);
			handleSelectFiles(id, true);
		} catch (error) {
			if (!disableToast)
				toast.error(
					'There was an error adding as magnet in Real-Debrid. Please try again.'
				);
			throw error;
		}
	};

	const handleAddAsMagnetInAd = async (hash: string, disableToast: boolean = false) => {
		try {
			if (!rdKey) throw new Error('no_rd_key');
			await uploadMagnet(rdKey, [hash]);
			if (!disableToast) toast.success('Successfully added as magnet!');
			setTorrentCache(
				(prev) =>
					({ ...prev, [hash]: { hash, status: 'downloading' } } as Record<
						string,
						CachedTorrentInfo
					>)
			);
		} catch (error) {
			if (!disableToast)
				toast.error('There was an error adding as magnet in AllDebrid. Please try again.');
			throw error;
		}
	};

	function wrapDownloadFilesInRdFn(t: UserTorrent) {
		return async () => await handleAddAsMagnetInRd(t.hash, true);
	}

	function wrapDownloadFilesInAdFn(t: UserTorrent) {
		return async () => await handleAddAsMagnetInAd(t.hash, true);
	}

	async function downloadNonDupeTorrentsInRd() {
		const libraryHashes = Object.keys(torrentCache!);
		const yetToDownload = filteredList
			.filter((t) => !libraryHashes.includes(t.hash))
			.map(wrapDownloadFilesInRdFn);
		const [results, errors] = await runConcurrentFunctions(yetToDownload, 5, 500);
		if (errors.length) {
			toast.error(`Error downloading files on ${errors.length} torrents`);
		}
		if (results.length) {
			toast.success(`Started downloading ${results.length} torrents`);
		}
		if (!errors.length && !results.length) {
			toast('Everything has been downloaded', { icon: '👏' });
		}
	}

	async function downloadNonDupeTorrentsInAd() {
		const libraryHashes = Object.keys(torrentCache!);
		const yetToDownload = filteredList
			.filter((t) => !libraryHashes.includes(t.hash))
			.map(wrapDownloadFilesInAdFn);
		const [results, errors] = await runConcurrentFunctions(yetToDownload, 5, 500);
		if (errors.length) {
			toast.error(`Error downloading files on ${errors.length} torrents`);
		}
		if (results.length) {
			toast.success(`Started downloading ${results.length} torrents`);
		}
		if (!errors.length && !results.length) {
			toast('Everything has been downloaded', { icon: '👏' });
		}
	}

	const inLibrary = (hash: string) => hash in torrentCache!;
	const notInLibrary = (hash: string) => !inLibrary(hash);
	const isDownloaded = (hash: string) =>
		inLibrary(hash) && torrentCache![hash].status === 'downloaded';
	const isDownloading = (hash: string) =>
		inLibrary(hash) && torrentCache![hash].status !== 'downloaded';

	const handleDeleteTorrent = async (id: string, disableToast: boolean = false) => {
		try {
			if (!rdKey) throw new Error('no_rd_key');
			await deleteTorrent(rdKey, id);
			if (!disableToast) toast.success(`Download canceled (${id.substring(0, 3)})`);
			setTorrentCache((prevCache) => {
				const updatedCache = { ...prevCache };
				const hash = Object.keys(updatedCache).find((key) => updatedCache[key].id === id);
				delete updatedCache[hash!];
				return updatedCache;
			});
		} catch (error) {
			if (!disableToast) toast.error(`Error deleting torrent (${id.substring(0, 3)})`);
			throw error;
		}
	};

	const handleSelectFiles = async (id: string, disableToast: boolean = false) => {
		try {
			if (!rdKey) throw new Error('no_rd_key');
			const response = await getTorrentInfo(rdKey, id);

			const selectedFiles = getSelectableFiles(response.files.filter(isVideo)).map(
				(file) => file.id
			);
			if (selectedFiles.length === 0) {
				handleDeleteTorrent(id, true);
				throw new Error('no_files_for_selection');
			}

			await selectFiles(rdKey, id, selectedFiles);
		} catch (error) {
			if ((error as Error).message === 'no_files_for_selection') {
				if (!disableToast)
					toast.error(`No files for selection, deleting (${id.substring(0, 3)})`, {
						duration: 5000,
					});
			} else {
				if (!disableToast) toast.error(`Error selecting files (${id.substring(0, 3)})`);
			}
			throw error;
		}
	};

	return (
		<div className="mx-4 my-8">
			<Head>
				<title>
					Debrid Media Manager - Hash list:{' '}
					{(totalBytes / ONE_GIGABYTE / 1024).toFixed(1)} TB
				</title>
			</Head>
			<Toaster position="top-right" />
			<div className="flex justify-between items-center mb-4">
				<h1 className="text-3xl font-bold">
					Share this page ({userTorrentsList.length} files in total; size:{' '}
					{(totalBytes / ONE_GIGABYTE / 1024).toFixed(1)} TB)
				</h1>
				<Link
					href="/"
					className="text-2xl bg-cyan-800 hover:bg-cyan-700 text-white py-1 px-2 rounded"
				>
					Go Home
				</Link>
			</div>
			<div className="mb-4">
				<Link
					href="/hashlist?mediaType=movie"
					className="mr-2 mb-2 bg-sky-800 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded"
				>
					Show {movieCount} movies
				</Link>
				<Link
					href="/hashlist?mediaType=tv"
					className="mr-2 mb-2 bg-sky-800 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded"
				>
					Show {tvCount} TV shows
				</Link>
				{rdKey && (
					<button
						className={`mr-2 mb-2 bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded ${
							filteredList.length === 0 ? 'opacity-60 cursor-not-allowed' : ''
						}`}
						onClick={downloadNonDupeTorrentsInRd}
						disabled={filteredList.length === 0}
					>
						Download all torrents in Real-Debrid
					</button>
				)}
				{adKey && (
					<button
						className={`mr-2 mb-2 bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded ${
							filteredList.length === 0 ? 'opacity-60 cursor-not-allowed' : ''
						}`}
						onClick={downloadNonDupeTorrentsInAd}
						disabled={filteredList.length === 0}
					>
						Download all torrents in AllDebrid
					</button>
				)}

				{Object.keys(router.query).length !== 0 && (
					<Link
						href="/hashlist"
						className="mr-2 mb-2 bg-yellow-400 hover:bg-yellow-500 text-black py-2 px-4 rounded"
					>
						Clear filter
					</Link>
				)}
			</div>
			<div className="overflow-x-auto">
				{loading || grouping || filtering ? (
					<div className="flex justify-center items-center mt-4">
						<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
					</div>
				) : (
					<table className="w-full">
						<thead>
							<tr>
								<th
									className="px-4 py-2 cursor-pointer"
									onClick={() => handleSort('title')}
								>
									Title{' '}
									{sortBy.column === 'title' &&
										(sortBy.direction === 'asc' ? '↑' : '↓')}
								</th>
								<th
									className="px-4 py-2 cursor-pointer"
									onClick={() => handleSort('bytes')}
								>
									Size{' '}
									{sortBy.column === 'bytes' &&
										(sortBy.direction === 'asc' ? '↑' : '↓')}
								</th>
								<th
									className="px-4 py-2 cursor-pointer"
									onClick={() => handleSort('score')}
								>
									Score{' '}
									{sortBy.column === 'score' &&
										(sortBy.direction === 'asc' ? '↑' : '↓')}
								</th>
								<th className="px-4 py-2">Actions</th>
							</tr>
						</thead>
						<tbody>
							{sortedData().map((t) => {
								const groupCount = getGroupings(t.mediaType)[
									getMediaId(t.info, t.mediaType)
								];
								const filterText =
									groupCount > 1 && !router.query.filter
										? `${groupCount - 1} other file${
												groupCount === 1 ? '' : 's'
										  }`
										: '';
								return (
									<tr
										key={t.hash}
										className={`
									hover:bg-yellow-100
									border-t-2
									${isDownloaded(t.hash) && 'bg-green-100'}
									${isDownloading(t.hash) && 'bg-red-100'}
								`}
									>
										<td className="border px-4 py-2">
											<strong>{t.title}</strong>{' '}
											<Link
												className="text-sm text-green-600 hover:text-green-800"
												href={`/hashlist?filter=${getMediaId(
													t.info,
													t.mediaType
												)}`}
											>
												{filterText}
											</Link>{' '}
											<Link
												target="_blank"
												className="text-sm text-blue-600 hover:text-blue-800"
												href={`/search?query=${getMediaId(
													t.info,
													t.mediaType
												)}`}
											>
												Search again
											</Link>
											<br />
											{t.filename}
										</td>
										<td className="border px-4 py-2">
											{(t.bytes / ONE_GIGABYTE).toFixed(1)} GB
										</td>
										<td className="border px-4 py-2">{t.score.toFixed(1)}</td>
										<td className="border px-4 py-2">
											{(isDownloaded(t.hash) || isDownloading(t.hash)) &&
												`${torrentCache![t.hash].status}`}
											{rdKey && notInLibrary(t.hash) && (
												<button
													className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
													onClick={() => {
														handleAddAsMagnetInRd(t.hash);
													}}
												>
													Download in RD
												</button>
											)}
											{adKey && notInLibrary(t.hash) && (
												<button
													className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
													onClick={() => {
														handleAddAsMagnetInAd(t.hash);
													}}
												>
													Download in AD
												</button>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

export default withAuth(TorrentsPage);
