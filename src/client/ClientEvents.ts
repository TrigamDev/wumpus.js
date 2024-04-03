export enum ClientEvents {
    // Util
    apiRequest = 'apiRequest',
    apiResponse = 'apiResponse',
    debug = 'debug',
    error = 'error',
    invalidRequest = 'invalidRequest',

    // Client
    joinServer = 'joinServer',
    leaveServer = 'leaveServer',
    rateLimited = 'rateLimited',
    ready = 'ready',

    // Shard
    shardReady = 'shardReady',
    shardResume = 'shardResume',
    shardReconnecting = 'shardReconnecting',
    shardDisconnect = 'shardDisconnect',
    shardError = 'shardError',

    // Interactions
    interaction = 'interaction',

    // Servers
    serverUpdate = 'serverUpdate',
    serverUnavailable = 'serverUnavailable',
    serverIntegrationsUpdate = 'serverIntegrationsUpdate',
    warn = 'warn',

    // Members
    memberJoin = 'memberJoin',
    memberAvailable = 'memberAvailable',
    memberUpdate = 'memberUpdate',
    memberLeave = 'memberLeave',
    memberBan = 'memberBan',
    memberUnban = 'memberUnban',
    membersChunk = 'memberChunk',
    presenceUpdate = 'presenceUpdate',
    userUpdate = 'userUpdate',
    voiceStateUpdate = 'voiceStateUpdate',

    // Events
    eventCreate = 'eventCreate',
    eventUpdate = 'eventUpdate',
    eventJoin = 'eventJoin',
    eventLeave = 'eventLeave',
    eventDelete = 'eventDelete',

    // Invites
    inviteCreate = 'inviteCreate',
    inviteDelete = 'inviteDelete',

    // Roles
    roleCreate = 'roleCreate',
    roleUpdate = 'roleUpdate',
    roleDelete = 'roleDelete',

    // Channels
    channelCreate = 'channelCreate',
    channelUpdate = 'channelUpdate',
    channelPinsUpdate = 'channelPinsUpdate',
    channelDelete = 'channelDelete',
    webhooksUpdate = 'webhooksUpdate',
    typingStart = 'typingStart',

    // Threads
    threadCreate = 'threadCreate',
    threadUpdate = 'threadUpdate',
    threadDelete = 'threadDelete',
    threadSync = 'threadSync',
    threadMembersUpdate = 'threadMembersUpdate',
    clientThreadUpdate = 'clientThreadUpdate',

    // Messages
    messageSend = 'messageSend',
    messageUpdate = 'messageUpdate',
    messageDelete = 'messageDelete',
    messagePurge = 'messagePurge',

    // Message Reactions
    messageReact = 'messageReact',
    messageUnreact = 'messageUnreact',
    messageReactionClear = 'messageReactionClear',
    messageReactionRemove = 'messageReactionRemove',

    // Expressions
    emojiCreate = 'emojiCreate',
    emojiUpdate = 'emojiUpdate',
    emojiDelete = 'emojiDelete',
    stickerCreate = 'stickerCreate',
    stickerUpdate = 'stickerUpdate',
    stickerDelete = 'stickerDelete',

    // Stage
    stageCreate = 'stageCreate',
    stageUpdate = 'stageUpdate',
    stageDelete = 'stageDelete',
}