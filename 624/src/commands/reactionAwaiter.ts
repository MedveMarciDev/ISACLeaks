import { MessageReaction, RepliableInteraction, StageChannel, VoiceChannel } from "discord.js";

function emojiFilter(reaction: MessageReaction) {
    return reaction.emoji.name === "👍";
}

export async function replyWithReactions(interaction: RepliableInteraction, channel: StageChannel | VoiceChannel, handler: (interaction: RepliableInteraction) => Promise<void>) {
    const requiredReactions = Math.floor((channel.members.size - 1) * 0.5);
    if (requiredReactions < 1) {
        await handler(interaction);
        return;
    }
    const sent = await interaction.reply({
        content: `${requiredReactions} reakció kell`,
        fetchReply: true
    });
    await sent.react("👍");
    const collector = sent.createReactionCollector({ filter: emojiFilter, time: 1000 * 60 });
    collector.on("collect", reaction => {
        if (reaction.emoji.name !== "👍") {
            reaction.remove();
            return;
        }
        if (reaction.count < requiredReactions)
            return;
        collector.stop();
        handler(interaction);
    });
    collector.on("end", () => sent.edit("Megszakítva"));
}

export function replySafe(interaction: RepliableInteraction, content: string) {
    return interaction.replied ? interaction.editReply(content) : interaction.reply(content);
}