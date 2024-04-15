<script lang="ts">
	import { buildURL } from '$lib';
	import { DateTime } from 'luxon';
	import { fetchVideos, updateVideo, type Track, type Video, toSortedVideos } from './api';
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

	async function fetchVideosEffect() {
		const _videos = await fetchVideos(accessToken!);
		tracks = [
			{ kind: 'unscheduled', videos: _videos.filter((x) => x.clientPublishAt === undefined) },
			{
				kind: 'aperiodic',
				videos: toSortedVideos(_videos.filter((x) => x.clientPublishAt !== undefined))
			}
		];
	}

	function addTrack() {
		tracks = [
			...tracks,
			{
				kind: 'periodic',
				videos: [],
				schedule: {
					periodInDays: 1,
					start: DateTime.now().plus({ days: 100 })
				}
			}
		];
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
			<div><button onclick={addTrack}>Add track</button></div>
		</div>
	{/await}
{/if}

<style>
	.tracks {
		display: flex;
	}
</style>
