import { RecoverMethod } from "./GatewayCodes";

export class GatewayError extends Error {
	public shardId: number;
    public code: number;
    public recover: RecoverMethod;
    public constructor(message: string, shardId: number, code: number, recover: RecoverMethod) {
        super(buildMessage(message, shardId, code, recover));
		this.name = 'GatewayError';
		this.shardId = shardId;
        this.code = code;
        this.recover = recover;
        Error.captureStackTrace(this, GatewayError);
    }

	public toString(): string {
		return this.message;
	}
}

function buildMessage(message: string, shardId: number, code: number, recover: RecoverMethod): string {
	return `${message} \u001b[30m(Shard: #${shardId}, Code: ${code}, Recover: ${recover})\u001b[0m`;
}