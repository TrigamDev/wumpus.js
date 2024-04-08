import EventEmitter from "eventemitter3";
import { WebSocket, CloseEvent } from "ws";

import Client from "../client/Client";
import { GatewayEvents } from "./GatewayEvents";
import { GatewayError } from "../error/GatewayError";
import { Color, debugLog, warn } from "../util/DebugLog";
import ShardSocket from "./ShardSocket";

/**
 * Represents a self-contained shard, managed by the {@link Client}.
 * Connects to the Discord Gateway, handles events and payloads, manages
 * the session, and will reconnect when needed
 */
export default class Shard extends EventEmitter {
    // Shard info
    public client: Client;
    public id: number;
    private token: string;
	// Websocket
	private socket: ShardSocket;

    constructor(client: Client, id: number = 0, token: string = "") {
        super();
        this.client = client;
        this.id = id;
        this.token = token;

		this.socket = this.createSocket();
    };

	/**
	 * @description Connects the shard to the Discord Gateway
	 */
	public async connect(): Promise<Shard> {
		this.socket.connect();
		return this;
	};

	public createSocket(): ShardSocket {
		let socket = new ShardSocket(this, this.token);

		// Events
		socket.on(GatewayEvents.Ready, (data: any) => {
			debugLog(this.client, this, `Shard started!`, Color.Magenta);
		});
		socket.on(GatewayEvents.Resumed, (data: any) => {
			this.emit(GatewayEvents.Resumed, data);
			debugLog(this.client, this, `Resumed!`, Color.Magenta);
		});
		socket.on(GatewayEvents.Closed, (event: CloseEvent) => {
			debugLog(this.client, this, `Disconnecting with code: ${event.code}`, Color.Magenta);
		});
		socket.on(GatewayEvents.Error, (error: GatewayError) => {
			warn(this.client, this, `Error: ${error.message}`);
		});
		socket.on(GatewayEvents.Hello, (heartbeatInterval: number) => {
			this.emit(GatewayEvents.Hello, heartbeatInterval);
			debugLog(this.client, this, `Hello!`, Color.Green);
		});
		socket.on(GatewayEvents.Heartbeat, (elapsed: number) => {
			this.emit(GatewayEvents.Heartbeat, elapsed);
			debugLog(this.client, this, `Heartbeat acknowledged (time elapsed: ${elapsed}ms)`, Color.Yellow);
		});
		socket.on(GatewayEvents.Dispatch, (data: any) => {
			this.emit(GatewayEvents.Dispatch, data);
			debugLog(this.client, this, `Dispatched event: ${data.name}`, Color.Cyan);
		});

		return socket;
	}
}