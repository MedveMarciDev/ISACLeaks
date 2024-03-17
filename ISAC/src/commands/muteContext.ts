import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    GuildMember,
    ModalBuilder,
    ModalSubmitInteraction,
    TextInputBuilder,
    TextInputStyle,
    UserContextMenuCommandInteraction
} from "discord.js";
import logError from "../helpers/errorLogger";
import { addMute } from "../modules/muteManager";
import { contextName, contextType } from "./decorators";
import { DurationParser } from "../modules/sanctionSystem/parsers/stringParsers";
import ContextBase from "./contextBase";
import client from "../modules/client";
import { checkPermissions } from "../modules/permissions";
import CommandList from "./commandList";

@contextName("Felhasználó némítása")
@contextType(ApplicationCommandType.User)
export default class ContextMute extends ContextBase {
    public async executeInternal(context: UserContextMenuCommandInteraction) {
        if (!checkPermissions(context.user.id, CommandList.mute)) {
            await this.replyEphemeral("Nincs jogosultságod ehhez a művelethez!");
            return;
        }

        const userId = client.guilds.cache.first()!.members.cache.get(this.targetUser(context).user.id);
        if (userId!.user.bot) {
            await this.replyEphemeral("Nem némíthatod le a botokat!");
            return;
        }
        const mutedBy = context.member! as GuildMember;
        const modal = new ModalBuilder()
        .setCustomId(`muteMenu-${mutedBy.user.id}-${userId?.user.id}`)
        .setTitle("Némítási Idő");
        const time = new TextInputBuilder()
        .setCustomId("inputTime")
        .setLabel("Ide írdd az időt")
        .setRequired(true)
        .setStyle(TextInputStyle.Short);
        const reason = new TextInputBuilder()
        .setCustomId("inputReason")
        .setLabel("Ide írdd az indokot")
        .setRequired(true)
        .setStyle(TextInputStyle.Short);
        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(time);
        const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reason);
        modal.addComponents(firstActionRow, secondActionRow);
        await context.showModal(modal);
    }
}

export async function handleMuteMenuModal(interaction: ModalSubmitInteraction, mutedById: string, user: string) {
    const time = interaction.fields.getTextInputValue("inputTime");
    const reason = interaction.fields.getTextInputValue("inputReason");
    const userId = client.guilds.cache.first()!.members.cache.get(user);
    if (isNaN(Number(time)) || !time || !reason || !isNaN(Number(reason))) {
        await interaction.reply({ content: "Nem megfelelő formátum!", ephemeral: true });
        return;
    }
    const duration = DurationParser.instance.parse(time);
    const mutedBy = client.guilds.cache.first()!.members.cache.get(mutedById)!;
    if (!(userId && mutedBy && duration && reason)) {
        await interaction.reply({ content: "Hiba (1)", ephemeral: true });
        return;
    }
    const result = await addMute(userId, duration, mutedBy, reason).then(() => [ true, null ]).catch(err => [ false, err ]);
    if (result[0])
        await interaction.reply({
            content: `Sikeresen némítottad ${userId.displayName}-t!`, ephemeral: true
        });
    else {
        if (!!result[1])
            logError("Mute unsuccessful", result[1]);
        await interaction.reply({
            content: `Mute sikertelen!`, ephemeral: true
        });
    }
}