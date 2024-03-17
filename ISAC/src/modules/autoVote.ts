import client from "./client";
import logError, { logRaw } from "../helpers/errorLogger";
import config from "../configuration";
import { isText } from "../helpers/common";
import { EmojiIdentifierResolvable, Message, TextChannel, ThreadChannel } from "discord.js";
import { getEmoji } from "../helpers/emojiResolver";

export type AutoVoteOptions = { textChannels: string[], forums: string[], upvote: string, downvote: string };

let upReaction: EmojiIdentifierResolvable | null;
let downReaction: EmojiIdentifierResolvable | null;

export default function setupAutoVote() {
    const cfg = config.autoVote;
    const autoVoteChannels = cfg.textChannels;
    if (autoVoteChannels.length <= 0)
        return;
    const guild = client.guilds.cache.first()!;
    upReaction = getEmoji(cfg.upvote);
    downReaction = getEmoji(cfg.downvote);
    if (!upReaction || !downReaction) {
        logRaw("AutoVote: Emoji nem található!");
        return;
    }
    for (const channelId of autoVoteChannels) {
        const channel = guild.channels.cache.get(channelId) as TextChannel;
        if (!channel || !isText(channel))
            continue;
        const collector = channel.createMessageCollector();
        collector.on("collect", reactToMessage);
    }
}

function reactToMessage(m: Message) {
    if (m.author.bot)
        return;
    m.react(upReaction!)
    .catch(() => logRaw("Nem sikerült reagálni! Emoji: " + upReaction))
    .then(() => m.react(downReaction!))
    .catch(() => logRaw("Nem sikerült reagálni! Emoji: " + downReaction));
}

export async function onThreadCreated(thread: ThreadChannel, isNew: boolean) {
    if (!upReaction || !downReaction || !isNew || !config.autoVote.forums.includes(thread.parentId?.toString() ?? ""))
        return;
    try {
        const message = await thread.fetchStarterMessage({ force: true });
        reactToMessage(message!);
    } catch (e) {
        logError(`Failed reacting to thread ${thread.id}`, e);
    }
}