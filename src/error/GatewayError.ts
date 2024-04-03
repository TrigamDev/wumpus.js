export class GatewayError extends Error {
    public code: number;
    public reconnect: boolean;
    public constructor(message: string, code: number, reconnect: boolean) {
        super(message);
        this.code = code;
        this.reconnect = reconnect;
        Error.captureStackTrace(this, GatewayError);
    }

    public toString() {
        return `GatewayError: ${this.message} (code: ${this.code}, reconnect: ${this.reconnect})`;
    }
}