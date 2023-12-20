import { bareUnrestrictLink } from '@/services/realDebrid';
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

const handler: NextApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
	const { app, token, link } = req.query;
	const resp = await bareUnrestrictLink(token as string, link as string);
	res.redirect(307, `${app}://${resp.download.replace('https://', '')}`);
};

export default handler;