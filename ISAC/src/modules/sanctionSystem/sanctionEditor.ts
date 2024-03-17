import {
    ActionRowBuilder,
    ButtonInteraction,
    GuildMember,
    Message,
    ModalBuilder,
    ModalSubmitInteraction,
    SelectMenuInteraction,
    TextInputBuilder,
    userMention
} from "discord.js";
import { getSanctionById, removeSanction } from "./sanctionManager";
import { hasAnyPermission, isAdmin } from "../permissions";
import config from "../../configuration";
import database from "../database";
import logError, { logRaw } from "../../helpers/errorLogger";
import { textChannel } from "../../helpers/common";
import { getEditFunction, logIdentifier } from "./sanctionDatabaseInterop";
import {
    ActionCreationMode,
    Ban,
    IDeletable,
    IServers,
    LoggableSanctionBase,
    SanctionLogInteraction
} from "./sanctionSytem.types";
import { v4 as uuidv4 } from "uuid";
import { SanctionGUIInstantiator, textInput } from "./instantiators/sanctionGUIInstantiator";
import allEmbedCreators from "./instantiators/list";
import {
    addSanctionFields,
    createActionRows,
    createEditModal,
    createSanctionEmbed,
    extractData,
    readModalFieldsIntoSanction,
    stripNonGenericFields
} from "./embedHelpers";
import { Server } from "../serverStatus/status.types";

const confirmDeleteCodes = new Map<string, string>();

function preventDeletion(sanction: LoggableSanctionBase, userId: string) {
    return sanction.issuedBy !== userId && !(sanction as unknown as IDeletable)?.canEveryoneDelete;
}

async function getSanction(interaction: ButtonInteraction | ModalSubmitInteraction | SelectMenuInteraction, type: string, id: string, checkDelete: boolean): Promise<[ number, LoggableSanctionBase | null ]> {
    const idAsNumber = parseInt(id);
    if (isNaN(idAsNumber)) {
        console.log(`Couldn't find sanction ${type}-${id}`);
        await interaction.reply({ content: "Hibás azonosító!", ephemeral: true });
        return [ -1, null ];
    }
    const sanction = getSanctionById(type, idAsNumber);
    if (!sanction) {
        console.log(`Couldn't find sanction ${type}-${id}`);
        await interaction.reply({ content: "Nem található a szankció!", ephemeral: true });
        return [ -1, null ];
    }
    if (checkDelete && preventDeletion(sanction, interaction.user.id) && !hasAnyPermission(<GuildMember>interaction.member, config.sanctionSystem.deleteOverrideRoles)) {
        console.log(`User ${interaction.user.id} tried to delete sanction ${type}-${id} issued by ${sanction.issuedBy}`);
        await interaction.reply({ content: "Nem törölheted ezt a szankciót!", ephemeral: true });
        return [ -1, null ];
    }
    if (!checkDelete && sanction.issuedBy !== interaction.user.id && !isAdmin(<GuildMember>interaction.member)) {
        await interaction.reply({ content: "A szankciót nem te adtad ki!", ephemeral: true });
        return [ -1, null ];
    }
    return [ idAsNumber, sanction ];
}

export async function editSanctionLog(interaction: ButtonInteraction, type: string, id: string) {
    const [ , sanction ] = await getSanction(interaction, type, id, false);
    if (!sanction)
        return;
    const ctor = sanction.constructor.name;
    const creator = allEmbedCreators[ctor];
    if (!creator) {
        logRaw(`SanctionModalSubmit: cannot find embed creator for ${ctor}!`);
        await interaction.reply({
            content: "Hiba történt a szankció frissítése közben!",
            ephemeral: true
        });
        return;
    }

    const modal = createEditModal(`${SanctionLogInteraction.SubmitChanges}-${type}-${id}`, sanction, creator, null);
    await interaction.showModal(modal);
}

export async function handleSanctionLogEditModal(interaction: ModalSubmitInteraction, type: string, id: string) {
    const [ , sanction ] = await getSanction(interaction, type, id, false);
    if (!sanction)
        return;
    const creator = allEmbedCreators[sanction.constructor.name];
    if (!creator) {
        logRaw(`SanctionModalSubmit: cannot find embed creator for ${sanction.constructor.name}!`);
        await interaction.reply({
            content: "Hiba történt a szankció frissítése közben! Szankció nem található.",
            ephemeral: true
        });
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    const copy = creator.newSanction;
    sanction.copyTo(copy);
    const message = <Message>interaction.message;
    readModalFieldsIntoSanction(interaction, copy, creator);
    await confirmEdits(message, creator, type, copy, interaction);
}

async function confirmEdits(message: Message, creator: SanctionGUIInstantiator<LoggableSanctionBase>, type: string, sanction: LoggableSanctionBase, interaction: ModalSubmitInteraction | SelectMenuInteraction) {
    const { embed, id } = extractData(message);
    stripNonGenericFields(embed);
    addSanctionFields(sanction, embed, creator);
    embed.addFields({ name: logIdentifier, value: id });
    const edit = getEditFunction(type);
    let response = await edit(sanction).then(e => `:white_check_mark: ${e}`).catch(e => `:x: ${e}`);
    if (!response.startsWith(":white_check_mark:")) {
        await interaction.editReply(response);
        return;
    }

    try {
        await (<Message>interaction.message).edit({
            embeds: [ embed ],
            components: createActionRows(ActionCreationMode.Log, `-${type}-${sanction.id}`, sanction)
        });
    } catch (e) {
        logError("SanctionLogEdit: failed to update embed", e);
        response += `\n:x: Embed frissítése sikertelen!`;
    }
    await interaction.editReply(response);
}

export async function showLogDeleteModal(interaction: ButtonInteraction, type: string, id: string) {
    const [ , sanction ] = await getSanction(interaction, type, id, true);
    if (!sanction)
        return;
    const customId = `${SanctionLogInteraction.Delete}-${type}-${id}`;
    const code = uuidv4().substring(0, 4);
    const modal = new ModalBuilder()
    .setTitle("Törlés megerősítése")
    .setCustomId(customId)
    .addComponents(new ActionRowBuilder<TextInputBuilder>()
    .addComponents(
        textInput(code, SanctionLogInteraction.Delete, "", 4)
        .setPlaceholder("Fenti kód")
        .setMinLength(4)
        .setMaxLength(4)
    ));
    confirmDeleteCodes.set(customId, code.toLowerCase());
    await interaction.showModal(modal);
}

export async function handleSanctionLogDeleteModal(interaction: ModalSubmitInteraction, type: string, id: string) {
    const code = confirmDeleteCodes.get(interaction.customId);
    confirmDeleteCodes.delete(interaction.customId);
    if (!code || interaction.fields.getTextInputValue(SanctionLogInteraction.Delete).trim().toLowerCase() !== code) {
        await interaction.reply({ content: "Törlés megszakítva: hibás kód!", ephemeral: true });
        return;
    }
    const [ idAsNumber, sanction ] = await getSanction(interaction, type, id, true);
    if (!sanction)
        return;
    await interaction.deferReply({ ephemeral: true });
    try {
        switch (type) {
            case "Ban":
                await database.con.bans.delete({ where: { banId: idAsNumber } });
                break;
            case "Warning":
                await database.con.warnings.delete({ where: { warnId: idAsNumber } });
                break;
            case "AgeCheck":
                await database.con.ageChecks.delete({ where: { checkId: idAsNumber } });
                break;
            case "WantedIndividual":
                await database.con.wantedIndividuals.delete({ where: { entryId: idAsNumber } });
                break;
            default:
                logRaw("Unknown sanction type: " + type);
                return await interaction.editReply("Ismeretlen típus: " + type);
        }
    } catch (e) {
        logError("Failed to delete sanction", e);
        await interaction.editReply("Törlés sikertelen!");
        return;
    }

    try {
        removeSanction(sanction);
        await interaction.editReply("Szankció törölve!");
        await (<Message>interaction.message).delete();
    } finally {
        const user = interaction.user;
        const embed = createSanctionEmbed(sanction, true)
        .addFields({
            name: "Törlés kezdeményezője",
            value: userMention(user.id),
            inline: false
        })
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() });
        await textChannel(config.sanctionSystem.deletionLog).send({ embeds: [ embed ] });
    }
}

export async function handleSanctionLogSelect(interaction: SelectMenuInteraction) {
    const [ , type, id ] = interaction.customId!.split("-");
    const [ , sanction ] = await getSanction(interaction, type, id, false);
    if (!sanction)
        return;
    const creator = allEmbedCreators[sanction.constructor.name];
    if (!creator) {
        logRaw(`SanctionLogSelect: cannot find embed creator for ${sanction.constructor.name}!`);
        await interaction.reply({
            content: "Hiba történt a szankció frissítése közben! Szankció nem található.",
            ephemeral: true
        });
        return;
    }
    const tracked = sanction as unknown as IServers;
    const servers = tracked?.servers;
    if (servers == null) {
        logRaw(`SanctionLogSelect: sanction is not tracked: ${sanction.constructor.name}!`);
        await interaction.reply({
            content: "Hiba történt a szankció frissítése közben! Szankció nem tárol szervereket.",
            ephemeral: true
        });
        return;
    }
    await interaction.deferReply({ ephemeral: true });
    const message = <Message>interaction.message;
    tracked.servers = interaction.values.map(v => <Server>v).sort();
    await confirmEdits(message, creator, type, sanction, interaction);
}