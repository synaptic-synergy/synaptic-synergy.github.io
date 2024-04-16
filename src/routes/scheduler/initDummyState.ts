import { range } from '$lib';
import { DateTime } from 'luxon';
import type { Video } from './api';

export function getInitDummyState(): Video[] {
	const base = DateTime.now().plus({ days: 5 }).set({ hour: 10, minute: 30, second: 0 });
	const offsets = [21, 49, 100];
	return [
		...range(5).map((x) => ({
			id: `A${x}`,
			name: `A ${x}`,
			clientPublishAt: undefined,
			serverPublishAt: undefined,
			thumbnail: '',
			status: {}
		})),
		...range(3).map((x) => ({
			id: `B${x}`,
			name: `B ${x}`,
			clientPublishAt: base.plus({ hours: offsets[x] }),
			serverPublishAt: base.plus({ hours: offsets[x] }),
			thumbnail: '',
			status: {}
		})),
		...range(5).map((x) => ({
			id: `C${x}`,
			name: `C ${x}`,
			clientPublishAt: base.plus({ minutes: 90, days: x }),
			serverPublishAt: base.plus({ minutes: 90, days: x }),
			thumbnail: '',
			status: {}
		}))
	];
}
