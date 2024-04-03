import EventEmitter from "eventemitter3";
import { WebSocket } from "ws";

import Client from "../client/Client";
import { GatewayVersion } from "../Constants";
import { BaseUrl, Gateway } from "../rest/Endpoints";
import { UnauthorizedRequest } from "../rest/RequestUtil";
import { CloseEventCode, CloseEventCodes, OperationCodes } from "../types/GatewayCodes";
import { GatewayEvents } from "./GatewayEvents";
import { GatewayError } from "../error/GatewayError";
import { Color, shardDebugLog } from "../util/DebugLog";

export enum ShardStatus {
    Idle,
    Connecting,
    Resuming,
    Connected
}

export default class Shard extends EventEmitter {
    public client: Client;
    public id: number;
    public status: ShardStatus = ShardStatus.Idle;
    private token: string;
    private socket: WebSocket | undefined;
    private websocketURL: string | undefined;

    constructor(client: Client, id: number = 0, token: string = "") {
        super();
        this.client = client;
        this.id = id;
        this.token = token;
    };

    public async connect(): Promise<Shard> {
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
            if (event.data.toString().startsWith("{")) this.handlePayload(JSON.parse(event.data.toString()));
        };
        this.socket.onclose = (event: CloseEvent) => {
            this.handleClose(event);
        }

        return this;
    };

    private handlePayload(payload: any) {
        switch (payload.op) {
            case OperationCodes.Hello: {
                this.emit(GatewayEvents.Hello)
                this.startHeartbeat(payload.d.heartbeat_interval);
                this.sendIdentify();
                break
            };
            case OperationCodes.HeartbeatAcknowledge: {
                this.emit(GatewayEvents.Heartbeat);
                shardDebugLog(this.client, this.id, `Heartbeat acknowledged`, Color.Yellow);
                break;
            };
            case OperationCodes.Dispatch: {
                this.emit(GatewayEvents.Ready);
                shardDebugLog(this.client, this.id, `Shard started!`, Color.Green);
                break;
            };
            case OperationCodes.InvalidSession: {
                if (this.client.options?.debugLogging) console.error("Invalid session!");
                break;
            };
            default: {
                if (this.client.options?.debugLogging) console.error("Unhandled payload of code: " + payload.op);
                break;
            }
        }
    };

    private async handleClose(event: CloseEvent) {
        let code = event.code;
        this.emit(GatewayEvents.Closed, { code });
        switch (code) {
            case CloseEventCodes.UnknownError.code: {
                if (this.client.options?.debugLogging) console.error("An unknown error occured!");
                break;
            };
            case CloseEventCodes.InvalidShard.code: {
                throw new GatewayError("Invalid shard!", code, CloseEventCodes.InvalidShard.reconnect);
            };
            default: {
                if (this.client.options?.debugLogging) console.error(`Unhandled close event code: ${code}`);
                break;
            }
        }
        // Check if we should reconnect
        for (let closeEventCode of Object.values(CloseEventCodes)) {
            if (code === closeEventCode.code && closeEventCode.reconnect) {
                if (this.client.options?.debugLogging) console.error(`Reconnecting...`);
                return this.connect();
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
}