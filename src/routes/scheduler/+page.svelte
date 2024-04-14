<script lang="ts">
	import { buildURL } from '$lib';
	import { dndzone } from 'svelte-dnd-action';
	import { DateTime } from 'luxon';
	import { fetchVideos, updateVideo, type Video } from './api';

	type Track =
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

	function handleDnd(track: Track, persist: boolean) {
		return function handleDnd(e: any) {
			track.videos = track.kind === 'aperiodic' ? toSortedVideos(e.detail.items) : e.detail.items;
			if (track.kind === 'periodic') {
				track.videos.forEach((x, i) => {
					x.clientPublishAt = track.schedule.start.plus({ days: track.schedule.periodInDays * i });
				});
			}
			if (track.kind === 'unscheduled') {
				track.videos.forEach((x) => {
					x.clientPublishAt = undefined;
				});
			}
			track.videos.forEach((x) => {
				if (persist && x.clientPublishAt?.toMillis() !== x.serverPublishAt?.toMillis()) {
					updateVideo(accessToken!, x);
					x.serverPublishAt = x.clientPublishAt;
				}
			});
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
				return `At ${formatDate(x.schedule.start)}, then every ${x.schedule.periodInDays === 1 ? 'day' : `${x.schedule.periodInDays} days`}`;
		}
	}

	function addTrack() {
		tracks.push({
			kind: 'periodic',
			videos: [],
			schedule: {
				periodInDays: 1,
				start: DateTime.now().plus({ days: 100 })
			}
		});
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
					<div class="title">{getTrackTitle(track)}</div>
					<ul
						use:dndzone={{
							items: track.videos,
							dropFromOthersDisabled: track.kind === 'aperiodic'
						}}
						onconsider={handleDnd(track, false)}
						onfinalize={handleDnd(track, true)}
					>
						{#each track.videos as video (video.id)}
							<li class="video">
								<img src={video.thumbnail} />
								<div class="video-props">
									<div class="title">{video.name}</div>
									<div class="video-publishAt">{formatDate(video.clientPublishAt)}</div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
			<div><button onclick={addTrack}>Add track</button></div>
		</div>
	{/await}
{/if}

<style>
	ul {
		list-style-type: none;
		padding-left: 0;
		min-height: 200px;
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
	.track {
		width: 400px;
	}

	.video {
		border-radius: 16px;
		border: solid 1px rgb(235, 235, 235);
		margin: 4px;
		padding: 8px;
		display: flex;
	}
	.video-props {
		padding: 8px;
	}
	.title {
		font-weight: bold;
	}
</style>
