import { RestVersion } from "../Constants";

export const BaseUrl = `https://discord.com/api/v${RestVersion}`;

// API Endpoints
export const Gateway =          () => '/gateway';
export const GatewayBot =       () => '/gateway/bot';