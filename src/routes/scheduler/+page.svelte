<script lang="ts">
	import { buildURL } from '$lib';
	import { dndzone } from 'svelte-dnd-action';

	interface Video {
		id: string;
		name: string;
		thumbnail: string;
		publishAt: string;
	}

	let accessToken = $state<string>();
	let videos = $state<Video[]>([]);

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

	async function fetchAll(resource: string, opts: Record<string, string>) {
		let pageToken = undefined;
		const res: any[] = [];
		while (true) {
			let resp: any = await (
				await fetch(
					buildURL(`https://www.googleapis.com/youtube/v3/${resource}`, {
						...opts,
						access_token: accessToken!,
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

	async function fetchVideos() {
		const channel = (
			await fetchAll('channels', {
				part: 'snippet,contentDetails',
				mine: 'true'
			})
		)[0];
		const uploadedPlaylist = channel.contentDetails.relatedPlaylists.uploads;
		const videoIds = (
			await fetchAll('playlistItems', {
				part: 'snippet,status',
				playlistId: uploadedPlaylist
			})
		)
			.filter(
				(x) => x.status.privacyStatus === 'private' && x.snippet.resourceId.kind === 'youtube#video'
			)
			.map((x) => x.snippet.resourceId.videoId);
		videos = (
			await fetchAll('videos', {
				part: 'snippet,status',
				id: videoIds.join(',')
			})
		).map((x) => ({
			id: x.id,
			name: x.snippet.title,
			thumbnail: x.snippet.thumbnails.default.url,
			publishAt: x.status.publishAt
		}));
	}

	function handleDnd(e: any) {
		videos = e.detail.items;
	}
</script>

{#if accessToken === undefined}
	Redirecting to login page...
{:else}
	{#await fetchVideos()}
		Loading videos...
	{:then}
		<ul use:dndzone={{ items: videos }} onconsider={handleDnd} onfinalize={handleDnd}>
			{#each videos as video (video.id)}
				<li><img src={video.thumbnail} /> {video.name} - {video.publishAt ?? 'unscheduled'}</li>
			{/each}
		</ul>
	{/await}
{/if}

<style>
	li img {
		vertical-align: middle;
	}
</style>
