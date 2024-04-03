import EventEmitter from "eventemitter3";

import Shard from "../gateway/Shard";
import { BaseUrl, GatewayBot } from "../rest/Endpoints";
import { AuthorizedRequest } from "../rest/RequestUtil";
import { GatewayEvents } from "../gateway/GatewayEvents";

/**
 * A Wumpus.js client.
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

    private async handleReady() {
        this.readyShards++;
        if (this.readyShards === this.shardCount) {
            this.emit('ready');
        }
    };

    private intentBits(intents: number[]) {
        let bits = 0;
        intents.forEach((intent) => {
            bits |= intent;
        });
        return bits;
    }
};

export interface ClientOptions {
    websocketCompression?: boolean;
    shardCount?: number;
    debugLogging?: boolean;
    // add more options in the future as needed
}

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