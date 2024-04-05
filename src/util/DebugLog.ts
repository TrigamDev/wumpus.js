import Client from "../client/Client";
import Shard from "../gateway/Shard";

export function debugLog(client: Client, shard: Shard | null, message: string, color: Color = Color.Reset, background: BackgroundColor | null = null) {
    let colorCode = background ? `${color};${background}` : `${color}`;
	let shardPrefix = shard ? `\u001b[36m[Shard #${shard.id}]\u001b[0m ` : '';
    if (client.options?.debugLogging) console.log(`${shardPrefix}\u001b[${colorCode}m${message}\u001b[0m`);
}

export function warn(client: Client, shard: Shard | null, message: string, color: Color = Color.Red, background: BackgroundColor | null = null) {
	let colorCode = background ? `${color};${background}` : `${color}`;
	let shardPrefix = shard ? `\u001b[36m[Shard #${shard.id}]\u001b[0m ` : '';
	if (client.options?.debugLogging) console.warn(`${shardPrefix}\u001b[${colorCode}m${message}\u001b[0m`);
}

export enum Color {
    Black = 30,
    Red = 31,
    Green = 32,
    Yellow = 33,
    Blue = 34,
    Magenta = 35,
    Cyan = 36,
    White = 37,
    Reset = 0
}

export enum BackgroundColor {
    Black = 40,
    Red = 41,
    Green = 42,
    Yellow = 43,
    Blue = 44,
    Magenta = 45,
    Cyan = 46,
    White = 47
}