import config from "../../configuration";
import {
    AgeCheck,
    Ban,
    IServers,
    LoggableSanctionBase,
    SanctionReaderInteraction,
    WantedIndividual,
    Warning
} from "./sanctionSytem.types";
import {
    ActionRowBuilder,
    ButtonInteraction,
    channelMention,
    EmbedBuilder,
    Message,
    ModalBuilder,
    ModalSubmitInteraction,
    SelectMenuInteraction,
    TextChannel,
    TextInputBuilder,
    userMention
} from "discord.js";
import { newEmbed, textChannel, timeFromDate } from "../../helpers/common";
import logError, { logRaw } from "../../helpers/errorLogger";
import { deserializeString } from "./parsers/deserializers";
import { getUploadFunction } from "./sanctionDatabaseInterop";
import { Server } from "../serverStatus/status.types";
import {
    addSanctionFields,
    createActionRows,
    createEditModal,
    extractData,
    findCreator,
    readModalFieldsIntoSanction,
    stripNonGenericFields
} from "./embedHelpers";
import { v4 as uuidv4 } from "uuid";
import allEmbedCreators from "./instantiators/list";
import { SanctionGUIInstantiator, textInput } from "./instantiators/sanctionGUIInstantiator";
import { escapeText } from "../joinMessageSender";

export const playerName = "Játékos neve";
export const createdAt = "Létrehozva";
export const sender = "Küldő";
export const originalMessage = "originalMessage";

let verificationChannel: TextChannel;

type SanctionSentForVerification = { message: string, channel: string, sanction: LoggableSanctionBase }

const verifyMap = new Map<string, SanctionSentForVerification>();
const confirmDeleteCodes = new Map<string, string>();

export default function initSanctionReader() {
    const cfg = config.sanctionSystem.oldVerification;
    if (!cfg.enabled)
        return Promise.resolve();
    verificationChannel = textChannel(cfg.sendTo);
    if (!verificationChannel) {
        logRaw("SanctionReader: cannot find verification channel!");
        return Promise.resolve();
    }
    return Promise.all([
        processChannel<Ban>(cfg.bans, "Ban"),
        processChannel<Warning>(cfg.warnings, "Warning"),
        processChannel<AgeCheck>(cfg.ageChecks, "AgeCheck"),
        processChannel<WantedIndividual>(cfg.wantedIndividuals, "WantedIndividual")
    ]);
};

async function processChannel<T extends LoggableSanctionBase>(channelID: string, typeName: string) {
    const channel = textChannel(channelID);
    if (!channel) {
        logRaw(`SanctionReader: cannot find channel ${channelID}!`);
        return;
    }
    const creator = allEmbedCreators[typeName];
    if (!creator) {
        logRaw(`SanctionReader: cannot find embed creator for ${channelID}!`);
        return;
    }
    let messages = await channel.messages.fetch();
    while (messages.size > 0) {
        const last = messages.last();
        for (const msg of messages.values()) {
            if (msg.author.bot)
                continue;
            const instance = deserializeString(msg.content, typeName);
            if (instance == null) {
                logRaw(`SanctionReader: cannot deserialize message ${msg.id} in channel ${channelID}!`);
                continue;
            }
            try {
                await processMessage(instance, msg, creator);
            } catch (e) {
                logError(`SanctionReader: cannot process message ${msg.id} in channel ${channelID}`, e);
            }
        }

        if (last)
            messages = await channel.messages.fetch({ before: last.id });
        else
            break;
    }
}

async function processMessage(instance: LoggableSanctionBase, msg: Message<true>, creator: SanctionGUIInstantiator<LoggableSanctionBase>) {
    instance.created = msg.createdAt;
    instance.issuedBy = msg.author.id;
    const embed = newEmbed()
    .setTitle(creator.type)
    .setDescription(msg.content || "<üres>")
    .setURL(msg.url)
    .addFields(
        { name: sender, value: userMention(msg.author.id) + " " + escapeText(msg.author.username), inline: false },
        { name: createdAt, value: timeFromDate(msg.createdAt), inline: false }
    )
    .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() });
    const validate = addSanctionFields(instance, embed, creator);
    await sendVerificationMessage(msg, validate == null, embed, instance);
}

async function sendVerificationMessage<T extends LoggableSanctionBase>(msg: Message, isValid: boolean, embed: EmbedBuilder, instance: T) {
    const suffix = `-${msg.channelId}-${msg.id}`;
    const components = createActionRows(isValid, suffix, instance);
    const sent = await verificationChannel.send({ embeds: [ embed ], components });
    verifyMap.set(sent.id, {
        sanction: instance,
        message: msg.id,
        channel: msg.channelId
    });
}

export async function selectReaderServers(interaction: SelectMenuInteraction) {
    const data = verifyMap.get(interaction.message.id);
    if (!data) {
        logRaw(`SanctionVerifySelect: cannot find message ${interaction.message.id}!`);
        await interaction.reply({ content: "Üzenet nem található a memóriában!", ephemeral: true });
        return;
    }
    const tracked = data.sanction as unknown as IServers;
    if (tracked?.servers == null) {
        logRaw(`SanctionVerifySelect: cannot find tracked sanction ${interaction.message.id}!`);
        await interaction.reply({ content: "Hiba történt!", ephemeral: true });
        return;
    }

    tracked.servers = interaction.values.map(v => <Server>v).sort();
    const creator = findCreator(data.sanction);
    if (!creator) {
        logRaw("SanctionVerifySelect: cannot find embed creator!");
        await interaction.reply({ content: "Szerverek módosítva, embed frissítése nem lehetséges!", ephemeral: true });
        return;
    }

    const message = interaction.message as Message;
    if (message == null) {
        logRaw("SanctionVerifySelect: cannot find message!");
        await interaction.reply({ content: "Szerverek módosítva, embed frissítése nem lehetséges!", ephemeral: true });
        return;
    }

    const { embed, suffix } = extractData(message);
    stripNonGenericFields(embed);
    addSanctionFields(data.sanction, embed, creator);
    await interaction.update({
        embeds: [ embed ],
        components: createActionRows(data.sanction.isValid(), suffix, data.sanction)
    });
}

export async function acceptSanction(interaction: ButtonInteraction, channelID: string, messageID: string) {
    let message: string | null = null;
    let data: SanctionSentForVerification | null = null;
    for (const entry of verifyMap.entries()) {
        if (entry[1].message !== messageID)
            continue;
        message = entry[0];
        data = entry[1];
        break;
    }

    if (data == null) {
        logRaw(`SanctionModalSubmit: cannot find entry ${channelID}!`);
        await reply(interaction, "Hiba történt a szankció feltöltése közben! Szankció nem található.");
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    const channel = textChannel(channelID);
    if (!channel) {
        logRaw(`SanctionVerifyUpload: cannot find channel ${channelID}!`);
        await interaction.editReply("Feltöltés nem lehetséges: nem található a szankció csatornája!");
        return;
    }

    let msg: Message;
    try {
        msg = await channel.messages.fetch(messageID);
    } catch (e) {
        logRaw(`SanctionVerifyUpload: cannot find message ${messageID} in channel ${channelID}!`);
        await interaction.editReply(`Feltöltés nem lehetséges: nem található a szankció üzenete! ${channelMention(channelID)}`);
        return;
    }

    const emojis = msg.reactions.cache.map(r => r.emoji);
    const upload = getUploadFunction(data.sanction.constructor.name);
    let { success, response } = await upload(data.sanction, interaction.user, emojis).then(e => ({
        success: true,
        response: `:white_check_mark: ${e}`
    })).catch(e => ({
        success: false,
        response: `:x: ${e}`
    }));
    if (success)
        try {
            await msg.delete();
            await interaction.message.delete();
        } catch (e) {
            logRaw(`SanctionVerifyUpload: cannot delete message ${messageID} in channel ${channelID}!`);
            response += `\nTörlés nem lehetséges: nem található a szankció üzenete! ${channelMention(channelID)}`;
        }
    await interaction.editReply(response);
}

export async function editReaderSanction(interaction: ButtonInteraction) {
    const id = interaction.message.id;
    if (!verifyMap.has(id)) {
        await interaction.reply({ content: "Hiba történt a szankció szerkesztése közben!", ephemeral: true });
        return;
    }
    const data = verifyMap.get(id)!;
    const ctor = data.sanction.constructor.name;
    const creator = allEmbedCreators[ctor];
    if (!creator) {
        logRaw("SanctionReader: cannot find embed creator for " + ctor + "!");
        await interaction.reply({ content: "Hiba történt a szankció szerkesztése közben!", ephemeral: true });
        return;
    }
    const modal = createEditModal(`${SanctionReaderInteraction.SubmitChanges}-${id}`, data.sanction, creator, interaction);
    await interaction.showModal(modal);
}

export async function showReaderDeleteModal(interaction: ButtonInteraction, channelID: string, messageID: string) {
    const customId = `${SanctionReaderInteraction.Delete}-${channelID}-${messageID}`;
    const code = uuidv4().substring(0, 4);
    const modal = new ModalBuilder()
    .setTitle("Törlés megerősítése")
    .setCustomId(customId)
    .addComponents(new ActionRowBuilder<TextInputBuilder>()
    .addComponents(
        textInput(code, SanctionReaderInteraction.Delete, "", 4)
        .setPlaceholder("Fenti kód")
        .setMinLength(4)
        .setMaxLength(4)
    ));
    confirmDeleteCodes.set(customId, code.toLowerCase());
    await interaction.showModal(modal);
}

export async function processReaderDeleteModal(interaction: ModalSubmitInteraction, channelID: string, messageID: string) {
    const customId = interaction.customId;
    const code = confirmDeleteCodes.get(customId);
    confirmDeleteCodes.delete(customId);
    if (!code || code !== interaction.fields.getTextInputValue(SanctionReaderInteraction.Delete).trim().toLowerCase()) {
        await reply(interaction, "Törlés megszakítva: hibás kód!");
        return;
    }
    const channel = textChannel(channelID);
    if (!channel) {
        logRaw(`SanctionVerifyDelete: cannot find channel!`);
        await reply(interaction, "Törlés nem lehetséges: nem található a szankció csatornája!");
        return;
    }

    let message: Message;
    try {
        message = await channel.messages.fetch(messageID);
    } catch (e: any) {
        logRaw(`SanctionVerifyDelete: cannot find message!`);
        await reply(interaction, "Törlés nem lehetséges: nem található a szankció üzenete!");
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
        await message.delete();
        await (<Message>interaction.message).delete();
        await interaction.editReply("Szankció törölve!");
    } catch (e) {
        logRaw(`SanctionVerifyDelete: cannot delete message ${messageID} in channel ${channelID}!`);
        await interaction.editReply("Törlés sikertelen!");
    }
}

export async function handleSanctionReaderEditModal(interaction: ModalSubmitInteraction, id: string) {
    const entry = verifyMap.get(id);
    if (!entry) {
        logRaw(`SanctionModalSubmit: cannot find entry ${id}!`);
        await reply(interaction, "Hiba történt a szankció frissítése közben! Szankció nem található.");
        return;
    }

    const creator = allEmbedCreators[entry.sanction.constructor.name];
    if (!creator) {
        logRaw(`SanctionModalSubmit: cannot find embed creator for ${entry.sanction.constructor.name}!`);
        await reply(interaction, "Hiba történt a szankció frissítése közben! Szankció nem található.");
        return;
    }

    readModalFieldsIntoSanction(interaction, entry.sanction, creator);
    const message = interaction.message as Message;
    if (message == null) {
        await reply(interaction, "Adatok módosítva; embed frissítése nem lehetséges: üzenet nem található!");
        return;
    }

    const { embed, suffix } = extractData(message);
    stripNonGenericFields(embed);
    addSanctionFields(entry.sanction, embed, creator);
    // @ts-ignore
    await interaction.update({
        embeds: [ embed ],
        components: createActionRows(entry.sanction.isValid(), suffix, entry.sanction)
    });
}

function reply(interaction: ButtonInteraction | ModalSubmitInteraction, content: string, ephemeral = true) {
    return interaction.reply({ content, ephemeral });
}