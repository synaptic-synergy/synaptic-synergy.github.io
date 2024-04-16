import { buildURL } from '$lib';
import { DateTime } from 'luxon';
import { getInitDummyState } from './initDummyState';

export type TrackKind = 'unscheduled' | 'aperiodic' | 'new' | 'periodic';

export type TrackAny =
	| {
			kind: 'unscheduled' | 'aperiodic' | 'new';
			videos: Video[];
	  }
	| {
			kind: 'periodic';
			videos: Video[];
			schedule: Schedule;
	  };

export type Track<Kind extends TrackKind = TrackKind> = TrackAny & { kind: Kind };

export interface Schedule {
	start: DateTime;
	periodInDays: number;
}

export interface Video {
	id: string;
	name: string;
	thumbnail: string;
	status: any;
	serverPublishAt: DateTime | undefined;
	clientPublishAt: DateTime | undefined;
}

export function login() {
	const queryParams = {
		client_id: '163691415601-9dkcmmbel076laqtobf51j29u4nduq3a.apps.googleusercontent.com',
		redirect_uri: location.href,
		response_type: 'token',
		scope: 'https://www.googleapis.com/auth/youtube.force-ssl'
	};
	location.href = buildURL(`https://accounts.google.com/o/oauth2/v2/auth`, queryParams);
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
		const resp: any = await (
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
	if (accessToken === 'dummy') {
		const initDummyState = getInitDummyState();
		let dummyState = JSON.parse(localStorage.getItem('dummyState') ?? '[]') as Video[];
		if (dummyState.length < initDummyState.length - 3) {
			dummyState = initDummyState;
		}
		localStorage.setItem('dummyState', JSON.stringify(dummyState));
		dummyState.forEach((x) => {
			x.clientPublishAt =
				x.clientPublishAt == null ? undefined : DateTime.fromISO(x.clientPublishAt as any);
			x.serverPublishAt =
				x.serverPublishAt == null ? undefined : DateTime.fromISO(x.serverPublishAt as any);
		});
		return dummyState;
	}

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
	if (accessToken === 'dummy') {
		let dummyState = JSON.parse(localStorage.getItem('dummyState') ?? '[]') as Video[];
		dummyState = dummyState.filter((x) => x.id !== video.id);
		dummyState.push(video);
		localStorage.setItem('dummyState', JSON.stringify(dummyState));
		return {} as any;
	}

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
