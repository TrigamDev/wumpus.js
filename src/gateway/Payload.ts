import Client, { ClientOptions } from "../client/Client";
import { debugLog } from "../util/DebugLog";
import { GatewayOperationCode } from "./GatewayCodes";
import Shard from "./Shard";

export interface Payload {
	code: number;
	data: any;
	sequence: number | null;
	name: string | null;
};

export function parseIncomingPayload(payload: any): Payload {
	return {
		code: payload.op,
		data: payload.d,
		sequence: payload?.s,
		name: payload?.t
	}
}

export function parseOutgoingPayload(payload: Payload): string {
	return JSON.stringify({
		op: payload.code,
		d: payload.data,
		s: payload.sequence,
		t: payload.name
	});
};

export function sendPayload(socket: WebSocket | null, payload: Payload): void {
	if (socket) socket.send(parseOutgoingPayload(payload));
}

export const heartbeatPayload = (): Payload => {
	return {
		code: GatewayOperationCode.Heartbeat,
		data: null,
		sequence: null,
		name: null
	}
}

export const identifyPayload = (token: string, client: Client, shard: Shard): Payload => {
	return {
		code: GatewayOperationCode.Identify,
		data: {
			token: token,
			properties: {
				$os: process.platform,
				$browser: "Wumpus.js",
				$device: "Wumpus.js"
			},
			intents: client.intents,
			compress: client.options?.websocketCompression,
			shard: [shard.id, client.shardCount]
		},
		sequence: null,
		name: null
	}
}

export const resumePayload = (token: string, sessionId: string, sequence: number): Payload => {
	console.log(`Resuming session with session id: ${sessionId} and sequence: ${sequence}`);
	return {
		code: GatewayOperationCode.Resume,
		data: {
			token: token,
			session_id: sessionId,
			seq: sequence
		},
		sequence: null,
		name: null
	};
};