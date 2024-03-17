import { textChannel } from "../../helpers/common";
import config from "../../configuration";
import { logRaw } from "../../helpers/errorLogger";
import { getVanillaEmojiComponent } from "../../helpers/emojiResolver";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    SelectMenuInteraction,
    StringSelectMenuBuilder,
    TextInputBuilder
} from "discord.js";
import { Server } from "../serverStatus/status.types";
import { readModalFieldsIntoSanction, serverToOptionMapper } from "./embedHelpers";
import { playerName } from "./sanctionReader";
import { getUploadFunction } from "./sanctionDatabaseInterop";
import { IServers, LoggableSanctionBase } from "./sanctionSytem.types";
import allEmbedCreators from "./instantiators/list";
import { textInput } from "./instantiators/sanctionGUIInstantiator";
import { escapeText } from "../joinMessageSender";

export const createSanctionEntry = "createSanctionEntry";
export const sanctionEntrySelect = "createSanctionEntrySelect";

const serverSelectionMap = new Map<string, Server[]>();
const sanctionStateMap = new Map<string, LoggableSanctionBase>();

export async function initSanctionLogCreatorChannel() {
    const channel = textChannel(config.sanctionSystem.logCreationChannel);
    if (!channel) {
        logRaw("Sanction log creation channel not found");
        return;
    }

    const messages = await channel.messages.fetch();
    const keys = Object.keys(allEmbedCreators);
    const missing = keys.concat([]);
    for (const msg of messages.values()) {
        const button = msg.components?.[0]?.components?.[0];
        if (!button)
            continue;
        const id = button.customId!.split("-")[1];
        const index = keys.indexOf(id);
        if (index < 0) {
            logRaw("Unknown button found in sanction log creation channel: " + button.customId!);
            await msg.delete();
            continue;
        }

        const creator = allEmbedCreators[keys[index]];
        if (creator)
            missing.splice(keys.indexOf(id), 1);
        else {
            logRaw("Embed creator not found for button: " + id);
            await msg.delete();
        }
    }

    const emoji = getVanillaEmojiComponent("plus_sign")!;

    for (const key of missing) {
        const creator = allEmbedCreators[key];
        if (!creator)
            continue;
        const embed = new EmbedBuilder()
        .setTitle(creator.type)
        .setDescription(creator.description)
        .setColor(creator.newSanction.color);

        const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

        if (creator.isTracked) {
            const values = Object.values(Server);
            rows.push(new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(new StringSelectMenuBuilder()
            .setCustomId(`${sanctionEntrySelect}-${key}`)
            .setMinValues(1)
            .setMaxValues(values.length)
            .addOptions(values.map(serverToOptionMapper))
            .setPlaceholder("Szerverek")));
        }

        rows.push(new ActionRowBuilder<ButtonBuilder>()
        .addComponents(new ButtonBuilder()
            .setLabel("Új feljegyzés")
            .setEmoji(emoji)
            .setCustomId(`${createSanctionEntry}-${key}`)
            .setStyle(ButtonStyle.Primary)
        ));

        await channel.send({ embeds: [ embed ], components: rows });
    }
}

export async function handleSanctionCreateButton(interaction: ButtonInteraction, type: string) {
    const creator = allEmbedCreators[type];
    if (!creator) {
        logRaw("Embed creator not found for button: " + type);
        await interaction.reply({ content: `Nem található feljegyzés létrehozó ${type} típussal`, ephemeral: true });
        return;
    }

    if (creator.isTracked && !serverSelectionMap.has(interaction.user.id)) {
        await interaction.reply({ content: "Nem választottál ki szervereket!", ephemeral: true });
        return;
    }

    const data = sanctionStateMap.get(interaction.user.id + "-" + type) ?? creator.newSanction;
    const modal = new ModalBuilder()
    .setTitle(`Új ${creator.type} feljegyzés`)
    .setCustomId(`${createSanctionEntry}-${type}`)
    .addComponents(
        new ActionRowBuilder<TextInputBuilder>()
        .addComponents(
            textInput(playerName, playerName, escapeText(data.playerName), 32)
        )
    );
    for (const input of creator.createModalInputs(data))
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
}

export async function handleSanctionReaderSelect(interaction: SelectMenuInteraction, userId: string) {
    const servers = interaction.values.map(v => <Server>v).sort();
    serverSelectionMap.set(userId, servers);
    await interaction.update({});
}

export async function handleSanctionCreationModal(interaction: ModalSubmitInteraction, type: string) {
    const creator = allEmbedCreators[type];
    if (!creator) {
        logRaw("Embed creator not found for button: " + type);
        await interaction.reply({ content: `Nem található feljegyzés létrehozó ${type} típussal`, ephemeral: true });
        return;
    }

    const servers = serverSelectionMap.get(interaction.user.id);
    if (creator.isTracked && !servers) {
        await interaction.reply({ content: "Nem választottál ki szervereket!", ephemeral: true });
        return;
    }

    const sanction = sanctionStateMap.get(interaction.user.id + "-" + type) ?? creator.newSanction;
    sanction.issuedBy = interaction.user.id;
    sanction.created = new Date();
    readModalFieldsIntoSanction(interaction, sanction, creator);
    sanctionStateMap.set(interaction.user.id + "-" + type, sanction);
    const tracked = sanction as unknown as IServers;
    if (tracked?.servers)
        tracked.servers = servers!;
    await interaction.deferReply({ ephemeral: true });
    const upload = getUploadFunction(type);
    const response = await upload(sanction, interaction.user).then(e => `:white_check_mark: ${e}`).catch(e => `:x: ${e}`);
    if (response.startsWith(":white_check_mark:")) {
        serverSelectionMap.delete(interaction.user.id);
        sanctionStateMap.delete(interaction.user.id + "-" + type);
    }
    await interaction.editReply(response);
}