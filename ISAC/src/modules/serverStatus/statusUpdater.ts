import { EmbedBuilder, inlineCode, Message } from "discord.js";
import logError, { logRaw } from "../../helpers/errorLogger";
import { PlayerChartData, Server, ServerInfo, ServerStatusConfig, ServerStatusEmbed } from "./status.types";
import config from "../../configuration";
import { request } from "undici";
import { firstMessage, isText, textChannel } from "../../helpers/common";
import { getEmoji, getVanillaEmoji } from "../../helpers/emojiResolver";
import fs, { readFileSync } from "fs";
import { getWantedListByNickname } from "../sanctionSystem/sanctionManager";
import { escapeText } from "../joinMessageSender";
import QuickChart from "quickchart-js";

let nextUpdate = 0;

const staffSteamIds: string[] = [];

const regexUserID = /(\d{17})@steam:\s?(\S+)/ig;

const separator = " :diamond_shape_with_a_dot_inside: ";

function refreshStaffSteamIdList() {
    setTimeout(refreshStaffSteamIdList, 10 * 60 * 1000);
    try {
        const data = readFileSync(`${process.env.APPDATA}/SCP Secret Laboratory/config/7777/config_remoteadmin.txt`, "utf-8");
        const matches = data.match(regexUserID);
        if (!matches)
            return;
        staffSteamIds.length = 0;
        const staffRanks = config.serverStatus.staffRanks;
        for (const match of matches) {
            regexUserID.lastIndex = 0;
            const groups = regexUserID.exec(match);
            if (!groups)
                continue;
            const steamId = groups[1];
            const rank = groups[2];
            if (staffRanks.includes(rank.toLowerCase()))
                staffSteamIds.push(`${steamId}@steam`);
        }
    } catch (e) {
        logError("Failed reading staff steam IDs", e);
    }
}

export default async function initStatusUpdater() {
    try {
        refreshStaffSteamIdList();
        await fixedUpdate();
    } catch (e) {
        logError("Failed to initialize server status updater", e);
    }
}

async function fixedUpdate() {
    nextUpdate = Date.now() + config.serverStatus.updateMinutes * 60000;
    await update();
    setTimeout(fixedUpdate, nextUpdate - Date.now());
}

const hexRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

function readSavedStats(server: ServerInfo): PlayerChartData[] {
    try {
        const path = `./chartData-${server.id}.json`;
        const content = fs.existsSync(path) ? fs.readFileSync(path, "utf-8") : "[]";
        const json = JSON.parse(content);
        return Array.isArray(json) ? json : [];
    } catch (e) {
        logError(`Failed to read player statistics for server ${server.name}`, e);
        return [];
    }
}

function generateChart(server: ServerInfo, response: any) {
    if (!response["Online"])
        return null;
    const stats = readSavedStats(server).filter(e => {
        const date = new Date(e.time);
        return date.getTime() > Date.now() - 1000 * 60 * 60 * 24;
    });
    const currentPlayerCount = parseInt(response["Players"].split("/")[0]);
    const now = new Date();
    if (!isNaN(currentPlayerCount) && (stats.length === 0 || new Date(stats[stats.length - 1].time).getUTCHours() !== now.getUTCHours()))
        stats.push({ count: currentPlayerCount, time: now.toISOString() });
    stats.length = Math.min(stats.length, 24);
    try {
        fs.writeFileSync(`./chartData-${server.id}.json`, JSON.stringify(stats));
    } catch (e) {
        logError(`Failed to write player statistics for server ${server.name}`, e);
    }
    const times = stats.map(e => `${new Date(e.time).getHours()}:00`);
    const players = stats.map(e => e.count);
    const maxPlayers = parseInt(response["Players"].split("/")[1]);
    const chart = new QuickChart();
    const colorMatch = server.color.toString().match(hexRegex);
    const background = colorMatch
        ? `rgba(${parseInt(colorMatch[1], 16) - 30}, ${parseInt(colorMatch[2], 16) - 30}, ${parseInt(colorMatch[3], 16) - 30}, 0.2)`
        : "rgba(0, 0, 0, 0.2)";
    return chart.setConfig({
        type: "line",
        data: {
            labels: times,
            datasets: [
                {
                    backgroundColor: background,
                    borderColor: server.color,
                    data: players,
                    label: "Játékosok",
                    fill: "start"
                }
            ]
        },
        options: {
            title: {
                text: server.name,
                display: true
            },
            scales: {
                xAxes: [
                    {
                        gridLines: {
                            color: "rgba(200, 200, 200, 0.3)"
                        }
                    }
                ],
                yAxes: [
                    {
                        ticks: {
                            min: 0,
                            max: maxPlayers,
                            stepSize: 5
                        },
                        gridLines: {
                            color: "rgba(200, 200, 200, 0.3)"
                        }
                    }
                ]
            }
        }
    }).setBackgroundColor("#020");
}

function createServerStatusEmbed(response: any, status: ServerStatusConfig, port: any, server: ServerInfo): ServerStatusEmbed {
    const isOnline = response["Online"];
    const ff = isOnline ? (response["FF"] ? "Bekapcsolva" : "Kikapcsolva") : "Ismeretlen";
    const version = isOnline ? response["Version"] : "Ismeretlen";
    const ip = `${status.IP}:${port}`;
    const modded = server.typeOverride ?? (isOnline ? (response["Modded"] ? "Pluginos" : "Vanilla") : "Ismeretlen");
    const chart = generateChart(server, response);
    const embed = new EmbedBuilder()
    .setTitle(server.name)
    .setColor(server.color)
    .setThumbnail(server.image)
    .setImage(chart?.getUrl() ?? null)
    .setTimestamp()
    .addFields(
        {
            name: `Állapot :${isOnline ? "white_check_mark" : "x"}:`,
            value: isOnline ? `${response["Players"]} játékos` : "Offline",
            inline: true
        },
        { name: "Verzió :regional_indicator_v:", value: version, inline: true }
    );
    if (response["WL"])
        embed.addFields({ name: "Whitelist :lock:", value: "Aktív", inline: true });
    else
        embed.addFields({ name: "\u200B", value: "\u200B", inline: true });
    embed.addFields(
        { name: `Típus ${getVanillaEmoji("information")}`, value: modded, inline: true },
        { name: `Friendly Fire ${getEmoji(status.friendlyFireEmoji)}`, value: ff, inline: true },
        { name: `IP ${getVanillaEmoji("telescope")}`, value: ip, inline: true }
    )
    .setFooter({ text: config.ISAC });
    return {
        embed,
        name: server.name
    };
}

async function update() {
    const status = config.serverStatus;
    const global = textChannel(status.channel);

    if (!global || !isText(global)) {
        logRaw("ServerStatus channel doesn't exist");
        return;
    }
    const url = `https://api.scpslgame.com/serverinfo.php?` + new URLSearchParams({
        id: status.id,
        key: process.env.NW_API_KEY?.toString() ?? "",
        players: "1",
        version: "1",
        flags: "1",
        online: "1",
        list: "1",
        nicknames: "1"
    }).toString();
    try {
        const json = await (await request(url, { method: "GET" })).body.json();
        const servers = json["Servers"];
        if (servers != null) {
            await processCentralResponse(status, servers);
            return;
        }

        console.log("Server status fetch failed!");
        console.error(json);
        console.log(config.endOfStackTrace);
    } catch (e) {
        logError("Failed to fetch server status", e);
    }
}

async function validateMessageExists(channelId: string): Promise<Message> {
    const channel = textChannel(channelId);
    const first = await firstMessage(channel);
    return first != null ? first : await channel.send({
        embeds: [
            new EmbedBuilder()
            .setTitle("Server Status")
            .setDescription("Server Status")
        ]
    });
}

async function processCentralResponse(status: ServerStatusConfig, servers: any[]) {
    const globalEmbeds = createGlobalEmbeds(servers, status);
    const globalMessage = await validateMessageExists(config.serverStatus.channel);
    try {
        await globalMessage.edit({ embeds: globalEmbeds });
    } catch (e) {
        logError("Failed to edit server status message:", e);
    }
    const staffEmbeds = createStaffEmbeds(servers, status);
    const staffMessage = await validateMessageExists(config.serverStatus.staffPlayerList);
    try {
        await staffMessage.edit({
            embeds: staffEmbeds || null,
            content: staffEmbeds.length > 0 ? null : "Nincs senki a szervereken"
        });
    } catch (e) {
        logError("Failed to edit staff server status message:", e);
    }
}

function createGlobalEmbeds(servers: any[], status: ServerStatusConfig): EmbedBuilder[] {
    const embeds: ServerStatusEmbed[] = [];
    for (const response of servers) {
        const server = status.servers.find(i => i.id === response["ID"]);
        const port = response["Port"];
        if (server)
            embeds.push(createServerStatusEmbed(response, status, port, server));
    }
    return sortAndBuildEmbeds(embeds);
}

function sortAndBuildEmbeds(embeds: ServerStatusEmbed[]) {
    return embeds.sort((a, b) => a.name.localeCompare(b.name)).map(i => i.embed);
}

function createStaffEmbeds(servers: any[], status: ServerStatusConfig): EmbedBuilder[] {
    const embeds: ServerStatusEmbed[] = [];
    for (const response of servers) {
        const server = status.servers.find(i => i.id === response["ID"]);
        if (!server)
            continue;
        const embed = createStaffPlayerListEmbed(response, server);
        if (embed)
            embeds.push(embed);
    }
    return sortAndBuildEmbeds(embeds);
}

function safeCode(e: any) {
    return inlineCode(e.replaceAll("`", "\\`"));
}

function createStaffPlayerListEmbed(response: any, server: ServerInfo): ServerStatusEmbed | null {
    const isOnline = response["Online"];
    if (!isOnline)
        return null;
    const players = <any[]>response["PlayersList"];
    if (!players || players.length === 0)
        return null;
    const onlineStaff = players.filter(e => staffSteamIds.includes(e["ID"]));
    const nicknames = players.map(e => e["Nickname"]);
    const embed = new EmbedBuilder()
    .setTitle(`${server.name}: ${response["Players"]}`)
    .setColor(server.color)
    .setThumbnail(server.image)
    .setDescription(nicknames.map(safeCode).join(separator))
    .setTimestamp()
    .addFields({
        name: "Online Staffok",
        value: onlineStaff.length.toString() + " " + onlineStaff.filter(e => e["Nickname"]).map(e => safeCode(e["Nickname"])).join(separator),
        inline: true
    })
    .setFooter({ text: config.ISAC });
    const wanted = nicknames
    .filter(e => getWantedListByNickname(e)
    .filter(p => p.servers.includes(<Server>server.name)).length > 0)
    .map(e => `:exclamation: ${escapeText(e)}`);
    if (wanted.length > 0)
        embed.addFields({ name: "Körözöttek", value: wanted.join("\n"), inline: false });
    return {
        embed,
        name: server.name
    };
}