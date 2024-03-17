import { EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import config from "../configuration";
import { logRaw } from "../helpers/errorLogger";
import client from "./client";

function randomDesignation() {
    return Math.random().toString().substring(3, 7);
}

const escape = /([*_\\~<>#|@!`])/g;

export function escapeText(text: string) {
    return text.replaceAll(escape, "\\$1");
}

export default async function sendJoinMessage(member: GuildMember) {
    const channel = client.channels.cache.get(config.channels.joins) as TextChannel;
    if (channel == null) {
        logRaw("Join csatorna nem található!");
        return;
    }
    const newUser = member.user;
    const embed = new EmbedBuilder()
    .setTitle(`${member.guild.name}`)
    .setColor("#FF8A00")
    .setThumbnail(config.joinImage)
    .setDescription(`D-${randomDesignation()}, más néven **${escapeText(newUser.username)}** csatlakozott a szerverre! Érezd jól magad!`);
    await channel.send({ embeds: [ embed ] });
}
