<script lang="ts">
	import { DateTime } from 'luxon';
	import { cloneTrack, formatDate, toSortedVideos, type Track } from './api';
	import { dndzone } from 'svelte-dnd-action';

	let { track = $bindable() }: { track: Track } = $props();
	let _track = $state<Track>($state.snapshot(track));
	$effect(() => {
		_track = $state.snapshot(track);
	});

	function updatePublishAts() {
		_track.videos.forEach((x, i) => {
			if (_track.kind === 'periodic') {
				x.clientPublishAt = _track.schedule.start.plus({
					days: _track.schedule.periodInDays * i
				});
			}
			if (_track.kind === 'unscheduled') {
				x.clientPublishAt = undefined;
			}
		});
	}

	function handleDnd(persist: boolean) {
		return function handleDnd(e: any) {
			_track.videos = _track.kind === 'aperiodic' ? toSortedVideos(e.detail.items) : e.detail.items;
			if (persist) {
				updatePublishAts();
				track = $state.snapshot(_track);
			}
		};
	}

	const start = {
		get value() {
			return (_track as any).schedule.start
				.setZone('system')
				.set({ second: 0, millisecond: 0 })
				.toISO({
					includeOffset: false,
					suppressSeconds: true,
					suppressMilliseconds: true
				});
		},
		set value(val) {
			(_track as any).schedule.start = DateTime.fromISO(val);
		}
	};
</script>

<div class="track">
	<div class="title">
		{#if _track.kind === 'periodic'}
			At <input type="datetime-local" bind:value={start.value} oninput={updatePublishAts} />, then
			every
			<input
				type="number"
				min="1"
				max="14"
				bind:value={_track.schedule.periodInDays}
				oninput={updatePublishAts}
				style="width: 32px"
			/>
			days
		{:else if _track.kind === 'aperiodic'}
			Aperiodic
		{:else}
			Unscheduled
		{/if}
	</div>
	<ul
		use:dndzone={{
			items: _track.videos,
			dropFromOthersDisabled: _track.kind === 'aperiodic'
		}}
		onconsider={handleDnd(false)}
		onfinalize={handleDnd(true)}
	>
		{#each _track.videos as video (video.id)}
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
	.track {
		width: 400px;
	}

	.video {
		border-radius: 16px;
		border: solid 1px rgb(235, 235, 235);
		margin: 4px;
		padding: 8px;
		display: flex;
		background-color: #fffe;
	}
	.video-props {
		padding: 8px;
	}
	.title {
		font-weight: bold;
	}
</style>
