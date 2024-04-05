import EventEmitter from "eventemitter3";
import { WebSocket, CloseEvent } from "ws";

import Client from "../client/Client";
import { GatewayVersion } from "../Constants";
import { BaseUrl, Gateway } from "../rest/Endpoints";
import { UnauthorizedRequest } from "../rest/RequestUtil";
import {GatewayOperationCode, GatewayCloseCode, GatewayCloseEvent, RecoverMethod } from "./GatewayCodes";
import { GatewayEvents } from "./GatewayEvents";
import { GatewayError } from "./GatewayError";
import { Color, debugLog, warn } from "../util/DebugLog";
import { Payload, parsePayload } from "./Payload";

export enum ShardStatus {
    Idle,
    Connecting,
    Resuming,
    Connected
}

/**
 * Represents a self-contained shard, managed by the {@link Client}.
 * Connects to the Discord Gateway, handles events and payloads, manages
 * the session, and will reconnect when needed
 */
export default class Shard extends EventEmitter {
    // Shard info
    public client: Client;
    public id: number;
    public status: ShardStatus = ShardStatus.Idle;
    private token: string;
    // Websocket
    private socket: WebSocket | null = null;
    private websocketURL: string | null = null;
    // Session info
	private heartbeatLoop: Timer | null = null;
	private heartbeatStart: NodeJS.Timeout | null = null;
    private resumeUrl: string | null = null;
    private sessionId: string | null = null;
    private lastSequence: number | null = null;
    private heartbeatInterval: number = 0;
	private receivedHeartbeatAck: boolean = true;

    constructor(client: Client, id: number = 0, token: string = "") {
        super();
        this.client = client;
        this.id = id;
        this.token = token;
    };

	/**
	 * @returns {Promise<Shard>}
	 * @memberof Shard
	 * @description Connects the shard to the Discord Gateway.
	 */
	public async connect(): Promise<Shard> {
		debugLog(this.client, this, `Connecting...`, Color.Magenta);
		this.status = ShardStatus.Connecting;
		// fetch BaseUrl + Gateway and cache it to websocketURL
		const newURL = await UnauthorizedRequest(BaseUrl + Gateway());
		this.websocketURL = newURL.url;

		this.socket = new WebSocket(`${this.websocketURL}/?v=${GatewayVersion}&encoding=json`);

		// Handle websocket events
		this.socket.onopen = () => {
			this.status = ShardStatus.Connected;
			debugLog(this.client, this, `Opened websocket connection.`, Color.Green);
		};
		this.socket.onmessage = (event) => {
			try {
				let payload: Payload = parsePayload(JSON.parse(event.data.toString()));
				this.handlePayload(payload);
			} catch (e) { warn(this.client, this, String(e)); }
		};
        this.socket.onclose = (event: CloseEvent) => {
            this.handleClose(event);
        }

        return this;
	};

	/**
	 * @returns {Promise<Shard>}
	 * @memberof Shard
	 * @description Resumes the shard's connection to the Discord Gateway.
	 */
    public async resume(): Promise<Shard> {
        debugLog(this.client, this, `Resuming...`, Color.Magenta);
        this.status = ShardStatus.Resuming;

        // Resume
        this.websocketURL = this.resumeUrl;
        this.socket = new WebSocket(`${this.websocketURL}/?v=${GatewayVersion}&encoding=json`);
        this.socket.onopen = () => { this.sendResume(); };

        return this;
    };

	/**
	 * @returns {Promise<Shard>}
	 * @memberof Shard
	 * @description Disconnects the shard from the Discord Gateway.
	 */
    public async disconnect(closeEvent: GatewayCloseEvent, data: any): Promise<Shard> {
		debugLog(this.client, this, `Disconnecting...`, Color.Magenta);
		this.status = ShardStatus.Idle;
		this.emit(GatewayEvents.Closed);

		// Clear intervals
		if (this.heartbeatStart) clearTimeout(this.heartbeatStart);
		if (this.heartbeatLoop) clearInterval(this.heartbeatLoop);
		if (this.socket) {
			// Clear socket to prevent further messages
			this.socket.onclose = null;
			this.socket.onmessage = null;
			this.socket.close(closeEvent.code, data);
		};
		return this;
    };

	public async recover(closeEvent: GatewayCloseEvent): Promise<Shard> {
		switch (closeEvent.recover) {
			case RecoverMethod.Resume: return this.resume();
			case RecoverMethod.Reconnect: return this.connect();
			case RecoverMethod.Disconnect: return this.disconnect(closeEvent, null);
			default: {
				warn(this.client, this, `Unknown recover method: ${closeEvent.recover}`);
				return this;
			}
		}
	};

	/**
	 * @param payload The incoming payload
	 * @description Handles incoming payloads from the Discord Gateway.
	 */
    private handlePayload(payload: Payload) {
        switch (payload.code) {
            case GatewayOperationCode.Hello: {
                // Event
                this.emit(GatewayEvents.Hello);
				debugLog(this.client, this, `Hello!`, Color.Green);
                // Initialize
                this.heartbeatInterval = payload.data.heartbeat_interval;
                this.startHeartbeat(this.heartbeatInterval);
                this.sendIdentify();
                break;
            };
			case GatewayOperationCode.Heartbeat: {
				if (!this.receivedHeartbeatAck) warn(this.client, this, `Heartbeat ACK not received! Possibly a zombie connection.`);
				debugLog(this.client, this, `Heartbeat requested`, Color.Yellow);
				this.sendHeartbeat();
				this.receivedHeartbeatAck = false;
				break;
			}
            case GatewayOperationCode.HeartbeatAcknowledge: {
                this.emit(GatewayEvents.Heartbeat);
                debugLog(this.client, this, `Heartbeat acknowledged`, Color.Yellow);
				this.receivedHeartbeatAck = true;
                break;
            };
            // Ready event
            case GatewayOperationCode.Dispatch: {
                // Gather session info
                this.resumeUrl = payload.data.resume_gateway_url;
                this.sessionId = payload.data.session_id;
                this.lastSequence = payload.sequence;
				if (payload.data.shard) this.id = payload.data.shard[0];
				// Send up info to the client
				// user, guilds, application
                // Event
                this.emit(GatewayEvents.Ready);
                debugLog(this.client, this, `Shard started!`, Color.Green);
                break;
            };
			case GatewayOperationCode.Resume: {
                debugLog(this.client, this, `Resumed!`, Color.Green);
                this.emit(GatewayEvents.Resumed);
                this.status = ShardStatus.Connected;
                break;
            };
            case GatewayOperationCode.Reconnect: {
                debugLog(this.client, this, `Told to reconnect.`, Color.Yellow);
                this.resume();
                break;
            };
            case GatewayOperationCode.InvalidSession: {
                warn(this.client, this, "Invalid session!");
                if (payload.data === true) this.resume();
				else this.disconnect(GatewayCloseCode.JustClose, null);
                break;
            };
            default: {
				warn(this.client, this, "Unhandled payload of code: " + payload.code);
				warn(this.client, this, JSON.stringify(payload));
				break;
			}
        }
    };

	/**
	 * 
	 * @param event The {@link CloseEvent}
	 * @description Handles the closing of the websocket connection.
	 */
    private async handleClose(event: CloseEvent) {
		let closeEvent = this.closeEvent(event.code);
		if (!closeEvent) closeEvent = { code: event.code, recover: RecoverMethod.Disconnect };
        this.emit(GatewayEvents.Closed, { code: closeEvent.code, recover: closeEvent.recover });
        switch (closeEvent.code) {
			case GatewayCloseCode.Normal.code: { debugLog(this.client, this, "Normal close event.", Color.Black); break; };
			case GatewayCloseCode.JustClose.code: { debugLog(this.client, this, "Shutting down.", Color.Red); break; };
            case GatewayCloseCode.UnknownError.code: { warn(this.client, this, "An unknown error occured!"); break; };
            case GatewayCloseCode.InvalidShard.code: {
                throw new GatewayError("Invalid shard!", this.id, closeEvent.code, GatewayCloseCode.InvalidShard.recover);
            };
            case null: case undefined: { warn(this.client, this, "Closed without a code!"); break; }
            default: {
                warn(this.client, this, `Unhandled close event code: ${closeEvent.code}`);
				warn(this.client, this, JSON.stringify(event));
                break;
            }
        }
        // Recovery
		this.recover(closeEvent);
    }

	private closeEvent(code: number): GatewayCloseEvent | undefined {
		for (let closeEventCode of Object.values(GatewayCloseCode)) {
			if (code === closeEventCode.code) return closeEventCode;
		}
	}

	/**
	 * @param interval The interval to send heartbeats at
	 * @description Starts the heartbeat interval.
	 */
	private startHeartbeat(interval: number) {
		debugLog(this.client, this, `Starting heartbeat...`, Color.Black);
		// Add some jitter for the first heartbeat to not cause an influx of traffic
		this.heartbeatStart = setTimeout(() => { this.sendHeartbeat(); }, interval * Math.random()) as NodeJS.Timeout;
		// IT'S ALIVE
		this.heartbeatLoop = setInterval(() => { this.sendHeartbeat(); }, interval);
	};

	/**
	 * @description Sends a heartbeat payload to the Discord Gateway.
	 */
    private sendHeartbeat() {
        debugLog(this.client, this, `Sending heartbeat...`, Color.Black);
        if (this.socket) {
            this.socket.send(JSON.stringify({
                op: GatewayOperationCode.Heartbeat,
                d: null
            }));
        }
    };

	/**
	 * @description Sends an identify payload to the Discord Gateway.
	 */
    private sendIdentify() {
        debugLog(this.client, this, `Sending identify...`, Color.Black);
        const payload = {
            op: GatewayOperationCode.Identify,
            d: {
                token: this.token,
                properties: {
                    $os: process.platform,
                    $browser: "Wumpus.js",
                    $device: "Wumpus.js"
                },
                intents: this.client.intents,
                compress: this.client.options?.websocketCompression,
                shard: [this.id, this.client.shardCount]
            }
        };
        // Send out the payload
        if (this.socket) this.socket.send(JSON.stringify(payload));
    };

	/**
	 * @description Sends a resume payload to the Discord Gateway.
	 */
    private sendResume() {
        const payload = {
            op: GatewayOperationCode.Resume,
            d: {
                token: this.token,
                session_id: this.sessionId,
                seq: this.lastSequence
            }
        };
        // Send out the payload
        if (this.socket) this.socket.send(JSON.stringify(payload));
    };
}