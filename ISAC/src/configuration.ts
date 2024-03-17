import CONFIG from "./config.json";
import { CreatableTicket } from "./modules/tickets/tickets.types";
import { ServerStatusConfig } from "./modules/serverStatus/status.types";
import { MessageType } from "discord.js";
import { AutoRoleOptions } from "./modules/autoRoles/autoRoles.types";
import { AutoVoteOptions } from "./modules/autoVote";
import { SanctionConfig } from "./modules/sanctionSystem/sanctionSytem.types";
import { RoleManagementPermissions } from "./commands/roles/shared";
import { BasePermissions } from "./modules/permissions";

export type MessageChannels = {
    joins: string
    errorLog: string
    boosts: string
    deletedMessages: string
    messageEdits: string
    reactions: string
    info: string
    loggerIgnored: string[]
    roleModificationLog: string
    newAccountWarnChannel: string
};

export type Boosts = { messages: BoostMessage[], types: MessageType };

export type BoostMessage = { title: string, details: string };

export type CommandBypass = { id: string, perms: string[] };

export type CommandPermissions = { command: string, permissions: BasePermissions };

type WordFilteringOptions = {
    delete: boolean
    enabled: boolean
    ignoredChannels: string[]
    ignoredRoles: string[]
    logChannel: string
    wordList: string[]
}

type NameFilteringOptions = {
    enabled: boolean
    kick: boolean
    logChannel: string
    nameList: string[]
}

type MuteOptions = { role: string, logChannel: string }

export type Configuration = {
    joinImage: "https://i.imgur.com/mQighRb.png"
    ISAC: string
    endOfStackTrace: string
    channels: MessageChannels
    boost: Boosts
    commandBypass: CommandBypass[]
    autoVote: AutoVoteOptions
    muteOptions: MuteOptions
    wordFiltering: WordFilteringOptions
    goodTry: string[]
    goodTryRegex: string
    serverStatus: ServerStatusConfig
    ticketCategory: string
    tickets: CreatableTicket[]
    roleSelection: AutoRoleOptions
    sanctionSystem: SanctionConfig
    roleManagement: RoleManagementPermissions[]
    commandPermissions: CommandPermissions[]
    nameFiltering: NameFilteringOptions
};

const config: Configuration = CONFIG as unknown as Configuration;

export default config;