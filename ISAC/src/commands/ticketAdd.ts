import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import CommandBase from "./commandBase";
import { command, options } from "./decorators";
import { executedCommandInteractions, modifyTicketAccessOfMember } from "../modules/tickets/ticketManager";

@command("ticket-add", "Hozzáad egy felhasználót a jelenlegi tickethez")
@options(
    {
        name: "member",
        type: ApplicationCommandOptionType.User,
        description: "A kívánt felhasználó",
        required: true
    }
)
export default class TicketAdd extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const member = this.userOption("member")!;
        await modifyTicketAccessOfMember(command, member, true);
        executedCommandInteractions.set(command.id, `ticket-add @${member.user.id} "${member.user.username}"`);
    }
}