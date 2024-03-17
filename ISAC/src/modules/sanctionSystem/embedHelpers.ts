import {
    ActionCreationMode,
    IReason,
    IServers,
    LoggableSanctionBase,
    SanctionLogInteraction,
    SanctionReaderInteraction
} from "./sanctionSytem.types";
import { SanctionGUIInstantiator, textInput } from "./instantiators/sanctionGUIInstantiator";
import {
    ActionRow,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonComponent,
    ButtonInteraction,
    ButtonStyle,
    Embed,
    EmbedBuilder,
    Message,
    ModalBuilder,
    ModalSubmitInteraction,
    SelectMenuComponentOptionData,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputModalData,
    TextInputStyle,
    userMention
} from "discord.js";
import { getEmoji, getVanillaEmojiComponent } from "../../helpers/emojiResolver";
import { Server } from "../serverStatus/status.types";
import { createdAt, originalMessage, playerName, sender } from "./sanctionReader";
import allEmbedCreators from "./instantiators/list";
import { timeFromDate } from "../../helpers/common";
import { escapeText } from "../joinMessageSender";
import { logIdentifier } from "./sanctionDatabaseInterop";

export function findCreator(sanction: LoggableSanctionBase): SanctionGUIInstantiator<LoggableSanctionBase> {
    return allEmbedCreators[sanction.constructor.name] as SanctionGUIInstantiator<LoggableSanctionBase>;
}

export function createEditModal(id: string, data: LoggableSanctionBase, creator: SanctionGUIInstantiator<LoggableSanctionBase>, interaction: ButtonInteraction | null) {
    const modal = new ModalBuilder()
    .setTitle("Szankció szerkesztése")
    .setCustomId(id)
    .addComponents(
        new ActionRowBuilder<TextInputBuilder>()
        .addComponents(
            textInput(playerName, playerName, escapeText(data.playerName), 32)
        )
    );
    for (const input of creator.createModalInputs(data))
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    if (interaction != null && modal.components.length < 5)
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
            .setRequired(false)
            .setStyle(TextInputStyle.Paragraph)
            .setLabel("Eredeti üzenet")
            .setValue(interaction.message.embeds[0].description!)
            .setPlaceholder("Ezt a mezőt ne töltsd ki. Csak az eredeti üzenetet tartalmazza.")
            .setCustomId(originalMessage)));
    return modal;
}

export function addSanctionFields<T extends LoggableSanctionBase>(instance: T, embed: EmbedBuilder, creator: SanctionGUIInstantiator<T>, skipValidation?: boolean) {
    const validate = skipValidation ? null : instance.validate();
    if (validate == null) {
        embed.addFields({ name: playerName, value: escapeText(instance!.playerName) || "< üres >", inline: true });
        embed.addFields(creator.createEmbedFields(instance));
        const reason = instance as unknown as IReason;
        if (reason?.reason)
            embed.addFields({ name: "Indok", value: reason.reason || "< üres >", inline: false });
    } else
        embed.addFields({ name: "Hiba", value: validate });
    return validate;
}

export function readModalFieldsIntoSanction(interaction: ModalSubmitInteraction, sanction: LoggableSanctionBase, creator: SanctionGUIInstantiator<LoggableSanctionBase>) {
    for (const component of interaction.components) {
        const data = <TextInputModalData>component.components?.[0];
        if (data)
            creator.setField(sanction, data.customId, data.value.trim());
    }
}

export function createSanctionEmbed(entry: LoggableSanctionBase, skipValidation: boolean, creator?: SanctionGUIInstantiator<LoggableSanctionBase>) {
    creator ??= findCreator(entry);
    const embed = new EmbedBuilder()
    .setTitle(creator.type)
    .setColor(entry.color).addFields(
        { name: sender, value: userMention(entry.issuedBy), inline: false },
        { name: createdAt, value: timeFromDate(entry.created!), inline: false }
    );
    addSanctionFields(entry, embed, creator, skipValidation);
    return embed;
}

export function stripNonGenericFields(embed: EmbedBuilder) {
    const fields = [ ...embed.toJSON().fields! ];
    embed.spliceFields(0, fields.length);
    embed.addFields(fields.filter((e: any) => e.name === sender || e.name === createdAt));
}

export const readerVerifyServers = "readerVerifyServers";

export const logVerifyServers = "logVerifyServers";

export function createActionRows(mode: ActionCreationMode | boolean, suffix: string, instance: LoggableSanctionBase): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
    const creationMode = mode === true ? ActionCreationMode.Valid : mode === false ? ActionCreationMode.Invalid : mode;
    const actionRow = new ActionRowBuilder<ButtonBuilder>();
    const log = creationMode === ActionCreationMode.Log;
    if (creationMode === ActionCreationMode.Valid) {
        const accept = new ButtonBuilder()
        .setLabel("Elfogadás")
        .setEmoji(getVanillaEmojiComponent("check_mark")!)
        .setCustomId(`${SanctionReaderInteraction.Accept}${suffix}`)
        .setStyle(ButtonStyle.Success);
        actionRow.addComponents(accept);
    }
    const edit = new ButtonBuilder()
    .setLabel("Szerkesztés")
    .setEmoji(getVanillaEmojiComponent("pencil")!)
    .setCustomId(`${log ? SanctionLogInteraction.Edit : SanctionReaderInteraction.Edit}${suffix}`)
    .setStyle(ButtonStyle.Primary);
    actionRow.addComponents(edit);
    const deleteButton = new ButtonBuilder()
    .setLabel("Törlés")
    .setEmoji(getVanillaEmojiComponent("multiplication_sign")!)
    .setCustomId(`${log ? SanctionLogInteraction.Delete : SanctionReaderInteraction.Delete}${suffix}`)
    .setStyle(ButtonStyle.Danger);
    actionRow.addComponents(deleteButton);
    const serversRow = new ActionRowBuilder<StringSelectMenuBuilder>();
    const tracked = instance as unknown as IServers;
    if (tracked?.servers) {
        const values = Object.values(Server);
        serversRow.addComponents(
            new StringSelectMenuBuilder()
            .setCustomId((log ? logVerifyServers : readerVerifyServers) + suffix)
            .setOptions(values.map(serverToOptionMapper))
            .setPlaceholder(tracked.servers.join(", "))
            .setMinValues(1)
            .setMaxValues(values.length)
        );
    }

    return serversRow.components.length === 0 ? [ actionRow ] : [ actionRow, serversRow ];
}

export function extractData(message: Message) {
    const embed = <Embed>message.embeds[0];
    const id = embed.fields.find(e => e.name === logIdentifier)?.value ?? "0";
    const row = <ActionRow<ButtonComponent>>message.components[0];
    const data = <ButtonComponent>row.components[0];
    return {
        embed: new EmbedBuilder(embed.toJSON()),
        suffix: data.customId!.substring(data.customId!.indexOf("-")),
        id
    };
}

export function serverToOptionMapper(s: Server) {
    return <SelectMenuComponentOptionData>{
        value: s,
        label: s,
        emoji: getEmoji(s.substring(0, s.indexOf("-")))
    };
}
