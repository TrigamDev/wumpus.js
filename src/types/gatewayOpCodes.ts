// Gateway opcodes
// https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
enum gatewayOpCodes {
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
    HeartbeatACK = 11
}

export default gatewayOpCodes;