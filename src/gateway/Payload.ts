export interface Payload {
	code: number;
	data: any;
	sequence: number | null;
	name: string | null;
};

export function parsePayload(payload: any): Payload {
	return {
		code: payload.op,
		data: payload.d,
		sequence: payload?.s,
		name: payload?.t
	}
}