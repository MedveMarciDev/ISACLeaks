import client from "../../modules/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    channelMention,
    ChannelSelectMenuBuilder,
    ChannelSelectMenuInteraction,
    Interaction,
    roleMention,
    RoleSelectMenuBuilder,
    RoleSelectMenuInteraction,
    TextChannel
} from "discord.js";
import { ConfigEntry, ConfigEntryType, configLayout, getPaths, getValues, setValue } from "./configEditor.types";
import config from "../../configuration";
import * as fs from "fs";

require("dotenv").config({ path: process.argv.includes("cd") ? "../.env" : "./.env" });

async function onReady() {
    const guild = client.guilds.cache.first()!;
    const channel = guild.channels.cache.get(process.env.CONFIG_CHANNEL!) as TextChannel;
    console.log("Deleting config channel contents...");
    try {
        await channel.bulkDelete(100);
    } catch (e) {
        const messages = await channel.messages.fetch();
        await Promise.all(messages.map(e => e.delete()));
    }
    console.log("Refreshing config...");
    await sendComponents(channel);
    console.log("Waiting for user input");
}

client.once("ready", onReady);

client.on("interactionCreate", handleInteraction);

console.log("Logging in...");

client.login(process.env.BOT_TOKEN).then(() => console.log("Authenticated!"));

const pathToEntryCache = new Map<string, ConfigEntry>();

function createRoleSelect(path: string, multiSelect: boolean) {
    const row = new ActionRowBuilder<RoleSelectMenuBuilder>();
    const menu = new RoleSelectMenuBuilder()
    .setMinValues(1)
    .setCustomId(path);
    menu.setMaxValues(multiSelect ? 25 : 1);
    row.addComponents(menu);
    return row;
}

function createChannelSelect(path: string, multiSelect: boolean) {
    const row = new ActionRowBuilder<ChannelSelectMenuBuilder>();
    const menu = new ChannelSelectMenuBuilder()
    .setMinValues(1)
    .setCustomId(path);
    menu.setMaxValues(multiSelect ? 25 : 1);
    row.addComponents(menu);
    return row;
}

function getValueAndConvert(path: string, entry: ConfigEntry) {
    const obj = getValues(config, path);
    const value = obj.value;
    const showParent = entry[2] ?? false;
    if (showParent)
        return obj.parent;
    switch (entry[1]) {
        case ConfigEntryType.channel:
            return channelMention(value);
        case ConfigEntryType.role:
            return roleMention(value);
        case ConfigEntryType.channelArray:
            return value.map(channelMention).join(" ");
        case ConfigEntryType.roleArray:
            return value.map(roleMention).join(" ");
        default:
            return value;
    }
}

function createContentAndComponents(path: string, entry: ConfigEntry) {
    const value = getValueAndConvert(path, entry);
    const content = `**${path}**\n${typeof value === "string" ? value : JSON.stringify(value, null, 4)}`;
    let component: ActionRowBuilder<ChannelSelectMenuBuilder | RoleSelectMenuBuilder>;
    switch (entry[1]) {
        case ConfigEntryType.channel:
            component = createChannelSelect(path, false);
            break;
        case ConfigEntryType.role:
            component = createRoleSelect(path, false);
            break;
        case ConfigEntryType.channelArray:
            component = createChannelSelect(path, true);
            break;
        case ConfigEntryType.roleArray:
            component = createRoleSelect(path, true);
            break;
    }
    return { content, component };
}

async function sendComponents(channel: TextChannel) {
    const paths = getPaths(config, "");
    for (const path of paths) {
        const entry = configLayout.find(e => path.match(new RegExp(e[0].replaceAll("0", "\\d"), "i")));
        if (entry == null)
            continue;
        const { content, component } = createContentAndComponents(path, entry);
        pathToEntryCache.set(path, entry);
        await channel.send({ content, components: [ component ], allowedMentions: { roles: [] } });
    }

    const buttonRow = new ActionRowBuilder<ButtonBuilder>();
    const button = new ButtonBuilder()
    .setCustomId("saveConfig")
    .setStyle(ButtonStyle.Danger)
    .setLabel("Save")
    .setEmoji("📝");
    buttonRow.addComponents(button);
    await channel.send({ components: [ buttonRow ] });
}

async function handleInteraction(interaction: Interaction) {
    if (interaction.isChannelSelectMenu()) {
        await handleChannelSelectMenu(interaction);
        return;
    }
    if (interaction.isRoleSelectMenu()) {
        await handleRoleSelectMenu(interaction);
        return;
    }
    if (!interaction.isButton() || interaction.customId !== "saveConfig")
        return;
    await interaction.deferReply({ ephemeral: true });
    try {
        fs.writeFileSync((process.argv.includes("cd") ? "../" : "") + "src/config.json", JSON.stringify(config, null, 4), "utf-8");
        await interaction.editReply("Saved config!");
    } catch (e) {
        console.error(e);
        await interaction.editReply({ content: "Failed to save config!" });
    }
}

function handleChannelSelectMenu(interaction: ChannelSelectMenuInteraction) {
    const path = interaction.customId;
    const entry = pathToEntryCache.get(path)!;
    const channels = interaction.channels.map(e => e.id.toString());
    setValue(config, path, entry[1] === ConfigEntryType.channelArray ? channels : channels[0]);
    const { content, component } = createContentAndComponents(path, entry);
    return interaction.update({ content, components: [ component ] });
}

function handleRoleSelectMenu(interaction: RoleSelectMenuInteraction) {
    const path = interaction.customId;
    const entry = pathToEntryCache.get(path)!;
    const roles = interaction.roles.map(e => e.id.toString());
    setValue(config, path, entry[1] === ConfigEntryType.roleArray ? roles : roles[0]);
    const { content, component } = createContentAndComponents(path, entry);
    return interaction.update({ content, components: [ component ], allowedMentions: { roles: [] } });
}