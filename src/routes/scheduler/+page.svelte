<script lang="ts">
	import { buildURL } from '$lib';
	import { dndzone } from 'svelte-dnd-action';
	import { DateTime } from 'luxon';
	import { fetchVideos, type Video } from './api';

	interface Schedule {
		timeOfDay: DateTime;
		periodInDays: number;
	}

	interface Videos {
		unscheduled: Video[];
		aperiodic: Video[];
		periodic: Video[];
	}

	let accessToken = $state<string>();
	let videos = $state<Videos>({ unscheduled: [], aperiodic: [], periodic: [] });
	let schedule = $state<Schedule>({
		timeOfDay: DateTime.fromISO('2000-01-01T09:00:00'),
		periodInDays: 2
	});

	const titles = $derived({
		unscheduled: 'Unscheduled',
		aperiodic: 'Aperiodic',
		periodic: `At ${schedule.timeOfDay.toLocaleString(DateTime.DATETIME_SHORT)} and then every ${schedule.periodInDays === 1 ? 'day' : `${schedule.periodInDays} days`}`
	});

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
		videos = {
			unscheduled: _videos.filter((x) => x.clientPublishAt === undefined),
			aperiodic: toSortedVideos(_videos.filter((x) => x.clientPublishAt !== undefined)),
			periodic: []
		};
	}

	function toSortedVideos(x: Video[]): Video[] {
		return x.toSorted((a, b) => a.clientPublishAt!.toSeconds() - b.clientPublishAt!.toSeconds());
	}

	function handleDnd(track: keyof Videos) {
		return function handleDnd(e: any) {
			videos[track] = track === 'aperiodic' ? toSortedVideos(e.detail.items) : e.detail.items;
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
			{#each ["unscheduled", "aperiodic", "periodic"] as const as track}
				<div class="track">
					{titles[track]}
					<ul
						use:dndzone={{ items: videos[track], dropFromOthersDisabled: track === 'aperiodic' }}
						onconsider={handleDnd(track)}
						onfinalize={handleDnd(track)}
					>
						{#each videos[track] as video (video.id)}
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
