import Clear from "./clear";
import Mute from "./mute";
import Poll from "./poll";
import Unmute from "./unmute";
import ServerInfo from "./serverInfo";
import GiveRole from "./roles/giveRole";
import RemoveRole from "./roles/removeRole";
import UserInfo from "./userInfo";
import Info from "./info";
import CommandBase, { CommandOptionWithChoices } from "./commandBase";
import client from "../modules/client";
import { logRaw } from "../helpers/errorLogger";

import {
    ApplicationCommandOption,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    ContextMenuCommandInteraction,
    ContextMenuCommandType,
    SlashCommandBuilder
} from "discord.js";
import { RouteLike } from "@discordjs/rest";
import History from "./history";
import WantedList from "./wantedList";
import ListIssued from "./listIssued";
import Lockdown from "./lockdown";
import Redirect from "./redirect";
import Close from "./close";
import TicketAdd from "./ticketAdd";
import TicketRemove from "./ticketRemove";
import ContextBase from "./contextBase";
import UserInfoContext from "./userInfoContext";
import ContextMute from "./muteContext";
import UnmuteContext from "./unmuteContext";

export default class CommandList {
    static readonly clear = new Clear();
    static readonly info = new Info();
    static readonly Close = new Close();
    static readonly mute = new Mute();
    static readonly addMember = new TicketAdd();
    static readonly removeMember = new TicketRemove();
    static readonly poll = new Poll();
    static readonly lockdown = new Lockdown();
    static readonly removeRole = new RemoveRole();
    static readonly giveRole = new GiveRole();
    static readonly serverInfo = new ServerInfo();
    static readonly unmute = new Unmute();
    static readonly userInfo = new UserInfo();
    static readonly history = new History();
    static readonly wanted = new WantedList();
    static readonly listIssued = new ListIssued();
    static readonly redirect = new Redirect();

    static readonly userInfoContext = new UserInfoContext();
    static readonly muteContext = new ContextMute();
    static readonly unmuteContext = new UnmuteContext();

    static allCommands: CommandBase[] = [
        CommandList.clear,
        CommandList.info,
        CommandList.mute,
        // CommandList.poll,
        CommandList.Close,
        CommandList.addMember,
        CommandList.removeMember,
        CommandList.removeRole,
        CommandList.giveRole,
        CommandList.serverInfo,
        CommandList.unmute,
        CommandList.userInfo,
        CommandList.history,
        CommandList.wanted,
        CommandList.listIssued,
        CommandList.lockdown,
        CommandList.redirect
    ];

    static allContextMenus: ContextBase[] = [
        CommandList.userInfoContext,
        CommandList.muteContext,
        CommandList.unmuteContext
    ];

    static findCommand(command: string): CommandBase {
        const lower = command.toLowerCase();
        return <CommandBase>this.allCommands.find(e => e.commandName.toLowerCase() === lower);
    };

    static findContextMenu(context: string): ContextBase {
        const lower = context.toLowerCase();
        return <ContextBase>this.allContextMenus.find(e => e.contextName.toLowerCase() === lower);
    };

    static async registerCommands() {
        const guildId = client.guilds.cache.first()!.id;
        const commandManager = client.application?.commands;
        if (!commandManager) {
            logRaw("Error registering slash commands");
            return;
        }
        const url = <RouteLike>`/applications/${process.env.BOT_ID}/guilds/${guildId}/commands`;
        console.log("Registering commands...");
        const commands: any[] = CommandList.allCommands.map(e => {
            const builder = new SlashCommandBuilder();
            builder.setName(e.commandName);
            builder.setDescription(e.description);
            builder.setDMPermission(false);
            for (const option of e.options)
                addOption(option, builder);
            return builder.toJSON();
        });
        const contextCommands: any[] = CommandList.allContextMenus.map(e => {
                const builder = new ContextMenuCommandBuilder();
                builder.setName(e.contextName);
                builder.setType(<ContextMenuCommandType>e.contextType);
                builder.setDMPermission(false);
                return builder.toJSON();
            });
        commands.push(...contextCommands);
        await client.rest.put(url, { body: commands });
    }

    static handleCommand(interaction: ChatInputCommandInteraction) {
        if (interaction != null)
            CommandList.findCommand(interaction.commandName)?.execute(interaction);
    }

    static handleContext(interaction: ContextMenuCommandInteraction) {
        if (interaction != null)
            CommandList.findContextMenu(interaction.commandName)?.execute(interaction);
    }

}

function addOption(option: ApplicationCommandOption, builder: SlashCommandBuilder) {
    switch (option.type) {
        case ApplicationCommandOptionType.String:
            builder.addStringOption(o => {
                const r = o.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false);
                const withChoices = <CommandOptionWithChoices>option;
                const choices = withChoices.choices;
                if (choices)
                    r.addChoices(...choices);
                return r;
            });
            break;
        case ApplicationCommandOptionType.User:
            builder.addUserOption(o =>
                o.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false));
            break;
        case ApplicationCommandOptionType.Integer:
            builder.addIntegerOption(o => {
                o.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false);
                if (option.maxValue != null) {
                    if (option.minValue != null)
                        o.setMinValue(option.minValue);
                    o.setMaxValue(option.maxValue);
                }
                return o;
            });
            break;
        case ApplicationCommandOptionType.Channel:
            builder.addChannelOption(o =>
                o.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false));
            break;
        case  ApplicationCommandOptionType.Role:
            builder.addRoleOption(o =>
                o.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false));
            break;
        case ApplicationCommandOptionType.Boolean:
            builder.addBooleanOption(o =>
                o.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false));
            break;
    }
}
