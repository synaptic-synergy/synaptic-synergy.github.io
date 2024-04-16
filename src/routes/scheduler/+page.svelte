<script lang="ts">
	import { buildURL, range } from '$lib';
	import { DateTime } from 'luxon';
	import {
		fetchVideos,
		updateVideo,
		type Track,
		type Video,
		toSortedVideos,
		type Schedule
	} from './api';
	import TrackComponent from './TrackComponent.svelte';

	let accessToken = $state<string>();
	let tracks = $state<Track[]>([]);

	function login() {
		const queryParams = {
			client_id: '163691415601-9dkcmmbel076laqtobf51j29u4nduq3a.apps.googleusercontent.com',
			redirect_uri: window.location.href,
			response_type: 'token',
			scope: 'https://www.googleapis.com/auth/youtube'
		};
		window.location.href = buildURL(`https://accounts.google.com/o/oauth2/v2/auth`, queryParams);
	}

	$effect(() => {
		var params: Record<string, string> = {};
		var regex = /([^&=]+)=([^&]*)/g,
			m;
		while ((m = regex.exec(location.hash.substring(1)))) {
			params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
		}
		if ('access_token' in params) {
			accessToken = params.access_token;
		} else {
			login();
		}
	});

	$effect(() => {
		for (const track of tracks) {
			for (const video of track.videos) {
				if (video.clientPublishAt?.toMillis() !== video.serverPublishAt?.toMillis()) {
					//updateVideo(accessToken!, video);
					console.log('Updating', video.name);
					video.serverPublishAt = video.clientPublishAt;
				}
			}
		}
	});

	$inspect(tracks);

	$effect(() => {
		if (tracks.length > 2 && tracks.at(-1)?.kind !== 'new')
			tracks.push({
				kind: 'new',
				videos: []
			});
		const validPredicate = (x: Track) => x.kind !== 'periodic' || x.videos.length > 0;
		if (!tracks.every(validPredicate)) {
			tracks = tracks.filter(validPredicate);
		}
	});

	async function fetchVideosEffect() {
		let _videos = await fetchVideos(accessToken!);
		tracks = [
			{ kind: 'unscheduled', videos: _videos.filter((x) => x.clientPublishAt === undefined) }
		];
		_videos = toSortedVideos(_videos.filter((x) => x.clientPublishAt !== undefined));
		while (true) {
			const trackSuggestion = suggestTrack(_videos);
			console.log(trackSuggestion);
			if (
				trackSuggestion === undefined ||
				trackSuggestion.videos.length < (tracks.length === 1 ? 2 : 3)
			) {
				break;
			}
			tracks.push(trackSuggestion);
			_videos = _videos.filter((x) => !trackSuggestion.videos.includes(x));
		}
		tracks.splice(1, 0, {
			kind: 'aperiodic',
			videos: _videos
		});
	}

	function suggestTrack(videos: Video[]): Track | undefined {
		const byTime = (Object as any).groupBy(videos, (x: Video) =>
			x.clientPublishAt!.toLocaleString(DateTime.TIME_SIMPLE)
		);
		let maxLength = 1;
		let maxSchedule: Schedule | undefined = undefined;
		for (const [time, vids] of Object.entries(byTime) as [string, Video[]][]) {
			for (const period of range(1, 14)) {
				let currentStart = vids[0].serverPublishAt!;
				let currentLength = 1;
				vids.forEach((v, i) => {
					if (i === 0) return;
					if (
						vids[i - 1].clientPublishAt!.plus({ days: period }).toMillis() ===
						v.clientPublishAt!.toMillis()
					) {
						currentLength++;
					} else {
						if (currentLength > maxLength) {
							maxLength = currentLength;
							maxSchedule = {
								start: currentStart,
								periodInDays: period
							};
							currentStart = v.serverPublishAt!;
							currentLength = 1;
						}
					}
				});
				if (currentLength > maxLength) {
					maxLength = currentLength;
					maxSchedule = {
						start: currentStart,
						periodInDays: period
					};
				}
			}
		}
		if (maxSchedule === undefined) return undefined;
		return {
			kind: 'periodic',
			schedule: maxSchedule,
			videos: range(maxLength).map(
				(i) =>
					videos.find(
						(v) =>
							v.clientPublishAt!.toMillis() ===
							maxSchedule!.start.plus({ days: i * maxSchedule!.periodInDays }).toMillis()
					)!
			)
		};
	}
</script>

{#if accessToken === undefined}
	Redirecting to login page...
{:else}
	{#await fetchVideosEffect()}
		Loading videos...
	{:then}
		<div class="tracks">
			{#each tracks as _, i}
				<TrackComponent bind:track={tracks[i]} />
			{/each}
		</div>
	{/await}
{/if}

<style>
	.tracks {
		display: flex;
	}
</style>
