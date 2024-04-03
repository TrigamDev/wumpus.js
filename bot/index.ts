import Client from '../src/client/Client.ts';
import Intents from '../src/types/Intents.ts';

const client = new Client(
    process.env.BOT_TOKEN as string,
    [ ],
    {
        websocketCompression: false,
        shardCount: 2,
        debugLogging: true
    }
);

client.login();

client.on('ready', () => console.log('Ready!'));