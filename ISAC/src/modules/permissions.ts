import { GuildMember, Permissions, PermissionsBitField } from "discord.js";
import client from "./client";

export type BasePermissions = string[] | boolean;

export default interface IPermissions {
    permissions: BasePermissions
}

export function isAdmin(member: GuildMember) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

export function checkPermissions(userId: string, obj: IPermissions): boolean {
    const member = client.guilds.cache.first()!.members.cache.get(userId)!;
    return isAdmin(member) ||
        (obj == null || obj.permissions === false
            ? false
            : obj.permissions === true
                ? true
                : hasAnyPermission(member, obj.permissions));
}

export function hasPermission(member: GuildMember, permission: string): boolean {
    return isAdmin(member) || member.roles.cache.has(permission);
}

export function hasAnyPermission(member: GuildMember, permissions: string[]): boolean {
    return isAdmin(member) || permissions.some(p => member.roles.cache.has(p));
}