import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import CommandBase from "./commandBase";
import { getChannel } from "../helpers/common";
import { command, globallyAvailable } from "./decorators";
import { closeTicket } from "../modules/tickets/ticketManager";

@command("ticket-close", "Bezárja az adott ticketet.")
@globallyAvailable()
export default class Close extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const channel = getChannel(command.channel!.id);
        const ticket = command.channel as TextChannel;
        if (!ticket) {
            await command.reply({ content: "Hiba! (1)", ephemeral: true });
        }
        await closeTicket(command);
    }
}