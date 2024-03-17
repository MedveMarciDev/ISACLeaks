import config from "../../configuration";
import { CommandInteraction, GuildMember, Role, roleMention, userMention } from "discord.js";
import { newEmbed, textChannel } from "../../helpers/common";

export type RoleManagementPermissions = { staffRole: string, manageRoles: string[] }

export function getRoleManagementPermissions(user: GuildMember): RoleManagementPermissions[] {
    return config.roleManagement.filter(r => user.roles.cache.some(e => e.id.toString() === r.staffRole));
}

export function getManageableRoles(user: GuildMember): string[] {
    return getRoleManagementPermissions(user).flatMap(r => r.manageRoles);
}

export async function validateUsage(command: CommandInteraction, sender: GuildMember, roleToGive: Role | null, member: GuildMember | null): Promise<boolean> {
    if (!roleToGive) {
        await command.reply({
            ephemeral: true,
            content: "Nem található a rang!"
        });
        return false;
    }
    if (!member) {
        await command.reply({
            ephemeral: true,
            content: "Nem található a felhasználó!"
        });
        return false;
    }
    const permissions = getManageableRoles(sender);
    if (permissions.length < 1) {
        await command.reply({
            ephemeral: true,
            content: "Ehhez nincs jogod!"
        });
        return false;
    }
    if (!roleToGive || !permissions.includes(roleToGive.id.toString())) {
        await command.reply({
            ephemeral: true,
            content: "Nincs jogod kezelni ezt a rangot!"
        });
        return false;
    }
    return true;
}

export async function sendRoleLogUponSuccess(success: boolean, sender: GuildMember, member: GuildMember, roleToGive: Role, operation: string) {
    if (success)
        await textChannel(config.channels.roleModificationLog).send({
            embeds: [
                newEmbed("Red")
                .setTitle(operation)
                .addFields(
                    { name: "Staff", value: userMention(sender.user.id) },
                    { name: "Érintett felhasználó", value: userMention(member.user.id) },
                    { name: "Rang", value: roleMention(roleToGive.id) }
                )
                .setTimestamp()
            ]
        });
}