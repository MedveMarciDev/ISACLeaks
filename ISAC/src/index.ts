import client from "./modules/client";
import sendJoinMessage from "./modules/joinMessageSender";
import executeFilter from "./modules/messageFiltering";
import { handleMuteButtonInteraction, initMuteManager } from "./modules/muteManager";
import logError, { logRaw } from "./helpers/errorLogger";
import setupAutoVote, { onThreadCreated } from "./modules/autoVote";
import boostMessage from "./modules/boost";
import initStatusUpdater from "./modules/serverStatus/statusUpdater";
import {
    ActivityType,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Message,
    MessageReaction,
    ModalSubmitInteraction,
    StringSelectMenuInteraction,
    User
} from "discord.js";
import CommandList from "./commands/commandList";
import config from "./configuration";
import { closeTicket, initTickets, openTicket, readTicketLog } from "./modules/tickets/ticketManager";
import {
    disconnectVoiceLog,
    joinVoiceLog,
    logMessageDeletion,
    logMessageEdit,
    logReactionAdded,
    logReactionRemoved,
    moveVoiceLog
} from "./modules/log";
import initRoleSelection, { handleRoleSelectInteraction } from "./modules/autoRoles/autoRoleManager";
import initSanctionReader, {
    acceptSanction,
    editReaderSanction,
    handleSanctionReaderEditModal,
    processReaderDeleteModal,
    selectReaderServers,
    showReaderDeleteModal
} from "./modules/sanctionSystem/sanctionReader";
import { TicketInteraction } from "./modules/tickets/tickets.types";
import { SanctionLogInteraction, SanctionReaderInteraction } from "./modules/sanctionSystem/sanctionSytem.types";
import { fetchSanctionData } from "./modules/sanctionSystem/sanctionDatabaseInterop";
import db from "./modules/database";
import {
    createSanctionEntry,
    handleSanctionCreateButton,
    handleSanctionCreationModal,
    handleSanctionReaderSelect,
    initSanctionLogCreatorChannel,
    sanctionEntrySelect
} from "./modules/sanctionSystem/logChannelInstantiator";
import { logVerifyServers, readerVerifyServers } from "./modules/sanctionSystem/embedHelpers";
import {
    editSanctionLog,
    handleSanctionLogDeleteModal,
    handleSanctionLogEditModal,
    handleSanctionLogSelect,
    showLogDeleteModal
} from "./modules/sanctionSystem/sanctionEditor";
import initInfo from "./modules/initInfo";
import { nameFilter } from "./modules/nameFilter";
import { handleMuteMenuModal } from "./commands/muteContext";
import initChannelsAndRoles from "./modules/channelsAndRoles";
import { newAccountCheck } from "./modules/newAccountWarn";

require("dotenv").config();

client.once("ready", onReady);

async function onReady() {
    if (client.guilds.cache.size > 1) {
        logRaw(
            "A bot jelenleg több discord szerveren is jelen van. Erre nincs felkészítve, így csak az egyiken fog megfelelően működni.\nMegfelelő működés helye: " +
            client.guilds.cache.first()!.name
        );
    }

    await db.connect();
    console.log("Initializing role selection...");
    await initRoleSelection();
    console.log("Initializing info...");
    await initInfo();
    console.log("Loading mutes...");
    await initMuteManager();
    console.log("Setting up auto vote...");
    await setupAutoVote();
    console.log("Initializing ticket system...");
    await initTickets();
    console.log("Initializing sanction system (1 of 3)...");
    await fetchSanctionData();
    if (process.argv.includes("verify")) {
        console.log("Initializing sanction system (2 of 3)...");
        await initSanctionReader();
    }
    console.log("Initializing sanction system (3 of 3)...");
    await initSanctionLogCreatorChannel();
    console.log("Updating server status...");
    await initStatusUpdater();
    client.user?.setPresence({
        status: "dnd",
        afk: true,
        activities: [ { name: "v2", type: ActivityType.Competing } ]
    });
    initChannelsAndRoles();
    console.log("Bot is ready to operate");
    require("git-last-commit").getLastCommit((err: any, commit: any) => {
        logRaw("Current revision: **" + commit.shortHash + "** `" + commit.subject + "`");
    });
}

client.on("guildMemberAdd", async member => {
    await nameFilter(member);
    await newAccountCheck(member);
    await sendJoinMessage(member);

});

client.on("messageCreate", async message => {
    if (!message.author.bot && config.wordFiltering.enabled)
        await executeFilter(message);
});

client.on("messageUpdate", async (old, edited) => {
    if (config.wordFiltering.enabled) {
        if (!edited.partial)
            await executeFilter(edited);
    }

    if (edited.author != null && !edited.author.bot)
        await logMessageEdit(<Message>old, <Message>edited);
});

client.on("messageDelete", async message => {
    if (message.author != null && !message.author.bot)
        await logMessageDeletion(<Message>message);
});

client.on("messageReactionAdd", async (reaction, user) => await logReactionAdded(reaction as MessageReaction, user as User));

client.on("messageReactionRemove", async (messageReaction, user) => await logReactionRemoved(messageReaction as MessageReaction, user as User));

client.on("guildMemberUpdate", async (o, n) => {
    if (!o.premiumSince && n.premiumSince)
        await boostMessage(n);
});

client.on("threadCreate", onThreadCreated);

client.on("interactionCreate", async interaction => {
    if (interaction.isChatInputCommand()) {
        CommandList.handleCommand(interaction as ChatInputCommandInteraction);
        return;
    }
    if (interaction.isContextMenuCommand()) {
        CommandList.handleContext(interaction);
        return;
    }
    try {
        if (interaction.isStringSelectMenu()) {
            await handleSelectInteraction(interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            await handleModalInteraction(interaction);
            return;
        }

        if (interaction.isButton() && interaction.isMessageComponent())
            await handleButtonInteraction(interaction);
    } catch (e) {
        logError(`Failed handling interaction of type ${interaction.constructor.name}`, e);
    }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
        const member = newState.member;
        const oldChannel = oldState.channel;
        const newChannel = newState.channel;
        if (!member) return;
        if (config.channels.loggerIgnored.includes(newChannel?.id ?? "") || config.channels.loggerIgnored.includes(oldChannel?.id ?? "")) return;
        if (oldChannel && !newChannel)
            await disconnectVoiceLog(member, oldChannel);
        if (!oldChannel && newChannel)
            await joinVoiceLog(member, newChannel);
        if (oldChannel && newChannel && oldChannel !== newChannel)
            await moveVoiceLog(member, oldChannel, newChannel);
    } catch (e) {
        logError(`Failed handling voice state update`, e);
    }
});

function handleSelectInteraction(interaction: StringSelectMenuInteraction) {
    const [ type ] = interaction.customId.split("-");
    switch (type) {
        case "roleSelect":
            return handleRoleSelectInteraction(interaction);
        case readerVerifyServers:
            return selectReaderServers(interaction);
        case sanctionEntrySelect:
            return handleSanctionReaderSelect(interaction, interaction.user.id);
        case logVerifyServers:
            return handleSanctionLogSelect(interaction);
        default:
            console.warn("Unknown select interaction: " + interaction.customId);
            return Promise.resolve();
    }
}

function handleModalInteraction(interaction: ModalSubmitInteraction) {
    if (interaction == null)
        return Promise.resolve();
    const [ type, id, second ] = interaction.customId.split("-");
    switch (type) {
        case SanctionReaderInteraction.SubmitChanges:
            return handleSanctionReaderEditModal(interaction, id);
        case SanctionReaderInteraction.Delete:
            return processReaderDeleteModal(interaction, id, second);
        case createSanctionEntry:
            return handleSanctionCreationModal(interaction, id);
        case SanctionLogInteraction.SubmitChanges:
            return handleSanctionLogEditModal(interaction, id, second);
        case SanctionLogInteraction.Delete:
            return handleSanctionLogDeleteModal(interaction, id, second);
        case "muteMenu":
            return handleMuteMenuModal(interaction, id, second);
        default:
            console.warn("Unknown modal interaction: " + interaction.customId);
            return Promise.resolve();
    }
}

function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    if (interaction == null)
        return Promise.resolve();

    const [ type, id, second ] = interaction.customId.split("-");
    switch (type) {
        case "unmute":
            return handleMuteButtonInteraction(interaction);
        case TicketInteraction.Open:
            return openTicket(interaction, id);
        case TicketInteraction.Close:
            return closeTicket(interaction);
        case TicketInteraction.Read:
            return readTicketLog(interaction, id);
        case SanctionReaderInteraction.Accept:
            return acceptSanction(interaction, id, second);
        case SanctionReaderInteraction.Edit:
            return editReaderSanction(interaction);
        case SanctionReaderInteraction.Delete:
            return showReaderDeleteModal(interaction, id, second);
        case createSanctionEntry:
            return handleSanctionCreateButton(interaction, id);
        case SanctionLogInteraction.Edit:
            return editSanctionLog(interaction, id, second);
        case SanctionLogInteraction.Delete:
            return showLogDeleteModal(interaction, id, second);
        default:
            console.warn("Unknown button interaction: " + interaction.customId);
            return Promise.resolve();
    }
}

console.log("Logging in...");
client.login(process.env.BOT_TOKEN).then(() => console.log("Authenticated!"));
