<script lang="ts">
	import { buildURL } from '$lib';
	import { dndzone } from 'svelte-dnd-action';
	import { DateTime } from 'luxon';
	import { fetchVideos, type Video } from './api';

	type Track =
		| {
				kind: 'unscheduled' | 'aperiodic';
				videos: Video[];
		  }
		| {
				kind: 'periodic';
				videos: Video[];
				schedule: {
					timeOfDay: DateTime;
					periodInDays: number;
				};
		  };

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
		const _videos = await fetchVideos(accessToken!);
		tracks = [
			{ kind: 'unscheduled', videos: _videos.filter((x) => x.clientPublishAt === undefined) },
			{
				kind: 'aperiodic',
				videos: toSortedVideos(_videos.filter((x) => x.clientPublishAt !== undefined))
			}
		];
	}

	function toSortedVideos(x: Video[]): Video[] {
		return x.toSorted((a, b) => a.clientPublishAt!.toSeconds() - b.clientPublishAt!.toSeconds());
	}

	function handleDnd(track: Track) {
		return function handleDnd(e: any) {
			track.videos = track.kind === 'aperiodic' ? toSortedVideos(e.detail.items) : e.detail.items;
		};
	}

	function formatDate(x: DateTime | undefined) {
		if (x === undefined) return '';
		return x.setZone('system').toLocaleString(DateTime.DATETIME_SHORT);
	}

	function getTrackTitle(x: Track) {
		switch (x.kind) {
			case 'unscheduled':
				return 'Unscheduled';
			case 'aperiodic':
				return 'Aperiodic';
			case 'periodic':
				return `At ${formatDate(x.schedule.timeOfDay)}, then every ${x.schedule.periodInDays === 1 ? 'day' : `${x.schedule.periodInDays} days`}`;
		}
	}
</script>

{#if accessToken === undefined}
	Redirecting to login page...
{:else}
	{#await fetchVideosEffect()}
		Loading videos...
	{:then}
		<div class="tracks">
			{#each tracks as track}
				<div class="track">
					{getTrackTitle(track)}
					<ul
						use:dndzone={{
							items: track.videos,
							dropFromOthersDisabled: track.kind === 'aperiodic'
						}}
						onconsider={handleDnd(track)}
						onfinalize={handleDnd(track)}
					>
						{#each track.videos as video (video.id)}
							<li class="video">
								<img src={video.thumbnail} />
								<div class="video-props">
									<div class="video-title">{video.name}</div>
									<div class="video-publishAt">{formatDate(video.clientPublishAt)}</div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{/await}
{/if}

<style>
	ul {
		list-style-type: none;
		padding-left: 0;
	}
	li img {
		vertical-align: middle;
		width: 120px;
		height: 66px;
		object-fit: cover;
	}

	.tracks {
		display: flex;
	}

	.video {
		border-radius: 16px;
		border: solid 1px rgb(235, 235, 235);
		margin: 4px;
		padding: 8px;
		width: 400px;
		display: flex;
	}
	.video-props {
		padding: 8px;
	}
	.video-title {
		font-weight: bold;
	}
</style>
