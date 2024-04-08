import EventEmitter from "eventemitter3";
import Shard from "./Shard";
import { GatewayError } from "../error/GatewayError";
import { GatewayCloseCode, GatewayCloseEvent, GatewayOperationCode, RecoverMethod } from "./GatewayCodes";
import { GatewayVersion } from "../Constants";
import { Color, debugLog, warn } from "../util/DebugLog";
import { Payload, heartbeatPayload, identifyPayload, parseIncomingPayload, resumePayload, sendPayload } from "./Payload";
import { UnauthorizedRequest } from "../rest/Request";
import { BaseUrl, Gateway } from "../rest/Endpoints";
import { DispatchEvents, GatewayEvents } from "./GatewayEvents";

export enum SocketStatus {
	Idle,
	Connecting,
	Resuming,
	Connected
}

/**
 * @description Represents a shard's websocket connection to the Discord Gateway.
 * @param {Shard} shard - The shard this websocket belongs to.
 */
export default class ShardSocket extends EventEmitter {
	private shard: Shard;
	private token: string = '';
	public status: SocketStatus = SocketStatus.Idle;
	// Websocket
	private websocket: WebSocket | null = null;
	private websocketUrl: string | null = null;
	// Session info
	private heartbeatLoop: Timer | null = null;
	private heartbeatStart: NodeJS.Timeout | null = null;
	private lastHeartbeat: Date = new Date();
	private hasAuthenticated: boolean = false;
	private resumeUrl: string | null = null;
	private sessionId: string | null = null;
	private lastSequence: number | null = null;
	private heartbeatInterval: number = 0;
	private receivedHeartbeatAck: boolean = true;

	public constructor(shard: Shard, token: string) {
		super();
		this.shard = shard;
		this.token = token;
	}

	// Websocket connection/setup

	/**
	 * @description Initializes the first connection to the Discord Gateway
	 * @returns {Promise<ShardSocket>}
	 */
	public async connect(): Promise<ShardSocket> {
		this.status = SocketStatus.Connecting;
		this.hasAuthenticated = false;
		// fetch BaseUrl + Gateway and cache it to websocketUrl
		const newUrl = await UnauthorizedRequest(BaseUrl + Gateway());
		this.websocketUrl = newUrl.url;

		this.websocket = await this.connectToGateway(this.websocketUrl);

		return this;
	};

	/**
	 * @description Resumes the shard's connection to the Discord Gateway.
	 * @returns {Promise<ShardSocket>}
	 */
	public async resume(): Promise<ShardSocket> {
		debugLog(this.shard.client, this.shard, `Resuming...`, Color.Magenta);
		this.status = SocketStatus.Resuming;
		// Resume
		this.websocketUrl = this.resumeUrl;
		this.websocket = await this.connectToGateway(this.resumeUrl);
		this.websocket.onopen = () => {
			this.status = SocketStatus.Connected;
			debugLog(this.shard.client, this.shard, `Reopened websocket connection!`, Color.Green);
			debugLog(this.shard.client, this.shard, `Sending resume...`, Color.Black);
			sendPayload(this.websocket, resumePayload(this.token, this.sessionId || '', this.lastSequence || 0));
		};

		return this;
	};

	/**
	 * @description Disconnects the shard from the Discord Gateway.
	 * @param closeEvent The close event to recover from
	 * @param data The data to send with the close event
	 * @returns {Promise<ShardSocket>}
	 */
	public async disconnect(closeEvent: GatewayCloseEvent, data: any): Promise<ShardSocket> {
		this.status = SocketStatus.Idle;
		this.emit(GatewayEvents.Closed, closeEvent);
		super.emit(GatewayEvents.Closed, closeEvent);

		// Clear intervals
		if (this.heartbeatStart) clearTimeout(this.heartbeatStart);
		if (this.heartbeatLoop) clearInterval(this.heartbeatLoop);
		if (this.websocket) {
			// Clear socket to prevent further messages
			this.websocket.onclose = null;
			this.websocket.onmessage = null;
			this.websocket.close(closeEvent.code, data);
		};
		return this;
	};

	private onOpen() {
		this.status = SocketStatus.Connected;
		debugLog(this.shard.client, this.shard, `Opened websocket connection!`, Color.Green);
	};

	private onMessage(event: any) {
		try {
			let payload: Payload = parseIncomingPayload(JSON.parse(event.data.toString()));
			this.handlePayload(payload);
		} catch (e) { warn(this.shard.client, this.shard, String(e)); }
	};

	private onClose(event: CloseEvent) { this.handleClose(event); };

	private onError(event: Event) { warn(this.shard.client, this.shard, `Error: ${event}`); };

	/**
	 * @description Connects to the Discord Gateway
	 * @param url The url to connect to
	 * @returns {Promise<WebSocket>}
	 */
	private async connectToGateway(url: string | null): Promise<WebSocket> {
		if (!url || url === '') this.error("No Url provided!", GatewayCloseCode.InvalidShard, this.connectToGateway);
		let connectUrl = `${url}/?v=${GatewayVersion}&encoding=json`;
		debugLog(this.shard.client, this.shard, `Connecting...`, Color.Magenta);
		debugLog(this.shard.client, this.shard, `Connecting to ${connectUrl}...`, Color.Black);

		let socket = new WebSocket(connectUrl);
		socket.onopen = () => this.onOpen();
		socket.onmessage = (event) => this.onMessage(event);
		socket.onclose = (event) => this.onClose(event as any as CloseEvent);
		socket.onerror = (event) => this.onError(event as any as Event);

		return socket;
	};

	/**
	 * @description Recovers the shard from a close event.
	 * @param closeEvent The close event to recover from
	 * @returns {Promise<ShardSocket>}
	 */
	public async recover(closeEvent: GatewayCloseEvent): Promise<ShardSocket> {
		switch (closeEvent.recover) {
			case RecoverMethod.Resume: return this.resume();
			case RecoverMethod.Reconnect: return this.connect();
			case RecoverMethod.Disconnect: return this.disconnect(closeEvent, null);
			default: {
				warn(this.shard.client, this.shard, `Unknown recover method: ${closeEvent.recover}`);
				return this;
			}
		}
	};

	/**
	 * @description Emits an error and throws it.
	 * @param error The error to emit
	 */
	public error(message: string, closeEvent: GatewayCloseEvent, source: CallableFunction) {
		let error = new GatewayError(source, message, this.shard.id, closeEvent.code, closeEvent.recover);
		this.emit(GatewayEvents.Error, error);
		super.emit(GatewayEvents.Error, error);
		throw error;
	}

	// Message Handling

	/**
	 * @param payload The incoming payload
	 * @description Handles incoming payloads from the Discord Gateway.
	 */
	private handlePayload(payload: Payload) {
		switch (payload.code) {
			case GatewayOperationCode.Hello: {
				// Event
				this.emit(GatewayEvents.Hello, payload.data.heartbeat_interval);
				// Initialize
				if (payload.data.heartbeat_interval) {
					this.heartbeatInterval = payload.data.heartbeat_interval;
					this.startHeartbeat(this.heartbeatInterval);
				}
				if (this.status !== SocketStatus.Resuming) this.sendIdentify();
				break;
			};
			case GatewayOperationCode.Heartbeat: {
				if (!this.receivedHeartbeatAck) warn(this.shard.client, this.shard, `Heartbeat ACK not received! Possibly a zombie connection.`);
				debugLog(this.shard.client, this.shard, `Heartbeat requested`, Color.Yellow);
				sendPayload(this.websocket, heartbeatPayload());
				this.receivedHeartbeatAck = false;
				break;
			}
			case GatewayOperationCode.HeartbeatAcknowledge: {
				let elapsed = new Date().getTime() - this.lastHeartbeat.getTime();
				this.emit(GatewayEvents.Heartbeat, elapsed);
				this.receivedHeartbeatAck = true;
				this.lastHeartbeat = new Date();
				break;
			};
			// Ready event
			case GatewayOperationCode.Dispatch: {
				this.lastSequence = payload.sequence || this.lastSequence;
				this.handleDispatch(payload);
				break;
			};
			case GatewayOperationCode.Reconnect: {
				debugLog(this.shard.client, this.shard, `Told to reconnect.`, Color.Yellow);
				this.resume();
				break;
			};
			case GatewayOperationCode.InvalidSession: {
				warn(this.shard.client, this.shard, "Invalid session!");
				if (payload.data === true) this.resume();
				else this.disconnect(GatewayCloseCode.Close, null);
				break;
			};
			default: {
				warn(this.shard.client, this.shard, "Unhandled payload of code: " + payload.code);
				warn(this.shard.client, this.shard, JSON.stringify(payload));
				break;
			}
		}
	};

	private handleDispatch(payload: Payload) {
		this.emit(GatewayEvents.Dispatch, payload);
		switch (payload.name) {
			case DispatchEvents.Ready: {
				// Gather session info
				this.resumeUrl = payload.data.resume_gateway_url || this.resumeUrl;
				this.sessionId = payload.data.session_id || this.sessionId;
				this.shard.id = payload.data.shard[0] || this.shard.id;

				// Send up info to the client
				// user, guilds, application

				// Event
				this.emit(GatewayEvents.Ready);
				super.emit(GatewayEvents.Ready);
				this.status = SocketStatus.Connected;
				break;

			};
			case DispatchEvents.Resumed: {
				this.emit(GatewayEvents.Resumed);
				this.status = SocketStatus.Connected;
				break;
			};
			default: {
				warn(this.shard.client, this.shard, `Unhandled dispatch event: ${payload.name}`);
				break;
			}
		}
	};

	// Websocket health

	/**
	 * @param interval The interval to send heartbeats at
	 * @description Starts the heartbeat interval.
	 */
	private startHeartbeat(interval: number) {
		let jitter = interval * Math.random();
		debugLog(this.shard.client, this.shard, `Starting heartbeat... (interval: ${interval}ms, jitter: ${Math.round(jitter)}ms)`, Color.Black);
		// Clear existing heartbeats
		if (this.heartbeatStart || this.heartbeatLoop) {
			warn(this.shard.client, this.shard, `Found existing heartbeat! Clearing...`);
			if (this.heartbeatStart) clearTimeout(this.heartbeatStart);
			if (this.heartbeatLoop) clearInterval(this.heartbeatLoop);
		}
		// Add some jitter for the first heartbeat to not cause an influx of traffic
		this.heartbeatStart = setTimeout(() => {
			debugLog(this.shard.client, this.shard, `Sending heartbeat...`, Color.Black);
			sendPayload(this.websocket, heartbeatPayload())
			// IT'S ALIVE
			this.heartbeatLoop = setInterval(() => {
				debugLog(this.shard.client, this.shard, `Sending heartbeat...`, Color.Black);
				sendPayload(this.websocket, heartbeatPayload())
			}, interval);
		}, jitter) as NodeJS.Timeout;
	};

	/**
	 * @description Sends an identify payload to the Discord Gateway.
	 */
	private sendIdentify() {
		if (this.hasAuthenticated) return warn(this.shard.client, this.shard, `Already authenticated, skipping identify!`);
		debugLog(this.shard.client, this.shard, `Sending identify...`, Color.Black);
		sendPayload(this.websocket, identifyPayload(this.token, this.shard.client, this.shard));
		this.hasAuthenticated = true;
	};

	/**
	 * @param event The {@link CloseEvent}
	 * @description Handles the closing of the websocket connection.
	 */
	private async handleClose(event: CloseEvent) {
		let closeEvent = this.closeEvent(event.code);
		if (!closeEvent) closeEvent = { code: event.code, recover: RecoverMethod.Disconnect };
		this.emit(GatewayEvents.Closed, { code: closeEvent.code, recover: closeEvent.recover });
		super.emit(GatewayEvents.Closed, { code: closeEvent.code, recover: closeEvent.recover });
		switch (closeEvent.code) {
			case GatewayCloseCode.Normal.code: { debugLog(this.shard.client, this.shard, "Normal close event", Color.Black); break; };
			case GatewayCloseCode.Close.code: { warn(this.shard.client, this.shard, "Shutting down!"); break; };
			case GatewayCloseCode.UnknownError.code: { warn(this.shard.client, this.shard, "An unknown error occured!"); break; };
			case GatewayCloseCode.InvalidShard.code: { return this.error("Invalid shard!", closeEvent, this.handleClose); };
			case GatewayCloseCode.DisallowedIntents.code: { return this.error("Those intents aren't allowed!", closeEvent, this.handleClose); };
			case null: case undefined: { warn(this.shard.client, this.shard, "Closed without a code!"); break; }
			default: {
				warn(this.shard.client, this.shard, `Unhandled close event code: ${closeEvent.code}`);
				warn(this.shard.client, this.shard, JSON.stringify(event));
				break;
			}
		}
		// Recovery
		this.recover(closeEvent);
	};

	// Util

	/**
	 * @param code The close event code
	 * @returns {GatewayCloseEvent | undefined}
	 * @description Returns the close event based on the code.
	 */
	private closeEvent(code: number): GatewayCloseEvent | undefined {
		for (let closeEventCode of Object.values(GatewayCloseCode)) {
			if (code === closeEventCode.code) return closeEventCode;
		}
	}
}