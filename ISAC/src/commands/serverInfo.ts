import { ChatInputCommandInteraction } from "discord.js";
import CommandBase from "./commandBase";
import config from "../configuration";
import { newEmbed, time } from "../helpers/common";
import { command, globallyAvailable } from "./decorators";
import { userMention } from "discord.js";

@command("serverinfo", "Néhány hasznos információ a szerverről")
@globallyAvailable()
export default class ServerInfo extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const fetchedMembers = await command.guild!.members.fetch({ withPresences: true });
        let userCount = 0;
        let online = 0;
        let bots = 0;
        fetchedMembers.forEach(e => {
            if (e.user.bot) {
                bots++;
                return;
            }
            const status = e.presence?.status;
            if (status === "online" || status === "dnd")
                online++;
            userCount++;
        });
        const embed = newEmbed()
        .setThumbnail(`${config.joinImage}`)
        .setTitle(`${command.guild!.name}`)
        .addFields(
            {
                name: "Létrehozva",
                value: time(command.guild!.createdTimestamp),
                inline: false
            },
            {
                name: "Tulajdonos",
                value: userMention(command.guild!.ownerId),
                inline: true
            },
            {
                name: "Elérhető tagok",
                value: `${online}/${userCount}`,
                inline: true
            },
            { name: "Botok", value: `${bots}`, inline: true },
            { name: "Rangok száma", value: `${command.guild!.roles.cache.size - 1}`, inline: true },
            { name: "Szerver ID", value: `${command.guildId}`, inline: false }
        );
        await command.reply({ ephemeral: false, embeds: [ embed ] });
    }
}