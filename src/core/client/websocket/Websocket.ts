import WebSock from 'ws';
import opCodes from '../../../types/gatewayOpCodes';
import gatewayOpCodes from '../../../types/gatewayOpCodes';

export default class WebSocket {
    private ws: WebSock;
    private token: string;

    constructor(token: string) {
        this.token = token;
        this.ws = new WebSock(null);
    };

    public start(gatewayURL: string) {
        this.ws = new WebSock(`${gatewayURL}/?v=10&encoding=json`);

        this.ws.on('open', () => {
            console.log('Websocket connection opened');
            this.sendHeartbeat();
            this.sendIdentify();
        });

        this.ws.on('message', (data: string) => {
            const payload = JSON.parse(data);

            // THIS IS THE BOT'S HEART, DO NOT TOUCH
            switch (payload.op) {
                case opCodes.Hello: {
                    const interval = payload.d.heartbeat_interval;
                    setInterval(() => {
                        this.sendHeartbeat();
                    }, interval);
                    break;
                };
                case opCodes.HeartbeatACK: {
                    console.log('Heartbeat acknowledged');
                    break;
                };
                default: {
                    console.log('Received payload: ', payload.op);
                    break;
                };
            };
        });

        this.ws.on('close', () => {
            console.log('Websocket connection closed');
        });
    };

    private sendHeartbeat() {
        this.ws.send(JSON.stringify({
            op: 1,
            d: null
        }));
    }

    private sendIdentify() {
        this.ws.send(JSON.stringify({
            op: gatewayOpCodes.Identify,
            d: {
                token: this.token,
                properties: {
                    $os: 'linux',
                    $browser: '',
                    $device: ''
                },
                intents: 513,
                shard: [0, 1]
            }
        }));
    }
}