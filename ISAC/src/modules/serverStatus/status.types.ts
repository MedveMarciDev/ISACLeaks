import { ColorResolvable, EmbedBuilder } from "discord.js";
import config from "../../configuration";

export enum Server {
    K54 = "54-es Körzet",
    K56 = "56-os Körzet",
    K58 = "58-as Körzet",
    K62 = "62-es Körzet"
}

export function getDiscordRoleFromServer(server: Server): string {
    return `<@&${config.serverStatus.associations.find(x => x.server === server.toString())?.role}>`;
}

export type ServerRoleAssociation = { server: Server, role: string, emoji: string };

export type ServerStatusConfig = {
    updateMinutes: number
    IP: string
    channel: string
    staffPlayerList: string
    staffRanks: string[]
    id: string
    servers: ServerInfo[]
    associations: ServerRoleAssociation[]
    friendlyFireEmoji: string
}

export type ServerInfo = {
    id: number
    name: string
    color: ColorResolvable
    image: string
    typeOverride?: string
}

export type ServerStatusEmbed = {
    embed: EmbedBuilder
    name: string
}

export type PlayerChartData = {
    count: number
    time: string
};