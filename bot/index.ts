import Client from '../src/client/Client.ts';
import Intents from '../src/client/Intents.ts';

const client = new Client(
    [ ],
    {
        websocketCompression: false,
        shardCount: 1,
        debugLogging: true
    }
);

client.login(process.env.BOT_TOKEN as string);

client.on('ready', () => console.log('Ready!'));