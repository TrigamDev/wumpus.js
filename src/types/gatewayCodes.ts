// https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
export const operationCodes = {
    dispatch: 0,
    heartbeat: 1,
    identify: 2,
    presenceUpdate: 3,
    voiceStateUpdate: 4,
    resume: 6,
    reconnect: 7,
    requestGuildMembers: 8,
    invalidSession: 9,
    hello: 10,
    heartbeatAcknowledge: 11,
};

// https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-close-event-codes
export interface CloseEventCode {
    code: number;
    reconnect: boolean;
};

export const closeEventCodes = {
    unknownError: { code: 4000, reconnect: true } as CloseEventCode,
    unknownOpCode: { code: 4001, reconnect: true } as CloseEventCode,
    decodeError: { code: 4002, reconnect: true } as CloseEventCode,
    notAuthenticated: { code: 4003, reconnect: true } as CloseEventCode,
    authenticationFailed: { code: 4004, reconnect: false } as CloseEventCode,
    alreadyAuthenticated: { code: 4005, reconnect: true } as CloseEventCode,
    invalidSeq: { code: 4007, reconnect: true } as CloseEventCode,
    rateLimited: { code: 4008, reconnect: true } as CloseEventCode,
    sessionTimedOut: { code: 4009, reconnect: true } as CloseEventCode,
    invalidShard: { code: 4010, reconnect: false } as CloseEventCode,
    shardingRequired: { code: 4011, reconnect: false } as CloseEventCode,
    invalidAPIVersion: { code: 4012, reconnect: false } as CloseEventCode,
    invalidIntents: { code: 4013, reconnect: false } as CloseEventCode,
    disallowedIntents: { code: 4014, reconnect: false } as CloseEventCode,
};