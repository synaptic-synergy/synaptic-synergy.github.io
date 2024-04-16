<script lang="ts">
	import { range } from '$lib';
	import { DateTime } from 'luxon';
	import {
		login,
		fetchVideos,
		updateVideo,
		type Track,
		type Video,
		toSortedVideos,
		type Schedule
	} from './api';
	import TrackComponent from './TrackComponent.svelte';

	let isError = $state(false);
	let accessToken = $state<string>();
	let tracks = $state<Track[]>([]);

	$effect(() => {
		var params: Record<string, string> = {};
		var regex = /([^&=]+)=([^&]*)/g,
			m;
		while ((m = regex.exec(location.hash.substring(1)))) {
			params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
		}

		if ('error' in params) {
			isError = true;
		} else {
			if ('access_token' in params) {
				const expiration = Date.now() + Number(params.expires_in ?? 3599) * 1000;
				sessionStorage.setItem('token', params.access_token);
				sessionStorage.setItem('expiration', expiration.toString());
			}

			const storedAccessToken = sessionStorage.getItem('token') ?? undefined;
			const expiration = Number(sessionStorage.getItem('expiration') ?? 0);

			if (storedAccessToken !== undefined) {
				setTimeout(() => login(), Math.max(0, expiration - Date.now()));
			}
			accessToken = storedAccessToken;
		}
		location.replace('#');
		if (typeof history.replaceState == 'function') {
			history.replaceState({}, '', location.href.slice(0, -1));
		}
	});

	$effect(() => {
		for (const track of tracks) {
			for (const video of track.videos) {
				if (video.clientPublishAt?.toMillis() !== video.serverPublishAt?.toMillis()) {
					updateVideo(accessToken!, $state.snapshot(video));
					video.serverPublishAt = video.clientPublishAt;
				}
			}
		}
	});

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
		let videos = await fetchVideos(accessToken!);
		console.log(videos);
		tracks = [
			{ kind: 'unscheduled', videos: videos.filter((x) => x.clientPublishAt === undefined) }
		];
		videos = toSortedVideos(videos.filter((x) => x.clientPublishAt !== undefined));
		while (true) {
			const trackSuggestion = suggestTrack(videos);
			console.log({ trackSuggestion });
			if (
				trackSuggestion === undefined ||
				trackSuggestion.videos.length < (tracks.length === 1 ? 2 : 3)
			) {
				break;
			}
			tracks.push(trackSuggestion);
			videos = videos.filter((x) => !trackSuggestion.videos.includes(x));
		}
		tracks.splice(1, 0, {
			kind: 'aperiodic',
			videos
		});
	}

	function suggestTrack(videos: Video[]): Track | undefined {
		const byTime = (Object as any).groupBy(videos, (x: Video) =>
			x.clientPublishAt!.toLocaleString(DateTime.TIME_SIMPLE)
		);
		let maxLength = 1;
		let maxSchedule: Schedule | undefined = undefined;
		for (const vids of Object.values(byTime) as Video[][]) {
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

	function dummyLogin() {
		accessToken = 'dummy';
	}
</script>

{#if isError}
	Authorization error
{:else if accessToken === undefined}
	<p>
		Due to the quotas on YouTube API, I cannot just make this be publicly usable. You can try the
		app with dummy data. If you are a youtuber, and would like to use this tool, contact me and I
		will grant you access.
	</p>
	<p>
		<button onclick={dummyLogin}>Try using dummy data</button>
	</p>
	{accessToken}
	<p>
		<button onclick={login}>Let me login, I was granted access</button>
	</p>
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
