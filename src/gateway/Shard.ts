import EventEmitter from "eventemitter3";
import { WebSocket } from "ws";

import Client from "../client/Client";
import { GatewayVersion } from "../Constants";
import { BaseUrl, Gateway } from "../rest/Endpoints";
import { UnauthorizedRequest } from "../rest/RequestUtil";
import { OperationCodes } from "../types/GatewayCodes";

export default class Shard extends EventEmitter {
    public client: Client;
    private socket: WebSocket | undefined;
    private websocketURL: string | undefined;

    constructor(client: Client) {
        super();

        this.client = client;
    };

    public async connect(): Promise<Shard> {
        // fetch BaseUrl + Gateway and cache it to websocketURL
        const newURL = await UnauthorizedRequest(BaseUrl + Gateway());
        this.websocketURL = newURL.url;
        
        this.socket = new WebSocket(`${this.websocketURL}/?v=${GatewayVersion}&encoding=json`);
        // Handle websocket events
        this.socket.onopen = () => { console.log("Opened websocket connection.") };

        this.socket.onmessage = (event) => {
            if (event.data.toString().startsWith("{")) this.handlePayload(JSON.parse(event.data.toString()));
        };

        return this;
    };

    private handlePayload(payload: any) {
        switch (payload.op) {
            case OperationCodes.Hello: {
                this.startHeartbeat(payload.d.heartbeat_interval);
                this.sendIdentify();
                break
            };
            default: {
                console.log("Unhandled payload of code: " + payload.op);
                break;
            }
        }
    }

    private startHeartbeat(interval: number) {
        console.log("Starting heartbeat...")
        // Add some jitter for the first heartbeat to not cause an influx of traffic
        setTimeout(() => { this.sendHeartbeat(); }, interval * Math.random());
        // IT'S ALIVE
        setInterval(() => { this.sendHeartbeat(); }, interval);
    };

    private sendHeartbeat() {
        console.log("Sending heartbeat...")
        if (this.socket) {
            this.socket.send(JSON.stringify({
                op: OperationCodes.Heartbeat,
                d: null
            }));
        }
    };

    private sendIdentify() {
        console.log("Sending identify...")
        const payload = {
            op: OperationCodes.Identify,
            d: {
                token: this.client.token,
                intents: this.client.intents,
                properties: {
                    $os: process.platform,
                    $browser: "Wumpus.js",
                    $device: "Wumpus.js"
                },
                shard: [0, 1]
            }
        };
        // Set shard count if it exists
        if (this.client.options?.shardCount) payload.d.shard = [this.client.options.shardCount, this.client.shards.size];
        // Send out the payload
        if (this.socket) this.socket.send(JSON.stringify(payload));
    };
}