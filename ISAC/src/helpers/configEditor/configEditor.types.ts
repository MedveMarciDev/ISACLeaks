export enum ConfigEntryType {
    role,
    channel,
    roleArray,
    channelArray
}

export type ConfigEntry = [ string, ConfigEntryType, boolean? ];

export function getPaths(obj: any, current: string): string[] {
    const paths: string[] = [];
    const prefix = current ? current + "." : "";
    if (Array.isArray(obj) && obj.every(e => typeof e === "string")) {
        paths.push(current);
        return paths;
    }
    if (typeof obj === "object") {
        for (const key of Object.keys(obj))
            paths.push(...getPaths(obj[key], prefix + key));
        return paths;
    }
    paths.push(current);
    return paths;
}

export function getValues(obj: any, path: string): { isSet: boolean, value: any, parent: any } {
    const parts = path.split(".");
    let value = obj;
    let parent = obj;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        parent = value;
        value = value[part];
        if (value === undefined)
            break;
    }
    return { isSet: value !== undefined && value !== obj, value, parent };
}

export function setValue(obj: any, path: string, value: any): boolean {
    const parts = path.split(".");
    for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
        if (obj === undefined)
            return false;
    }
    obj[parts[parts.length - 1]] = value;
    return true;
}

export const configLayout: ConfigEntry[] = [
    [ "channels.joins", ConfigEntryType.channel ],
    [ "channels.errorLog", ConfigEntryType.channel ],
    [ "channels.boosts", ConfigEntryType.channel ],
    [ "channels.deletedMessages", ConfigEntryType.channel ],
    [ "channels.messageEdits", ConfigEntryType.channel ],
    [ "channels.reactions", ConfigEntryType.channel ],
    [ "channels.info", ConfigEntryType.channel ],
    [ "channels.loggerIgnored", ConfigEntryType.channelArray ],
    [ "autoVote.textChannels", ConfigEntryType.channelArray ],
    [ "autoVote.forums", ConfigEntryType.channelArray ],
    [ "wordFiltering.ignoredChannels", ConfigEntryType.channelArray ],
    [ "wordFiltering.logChannel", ConfigEntryType.channel ],
    [ "nameFiltering.logChannel", ConfigEntryType.channel ],
    [ "serverStatus.associations.0.role", ConfigEntryType.role, true ],
    [ "tickets.0.initialization.channel", ConfigEntryType.channel, true ],
    [ "tickets.0.initialization.blacklistedRoles", ConfigEntryType.roleArray, true ],
    [ "tickets.0.creation.pingRoles", ConfigEntryType.roleArray, true ],
    [ "tickets.0.creation.pingRolesHidden", ConfigEntryType.roleArray, true ],
    [ "tickets.0.creation.rolesWithAccess", ConfigEntryType.roleArray, true ],
    [ "tickets.0.log.channel", ConfigEntryType.channel, true ],
    [ "roleSelection.options.0.id", ConfigEntryType.role, true ],
    [ "sanctionSystem.oldVerification.bans", ConfigEntryType.channel ],
    [ "sanctionSystem.oldVerification.warnings", ConfigEntryType.channel ],
    [ "sanctionSystem.oldVerification.ageChecks", ConfigEntryType.channel ],
    [ "sanctionSystem.oldVerification.wantedIndividuals", ConfigEntryType.channel ],
    [ "sanctionSystem.oldVerification.sendTo", ConfigEntryType.channel ],
    [ "sanctionSystem.banLogChannel", ConfigEntryType.channel ],
    [ "sanctionSystem.warnLogChannel", ConfigEntryType.channel ],
    [ "sanctionSystem.ageCheckChannel", ConfigEntryType.channel ],
    [ "sanctionSystem.wantedIndividualsChannel", ConfigEntryType.channel ],
    [ "sanctionSystem.permittedRoles", ConfigEntryType.roleArray ],
    [ "sanctionSystem.logCreationChannel", ConfigEntryType.channel ],
    [ "sanctionSystem.deleteOverrideRoles", ConfigEntryType.roleArray ],
    [ "sanctionSystem.deletionLog", ConfigEntryType.channel ],
    [ "roleManagement.0.staffRole", ConfigEntryType.role, true ],
    [ "roleManagement.0.manageRoles", ConfigEntryType.roleArray, true ],
    [ "commandPermissions.clear", ConfigEntryType.roleArray, false ],
    [ "commandPermissions.info", ConfigEntryType.roleArray, false ],
    [ "commandPermissions.mute", ConfigEntryType.roleArray, false ],
    [ "commandPermissions.removerole", ConfigEntryType.roleArray, false ],
    [ "commandPermissions.giverole", ConfigEntryType.roleArray, false ],
    [ "commandPermissions.unmute", ConfigEntryType.roleArray, false ],
    [ "commandPermissions.history", ConfigEntryType.roleArray, false ],
    [ "commandPermissions.wanted", ConfigEntryType.roleArray, false ],
    [ "commandPermissions.listissued", ConfigEntryType.roleArray, false ]
];