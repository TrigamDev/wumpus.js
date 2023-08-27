import axios from 'axios';
import WebSocket from './websocket/Websocket';

export default class Client {
    private token: string;
    private baseURL: string = 'https://discord.com/api';
    private webSocket: WebSocket;

    constructor(token: string) {
        this.token = token;
        this.webSocket = new WebSocket(this.token);
    };

    public async login(token = this.token) {
        const gatewayInfo = await this.getGatewayInfo();

        if (!gatewayInfo || !gatewayInfo.url) {
            throw new Error('Failed to fetch gateway information');
        };
        //     client_id: '1145091520593149972',
        this.webSocket.start(gatewayInfo.url);
    };

    private async getGatewayInfo() {
        const response = await axios.get(`${this.baseURL}/v10/gateway/bot`, {
            headers: {
                Authorization: `Bot ${this.token}`
            },
        });

        return response.data;
    };
};