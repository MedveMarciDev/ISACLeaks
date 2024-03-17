import CONFIG from "./config.json";

export type Configuration = {
    commandChannels: string[]
    voiceChannels: string[]
    moderatorRankIds: string[]
    errorChannel: string
};

export type InstanceSettings = { commandChannel: string, voiceChannel: string };

const config = CONFIG as unknown as Configuration;

export default config;