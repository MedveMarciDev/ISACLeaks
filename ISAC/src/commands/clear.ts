import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    TextChannel
} from "discord.js";
import CommandBase from "./commandBase";
import { command, options } from "./decorators";

@command("clear", "Nagy mennyiségű üzenet kitörlése")
@options({
    name: "üzenetek",
    type: ApplicationCommandOptionType.Integer,
    description: "Törlendő üzenetek száma",
    required: true,
    minValue: 1,
    maxValue: 100
})
export default class Clear extends CommandBase {
    async executeInternal(command: ChatInputCommandInteraction) {
        const length = this.int("üzenetek");
        const channel = command.channel as TextChannel;
        await this.processing();
        try {
            await channel.bulkDelete(length);
            await command.editReply(`Sikeresen töröltél ${length} üzenetet!`);
        } catch (e) {
            await command.editReply(`Hiba történt a törlés közben! 14 napnál régebbi üzeneteket nem tudsz törölni, és egyszerre csak 100 üzenetet lehet!`);
        }
    }

}
