import { lcg, shuffle } from './seededShuffle';

const terms = [
	'🦸 action',
	'🗺️ adventure',
	'🌏 all',
	'🌳 amazon',
	'🎨 animated',
	'🎬 animation',
	'🌟 anticipated',
	'🍏 apple',
	'🔭 astronomy',
	'📖 base',
	'📺 bbc',
	'🏆 best',
	'👶 children',
	'💻 collection',
	'😂 comedies',
	'🎭 comedy',
	'🤪 crazy',
	'🔍 crime',
	'⏱️ current',
	'🌚 dark',
	'🐭 disney',
	'📚 documentaries',
	'🎥 documentary',
	'🎭 drama',
	'🐉 dreamworks',
	'🔭 exploration',
	'👨‍👩‍👧‍👦 family',
	'🧚 fantasy',
	'😊 feel',
	'🤯 freak',
	'😂 funny',
	'👍 good',
	'📺 hbo',
	'📚 history',
	'😱 horror',
	'📺 hulu',
	'🌟 imdb',
	'🎥 indie',
	'💡 inspired',
	'😲 intense',
	'👶 kids',
	'🆕 latest',
	'🔝 max',
	'🤯 mindfuck',
	'📈 most',
	'🎬 movie',
	'🎦 moviemeter',
	'🔍 mystery',
	'📺 netflix',
	'📼 nostalgic',
	'🌌 outer',
	'😆 parody',
	'🏴‍☠️ pirate',
	'🐠 pixar',
	'📜 plot',
	'🔝 popular',
	'📺 prime',
	'🤔 provoking',
	'🤪 quirky',
	'⭐ rated',
	'💿 bluray',
	'🆕 releases',
	'❤️ romantic',
	'🍅 rotten',
	'🔬 sci',
	'🪐 scifi',
	'📺 series',
	'📺 shows',
	'🌌 sky',
	'🚀 space',
	'📚 story',
	'😮 stunning',
	'🦸 superhero',
	'🔟 ten',
	'🧠 thought',
	'😱 thriller',
	'😲 thrilling',
	'⏳ time',
	'📰 today',
	'🍅 tomatoes',
	'🔝 top',
	'🧳 travel',
	'🌀 trippy',
	'🌀 twist',
	'👀 visual',
	'⚔️ war',
	'📺 watched',
	'📅 week',
	'🤯 weird',
	'🗾 japan',
	'🇰🇷 korea',
	'🇹🇭 thai',
	'🇨🇳 chinese',
	'🇩🇪 german',
	'🇬🇧 uk',
	'🇮🇳 india',
	'🇺🇸 america',
	'🇫🇷 french',
	'🇮🇹 italian',
	'🇪🇸 spanish',
	'🇷🇺 russia',
	'🇧🇷 brazil',
	'🇲🇽 mexican',
	'🇨🇦 canadian',
	'🇦🇺 australia',
	'🇸🇪 swedish',
	'🇳🇱 dutch',
	'🇹🇷 turkish',
	'🇮🇪 irish',
	'🇵🇱 polish',
	'🇧🇪 belgian',
	'🇨🇭 swiss',
	'🇳🇴 norwegian',
	'🇩🇰 danish',
	'🇫🇮 finnish',
	'🇬🇷 greek',
];

export const getTerms = (limit: number) => {
	let rng = lcg(new Date().getTime() / 1000 / 60 / 10);
	return shuffle(terms, rng).slice(0, limit);
};