import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    PermissionOverwrites, PermissionsBitField,
    TextChannel
} from "discord.js";
import CommandBase from "./commandBase";
import { command, options } from "./decorators";
import { logLockChannel, logUnLockChannel } from "../modules/log";

@command("lockdown", "Lezárja azt a csatornát amelyiket kiválasztod")
@options({
    name: "channel",
    description: "Az a csatorna amit le szeretnél zárni",
    type: ApplicationCommandOptionType.Channel,
    required: true
})
export default class Lockdown extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const channel = command.options.getChannel("channel") as TextChannel;
        if (channel.permissionsFor(channel.guild.roles.everyone).has(PermissionsBitField.Flags.SendMessages) || channel.permissionsFor(channel.guild.roles.everyone).has(PermissionsBitField.Flags.AddReactions) || channel.permissionsFor(channel.guild.roles.everyone).has(PermissionsBitField.Flags.SendMessagesInThreads) || channel.permissionsFor(channel.guild.roles.everyone).has(PermissionsBitField.Flags.UseApplicationCommands)) {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                AddReactions: false,
                SendMessagesInThreads: false,
                UseApplicationCommands: false,
                SendMessages: false
            });
            await command.reply({ content: `<#${channel.id}> Sikeresen lezárva`, ephemeral: true });
            await logLockChannel(channel, command.user);
        } else {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                AddReactions: null,
                SendMessagesInThreads: null,
                UseApplicationCommands: null,
                SendMessages: null
            });
            await command.reply({ content: `<#${channel.id}> Sikeresen megnyitva`, ephemeral: true });
            await logUnLockChannel(channel, command.user);
        }
    }
}