import { ChannelType, ColorResolvable, EmbedBuilder, GuildBasedChannel, TextChannel, User } from "discord.js";
import client from "../modules/client";
import TimeFormat from "./timeFormat";
import EmbedBody from "./embedBody";
import config from "../configuration";

export function user(id: User): string {
    return `<@${id.id}>`;
}

export function isText(channel: GuildBasedChannel): boolean {
    return channel.type === ChannelType.GuildText;
}

export function getChannel(id: string) {
    return client.guilds.cache.first()!.channels.cache.get(id);
}

export function textChannel(id: string): TextChannel {
    return getChannel(id) as TextChannel;
}

export function toEmbed(body: EmbedBody, withFooter: boolean = true) {
    const embed = new EmbedBuilder()
    .setColor(body.color)
    .setTitle(body.title)
    .setDescription(body.body);
    if (withFooter)
        embed.setFooter({ text: config.ISAC });
    return embed;
}

export function timeFromDate(date: Date, format: TimeFormat = TimeFormat.ShortDateTime): string {
    return time(date.getTime(), format);
}

export function time(dateValue: number, format: TimeFormat = TimeFormat.ShortDateTime): string {
    return `<t:${Math.floor(dateValue / 1000)}:${format}>`;
}

export function now(format: TimeFormat = TimeFormat.ShortDateTime): string {
    return time(Date.now(), format);
}

export async function firstMessage(channel: TextChannel) {
    const messages = await channel.messages.fetch({ limit: 1 });
    return messages.first();
}

export function newEmbed(color: ColorResolvable = "#b434eb") {
    return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: config.ISAC });
}

const symbolFilter = new RegExp(`[${config.goodTryRegex}]`, "ug");

export function normalizeText(message: string): string {
    return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(symbolFilter, "")
    .trim();
}

export function splitFirst(text: string, separator: string): string[] {
    const index = text.indexOf(separator);
    if (index < 0)
        return [ text ];
    return [ text.substring(0, index), text.substring(index + separator.length) ];
}