// https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
export enum OperationCodes {
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

// https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-close-event-codes
export interface CloseEventCode {
    code: number;
    reconnect: boolean;
};

export const CloseEventCodes = {
    UnknownError: { code: 4000, reconnect: true } as CloseEventCode,
    UnknownOpCode: { code: 4001, reconnect: true } as CloseEventCode,
    DecodeError: { code: 4002, reconnect: true } as CloseEventCode,
    NotAuthenticated: { code: 4003, reconnect: true } as CloseEventCode,
    AuthenticationFailed: { code: 4004, reconnect: false } as CloseEventCode,
    AlreadyAuthenticated: { code: 4005, reconnect: true } as CloseEventCode,
    InvalidSeq: { code: 4007, reconnect: true } as CloseEventCode,
    RateLimited: { code: 4008, reconnect: true } as CloseEventCode,
    SessionTimedOut: { code: 4009, reconnect: true } as CloseEventCode,
    InvalidShard: { code: 4010, reconnect: false } as CloseEventCode,
    ShardingRequired: { code: 4011, reconnect: false } as CloseEventCode,
    InvalidAPIVersion: { code: 4012, reconnect: false } as CloseEventCode,
    InvalidIntents: { code: 4013, reconnect: false } as CloseEventCode,
    DisallowedIntents: { code: 4014, reconnect: false } as CloseEventCode,
};