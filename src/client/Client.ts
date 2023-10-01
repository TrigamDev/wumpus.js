import EventEmitter from "eventemitter3";

import Shard from "../gateway/Shard";
import { BaseUrl, GatewayBot } from "../rest/Endpoints";
import { AuthorizedRequest } from "../rest/RequestUtil";

/**
 * A Wumpus.js client.
 * @param {string} token - The authentication token.
 * @param {number[]} intents - An array of intents.
 * @param {ClientOptions} [options] - The client options.
 */
export default class Client extends EventEmitter {
    public token: string;
    public intents: number;
    public options: ClientOptions | undefined;

    public shards: Map<number, Shard> = new Map();

    constructor(token: string, intents: number[], options?: ClientOptions) {
        super();

        this.token = token;
        this.intents = this.intentBits(intents);
        this.options = options;

        this.shards = new Map();
    }

    public async login() {
        const gatewayInfo: BotGatewayInfo = await AuthorizedRequest(BaseUrl + GatewayBot(), this.token) as BotGatewayInfo;
        // Set the number of shards
        let shardCount: number = 1;
        if (this.options?.shardCount) shardCount = this.options.shardCount;
        else if (gatewayInfo.shards) shardCount = gatewayInfo.shards;
        
        this.shards.set(shardCount, await new Shard(this).connect());
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