<script lang="ts">
	import { DateTime } from 'luxon';
	import { cloneTrack, formatDate, toSortedVideos, type Track } from './api';
	import { dndzone } from 'svelte-dnd-action';

	let { track = $bindable() }: { track: Track } = $props();
	let _track = $state<Track>(cloneTrack(track));
	$effect(() => {
		_track = cloneTrack(track);
	});

	function updatePublishAts() {
		const __track = cloneTrack(_track);
		__track.videos.forEach((x, i) => {
			if (__track.kind === 'periodic') {
				x.clientPublishAt = __track.schedule.start.plus({
					days: __track.schedule.periodInDays * i
				});
			}
			if (__track.kind === 'unscheduled') {
				x.clientPublishAt = undefined;
			}
		});
		_track = __track;
	}

	function handleDnd(persist: boolean) {
		return function handleDnd(e: any) {
			_track = {
				...track,
				videos: _track.kind === 'aperiodic' ? toSortedVideos(e.detail.items) : e.detail.items
			};
			updatePublishAts();
			if (persist) {
				track = cloneTrack(_track);
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
			const __track = cloneTrack(_track);
			(__track as any).schedule.start = DateTime.fromISO(val);
			_track = __track;
		}
	};

	const period = {
		get value() {
			return (_track as any).schedule.periodInDays;
		},
		set value(val) {
			const __track = cloneTrack(_track);
			(__track as any).schedule.periodInDays = val;
			_track = __track;
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
				bind:value={period.value}
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
