import { EmbedBuilder, GuildMember } from "discord.js";
import config from "../configuration";
import { newEmbed, normalizeText, textChannel, user } from "../helpers/common";
import logError from "../helpers/errorLogger";

export async function nameFilter(member: GuildMember) {
    if (!config.nameFiltering.enabled)
        return;
    if (!config.nameFiltering.logChannel) logError("No name filtering log channel set", true);
    if (!config.nameFiltering.nameList.length) logError("No name filtering list set", true);
    const name = normalizeText(member.user.username.toLowerCase());
    for (const i of config.nameFiltering.nameList) {
        if (!name.includes(i))
            continue;
        const logChannel = textChannel(config.nameFiltering.logChannel);
        const warning = newEmbed()
        .setTitle("Név Szűrés:tm:")
        .setThumbnail(member.user.displayAvatarURL() || "https://i.imgur.com/226jXEl.png")
        .setTimestamp()
        .addFields(
            { name: "Felhasználó:", value: user(member.user), inline: true },
            {
                name: "Megjegyzés:",
                value: `Tiltott nevet tartalmaz a neve. A tiltott név: ${i}`,
                inline: true
            },
            { name: "ID:", value: member.id, inline: true }
        )
        .setColor("#ff0000");
        if (config.nameFiltering.kick) {
            const dmEmbed = new EmbedBuilder()
            .setTitle("Kidobás")
            .setDescription("Ki lettél dobva az SCP: Secret Laboratory Magyar Közösség szerverből!")
            .setColor("Red")
            .setTimestamp()
            .addFields({
                name: "Indok:",
                value: "Tiltott szót tartalmaz a neved! Ha ez egy hiba, keresd fel: MedveMarci#1244",
                inline: false
            }, {
                name: "Szerver:",
                value: "SCP: Secret Laboratory Magyar Közösség",
                inline: false
            })
            .setFooter({ text: config.ISAC });
            try {
                const dm = await member.user.createDM();
                await dm.send({ embeds: [ dmEmbed ] });
            } catch (e) {
                logError(`User cound not be notified in DMs`, e);
            }
            await member.kick("Tiltott szót tartalmaz a neved! Ha ez egy hiba, keresd fel: MedveMarci#1244");
        }
        logChannel?.send({ embeds: [ warning ] });
        break;
    }
}