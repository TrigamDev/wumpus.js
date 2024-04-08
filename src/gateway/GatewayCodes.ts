// https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
export enum GatewayOperationCode {
    Dispatch = 0,
    Heartbeat = 1,
    Identify = 2,
    PresenceUpdate = 3,
    VoiceStateUpdate = 4,
    Resume = 6,
    Reconnect = 7,
    RequestGuildMembers = 8,
    InvalidSession = 9,
    Hello = 10,
    HeartbeatAcknowledge = 11,
};

export interface GatewayCloseEvent {
    code: number;
    recover: RecoverMethod;
};

export enum RecoverMethod {
	Resume = 0,
	Reconnect = 1,
	Disconnect = 2,
}

// https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-close-event-codes
// https://www.rfc-editor.org/rfc/rfc6455.html#page-45
export const GatewayCloseCode = {
	Normal: { code: 1000, recover: RecoverMethod.Resume } as GatewayCloseEvent,
	Close: { code: 1001, recover: RecoverMethod.Disconnect } as GatewayCloseEvent,
	Error: { code: 1006, recover: RecoverMethod.Reconnect } as GatewayCloseEvent,
	Resuming: { code: 4200, recover: RecoverMethod.Resume } as GatewayCloseEvent,
	ZombieConnection: { code: 4201, recover: RecoverMethod.Reconnect } as GatewayCloseEvent,
    UnknownError: { code: 4000, recover: RecoverMethod.Resume } as GatewayCloseEvent,
    UnknownOpCode: { code: 4001, recover: RecoverMethod.Resume } as GatewayCloseEvent,
    DecodeError: { code: 4002, recover: RecoverMethod.Resume } as GatewayCloseEvent,
    NotAuthenticated: { code: 4003, recover: RecoverMethod.Resume } as GatewayCloseEvent,
    AuthenticationFailed: { code: 4004, recover: RecoverMethod.Disconnect } as GatewayCloseEvent,
    AlreadyAuthenticated: { code: 4005, recover: RecoverMethod.Resume } as GatewayCloseEvent,
    InvalidSeq: { code: 4007, recover: RecoverMethod.Reconnect } as GatewayCloseEvent,
    RateLimited: { code: 4008, recover: RecoverMethod.Resume } as GatewayCloseEvent,
    SessionTimedOut: { code: 4009, recover: RecoverMethod.Reconnect } as GatewayCloseEvent,
    InvalidShard: { code: 4010, recover: RecoverMethod.Disconnect } as GatewayCloseEvent,
    ShardingRequired: { code: 4011, recover: RecoverMethod.Disconnect } as GatewayCloseEvent,
    InvalidAPIVersion: { code: 4012, recover: RecoverMethod.Disconnect } as GatewayCloseEvent,
    InvalidIntents: { code: 4013, recover: RecoverMethod.Disconnect } as GatewayCloseEvent,
    DisallowedIntents: { code: 4014, recover: RecoverMethod.Disconnect } as GatewayCloseEvent,
};