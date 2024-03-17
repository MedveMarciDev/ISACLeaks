import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    GuildMember
} from "discord.js";
import CommandBase from "./commandBase";
import { removeMute } from "../modules/muteManager";
import { command, options } from "./decorators";

const USER_OPTION = "user";

@command("unmute", "Némítás feloldása")
@options(
    {
        name: USER_OPTION,
        type: ApplicationCommandOptionType.User,
        required: true,
        description: "Akiről a némítást leveszed"
    }
)
export default class Unmute extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const userId = this.userOption(USER_OPTION)!;
        const mutedBy = command.member as GuildMember;
        if (!userId || !mutedBy) {
            await this.replyEphemeral("Unmute sikertelen");
            return;
        }
        await this.processing(true);
        await removeMute(userId.user.id, true, mutedBy);
        await command.editReply(`Sikeresen feloldottad ${userId.displayName} némítását`);
    }
}