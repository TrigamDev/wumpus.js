import axios from 'axios';
import WebSocket from './websocket/Websocket';
import GatewayIntents from '../../types/gatewayIntents';

export default class Client {
    private token: string;
    private options: ClientOptions;
    private baseURL: string = 'https://discord.com/api';
    private webSocket: WebSocket;

    constructor(token: string, options: ClientOptions) {
        this.token = token;
        this.options = options;
        this.webSocket = new WebSocket(this.token, this.intentBits());
    };

    public async login(token = this.token) {
        const gatewayInfo = await this.getGatewayInfo();

        if (!gatewayInfo || !gatewayInfo.url) {
            throw new Error('Failed to fetch gateway information');
        };
        this.webSocket.start(gatewayInfo.url);
    };

    private async getGatewayInfo() {
        const response = await axios.get(`${this.baseURL}/v10/gateway/bot`, {
            headers: { Authorization: `Bot ${this.token}` },
        });
        return response.data;
    };

    // Convert the array of intents into an integer
    private intentBits() {
        let bits = 0;
        for (const intent in this.options.intents) {
            bits |= Number(GatewayIntents[intent]);
        };
        return bits;
    }
};

type ClientOptions = {
    intents: GatewayIntents[],
};