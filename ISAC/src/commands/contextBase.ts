import {
    ApplicationCommandType,
    ContextMenuCommandInteraction,
    InteractionResponse,
    UserContextMenuCommandInteraction
} from "discord.js";
import logError from "../helpers/errorLogger";
import config from "../configuration";
import IPermissions, { BasePermissions, checkPermissions } from "../modules/permissions";
import client from "../modules/client";

export default abstract class ContextBase implements IPermissions {

    private currentInteraction: ContextMenuCommandInteraction | null = null;

    async execute(context: ContextMenuCommandInteraction): Promise<void> {
        try {
            this.currentInteraction = context;
            if (!checkPermissions(context.user.id, this)) {
                await this.replyEphemeral("Ehhez nincs jogod!");
                return;
            }
            await this.executeInternal(context);
        } catch (e) {
            logError(`Failed handing command ${this.contextName}`, e);
        } finally {
            this.currentInteraction = null;
        }
    }

    protected replyEphemeral(content: string): Promise<InteractionResponse> {
        return this.currentInteraction!.reply({ ephemeral: true, content });
    }

    protected targetUser(context: UserContextMenuCommandInteraction) {
        return context.targetMember ?? client.guilds.cache.first()!.members.cache.get(context.targetId)!;
    }

    protected processing(ephemeral: boolean = true): Promise<InteractionResponse> {
        return this.currentInteraction!.deferReply({ ephemeral });
    }

    protected abstract executeInternal(command: ContextMenuCommandInteraction): Promise<void>;

    public readonly contextName: string;
    public permissions: BasePermissions = false;
    public readonly contextType: ApplicationCommandType.User | ApplicationCommandType.Message | undefined;

    constructor() {
        const proto = this.constructor.prototype;
        this.contextName = proto.contextName;
        this.contextType = proto.contextType;
        this.permissions = proto.noRequiredPermissions === true
            ? true
            : config.commandPermissions.find(e => e.command === this.contextName)?.permissions ?? false;
        proto.noRequiredPermissions = undefined;
    }
}