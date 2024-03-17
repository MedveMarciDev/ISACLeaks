import { channelMention, Message, TextChannel } from "discord.js";
import config from "../configuration";
import { newEmbed, normalizeText, textChannel, user } from "../helpers/common";

export default async function executeFilter(message: Message) {
    if (!message.content)
        return;
    for (const i of config.wordFiltering.ignoredChannels)
        if (i === message.channelId)
            return;
    for (const i of config.wordFiltering.ignoredRoles)
        if (message.member?.roles.cache.has(i)) return;
    if (message.content.toLowerCase().includes("discord.gg")) {
        const channel = message.channel as TextChannel;
        const logChannel = textChannel(config.wordFiltering.logChannel);
        const warning = newEmbed("#ff0000")
        .setTitle("Chat Szűrés:tm:")
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
            { name: "Felhasználó:", value: user(message.author), inline: true },
            { name: "Neve:", value: message.author.username, inline: true },
            {
                name: "Megjegyzés:",
                value: `Hirdetett az egyik csatornában. A hirdetés: ${message.content}`,
                inline: true
            },
            { name: "Csatorna:", value: channelMention(channel.id), inline: true }
        )
        .setDescription(message.content);
        logChannel?.send({ embeds: [ warning ] });
        await message.delete();
        return;
    }

    const normalized = normalizeText(message.content);

    for (const i of config.wordFiltering.wordList)
        if (normalized.includes(i)) {
            const channel = message.channel as TextChannel;
            const logChannel = textChannel(config.wordFiltering.logChannel);
            const warning = newEmbed()
            .setTitle("Chat Szűrés:tm:")
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: "Felhasználó:", value: user(message.author), inline: true },
                { name: "Neve:", value: message.author.username, inline: true },
                {
                    name: "Megjegyzés:",
                    value: `Tiltott szót használt az egyik csatornában. A tiltott szó: ${i}`,
                    inline: true
                },
                { name: "Csatorna:", value: channelMention(channel.id), inline: true }
            )
            .setDescription(message.content)
            .setColor("#ff0000");
            logChannel?.send({ embeds: [ warning ] });
            if (config.wordFiltering.delete)
                await message.delete();
            break;
        }
    for (const i of config.goodTry) {
        if (normalized.includes(i)) {
            const channel = message.channel as TextChannel;
            await message.delete();
            await channel.send(`Szép próbálkozás ${user(message.author)}!`);
            break;
        }
    }
}
