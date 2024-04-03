import Client from '../src/client/Client.ts';
import Intents from '../src/types/Intents.ts';

const client = new Client(
    [ ],
    {
        websocketCompression: false,
        shardCount: 2,
        debugLogging: true
    }
);

client.login(process.env.BOT_TOKEN as string);

client.on('ready', () => console.log('Ready!'));