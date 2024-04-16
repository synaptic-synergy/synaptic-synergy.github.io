import { range } from '$lib';
import { DateTime } from 'luxon';
import type { Video } from './api';

export function getInitDummyState(): Video[] {
	const base = DateTime.now().plus({ days: 5 }).set({ hour: 10, minute: 30, second: 0 });
	const offsets = [21, 49, 100];
	return [
		...range(5).map((x) => ({
			id: `A${x}`,
			name: `Video - A ${x}`,
			clientPublishAt: undefined,
			serverPublishAt: undefined,
			thumbnail: `https://picsum.photos/seed/A${x}/120/90`,
			status: {}
		})),
		...range(3).map((x) => ({
			id: `B${x}`,
			name: `Video - B ${x}`,
			clientPublishAt: base.plus({ hours: offsets[x] }),
			serverPublishAt: base.plus({ hours: offsets[x] }),
			thumbnail: `https://picsum.photos/seed/B${x}/120/90`,
			status: {}
		})),
		...range(5).map((x) => ({
			id: `C${x}`,
			name: `Video - C ${x}`,
			clientPublishAt: base.plus({ minutes: 90, days: x }),
			serverPublishAt: base.plus({ minutes: 90, days: x }),
			thumbnail: `https://picsum.photos/seed/C${x}/120/90`,
			status: {}
		}))
	];
}
