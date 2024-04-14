<script lang="ts">
	import { buildURL } from '$lib';
	import { dndzone } from 'svelte-dnd-action';
	import { DateTime } from 'luxon';
	import { fetchVideos, type Video } from './api';

	interface Track {
		kind: 'unscheduled' | 'aperiodic' | 'periodic' | 'new';
		videos: Video[];
	}

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

	async function fetchVideosEffect() {
		const videos = await fetchVideos(accessToken!);
		tracks = [
			{ kind: 'unscheduled', videos: videos.filter((x) => x.clientPublishAt === undefined) },
			{ kind: 'aperiodic', videos: videos.filter((x) => x.clientPublishAt !== undefined) },
			{ kind: 'new', videos: [] }
		];
	}

	function handleDnd(index: number) {
		return function handleDnd(e: any) {
			tracks[index].videos = e.detail.items;
		};
	}

	function formatDate(x: DateTime | undefined) {
		if (x === undefined) return '';
		return x.setZone('system').toLocaleString(DateTime.DATETIME_SHORT);
	}
</script>

{#if accessToken === undefined}
	Redirecting to login page...
{:else}
	{#await fetchVideosEffect()}
		Loading videos...
	{:then}
		<div class="tracks">
			{#each tracks as track, trackIndex (trackIndex)}
				<div class="track">
					{track.kind}
					<ul
						use:dndzone={{ items: track.videos }}
						onconsider={handleDnd(trackIndex)}
						onfinalize={handleDnd(trackIndex)}
					>
						{#each track.videos as video (video.id)}
							<li>
								<img src={video.thumbnail} />
								{video.name} - {formatDate(video.clientPublishAt)}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{/await}
{/if}

<style>
	li img {
		vertical-align: middle;
	}

	.tracks {
		display: flex;
	}
</style>
