import { useCurrentUser } from '@/hooks/auth';
import { DeleteUserTorrentDB } from '@/torrent/db';
import { landscapeMode } from '@/utils/landscapeMode';
import { libraryToastOptions } from '@/utils/toastOptions';
import { withAuth } from '@/utils/withAuth';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';

function IndexPage() {
	useEffect(landscapeMode, []);

	const router = useRouter();
	const { realDebrid: rdUser, allDebrid: adUser, rdError, adError } = useCurrentUser();

	useEffect(() => {
		if (rdError) {
			toast.error(
				'Real-Debrid get user info failed, check your email and confirm the login coming from DMM'
			);
		}
		if (adError) {
			toast.error(
				'AllDebrid get user info failed, check your email and confirm the login coming from DMM'
			);
		}
	}, [rdError, adError]);

	const handleHashListClick = () => {
		const newTab = window.open('https://hashlists.debridmediamanager.com', '_blank');
		newTab?.focus();
	};

	const handleLogout = (prefix?: string) => {
		if (prefix) {
			let i = localStorage.length - 1;
			while (i >= 0) {
				const key = localStorage.key(i);
				if (key && key.startsWith(prefix)) localStorage.removeItem(key);
				i--;
			}

			router.reload();
		} else {
			localStorage.clear();
			router.push('/start');
		}
	};

	const handleClearCache = async () => {
		await DeleteUserTorrentDB();
		toast.success(`Library cache cleared, please check again`, libraryToastOptions);
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen">
			<Head>
				<title>Debrid Media Manager - Home</title>
			</Head>
			<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 200 200">
				<rect x="25" y="25" width="150" height="150" fill="#2C3E50" rx="20" ry="20" />
				<circle cx="100" cy="100" r="60" fill="#00A0B0" />
				<path d="M85,65 L85,135 L135,100 Z" fill="#ECF0F1" />
				<path d="M60,90 Q80,60 100,90 T140,90" fill="#CC333F" />
				<path
					d="M75,121 L80,151 L90,136 L100,151 L110,136 L120,151 L125,121 Z"
					fill="#EDC951"
				/>
			</svg>
			<Toaster position="bottom-right" />
			{/* this is made by ChatGPT */}
			{rdUser || adUser ? (
				<>
					<h1 className="text-2xl font-bold mb-4">Debrid Media Manager</h1>
					<div className="flex flex-col items-center">
						<p className="text-lg font-bold mb-4">
							Welcome back,{' '}
							{rdUser ? (
								<>
									Real-Debrid: {rdUser.username} {rdUser.premium ? '✅' : '❌'}
								</>
							) : (
								<Link
									href="/realdebrid/login"
									className="px-4 py-2 m-2 text-sm text-white bg-gray-500 rounded hover:bg-gray-600"
								>
									Login with Real-Debrid
								</Link>
							)}{' '}
							{adUser ? (
								<>
									AllDebrid: {adUser.username} {adUser.isPremium ? '✅' : '❌'}
								</>
							) : (
								<Link
									href="/alldebrid/login"
									className="px-4 py-2 m-2 text-white bg-gray-500 rounded hover:bg-gray-600"
								>
									Login with AllDebrid
								</Link>
							)}
						</p>

						<p className="text-sm mb-4">
							Besides the 10+ million torrents indexed (as of December 2023), no other
							data is stored
						</p>

						<hr className="w-full mb-4" />

						<div className="flex mb-4">
							<Link
								href="/library"
								className="mr-2 bg-cyan-800 hover:bg-cyan-700 text-white font-bold py-1 px-2 rounded"
							>
								📚 My Library
							</Link>

							<button
								className="mr-2 bg-cyan-800 hover:bg-cyan-700 text-white font-bold py-1 px-2 rounded"
								onClick={handleHashListClick}
							>
								#️⃣ Hash list browser
							</button>

							<Link
								href="/search"
								className="mr-2 bg-blue-800 hover:bg-blue-700 text-yellow-200 font-bold py-1 px-2 rounded border-2 border-yellow-200"
							>
								🔎 Improved Search
							</Link>

							<Link
								href="/browse/recent"
								className="mr-2 bg-blue-800 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
							>
								⏰ Recently Updated
							</Link>

							<Link
								href="/browse"
								className="mr-2 bg-blue-800 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
							>
								🌐 Browse
							</Link>
						</div>

						<div className="flex mb-4">
							{/* <button
								className="mr-2 bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded text-sm"
								onClick={() => router.push('/fixer')}
							>
								Fix playback or scan problems
							</button> */}
							<button
								className="mr-2 bg-orange-500 hover:bg-orange-700 text-white font-bold py-1 px-2 rounded text-sm"
								onClick={() => handleClearCache()}
							>
								Missing library items?
							</button>
							{rdUser && (
								<button
									className="mr-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
									onClick={() => handleLogout('rd:')}
								>
									Logout Real-Debrid
								</button>
							)}
							{adUser && (
								<button
									className="mr-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
									onClick={() => handleLogout('ad:')}
								>
									Logout AllDebrid
								</button>
							)}
						</div>
						<hr className="w-full mb-4" />
						<div className="text-sm text-center mb-4">
							Get your movies straight from{' '}
							<b>
								<a href="https://www.imdb.com/chart/top/" target="_blank">
									IMDB
								</a>
							</b>{' '}
							or{' '}
							<b>
								<a href="https://mdblist.com/" target="_blank">
									MDBList
								</a>
							</b>{' '}
							with{' '}
							<span className="bg-green-100 text-green-800 px-1">
								<b>DMM browser extensions</b>
							</span>{' '}
							for{' '}
							<b>
								<a
									className="underline"
									href="https://chromewebstore.google.com/detail/debrid-media-manager/fahmnboccjgkbeeianfdiohbbgmgoibb"
									target="_blank"
								>
									Chrome
								</a>
							</b>{' '}
							and{' '}
							<b>
								<a
									className="underline"
									href="https://addons.mozilla.org/en-US/firefox/addon/debrid-media-manager/"
									target="_blank"
								>
									Firefox
								</a>
							</b>
						</div>
						<div className="text-sm text-center mb-4">
							<a
								className="underline"
								href="https://github.com/debridmediamanager/zurg-testing"
								target="_blank"
							>
								<span className="bg-purple-100 text-purple-800 px-1">
									<b>zurg</b>
								</span>{' '}
								<b>beta is out</b>!
							</a>{' '}
							Mount your Real-Debrid library and play your files directly from your
							computer.
						</div>
						<div className="text-sm text-center mb-4">
							<a
								className="text-azure"
								href="https://www.reddit.com/r/debridmediamanager/"
								target="_blank"
							>
								🤖 r/debridmediamanager
							</a>{' '}
							🤝 Sponsor this project&apos;s development on{' '}
							<a
								className="underline"
								href="https://github.com/sponsors/debridmediamanager"
								target="_blank"
							>
								Github
							</a>{' '}
							|{' '}
							<a
								className="underline"
								href="https://www.patreon.com/debridmediamanager"
								target="_blank"
							>
								Patreon
							</a>{' '}
							|{' '}
							<a
								className="underline"
								href="https://paypal.me/yowmamasita"
								target="_blank"
							>
								Paypal
							</a>
						</div>
					</div>
				</>
			) : (
				<h1 className="text-2xl font-bold">Debrid Media Manager is loading...</h1>
			)}
		</div>
	);
}

export default withAuth(IndexPage);
