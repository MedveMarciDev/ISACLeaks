import { ComponentEmojiResolvable, EmojiIdentifierResolvable } from "discord.js";
import client from "../modules/client";

const sourceEmojiMap = require("emojilib");

const allEmojis = new Map<string, string>();

for (const key in sourceEmojiMap)
    for (const emoji of sourceEmojiMap[key])
        allEmojis.set(emoji, key.trim());

export function getVanillaEmoji(emoji: string): EmojiIdentifierResolvable | null {
    if (emoji == null)
        return null;
    const lowerCase = emoji.toLowerCase();
    return allEmojis.get(lowerCase) as EmojiIdentifierResolvable ?? null;
}

export function getGuildEmoji(name: string): EmojiIdentifierResolvable | null {
    return client.guilds.cache.first()!.emojis.cache.find(e => e.name === name)?.id ?? null;
}

export function getEmoji(emoji: string): EmojiIdentifierResolvable | null {
    return getGuildEmoji(emoji) ?? getVanillaEmoji(emoji);
}

export function getVanillaEmojiComponent(emoji: string): ComponentEmojiResolvable | null {
    if (emoji == null)
        return null;
    const lowerCase = emoji.toLowerCase();
    return allEmojis.get(lowerCase) as ComponentEmojiResolvable ?? null;
}

export function getGuildEmojiComponent(name: string): ComponentEmojiResolvable | null {
    return client.guilds.cache.first()!.emojis.cache.find(e => e.name === name)?.id ?? null;
}

export function getEmojiComponent(emoji: string): ComponentEmojiResolvable | null {
    return getGuildEmojiComponent(emoji) ?? getVanillaEmojiComponent(emoji);
}