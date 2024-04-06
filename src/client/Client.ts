import EventEmitter from "eventemitter3";

import Shard from "../gateway/Shard";
import { BaseUrl, GatewayBot } from "../rest/Endpoints";
import { AuthorizedRequest } from "../rest/RequestUtil";
import { GatewayEvents } from "../gateway/GatewayEvents";
import { ClientEvents } from "./ClientEvents";

/**
 * @description A Wumpus.js client. Main entry point for interacting with Discord.
 * @param {number[]} intents - An array of intents.
 * @param {ClientOptions} [options] - The client options.
 */
export default class Client extends EventEmitter {
    public intents: number;
    public options: ClientOptions | undefined;

    public shards: Map<number, Shard> = new Map();
    public shardCount: number = 1;

    private readyShards: number;

    constructor(intents: number[], options?: ClientOptions) {
        super();
        this.intents = this.intentBits(intents);
        this.options = options;

        this.shards = new Map();
        this.readyShards = 0;
    }

	/**
	 * Logs the client in using a bot token.
	 * @param {string} token - The bot token.
	 */
    public async login(token: string) {
        const gatewayInfo: BotGatewayInfo = await AuthorizedRequest(BaseUrl + GatewayBot(), token) as BotGatewayInfo;
        // Set the number of shards
        if (this.options?.shardCount) this.shardCount = this.options.shardCount;
        else if (gatewayInfo.shards) this.shardCount = gatewayInfo.shards;
        
        // event formula: shard_id = (guild_id >> 22) % num_shards
        for (let i = 0; i < this.shardCount; i++) {
            let shard = await new Shard(this, i, token).connect();
            this.shards.set(i, shard);
            shard.on(GatewayEvents.Ready, this.handleReady.bind(this));
        }
    };

	/**
	 * @description Emits the {@link ClientEvents.ready} event when all shards are ready.
	 */
    private async handleReady() {
        this.readyShards++;
        if (this.readyShards === this.shardCount) {
            this.emit(ClientEvents.ready);
        }
    };

	/**
	 * @description Converts an array of intents into a single bitfield.
	 * @param {number[]} intents - An array of intents.
	 * @returns {number} - The bitfield.
	 */ 
    private intentBits(intents: number[]): number {
        let bits = 0;
        intents.forEach((intent) => {
            bits |= intent;
        });
        return bits;
    }
};

/**
 * The client options.
 * @param {boolean} [websocketCompression] - Whether to enable websocket compression.
 * @param {number} [shardCount] - The number of shards to use.
 * @param {boolean} [debugLogging] - Whether to enable debug logging.
 */
export interface ClientOptions {
    websocketCompression?: boolean;
    shardCount?: number;
    debugLogging?: boolean;
    // add more options in the future as needed
}

/**
 * The bot gateway information.
 * @param {string} url - The gateway URL.
 * @param {number} shards - The number of recommended shards.
 * @param {Object} session_start_limit - The session start limit.
 * @param {number} session_start_limit.total - The total number of session starts.
 * @param {number} session_start_limit.remaining - The remaining number of session starts.
 * @param {number} session_start_limit.reset_after - The number of milliseconds until the session limit resets.
 * @param {number} session_start_limit.max_concurrency - The maximum number of session starts per 5 seconds.
 */
export interface BotGatewayInfo {
    url: string;
    shards: number;
    session_start_limit: {
        total: number;
        remaining: number;
        reset_after: number;
        max_concurrency: number;
    };
}