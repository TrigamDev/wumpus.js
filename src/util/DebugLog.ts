import Client from "../client/Client";

export function debugLog(client: Client, message: string, color: Color = Color.Reset, background: BackgroundColor | null = null) {
    let colorCode = background ? `${color};${background}` : `${color}`;
    if (client.options?.debugLogging) console.log(`\u001b[${colorCode}m${message}\u001b[0m`);
}

export function shardDebugLog(client: Client, shardId: number, message: string, color: Color = Color.Reset, background: BackgroundColor | null = null) {
    let colorCode = background ? `${color};${background}` : `${color}`;
    if (client.options?.debugLogging) console.log(`\u001b[36m[Shard #${shardId}]\u001b[0m \u001b[${colorCode}m${message}\u001b[0m`);
}

export function warn(client: Client, message: string) {
    if (client.options?.debugLogging) console.warn(`\u001b[33m${message}\u001b[0m`);
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