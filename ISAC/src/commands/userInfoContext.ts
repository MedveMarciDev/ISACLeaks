import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ContextMenuCommandInteraction,
    UserContextMenuCommandInteraction
} from "discord.js";
import { newEmbed, time, timeFromDate } from "../helpers/common";
import TimeFormat from "../helpers/timeFormat";
import { contextName, contextType, globallyAvailable } from "./decorators";
import ContextBase from "./contextBase";
import client from "../modules/client";

const statusMap: any = {
    online: "Online",
    idle: "Tétlen",
    dnd: "Ne zavarjanak"
};

function getStatus(status: string | undefined): string {
    return statusMap[status ?? ""] ?? "Offline";
}

@contextName("UserInfo")
@contextType(ApplicationCommandType.User)
@globallyAvailable()
export default class UserInfoContext extends ContextBase {
    public async executeInternal(context: UserContextMenuCommandInteraction) {
        const user = client.guilds.cache.first()!.members.cache.get(this.targetUser(context).user.id);
        if (!user) {
            await this.replyEphemeral("Nem található a felhasználó");
            return;
        }
        const nickname = user.nickname;
        if (user!.user.bot) {
            await this.replyEphemeral("A parancsot nem lehet boton használni!");
            return;
        }
        const status = user.presence!.status;
        const embed = newEmbed()
        .setThumbnail(user.displayAvatarURL())
        .setTitle(user.user.tag)
        .setDescription("Információk a felhasználóról")
        .addFields(
            {
                name: "Regisztrált",
                value: time(user.user.createdTimestamp),
                inline: false
            },
            {
                name: "Csatlakozás",
                value: time(user.joinedTimestamp!),
                inline: true
            },
            {
                name: "Rangok",
                value: `${Array.from(user.roles.cache.filter(r => r.toString() !== "@everyone").values()).join(" ")}`,
                inline: true
            },
            { name: "Státusz", value: getStatus(status), inline: true },
            {
                name: "Szervert boostolja?",
                value: `${user.premiumSince ? timeFromDate(user.premiumSince, TimeFormat.Relative) : "Nem"}`,
                inline: true
            },
            { name: "ID", value: user.id, inline: true }
        );
        if (nickname)
            embed.addFields({ name: "Becenév", value: `${nickname}`, inline: true });
        await context.reply({ ephemeral: true, embeds: [ embed ] });
        return;
    }
}

