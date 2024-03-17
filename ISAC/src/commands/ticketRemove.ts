import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import CommandBase from "./commandBase";
import { command, options } from "./decorators";
import { executedCommandInteractions, modifyTicketAccessOfMember } from "../modules/tickets/ticketManager";

@command("ticket-remove", "Bezárja az adott ticketet.")
@options(
    {
        name: "member",
        type: ApplicationCommandOptionType.User,
        description: "A kívánt felhasználó",
        required: true
    }
)
export default class TicketRemove extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const member = this.userOption("member")!;
        await modifyTicketAccessOfMember(command, member, false);
        executedCommandInteractions.set(command.id, `ticket-remove @${member.user.id} "${member.user.username}"`);
    }
}