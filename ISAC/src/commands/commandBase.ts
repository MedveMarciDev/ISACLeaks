import {
    ApplicationCommandChoicesOption,
    ApplicationCommandOption,
    ApplicationCommandStringOption,
    ChatInputCommandInteraction,
    GuildMember,
    InteractionResponse,
    Role
} from "discord.js";
import logError from "../helpers/errorLogger";
import client from "../modules/client";
import IPermissions, { BasePermissions, checkPermissions } from "../modules/permissions";
import config from "../configuration";

export default abstract class CommandBase implements IPermissions {

    private currentInteraction: ChatInputCommandInteraction | null = null;

    async execute(command: ChatInputCommandInteraction): Promise<void> {
        try {
            this.currentInteraction = command;
            if (!checkPermissions(command.user.id, this)) {
                await this.replyEphemeral("Ehhez nincs jogod!");
                return;
            }
            await this.executeInternal(command);
        } catch (e) {
            logError(`Failed handing command ${this.commandName}`, e);
        } finally {
            this.currentInteraction = null;
        }
    }

    protected int(optionName: string): number {
        return this.currentInteraction!.options.getInteger(optionName, true)!;
    }

    protected str(optionName: string): string {
        return this.currentInteraction!.options.getString(optionName, true)!;
    }

    protected userOption(optionName: string, optional?: boolean): GuildMember | null {
        const user = this.currentInteraction!.options.getUser(optionName, !optional);
        return !user ? null : client.guilds.cache.first()!.members.cache.get(user.id) ?? null;
    }

    protected roleOption(optionName: string): Role | null {
        const role = this.currentInteraction!.options.getRole(optionName, true);
        return !role ? null : client.guilds.cache.first()!.roles.cache.get(role.id) ?? null;
    }

    protected optInt(optionName: string): number | null {
        return this.currentInteraction!.options.getInteger(optionName, false);
    }

    protected optStr(optionName: string): string | null {
        return this.currentInteraction!.options.getString(optionName, false);
    }

    protected processing(ephemeral: boolean = true): Promise<InteractionResponse> {
        return this.currentInteraction!.deferReply({ ephemeral });
    }

    protected replyEphemeral(content: string): Promise<InteractionResponse> {
        return this.currentInteraction!.reply({ ephemeral: true, content });
    }

    protected abstract executeInternal(command: ChatInputCommandInteraction): Promise<void>;

    public readonly commandName: string;
    public readonly description: string;
    public readonly options: ApplicationCommandOption[];
    public permissions: BasePermissions = false;

    constructor() {
        const proto = this.constructor.prototype;
        this.commandName = proto.commandName;
        this.description = proto.description;
        this.options = proto.options ?? [];
        this.permissions = proto.noRequiredPermissions === true
            ? true
            : config.commandPermissions.find(e => e.command === this.commandName)?.permissions ?? false;
    }
}

export type CommandOptionWithChoices = { choices: ApplicationCommandChoicesOption[] } & ApplicationCommandStringOption;
