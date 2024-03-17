import { ActivityType, Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import chalk from "chalk"

import { handleInteraction } from "./commands/commands";
import config, { InstanceSettings } from "./configuration";

const queue: string[] = [];
export { queue }
require("dotenv").config();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
export { client };

const commands = [
    new SlashCommandBuilder()
    .setName("play")
    .setDescription("Ezzel a paranccsal tudsz elindítani zenét a zenelejátszó csatornában!")
    .addStringOption(option =>
        option.setName("zene")
        .setDescription("Ide írd a zene nevét vagy a YouTube linket.")
        .setRequired(true)),
    new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Ezzel a paranccsal tudod átugrani a zenét!"),
    new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Ezzel a paranccsal tudod bekapcsolni az ismétlést"),
    new SlashCommandBuilder()
    .setName("clearqueue")
    .setDescription("Ezzel a paranccsal tudod kiüríteni a sort."),
    new SlashCommandBuilder()
    .setName("getqueue")
    .setDescription("Ezzel a paranccsal tudod lekérni hogy milyen zenék vannak a sorban."),
    new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Ezzel a paranccsal tudod lekérni hogy milyen zenét játszik a bot."),
    new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Ezzel a paranccsal tudod leállítani a zenét!"),
    new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Ezzel a paranccsal tudod elindítani a zenét!"),
    new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Ezzel a paranccsal tudod lecsatlakoztatni SCP-624-et a hangcsatorából!"),
    new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription("Ezzel a parancsal lehet lezárni a botot"),
    new SlashCommandBuilder()
    .setName("fskip")
    .setDescription("Ezzel a paranccsal tudod erőltetetten átugrani a zenét! CSAK MODERÁTOROK"),
    new SlashCommandBuilder()
    .setName("fstop")
    .setDescription("Ezzel a paranccsal tudod lecsatlakoztatni SCP-624-et a hangcsatorából erőltetetten! CSAK MODERÁTOROK")
]
.map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(`${process.env.TOKEN}`);
client.once("ready", onReady);

function setActivity(version: string, url: string) {
    client.user?.setActivity(version, {
        type: ActivityType.Streaming,
        url
    });
}

export function addToQueue(url: string) {
    queue.push(url);
}

async function onReady() {
    if (client.guilds.cache.size > 1) {
        console.log(chalk.red(
            "A bot jelenleg több discord szerveren is jelen van. Erre nincs felkészítve, így csak az egyiken fog megfelelően működni.\nMegfelelő működés helye: " +
            client.guilds.cache.first()!.name
        ));
    }
    console.log(chalk.bgYellow.black("Parancsok betöltése..."));
    await rest.put(Routes.applicationGuildCommands(`${client.application!.id}`, `${client.guilds.cache.first()!.id}`), { body: commands }).then(() => console.log(chalk.greenBright("A parancsok be lettek töltve! Ha mégse akkor kiírtam a hibát")));
    client.user?.setPresence({
        status: "online",
        afk: true
    });
    setActivity("BÉTA", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    console.log("Initializing player...");
    console.log(chalk.green(`SCP-624 sikeresen elindult!`));
}

let currentInstance: InstanceSettings;

export function inst() {
    return currentInstance!;
}

let token: string | undefined;

function parseArgs() {
    if (process.argv.length < 3)
        return false;
    const id = parseInt(process.argv[2]);
    if (isNaN(id) || id < 0 || config.voiceChannels.length < id || config.commandChannels.length < id)
        return false;
    token = process.env[`TOKEN_${id}`];
    if (!token || token.length < 1) {
        console.error(`Missing token for instance ${id}!`);
        return false;
    }

    rest.setToken(token);
    currentInstance = {
        commandChannel: config.commandChannels[id],
        voiceChannel: config.voiceChannels[id]
    };
    return true;
}

console.log("Starting instance...");
if (parseArgs()) {
    console.log(`Command channel set to ${currentInstance!.commandChannel}`);
    console.log(`Voice channel set to ${currentInstance!.voiceChannel}`);
    console.log("Logging in...");
    client.login(token).then(() => console.log("Authenticated!"));
} else {
    console.log(chalk.red("Missing arguments! Please provide an instance ID."));
    process.exit(1);
}

client.on(Events.InteractionCreate, handleInteraction);