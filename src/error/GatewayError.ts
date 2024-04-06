import { RecoverMethod } from "../gateway/GatewayCodes";

export class GatewayError extends Error {
	public shardId: number;
    public code: number;
    public recover: RecoverMethod;
    public constructor(source: CallableFunction, message: string, shardId: number, code: number, recover: RecoverMethod) {
        super(buildMessage(message, shardId, code, recover));
		this.name = 'GatewayError';
		this.shardId = shardId;
        this.code = code;
        this.recover = recover;
        Error.captureStackTrace(this, source);
    }

	public toString(): string {
		return this.message;
	}
}

function buildMessage(message: string, shardId: number, code: number, recover: RecoverMethod): string {
	return `${message} \u001b[30m(Shard: #${shardId}, Code: ${code}, Recover: ${recover})\u001b[0m`;
}