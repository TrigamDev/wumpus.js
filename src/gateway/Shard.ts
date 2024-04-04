import EventEmitter from "eventemitter3";
import { WebSocket, CloseEvent } from "ws";

import Client from "../client/Client";
import { GatewayVersion } from "../Constants";
import { BaseUrl, Gateway } from "../rest/Endpoints";
import { UnauthorizedRequest } from "../rest/RequestUtil";
import { CloseEventCode, CloseEventCodes, OperationCodes } from "../types/GatewayCodes";
import { GatewayEvents } from "./GatewayEvents";
import { GatewayError } from "../error/GatewayError";
import { Color, shardDebugLog, warn } from "../util/DebugLog";

export enum ShardStatus {
    Idle,
    Connecting,
    Resuming,
    Connected
}

export default class Shard extends EventEmitter {
    // Shard info
    public client: Client;
    public id: number;
    public status: ShardStatus = ShardStatus.Idle;
    private token: string;
    // Websocket
    private socket: WebSocket | undefined;
    private websocketURL: string | undefined;
    // Session info
    private resumeUrl: string | undefined;
    private sessionId: string | undefined;
    private lastSequence: number | undefined;
    private heartbeatInterval: number = 0;

    constructor(client: Client, id: number = 0, token: string = "") {
        super();
        this.client = client;
        this.id = id;
        this.token = token;
    };

	public async connect(): Promise<Shard> {
		shardDebugLog(this.client, this.id, `Connecting...`, Color.Magenta);
		this.status = ShardStatus.Connecting;
		// fetch BaseUrl + Gateway and cache it to websocketURL
		const newURL = await UnauthorizedRequest(BaseUrl + Gateway());
		this.websocketURL = newURL.url;

		this.socket = new WebSocket(`${this.websocketURL}/?v=${GatewayVersion}&encoding=json`);

		// Handle websocket events
		this.socket.onopen = () => {
			this.status = ShardStatus.Connected;
			shardDebugLog(this.client, this.id, `Opened websocket connection.`, Color.Green);
		};
		this.socket.onmessage = (event) => {
			try { this.handlePayload(JSON.parse(event.data.toString())); } catch (e) { warn(this.client, String(e)); }
		};
        this.socket.onclose = (event: CloseEvent) => {
            this.handleClose(event);
        }

        return this;
	};

    public async resume(): Promise<Shard> {
        shardDebugLog(this.client, this.id, `Resuming...`, Color.Magenta);
        this.status = ShardStatus.Resuming;

        // Resume
        this.websocketURL = this.resumeUrl;
        this.socket = new WebSocket(`${this.websocketURL}/?v=${GatewayVersion}&encoding=json`);
        this.socket.onopen = () => { this.sendResume(); };

        return this;
    };

    // public async disconnect(): Promise<Shard> {

    // };

    private handlePayload(payload: any) {
		//shardDebugLog(this.client, this.id, `Recieved opcode: ${JSON.stringify(payload.op)}`, Color.Black);
        switch (payload.op) {
            case OperationCodes.Hello: {
                // Event
                this.emit(GatewayEvents.Hello);
				shardDebugLog(this.client, this.id, `Hello!`, Color.Green);
                // Initialize
                this.heartbeatInterval = payload.d.heartbeat_interval;
                this.startHeartbeat(this.heartbeatInterval);
                this.sendIdentify();
                break;
            };
            case OperationCodes.HeartbeatAcknowledge: {
                this.emit(GatewayEvents.Heartbeat);
                shardDebugLog(this.client, this.id, `Heartbeat acknowledged`, Color.Yellow);
                break;
            };
            // Ready event
            case OperationCodes.Dispatch: {
                // Gather session info
                this.resumeUrl = payload?.d?.resume_gateway_url;
                this.sessionId = payload?.d?.session_id;
                this.lastSequence = payload?.s;
                // Event
                this.emit(GatewayEvents.Ready);
                shardDebugLog(this.client, this.id, `Shard started!`, Color.Green);
                break;
            };
            case OperationCodes.Reconnect: {
                shardDebugLog(this.client, this.id, `Told to reconnect.`, Color.Yellow);
                this.resume();
                break;
            }
            case OperationCodes.Resume: {
                shardDebugLog(this.client, this.id, `Resumed!`, Color.Green);
                this.emit(GatewayEvents.Resumed);
                this.status = ShardStatus.Connected;
                break;
            }
            case OperationCodes.InvalidSession: {
                warn(this.client, "Invalid session!");
                if (payload.d === true) this.resume();
                break;
            };
            default: {
                warn(this.client, "Unhandled payload of code: " + payload.op);
                break;
            }
        }
    };

    private async handleClose(event: CloseEvent) {
        let code = event.code;
        this.emit(GatewayEvents.Closed, { code });
        switch (code) {
            case CloseEventCodes.UnknownError.code: {
                warn(this.client, "An unknown error occured!");
                break;
            };
            case CloseEventCodes.InvalidShard.code: {
                throw new GatewayError("Invalid shard!", this.id, code, CloseEventCodes.InvalidShard.reconnect);
            };
            case null: case undefined: {
                warn(this.client, "Closed without a code!");
                break;
            }
            default: {
                warn(this.client, `Unhandled close event code: ${code}`);
                break;
            }
        }
        // Check if we should reconnect
        for (let closeEventCode of Object.values(CloseEventCodes)) {
            if (code === closeEventCode.code && closeEventCode.reconnect) {
                warn(this.client, `Reconnecting...`);
                return this.resume();
            }
        }
    }

    private startHeartbeat(interval: number) {
        shardDebugLog(this.client, this.id, `Starting heartbeat...`, Color.Black);
        // Add some jitter for the first heartbeat to not cause an influx of traffic
        setTimeout(() => { this.sendHeartbeat(); }, interval * Math.random());
        // IT'S ALIVE
        setInterval(() => { this.sendHeartbeat(); }, interval);
    };

    private sendHeartbeat() {
        shardDebugLog(this.client, this.id, `Sending heartbeat...`, Color.Black);
        if (this.socket) {
            this.socket.send(JSON.stringify({
                op: OperationCodes.Heartbeat,
                d: null
            }));
        }
    };

    private sendIdentify() {
        shardDebugLog(this.client, this.id, `Sending identify...`, Color.Black);
        const payload = {
            op: OperationCodes.Identify,
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

    private sendResume() {
        const payload = {
            op: OperationCodes.Resume,
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