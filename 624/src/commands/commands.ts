import {
    ActionRowBuilder,
    ActivityType,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    Interaction,
    RepliableInteraction,
    SelectMenuInteraction,
    StageChannel,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    VoiceBasedChannel,
    VoiceChannel
} from "discord.js";
import { addToQueue, client, inst, queue } from "..";
import newError, { lockdown } from "../functions";
import config from "../configuration";
import configuration from "../configuration";
import { v4 as uuidv4 } from "uuid";
import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection,
    joinVoiceChannel,
    PlayerSubscription
} from "@discordjs/voice";
import ytdl from "ytdl-core";
import { replySafe, replyWithReactions } from "./reactionAwaiter";

const yts = require("yt-search");
let lock = false;
let playing = false;
const player = createAudioPlayer();
let looped = false;

let subscription: PlayerSubscription | undefined;

async function processCommandWhenLocked(interaction: ChatInputCommandInteraction, member: GuildMember) {
    if (interaction.commandName !== "lockdown") {
        await interaction.reply({ content: "A bot jelenleg le van zárva. Kérlek várj, amíg egy moderátor feloldja." });
        return;
    }
    if (!member?.roles.cache.some(r => config.moderatorRankIds.includes(r.id))) {
        await interaction.reply({ content: "Nincs jogod használni ezt a parancsot." });
        return;
    }
    lock = false;
    await interaction.reply({ content: "A lezárás sikeresen fel lett oldva!" });
    client.user?.setPresence({
        status: "online",
        afk: true
    });
    client.user?.setActivity("BÉTA", {
        type: ActivityType.Streaming,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    });
}

export async function handleInteraction(interaction: Interaction) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        await handleButtonOrSelectInteraction(interaction);
        return;
    }
    if (!interaction.isCommand() || !interaction.isChatInputCommand())
        return;
    const member = client.guilds.cache.first()!.members.cache.get(interaction.user.id)!;
    const voiceChannel = member.voice.channel;
    const channel = inst().commandChannel;
    if (channel !== interaction.channelId) {
        interaction.reply({
            content: `Ebben a szobában nem tudod használni a parancsokat! <#${channel}>`,
            ephemeral: true
        });
        return;
    }
    if (lock) {
        await processCommandWhenLocked(interaction, member);
        return;
    }

    if (await processSimpleCommand(interaction, member))
        return;
    if (!voiceChannel?.id) {
        interaction.reply({ content: "Nem vagy bent egy hangcsatornában.", ephemeral: true });
        return;
    }
    if (config.voiceChannels.includes(voiceChannel.id))
        await processCommand(interaction, voiceChannel);
    else
        interaction.reply({
            content: "Ebben a hangcsatornában nem tudok zenét lejátszani!",
            ephemeral: true
        });
}

async function processSimpleCommand(interaction: ChatInputCommandInteraction, member: GuildMember) {
    switch (interaction.commandName) {
        case "lockdown":
            if (!member?.roles.cache.some(r => config.moderatorRankIds.includes(r.id))) {
                await interaction.reply({ content: "Nincs jogod használni ezt a parancsot." });
                return true;
            }
            client.user?.setPresence({
                status: "idle",
                afk: true,
                activities: [ { name: "Lockdown", type: ActivityType.Competing } ]
            });
            await lockdown(interaction);

            if (lock) {
                lock = false;
            } else if (!lock) {
                lock = true;
            }
            return true;
        case "getqueue":
            getQueue(interaction);
            return true;
        case "nowplaying":
            nowPlaying(interaction);
            return true;
    }
}

export async function getQueue(interaction: ChatInputCommandInteraction) {
    const queueEmbed = createEmbed("Zenei lista", "Itt láthatod a zenei listát");
    if (queue.length === 0) {
        queueEmbed.setDescription("A zenei lista üres.");
        await interaction.reply({ embeds: [ queueEmbed ] });
        return;
    }
    const queueString = queue.map((song, index) => `${index + 1}. ${song}`).join("\n");
    queueEmbed.setDescription(queueString);
    await interaction.reply({ embeds: [ queueEmbed ] });
}

export async function nowPlaying(interaction: ChatInputCommandInteraction) {
    const queueEmbed = createEmbed("Jelenlegi zene", "Itt láthatod a jelenlegi zenét");
    if (queue.length === 0) {
        queueEmbed.setDescription("Nem játszik semmi.");
        await interaction.reply({ embeds: [ queueEmbed ] });
        return;
    }
    queueEmbed.setDescription(queue[ 0 ]);
    await interaction.reply({ embeds: [ queueEmbed ] });
}

async function processCommand(interaction: ChatInputCommandInteraction, voiceChannel: VoiceBasedChannel) {
    switch (interaction.commandName) {
        case "play":
            await executePlay(interaction);
            break;
        case "skip":
            await executeSkip(voiceChannel, interaction);
            break;
        case "loop":
            await loop(interaction);
            break;
        case "clearqueue":
            await executeClearQueue(voiceChannel, interaction);
            break;
        case "shuffle":
            break;
        case "pause":
            await pause(interaction)
            break;
        case "resume":
            await resume(interaction)
            break;
        case "stop":
            await executeStop(voiceChannel, interaction);
            break;
        case "fstop": {
            const member = client.guilds.cache.first()?.members.cache.get(interaction.member!.user.id);
            if (!member?.roles.cache.some(r => config.moderatorRankIds.includes(r.id))) {
                await interaction.reply({ content: "Nincs jogod használni ezt a parancsot." });
                break;
            }
            await stop(interaction)
            break;
        }
        case "fskip":
            const member = client.guilds.cache.first()!.members.cache.get(interaction.member!.user.id);
            if (!member?.roles.cache.some(r => config.moderatorRankIds.includes(r.id))) {
                await interaction.reply({ content: "Nincs jogod használni ezt a parancsot." });
                break;
            }
            await skip(interaction)
            break;

    }
}

function videoInfoMapper(video: any, index: number) {
    return `#${index + 1}: **${escape(video.title)}** Hossz: ${video.timestamp}`;
}

const searchDict: { [key: string]: any[] } = {};

function createOptions(videoList: any) {
    return videoList.map((v: any, i: number) => new StringSelectMenuOptionBuilder()
        .setLabel(`#${i + 1}: ${v.title}`.substring(0, 100))
        .setValue(i.toString())
    );
}

const linkRegex = /(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/;

function createEmbed(title: string, description: string) {
    return new EmbedBuilder()
    .setTitle(title)
    .setThumbnail(client.user!.avatarURL())
    .setDescription(description)
    .setFooter({ text: "Zenebot" })
    .setColor("#ff0000");
}

async function executePlay(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
        const query = interaction.options.getString("zene")!.trim();
        const match = query.match(linkRegex);
        const searchResult = await yts.search(!match ? { query } : { videoId: match[1] });
        if (searchResult == null || match ? !searchResult : (searchResult.videos?.length ?? 0) === 0) {
            await interaction.editReply({ embeds: [ createEmbed("Hiba", "A keresés eredménytelen.") ] });
            return;
        }
        if (match)
            await handleSingleResult(interaction, searchResult);
        else
            await handleMultipleResults(interaction, searchResult.videos);
    } catch (error: any) {
        newError(error);
        await interaction.editReply("Valami nem sikerült, értesítsd a Bot Engineer-t!");
    }
}

player.on(AudioPlayerStatus.Playing, () => {
    playing = true;
    console.log("PLAYING");
});
player.on(AudioPlayerStatus.Idle, () => {
    if (looped) {
        console.log("Van még zene és ismételve van");
        console.log(queue);
        play();
        return;
    }
    queue.shift();
    if (queue[0]) {
        console.log("Van még zene");
        console.log(queue);
        playing = false;
        subscription?.unsubscribe();
        play();
        return;
    }
    console.log("Nincs zene");
    console.log(queue);
    const connection = getVoiceConnection(client.guilds.cache.first()!.id);
    playing = false;
    subscription?.unsubscribe();
    connection?.destroy();
    client.user?.setPresence({
        status: "online",
        afk: true
    });
    client.user?.setActivity("BÉTA", {
        type: ActivityType.Streaming,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    });
});
player.on(AudioPlayerStatus.Paused, () => {
    console.log("PAUSED");
});

async function pause(interaction: RepliableInteraction) {
    await replySafe(interaction, "A zene megállítva");
    player.pause(true)
}

async function resume(interaction: RepliableInteraction) {
    await replySafe(interaction, "A zene elindítva");
    player.unpause()
}

async function play() {
    if (!queue)
        return null;
    const video = await ytdl.getInfo(queue[0]);
    client.user?.setActivity(video.videoDetails.title, {
        type: ActivityType.Streaming,
        url: video.videoDetails.video_url
    });
    const channel = await client.guilds.cache.first()?.channels.cache.get(`${configuration.voiceChannels}`);
    if (!channel)
        return;
    const connection = await joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
    });
    const resource = await createAudioResource(ytdl(queue[0], {
        filter: "audioonly",
        highWaterMark: 1 << 62,
        liveBuffer: 1 << 62,
        dlChunkSize: 0,
        quality: "lowestaudio",
    }));
    subscription = await connection.subscribe(player);
    await player.play(resource);
    playing = true;
}

async function handleSingleResult(interaction: ChatInputCommandInteraction, searchResult: any) {
        await interaction.editReply({ embeds: [ createEmbed("Queued", `Hozzáadás a sorhoz folyamatban: **${escape(searchResult.title)}**`).setURL(searchResult.url) ] });
        if (!playing) {
            await addToQueue(searchResult.url);
            await play();
        }
        if (playing) {
            addToQueue(searchResult.url);
        }
}

async function handleMultipleResults(interaction: ChatInputCommandInteraction, searchResult: any[]) {
    if (searchResult.length === 1)
        return handleSingleResult(interaction, searchResult[0]);
    const videoList = searchResult.slice(0, 10);
    const embed = createEmbed("Search", "**Videók**\n" + videoList.map(videoInfoMapper).join("\n"));
    const uuid = uuidv4();
    const cancel = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(new ButtonBuilder()
    .setLabel("Mégse")
    .setStyle(ButtonStyle.Danger)
    .setCustomId("cancelSearch:" + uuid));
    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(new StringSelectMenuBuilder()
    .setCustomId("selectSearch:" + uuid)
    .setPlaceholder("Válasz zenét")
    .setMinValues(1)
    .setMaxValues(videoList.length)
    .addOptions(...createOptions(videoList)));
    searchDict[uuid] = videoList;
    await interaction.editReply({ embeds: [ embed ], components: [ cancel, selectRow ] });
}

async function cancel(interaction: ButtonInteraction, id: string) {
    delete searchDict[id];
    await interaction.update({
        embeds: [
            new EmbedBuilder()
            .setColor("Red")
            .setTitle("Search")
            .setDescription("Keresés elvetve")
            .setFooter({ text: "Zenebot" })
        ],
        components: []
    });
}

async function select(interaction: SelectMenuInteraction, id: string) {
    const list = searchDict[id];
    if (!list) {
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                .setColor("Red")
                .setTitle("Search")
                .setDescription("Ez a keresés már érvénytelen")
                .setFooter({ text: "Zenebot" })
            ],
            components: []
        });
        return;
    }
    const addingEmbed = createEmbed("Queued", `${interaction.values.length} zene hozzáadása a sorhoz folyamatban...`);
    const contentArray: string[] = [];
    const single = interaction.values.length === 1;
    let singleUrl: string = "";
    if (single) {
        const video = list[parseInt(interaction.values[0])];
        addingEmbed.setURL(video.url);
        contentArray.push(video.title);
        singleUrl = video.url;
    }

    await interaction.update({
        embeds: [ addingEmbed ],
        components: []
    });
    if (single)
        addToQueue(singleUrl);
    else
        for (const value of interaction.values) {
            const video = list[parseInt(value)];
            contentArray.push(`**${escape(video.title)}** (${video.url})`);
            addToQueue(video.url);
        }
    const queuedEmbed = createEmbed("Queued", `${interaction.values.length} zene hozzáadva a sorhoz:\n` + contentArray.join("\n"));
    if (single)
        queuedEmbed.setURL(singleUrl);
    await interaction.editReply({ embeds: [ queuedEmbed ] });
    if (!playing)
        play();
}

const escapeRegex = /([-/\\^$*+?.()|{}])/g;

function escape(text: string) {
    return text.replaceAll(escapeRegex, "\\$1");
}

async function handleButtonOrSelectInteraction(interaction: ButtonInteraction | SelectMenuInteraction) {
    const split = interaction.customId.split(":");
    switch (split[0]) {
        case "cancelSearch":
            await cancel(<ButtonInteraction>interaction, split[1]);
            break;
        case "selectSearch":
            await select(<SelectMenuInteraction>interaction, split[1]);
            break;
    }
}

async function skip(interaction: RepliableInteraction) {
    if (queue.length === 0 || queue.length === 1) {
        await stop(interaction)
        await interaction.editReply("A sornak vége lett");
        playing = false
        return;
    }
    player.stop(true);
    await subscription?.unsubscribe();
    await play();
    await replySafe(interaction, "Következő zene indul.");
}

async function executeSkip(voiceChannel: StageChannel | VoiceChannel, interaction: ChatInputCommandInteraction) {
    try {
        await replyWithReactions(interaction, voiceChannel, skip);
    } catch (error: any) {
        newError(error);
        await notifyError(interaction);
    }
}

async function clearQueue(interaction: RepliableInteraction) {
    queue.length = 0;
    await replySafe(interaction, "Sor törölve");
}

async function executeClearQueue(voiceChannel: StageChannel | VoiceChannel, interaction: ChatInputCommandInteraction) {
    try {
        await replyWithReactions(interaction, voiceChannel, clearQueue);
    } catch (error: any) {
        newError(error);
        await notifyError(interaction);
    }
}

async function stop(interaction: RepliableInteraction) {
    queue.length = 0;
    client.user?.setPresence({
        status: "online",
        afk: true
    });
    client.user?.setActivity("BÉTA", {
        type: ActivityType.Streaming,
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    });
    player.stop();
    subscription?.unsubscribe();
    playing = false;
    const connection = getVoiceConnection(client.guilds.cache.first()!.id);
    connection?.destroy();
    await replySafe(interaction, "Zene leállítva");
}

async function executeStop(voiceChannel: StageChannel | VoiceChannel, interaction: ChatInputCommandInteraction) {
    try {
        await replyWithReactions(interaction, voiceChannel, stop);
    } catch (error: any) {
        newError(error);
        await notifyError(interaction);
    }
}

async function loop(interaction: ChatInputCommandInteraction) {
    looped = !looped;
    await replySafe(interaction, looped ? "Ismétlés bekapcsolva" : "Ismétlés kikapcsolva");
}

function notifyError(interaction: ChatInputCommandInteraction) {
    return interaction.reply({
        content: "Valami nem sikerült, értesítsd a Bot Engineer-t!",
        ephemeral: true
    });
}
