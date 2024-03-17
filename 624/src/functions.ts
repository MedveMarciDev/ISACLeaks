import { Interaction, TextChannel } from "discord.js";
import { client } from ".";
import config from "./configuration";

export default function newError(text: string) {
    console.error(text);
    const chan = client.guilds.cache.first()!.channels.cache.get(config.errorChannel) as TextChannel;
    chan?.send(text);
}

export async function lockdown(interaction: Interaction) {
    const member = client.guilds.cache.first()!.members.cache.get(client.user!.id);
    await member!.voice.disconnect();
    if (interaction.isRepliable())
        interaction.reply(`A bot sikeresen lezárva!`);
}