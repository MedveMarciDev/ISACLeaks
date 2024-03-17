import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    Message
} from "discord.js";
import client from "./client";
import { checkPermissions } from "./permissions";
import db from "./database";
import logError, { logRaw } from "../helpers/errorLogger";
import CommandList from "../commands/commandList";
import config from "../configuration";
import { textChannel, time, user } from "../helpers/common";
import TimeFormat from "../helpers/timeFormat";
import { getVanillaEmojiComponent } from "../helpers/emojiResolver";

type MuteEntry = {
    user: string
    expires: string
    messageContent: string
    mutedBy: string
    embed: string
};

const mutes: MuteEntry[] = [];

export async function addMute(member: GuildMember, duration: number, mutedBy: GuildMember, reason: string) {
    if (mutes.some(m => m.user === member.id))
        throw new Error("Felhasználó magát próbálta némítani!");
    const options = config.muteOptions;
    await member.roles.add(options.role);
    const logChannel = textChannel(options.logChannel);
    const date = Date.now() + duration * 1000;
    const expirySnowflake = time(date, TimeFormat.Relative);
    const embed = new EmbedBuilder()
    .setTitle("Mute")
    .setThumbnail(member.user.displayAvatarURL() || "https://i.imgur.com/226jXEl.png")
    .addFields(
        { name: "Moderátor:", value: user(mutedBy.user), inline: true },
        {
            name: "Felhasználó:",
            value: user(member.user),
            inline: true
        },
        {
            name: "Felhasználó backup:",
            value: `${member.user.username} (${member.user.id})`,
            inline: false
        },
        {
            name: "Lejár:",
            value: expirySnowflake,
            inline: true
        },
        { name: "Indok:", value: reason, inline: true }
    )
    .setFooter({ text: config.ISAC })
    .setColor("#ff0000");
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
        .setCustomId("unmute")
        .setLabel("Unmute")
        .setStyle(ButtonStyle.Danger)
        .setEmoji(getVanillaEmojiComponent("multiplication_sign")!)
    );
    const message = await logChannel.send({ embeds: [ embed ], components: [ row ] });
    const mute: MuteEntry = {
        user: member.user.id,
        expires: new Date(date).toISOString(),
        messageContent: message.id,
        mutedBy: mutedBy.user.id,
        embed: JSON.stringify(embed.toJSON())
    };
    mutes.push(mute);
    await uploadMute(mute);
    const dmEmbed = new EmbedBuilder()
    .setTitle("Némítás")
    .setDescription("Le lettél némítva a Discord szerverünkön!")
    .setColor("Red")
    .addFields({ name: "Lejár:", value: expirySnowflake, inline: false }, {
        name: "Szerver:",
        value: "SCP: Secret Laboratory Magyar Közösség",
        inline: false
    }, {
        name: "Indok:", value: reason, inline: false
    })
    .setFooter({ text: config.ISAC });
    try {
        const dm = await member.user.createDM();
        await dm.send({ embeds: [ dmEmbed ] });
    } catch (e) {
        logError(`${member.user.username}#${member.user.discriminator} couldn't be notified in DMs`, e);
    }
    return true;
}

export async function removeMute(user: string, manual?: boolean, unmutedBy?: GuildMember) {
    const mute = mutes.find(m => m.user === user);
    if (!mute)
        return false;
    const logChannel = textChannel(config.muteOptions.logChannel);

    let muted: GuildMember;
    let message: Message;
    try {
        muted = await client.guilds.cache.first()!.members.fetch(mute.user);
        message = await logChannel.messages.fetch(mute.messageContent);
    } catch (err) {
        logError("Couldn't fetch muted member or log message!", err);
        return;
    }

    const embed = new EmbedBuilder(JSON.parse(mute.embed));
    embed.setColor("#87d37c")
    .addFields({
        name: "Feloldva:",
        value: manual ? `<@${unmutedBy!.user.id}> által` : "Automatikusan",
        inline: false
    })
    .setTitle("Mute - Feloldva");

    db.con.mutes.delete({
        where: {
            user
        }
    }).catch((err: any) => {
        logError("Adatbázis törlés sikertelen (Mute)", err);
    });
    if (!message) {
        logRaw("Couldn't find log message");
        return false;
    }
    await message!.edit({ embeds: [ embed ], components: [] });

    if (!muted) {
        logRaw("Couldn't Unmute person");
        return false;
    }
    await muted!.roles.remove(config.muteOptions.role);
    mutes.splice(mutes.indexOf(mute), 1);
    return true;
}

export async function initMuteManager() {
    db.con.mutes.findMany().then(async (res: any) => {
        await db.con.mutes.deleteMany({});
        for (const row of res) {
            const expires = row.expires;
            if (new Date(expires).getTime() <= Date.now())
                continue;
            mutes.push({
                user: row.user,
                expires,
                messageContent: row.messageContent,
                mutedBy: row.mutedBy,
                embed: JSON.parse(row.embed)
            });
        }
        validateAll();
        const data = mutes.map(val => {
            return {
                user: val.user,
                expires: val.expires.toString(),
                messageContent: val.messageContent,
                mutedBy: val.mutedBy,
                embed: JSON.stringify(val.embed)
            };
        });
        db.con.mutes.createMany({
            data
        }).catch((err: any) => {
            logError("Adatbázis visszatöltés sikertelen (Mute)", err);
        });
    }).catch(() => console.error("Error loading database!"));
}

function validateFirst() {
    const muteOptions = config.muteOptions;
    for (const i of mutes) {
        const expires = new Date(i.expires).getTime();
        if (expires <= Date.now())
            continue;
        const member = client.guilds.cache.first()!.members.cache.get(i.user);
        if (member)
            member.roles.add(muteOptions.role);
    }
}

function validateAll() {
    validateFirst();
    setInterval(lateValidate, 10000);
}

async function lateValidate() {
    for (const i of mutes) {
        const expires = new Date(i.expires).getTime();
        if (expires <= Date.now()) {
            await removeMute(i.user);
            continue;
        }
        const member = client.guilds.cache.first()!.members.cache.get(i.user);
        if (member && member.roles.cache.has(config.muteOptions.role))
            await member.roles.add(config.muteOptions.role);
    }
}

export async function uploadMute(mute: MuteEntry) {
    await db.con.mutes.create({
        data: {
            user: mute.user,
            mutedBy: mute.mutedBy,
            expires: mute.expires.toString(),
            messageContent: mute.messageContent,
            embed: JSON.stringify(mute.embed)
        }
    }).catch((err: any) => {
        logError("Adatbázis feltöltés sikertelen (Mute)", err);
    });
}

export async function handleMuteButtonInteraction(interaction: ButtonInteraction) {
    const user = getUserFromMention(interaction.message.embeds[0].fields?.find((i: any) => i.name === "Felhasználó:")?.value!.split("\n")[0]!)!;
    if (checkPermissions(interaction.user.id, CommandList.unmute)) {
        removeMute(user, true, interaction.member as GuildMember)
        .then(() => {
            interaction.reply({ content: "Némítás feloldva!", ephemeral: true });
        })
        .catch(i => {
            interaction.reply({ content: "Némítás feloldása sikertelen!", ephemeral: true });
            logError("Unmute error", i);
        });
    } else {
        await interaction.reply({ content: "Nincs jogod feloldani a némítást!", ephemeral: true });
    }
}

function getUserFromMention(mention: string) {
    if (!mention)
        return;

    if (mention.startsWith("<@") && mention.endsWith(">")) {
        mention = mention.slice(2, -1);

        if (mention.startsWith("!")) {
            mention = mention.slice(1);
        }

        return mention!;
    }
}
