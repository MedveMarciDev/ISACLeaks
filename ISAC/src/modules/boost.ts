import { ChannelType, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import { logRaw } from "../helpers/errorLogger";
import config from "../configuration";
import { isText, user } from "../helpers/common";

export default async function boostMessage(member: GuildMember) {
    const channel = member.guild.channels.cache.get(config.channels.boosts) as TextChannel;
    if (channel == null) {
        logRaw("Boost was detected, but no boost channel was given!");
        return;
    }
    if (!isText(channel))
        return;
    const boostMessage = config.boost.messages[Math.floor(Math.random() * config.boost.messages.length)];
    const embed = new EmbedBuilder()
    .setTitle("NITRO BOOST")
    .setThumbnail("https://i.imgur.com/P1OgrEg.png")
    .setDescription(`${boostMessage.title} ${user(member.user)} ${boostMessage.details}`)
    .setColor("#E000FF")
    .setFooter({ text: config.ISAC });
    await channel.send({ embeds: [ embed ] });
}
