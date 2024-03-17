import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    GuildMember,
    UserContextMenuCommandInteraction
} from "discord.js";
import { removeMute } from "../modules/muteManager";
import { contextName, contextType } from "./decorators";
import ContextBase from "./contextBase";
import client from "../modules/client";
import { checkPermissions } from "../modules/permissions";
import CommandList from "./commandList";

@contextName("Némítás feloldása")
@contextType(ApplicationCommandType.User)
export default class UnmuteContext extends ContextBase {
    public async executeInternal(context: UserContextMenuCommandInteraction) {
        if (!checkPermissions(context.user.id, CommandList.unmute)) {
            await this.replyEphemeral("Nincs jogosultságod ehhez a művelethez!");
            return;
        }
        const userId = client.guilds.cache.first()!.members.cache.get(this.targetUser(context).user.id);
        const mutedBy = context.member as GuildMember;
        if (!userId || !mutedBy) {
            await this.replyEphemeral("Unmute sikertelen");
            return;
        }
        await this.processing(true);
        await removeMute(userId.user.id, true, mutedBy);
        await context.editReply(`Sikeresen feloldottad ${userId.displayName} némítását`);
    }
}