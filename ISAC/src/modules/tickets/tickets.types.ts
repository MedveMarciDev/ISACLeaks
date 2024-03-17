import { ColorResolvable } from "discord.js";
import EmbedBody from "../../helpers/embedBody";

export type TicketLog = { channel: string, embedTitle: string, embedColor: ColorResolvable };

export type TicketInit = { channel: string, embed: EmbedBody, blacklistedRoles: string[], emoji: string };

export type TicketCreation = {
    pingRoles: string[]
    pingRolesHidden: string[]
    rolesWithAccess: string[]
    embed: EmbedBody
    description: string
};

export type CreatableTicket = {
    id: string
    channelName: string
    log: TicketLog
    initialization: TicketInit
    creation: TicketCreation
    tempDisable: boolean
};

enum TicketInteraction {
    Open = "open",
    Close = "close",
    Read = "readlog"
}

export { TicketInteraction };