import { ChatInputCommandInteraction } from "discord.js";
import CommandBase from "./commandBase";
import { newEmbed } from "../helpers/common";
import { command, globallyAvailable } from "./decorators";

@command("info", "Kiír információkat rólam")
@globallyAvailable()
export default class Info extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const embed = newEmbed()
        .setTitle(`Kiírja az összes elérhető parancsot.`)
        .addFields(
            {
                name: "Parancsok",
                value: `/userinfo, /serverinfo, /surprise, /info`,
                inline: false
            }
        );
        await command.reply({ ephemeral: true, embeds: [ embed ] });
    }
}