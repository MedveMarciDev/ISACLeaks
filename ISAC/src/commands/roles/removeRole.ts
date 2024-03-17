import CommandBase from "../commandBase";
import { ApplicationCommandOptionType, ChatInputCommandInteraction, roleMention, userMention } from "discord.js";
import { user } from "../../helpers/common";
import { sendRoleLogUponSuccess, validateUsage } from "./shared";
import logError from "../../helpers/errorLogger";
import { command, options } from "../decorators";

@command("removerole", "Rang eltávolítása egy felhasználóról")
@options(
    {
        name: "user",
        type: ApplicationCommandOptionType.User,
        description: "Akiről a rangot eltávolítod",
        required: true
    },
    {
        name: "role",
        type: ApplicationCommandOptionType.Role,
        description: "A rang, amit eltávolítasz",
        required: true
    }
)
export default class RemoveRole extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const guild = command.guild!;
        const sender = guild.members.cache.get(command.user.id)!;
        const member = this.userOption("user")!;
        const roleToGive = this.roleOption("role")!;
        if (!await validateUsage(command, sender, roleToGive, member))
            return;
        if (!member.roles.cache.has(roleToGive.id)) {
            await this.replyEphemeral("A rang nincs rajta a felhasználón!");
            return;
        }

        await this.processing();
        let success = false;
        try {
            await member.roles.remove(roleToGive!);
            success = true;
        } catch (e) {
            logError("Unable to remove role:", e);
        }

        await command.editReply(success
            ? `A rang ${(roleMention(roleToGive.id))} sikeresen el lett távolítva a következő felhasználóról: ${(userMention(member.user.id))}`
            : "Hopsz, nem sikerült! Értesítsd a fejlesztőket!");
        await sendRoleLogUponSuccess(success, sender, member, roleToGive, "Ranglevétel");
    }
};
