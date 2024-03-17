import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import CommandBase from "./commandBase";
import { newEmbed, time, timeFromDate } from "../helpers/common";
import TimeFormat from "../helpers/timeFormat";
import { command, globallyAvailable, options } from "./decorators";

const statusMap: any = {
    online: "Online",
    idle: "Tétlen",
    dnd: "Ne zavarjanak"
};

function getStatus(status: string | undefined): string {
    return statusMap[status ?? ""] ?? "Offline";
}

@command("userinfo", "Kiír információkat egy felhasználóról")
@options(
    {
        name: "felhasználó",
        type: ApplicationCommandOptionType.User,
        description: "A kívánt felhasználó",
        required: true
    }
)
@globallyAvailable()
export default class UserInfo extends CommandBase {
    public async executeInternal(command: ChatInputCommandInteraction) {
        const user = this.userOption("felhasználó");
        if (!user) {
            await this.replyEphemeral("Nem található a felhasználó");
            return;
        }
        const nickname = user!.nickname;
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
        await command.reply({ ephemeral: true, embeds: [ embed ] });
        return;
    }
}

