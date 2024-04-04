export class GatewayError extends Error {
	public shardId: number;
    public code: number;
    public reconnect: boolean;
    public constructor(message: string, shardId: number, code: number, reconnect: boolean) {
        super(buildMessage(message, shardId, code, reconnect));
		this.name = 'GatewayError';
		this.shardId = shardId;
        this.code = code;
        this.reconnect = reconnect;
        Error.captureStackTrace(this, GatewayError);
    }

	public toString(): string {
		return this.message;
	}
}

function buildMessage(message: string, shardId: number, code: number, reconnect: boolean): string {
	return `${message} \u001b[30m(Shard: #${shardId}, Code: ${code}, Reconnect: ${reconnect})\u001b[0m`;
}