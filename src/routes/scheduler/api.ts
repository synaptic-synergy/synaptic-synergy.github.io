import { buildURL } from '$lib';
import { DateTime } from 'luxon';

export type Track =
	| {
			kind: 'unscheduled' | 'aperiodic';
			videos: Video[];
	  }
	| {
			kind: 'periodic';
			videos: Video[];
			schedule: {
				start: DateTime;
				periodInDays: number;
			};
	  };

export interface Video {
	id: string;
	name: string;
	thumbnail: string;
	status: any;
	serverPublishAt: DateTime | undefined;
	clientPublishAt: DateTime | undefined;
}

export function cloneVideo(x: Video): Video {
	return { ...x };
}
export function cloneTrack(x: Track): Track {
	return {
		kind: x.kind,
		schedule: { ...(x as any).schedule },
		videos: x.videos.map((x) => ({
			...x,
			status: { ...x.status },
			serverPublishAt:
				x.serverPublishAt === undefined ? undefined : DateTime.fromISO(x.serverPublishAt.toISO()!),
			clientPublishAt:
				x.clientPublishAt === undefined ? undefined : DateTime.fromISO(x.clientPublishAt.toISO()!)
		}))
	};
}

export function toSortedVideos(x: Video[]): Video[] {
	return x.toSorted((a, b) => a.clientPublishAt!.toSeconds() - b.clientPublishAt!.toSeconds());
}

export function formatDate(x: DateTime | undefined) {
	if (x === undefined) return '';
	return x.setZone('system').toLocaleString(DateTime.DATETIME_SHORT);
}

export async function fetchAll(resource: string, opts: Record<string, string>) {
	let pageToken = undefined;
	const res: any[] = [];
	while (true) {
		let resp: any = await (
			await fetch(
				buildURL(`https://www.googleapis.com/youtube/v3/${resource}`, {
					...opts,
					maxResults: '50',
					pageToken
				})
			)
		).json();
		pageToken = resp.nextPageToken;
		res.push(...resp.items);
		if (pageToken === undefined) break;
	}
	return res;
}

export async function fetchVideos(accessToken: string): Promise<Video[]> {
	const channel = (
		await fetchAll('channels', {
			part: 'snippet,contentDetails',
			mine: 'true',
			access_token: accessToken
		})
	)[0];
	const uploadedPlaylist = channel.contentDetails.relatedPlaylists.uploads;
	const videoIds = (
		await fetchAll('playlistItems', {
			part: 'snippet,status',
			playlistId: uploadedPlaylist,
			access_token: accessToken
		})
	)
		.filter(
			(x) => x.status.privacyStatus === 'private' && x.snippet.resourceId.kind === 'youtube#video'
		)
		.map((x) => x.snippet.resourceId.videoId);
	return (
		await fetchAll('videos', {
			part: 'snippet,status',
			id: videoIds.join(','),
			access_token: accessToken
		})
	).map((x) => ({
		id: x.id,
		name: x.snippet.title,
		thumbnail: x.snippet.thumbnails.default.url,
		status: x.status,
		serverPublishAt:
			x.status.publishAt == undefined ? undefined : DateTime.fromISO(x.status.publishAt),
		clientPublishAt:
			x.status.publishAt == undefined ? undefined : DateTime.fromISO(x.status.publishAt)
	}));
}

export function updateVideo(accessToken: string, video: Video) {
	return fetch(
		buildURL('https://www.googleapis.com/youtube/v3/videos', {
			part: 'status',
			access_token: accessToken
		}),
		{
			method: 'PUT',
			body: JSON.stringify({
				id: video.id,
				status: {
					...video.status,
					publishAt: video.clientPublishAt?.toUTC().toISO(),
					privacyStatus: 'private'
				}
			})
		}
	);
}
