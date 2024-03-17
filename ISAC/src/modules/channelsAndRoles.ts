import client from "./client";
import * as fs from "fs";
import { ChannelType, NonThreadGuildBasedChannel, Role } from "discord.js";
import logError, { logRaw } from "../helpers/errorLogger";
import * as path from "path";

const directory = process.env.CHANNELS_ROLES_LOCATION;

export default function initChannelsAndRoles() {
    if (directory)
        update().then();
    else
        logRaw("No directory specified for channels and roles");
}

function channelMapper(channel: NonThreadGuildBasedChannel | null) {
    return {
        id: channel!.id,
        name: channel!.name,
        type: channel!.type
    };
}

function roleMapper(role: Role) {
    return {
        id: role.id,
        name: role.name,
        color: role.hexColor
    };
}

async function update() {
    setTimeout(update, 1000 * 60 * 2);
    const guild = client.guilds.cache.first()!;
    try {
        const channels = await guild.channels.fetch();
        fs.writeFileSync(path.join(directory!, "channels.json"), JSON.stringify(channels.filter(e => e != null).map(channelMapper)));
        const roles = await guild.roles.fetch();
        fs.writeFileSync(path.join(directory!, "roles.json"), JSON.stringify(roles.filter(e => e.id !== guild.roles.everyone.id).map(roleMapper)));
    } catch (e) {
        logError("Failed updating channels and roles", e);
    }
}