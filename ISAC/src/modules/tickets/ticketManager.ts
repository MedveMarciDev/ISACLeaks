import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    channelMention,
    ChannelType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    Interaction,
    Message,
    OverwriteResolvable,
    Permissions,
    PermissionsBitField,
    roleMention,
    TextChannel,
    User,
    userMention,
    VoiceChannel
} from "discord.js";
import client from "../client";
import database from "../database";
import logError, { logRaw } from "../../helpers/errorLogger";
import config from "../../configuration";
import { firstMessage, textChannel, timeFromDate, toEmbed, user } from "../../helpers/common";
import { CreatableTicket, TicketInteraction, TicketLog } from "./tickets.types";
import TimeFormat from "../../helpers/timeFormat";
import { v4 } from "uuid";
import { getEmojiComponent, getVanillaEmojiComponent } from "../../helpers/emojiResolver";
import { escapeText } from "../joinMessageSender";

type TicketMessage = { author: string, content: string, time: string };

const lastOpened = new Map<string, Date>();

export async function initTickets() {
    try {
        await initializeTicketsInternal();
    } catch (err) {
        logError(`Failed to initialize ticket system`, err);
    }
}

async function initializeTicketsInternal() {
    for (const ticket of config.tickets) {
        const channel = textChannel(ticket.initialization.channel)!;
        if (channel == null) {
            console.warn(`No channel found for ticket ${ticket.id}`);
            continue;
        }
        const message = await firstMessage(channel);
        if (message == null)
            await createMessage(ticket, channel);
    }
}

const view = [ PermissionsBitField.Flags.ViewChannel ];

const staticTextPermissions = [
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.SendMessages
];

const staticVoicePermissions = [
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.Stream
];

async function ticketCreationNotPossible(buttonId: string, ticket: CreatableTicket, interaction: ButtonInteraction) {
    if (ticket == null || ticket.initialization == null || ticket.creation == null) {
        await interaction.reply({
            ephemeral: true,
            content: "A ticket jelenleg nem hozható létre! Kérlek vedd fel a kapcsolatot egy staff taggal!"
        });
        console.warn("Ticket creation failed! Ticket config is invalid!");
        console.log(ticket == null ? "Ticket is null for interaction: " + buttonId : (ticket.initialization == null) + " | " + (ticket.creation == null));
        return true;
    }
    if (!interaction.inGuild() || !interaction.guild)
        return true;
    if (!ticket.tempDisable)
        return false;
    await interaction.reply({ ephemeral: true, content: "Ez a jegy jelenleg ki van kapcsolva!" });
    return true;
}

export async function openTicket(interaction: ButtonInteraction, buttonId: string) {
    const ticket = config.tickets.find(t => t.id === buttonId) as CreatableTicket;
    if (await ticketCreationNotPossible(buttonId, ticket, interaction))
        return;
    const init = ticket.initialization;
    for (const role of (interaction.member as GuildMember).roles.cache) {
        if (init.blacklistedRoles.includes(role[0])) {
            await interaction.reply({
                ephemeral: true,
                content: "Sajnos nem nyithatsz ticketet az egyik rangod miatt!"
            });
            return;
        }
    }
    const userId = interaction.member!.user.id;
    const last = lastOpened.get(userId);
    if ((last?.getTime() ?? 0) + 15000 > Date.now()) {
        await interaction.reply({
            ephemeral: true,
            content: "Lassan a testtel! Várj egy kicsit, mielőtt új ticketet nyitsz."
        });
        return;
    }
    await interaction.deferReply({ ephemeral: true });
    const text = await createChannels(ticket, interaction);
    const embed = toEmbed(ticket.creation.embed);
    await text.send({
        embeds: [ embed ],
        content: ticket.creation.pingRoles.map(function(id: string): string {
            return roleMention(id);
        }).join(" ")
    });
    const hiddenPings = ticket.creation.pingRolesHidden.map(function(id: string): string {
        return roleMention(id);
    });
    if (hiddenPings.length > 0) {
        const del = await text.send(hiddenPings.join(" "));
        del.delete();
    }
    text.send(`# ${userMention(interaction.member!.user.id)} légy szíves kifejteni a problémát!`);
    await interaction.editReply("Jegy sikeresen megnyitva! " + channelMention(text.id));
    lastOpened.set(userId, new Date());
}

function textPermissionMapper(i: string) {
    return {
        id: i,
        allow: [ ...staticTextPermissions, ...view ]
    };
}

function voicePermissionMapper(i: string) {
    return {
        id: i,
        allow: [ ...staticVoicePermissions, ...view ]
    };
}

async function createChannels(ticket: CreatableTicket, interaction: ButtonInteraction) {
    const textPerms: OverwriteResolvable[] = ticket.creation.rolesWithAccess.map(textPermissionMapper);
    const voicePerms: OverwriteResolvable[] = ticket.creation.rolesWithAccess.map(voicePermissionMapper);
    const uuid = uid();
    const guild = interaction.guild!.id;
    const member = interaction.member!.user.id;
    const text = await client.guilds.cache.first()!.channels.create({
        name: `${ticket.channelName}-${uuid}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: guild,
                deny: view
            }
        ]
    });
    const voice = await client.guilds.cache.first()!.channels.create({
        name: `${ticket.channelName}-${uuid}`,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [
            {
                id: guild,
                deny: view
            }
        ]
    });
    await text.setParent(config.ticketCategory);
    await voice.setParent(config.ticketCategory);
    await text.permissionOverwrites.set([
        {
            id: guild,
            deny: view,
            allow: staticTextPermissions
        },
        {
            id: member,
            allow: [ ...staticTextPermissions, ...view ]
        },
        ...voicePerms
    ]);
    await voice.permissionOverwrites.set([
        {
            id: guild,
            deny: view,
            allow: staticVoicePermissions
        },
        {
            id: member,
            allow: [ ...staticTextPermissions, ...view ]
        },
        ...textPerms
    ]);
    return text;
}

export const executedCommandInteractions = new Map<string, string>();

async function processTicketMessage(message: any, messageLog: TicketMessage[], users: Set<string>) {
    const interaction = message.interaction;
    if (interaction) {
        const command = executedCommandInteractions.get(interaction.id);
        if (!command)
            return;
        messageLog.push({
            author: interaction.user.username,
            content: `/${command}`,
            time: message.createdAt
        });
        users.add(interaction.user.id);
        return;
    }
    if (message.author.bot)
        return;
    let content = message.content?.toString();
    const mentions = content.matchAll(/<@(!*&*[0-9]+)>/g);
    for (const i of mentions) {
        const str = i[0];
        let id = i[1];
        if (id.startsWith("!") || id.startsWith("&"))
            id = id.substring(1);

        const member = await client.guilds.cache.first()!.members.fetch(id).then(e => e).catch(err => {
            logError("Ticket member left server", err);
            return null;
        });
        content = member != null ? content.replace(str, `***${escapeText(member.user.username)}***`) : content.replace(str, `**${id}**`);
    }
    messageLog.push({
        author: message.author.username,
        content,
        time: message.createdAt.toISOString()
    });
}

async function getTicketData(messages: Message[], source: Interaction) {
    const author = messages[0].mentions.users.first()!;
    const users = new Set<string>();
    users.add(author.id);
    for (const message of messages) {
        const a = message.author;
        if (message.inGuild() && a != null && !a.bot)
            users.add(a.id);
    }
    messages = messages.map(m => {
        if (m.stickers.size > 0)
            m.content += " " + m.stickers.map(e => e.url).join(" ");
        const list = [ ...(m.attachments?.values() || []) ];
        if (!list)
            return m;
        if (list.length === 0)
            return m;
        const msg = m;
        if (list.length > 0)
            msg.content += " " + list.map(e => e.url).join(" ");
        return msg;
    });
    const messageLog: TicketMessage[] = [];
    for (const message of messages)
        await processTicketMessage(message, messageLog, users);
    const closer = source.user;
    return { users, messages, author, messageLog, closer };
}

function findTicketVoiceChannel(ticketName: string) {
    return client.guilds.cache.first()!.channels.cache.find(i => i.name === ticketName && i.type === ChannelType.GuildVoice);
}

async function fetchTicketMessages(channel: TextChannel) {
    const messages: Message[] = [];
    let fetched = await channel.messages.fetch();
    while (fetched.size > 0) {
        const last = fetched.last();
        if (!last)
            break;
        messages.push(...fetched.values());
        fetched = await channel.messages.fetch({ before: last.id });
    }

    messages.reverse();
    messages.splice(0, 1);
    return messages;
}

async function logAndDelete(interaction: ButtonInteraction | ChatInputCommandInteraction, ticket: CreatableTicket, ticketName: string) {
    const {
        users,
        author,
        messageLog,
        closer
    } = await getTicketData(await fetchTicketMessages(<TextChannel>interaction.channel), interaction);
    let id: number;
    try {
        const result = await database.con.ticketLog.create({
            data: {
                log: JSON.stringify(messageLog)
            }
        });
        id = result.id;
    } catch (err) {
        logError("Database error while closing ticket", err);
        await interaction.editReply("Hopsz, nem sikerült! Értesítd valamelyik bot engineer-t a hibáról!");
        return;
    }

    const logUrl = await sendTicketLog(id, interaction, ticket.log, author, closer, users, messageLog);
    if (logUrl == null)
        return;

    const voice = findTicketVoiceChannel(ticketName);
    if (voice)
        await voice!.delete();
    else
        logRaw("Could not find voice channel for ticket " + ticketName + "\nLog: " + logUrl);
    await interaction.channel!.delete();
}

async function sendTicketLog(id: number, interaction: ButtonInteraction | ChatInputCommandInteraction, log: TicketLog, author: User, closer: User, users: Set<string>, messages: TicketMessage[]): Promise<string | null> {
    try {
        const embed = new EmbedBuilder()
        .setTitle(log.embedTitle)
        .setColor(log.embedColor)
        .setThumbnail(author?.displayAvatarURL() || "https://i.imgur.com/226jXEl.png")
        .addFields([
            { name: "Nyitotta:", value: !author ? "???" : user(author), inline: true },
            { name: "Lezárta:", value: !closer ? "???" : user(closer), inline: true },
            { name: "\u200B", value: "\u200B", inline: true },
            {
                name: "Résztvevők:",
                value: users.size === 0 ? "Senki" : Array.from(users).map(userMention).join("\n"),
                inline: true
            },
            { name: "Üzenetek száma:", value: messages.length.toString(), inline: true }
        ])
        .setFooter({ text: config.ISAC });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
            .setEmoji(getVanillaEmojiComponent("peek")!)
            .setCustomId(`${TicketInteraction.Read}-${id}`)
            .setLabel("Log olvasása")
            .setStyle(ButtonStyle.Primary)
        );

        const logChannel = interaction.guild!.channels.cache.get(log.channel);
        if (!logChannel || logChannel.type !== ChannelType.GuildText) {
            logRaw("Ticket Log channel was not specified!");
            return null;
        }
        return (await logChannel.send({ embeds: [ embed ], components: [ row ] })).url;
    } catch (err: any) {
        logError("Error while sending ticket log", err);
        await interaction.editReply("Hopsz, nem sikerült! Értesítd valamelyik bot engineer-t a hibáról!");
        return null;
    }
}

export async function closeTicket(interaction: ButtonInteraction | ChatInputCommandInteraction) {
    if (!interaction.inGuild() || !interaction.guild || !interaction.channel)
        return;
    const ticketName = interaction.channel.name;
    const stripped = stripUid(ticketName);
    const ticket = config.tickets.find(i => i.channelName === stripped);
    if (ticket == null) {
        await interaction.reply({ ephemeral: true, content: "Ez nem egy ticket!" });
        return;
    }
    await interaction.reply({ content: "Jegy lezárása folyamatban...", ephemeral: true });
    await logAndDelete(interaction, ticket, ticketName);
}

export async function readTicketLog(interaction: ButtonInteraction, buttonId: string) {
    if (!interaction.inGuild() || !interaction.guild || !interaction.channel)
        return;
    const id = parseInt(buttonId);

    let log = "";

    await interaction.deferReply({ ephemeral: true });

    try {
        const result = await database.con.ticketLog.findUnique({
            where: {
                id
            }
        });
        if (!result)
            return;
        log = result.log;
    } catch (err) {
        logError("Database error while trying to read ticket log", err);
        await interaction.editReply("Hopsz, nem sikerült! értesítsd valamely bot engineer-t a hibáról!");
        return;
    }
    try {
        const messages = JSON.parse(log);
        const replies: string[] = [];
        let currentMessage = 0;
        for (const message of messages) {
            if (!replies[currentMessage])
                replies[currentMessage] = "";
            replies[currentMessage] += `${timeFromDate(new Date(message.time), TimeFormat.ShortTime)} **${escapeText(message.author)}:** ${escapeText(message.content)} \n`;
            if (replies[currentMessage].length > 1850)
                currentMessage++;
        }

        const user = interaction.user;
        const title = interaction.message.embeds?.[0]?.title;
        if (!await trySendPM(user, interaction, "```yaml\n" + (title ?? "TICKET LOG") + "\n```" + (<Message>interaction.message).url))
            return;
        if (replies.length === 0 && !await trySendPM(user, interaction, "Senki nem küldött üzenetet a ticketben."))
            return;
        for (const reply of replies) {
            if (!await trySendPM(user, interaction, reply))
                return;
        }
        await interaction.editReply("Jegy log sikeresen elküldve!");
    } catch (e) {
        logError("Error while parsing & sending ticket log", e);
        await interaction.editReply("Hopsz, nem sikerült! értesítsd valamely bot engineer-t a hibáról!");
    }
}

async function trySendPM(user: User, interaction: ButtonInteraction, message: string) {
    try {
        await user.send(message);
    } catch (e) {
        console.log("Error while sending private message to " + user.username + "\n" + e);
        await unsuccessfulPM(interaction);
        return false;
    }
    return true;
}

function unsuccessfulPM(interaction: ButtonInteraction) {
    return interaction.editReply("Privát üzenetet küldése nem lehetséges!");
}

function createOpenTicketButton(ticket: CreatableTicket) {
    const emoji = getEmojiComponent(ticket.initialization.emoji);
    const button = new ButtonBuilder()
    .setCustomId(`${TicketInteraction.Open}-${ticket.id}`)
    .setLabel("Új Jegy Kérése")
    .setStyle(ButtonStyle.Success);
    if (emoji)
        button.setEmoji(emoji);
    return button;
}

async function createMessage(ticket: CreatableTicket, channel: TextChannel): Promise<Message> {
    const init = ticket.initialization;
    const embed = toEmbed(init.embed);
    const button = createOpenTicketButton(ticket);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    return await channel.send({ embeds: [ embed ], components: [ row ] });
}

function uid() {
    const uuid = v4();
    return uuid.substring(0, uuid.indexOf("-"));
}

export function stripUid(id: string) {
    return id.substring(0, id.lastIndexOf("-"));
}

export async function modifyTicketAccessOfMember(interaction: ChatInputCommandInteraction, member: GuildMember, allowAccess: boolean) {
    if (!interaction.inGuild() || !interaction.guild || !interaction.channel || !interaction.isCommand())
        return;
    const ticketName = interaction.channel.name;
    const stripped = stripUid(ticketName);
    const ticket = config.tickets.find(i => i.channelName === stripped);
    const channel = interaction.channel;
    const voice = findTicketVoiceChannel(ticketName);
    if (ticket == null) {
        await interaction.reply({ ephemeral: true, content: "Ez nem egy ticket!" });
        return;
    }
    await interaction.deferReply({ ephemeral: !allowAccess });
    try {
        await (<TextChannel>channel).permissionOverwrites.edit(member!.id, { ViewChannel: allowAccess });
        await (<VoiceChannel>voice).permissionOverwrites.edit(member!.id, { ViewChannel: allowAccess });
    } catch (e) {
        await interaction.editReply("Hopsz, nem sikerült! értesítsd valamely bot engineer-t a hibáról!");
        logError("Error while trying to modify ticket access", e);
        return;
    }
    await interaction.editReply("Hozzáférés sikeresen módosítva!");
    if (allowAccess)
        channel.send(userMention(member.user.id));
}