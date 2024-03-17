import { ApplicationCommandOptionType, ChatInputCommandInteraction, GuildMember } from "discord.js";
import CommandBase from "./commandBase";
import logError from "../helpers/errorLogger";
import { addMute } from "../modules/muteManager";
import { command, options } from "./decorators";
import { DurationParser } from "../modules/sanctionSystem/parsers/stringParsers";

@command("mute", "Felhasználó némítása")
@options(
    {
        name: "user",
        type: ApplicationCommandOptionType.User,
        description: "Akit némítasz",
        required: true
    },
    {
        name: "time",
        type: ApplicationCommandOptionType.String,
        description: "Némítás időtartama",
        required: true
    },
    {
        name: "reason",
        type: ApplicationCommandOptionType.String,
        description: "Némítás indoka",
        required: true
    }
)
export default class Mute extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const userId = this.userOption("user")!;
        if (userId!.user.bot) {
            await this.replyEphemeral("Nem némíthatod le a botokat!");
            return;
        }
        const mutedBy = command.member! as GuildMember;
        const duration = DurationParser.instance.parse(this.str("time"));
        const reason = this.optStr("reason");
        if (!(userId && mutedBy && duration && reason))
            return;
        await this.processing();
        const result = await addMute(userId, duration, mutedBy, reason).then(() => [ true, null ]).catch(err => [ false, err ]);
        if (result[0])
            await command.editReply(`Sikeresen némítottad ${userId.displayName}-t!`);
        else {
            if (!!result[1])
                logError("Mute unsuccessful", result[1]);
            await command.editReply(`Mute sikertelen!`);
        }
    }
}