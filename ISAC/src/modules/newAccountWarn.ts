import { EmbedBuilder, GuildMember } from "discord.js";
import config from "../configuration";
import logError from "../helpers/errorLogger";
import { now, textChannel, time } from "../helpers/common";
import TimeFormat from "../helpers/timeFormat";

export async function newAccountCheck(member: GuildMember) {
    if (Date.now() - member.user.createdTimestamp < 1209600000) {
        const warnChannel = textChannel(config.channels.newAccountWarnChannel);
        if (!warnChannel) {
            logError("No new account warn channel set", true);
        } else {
            const embed = new EmbedBuilder()
            .setTitle(":warning: Új fiók :warning:")
            .setColor("#FF8A00")
            .setTimestamp()
            .setFooter({ text: config.ISAC })
            .setThumbnail(member.user.displayAvatarURL() || "https://i.imgur.com/226jXEl.png")
            .setFields([
                { name: "Felhasználó", value: `<@${member.user.id}>`, inline: true },
                {
                    name: "Fiók létrehozásának ideje",
                    value: `${time(member.user.createdTimestamp, TimeFormat.ShortDateTime)} (${time(member.user.createdTimestamp, TimeFormat.Relative)})`,
                    inline: true
                },
                { name: "Fiók csatlakozásának ideje", value: now(), inline: true }
            ]);
            await warnChannel.send({ embeds: [ embed ] });
        }
    }
}