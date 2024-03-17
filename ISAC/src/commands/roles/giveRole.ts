import CommandBase from "../commandBase";
import { ApplicationCommandOptionType, ChatInputCommandInteraction, roleMention, userMention } from "discord.js";
import { sendRoleLogUponSuccess, validateUsage } from "./shared";
import logError from "../../helpers/errorLogger";
import { command, options } from "../decorators";

@command("giverole", "Rang hozzáadása egy felhasználóra")
@options(
    {
        name: "user",
        type: ApplicationCommandOptionType.User,
        description: "Akire a rangot adod",
        required: true
    },
    {
        name: "role",
        type: ApplicationCommandOptionType.Role,
        description: "A rang, amit adsz",
        required: true
    }
)
export default class GiveRole extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const sender = command.guild!.members.cache.get(command.user.id)!;
        const member = this.userOption("user")!;
        const roleToGive = this.roleOption("role")!;
        if (!await validateUsage(command, sender, roleToGive, member))
            return;
        if (member.roles.cache.has(roleToGive.id)) {
            await this.replyEphemeral("A rang már rajta van a felhasználón!");
            return;
        }

        await this.processing();
        let success = false;
        try {
            await member.roles.add(roleToGive!);
            success = true;
        } catch (e) {
            logError("Unable to add role:", e);
        }

        await command.editReply(success
            ? `A rang ${(roleMention(roleToGive.id))} sikeresen rákerült a következő felhasználóra: ${(userMention(member.user.id))}`
            : "Hopsz, nem sikerült! Értesítsd a fejlesztőket!");
        await sendRoleLogUponSuccess(success, sender, member, roleToGive, "Rangadás");
    }
};
