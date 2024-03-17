import {
    channelMention,
    EmbedBuilder,
    EmbedField,
    GuildMember,
    Message,
    MessageReaction,
    StageChannel,
    TextChannel,
    User,
    userMention,
    VoiceBasedChannel,
    VoiceChannel
} from "discord.js";
import { logRaw } from "../helpers/errorLogger";
import { isText, newEmbed, now, textChannel, time, user } from "../helpers/common";
import TimeFormat from "../helpers/timeFormat";
import config from "../configuration";
import { escapeText } from "./joinMessageSender";
import { sender } from "./sanctionSystem/sanctionReader";

export async function logMessageDeletion(message: Message) {
    const channel = textChannel(config.channels.deletedMessages);
    if (channel == null) {
        console.log("logMessageDeletion: Log csatorna nem található!");
        return;
    }
    if (config.channels.loggerIgnored.includes(message.channelId))
        return;
    const content = newEmbed("Red")
    .setTitle(`Üzenet törölve`)
    .addFields(
        {
            name: sender,
            value: user(message.author) + " " + escapeText(message.author.username),
            inline: true
        },
        {
            name: "Csatorna",
            value: channelMention(message.channel.id),
            inline: true
        },
        {
            name: "Üzenet elküldve",
            value: time(message.createdTimestamp, TimeFormat.LongTime)
        },
        {
            name: "Törlés ideje",
            value: now(TimeFormat.LongTime),
            inline: true
        }
    );
    if (message.content)
        content.setDescription(message.content);
    const attachments = message.attachments;
    const embeds = [ content ];
    if (attachments.size > 0) {
        const attachmentsEmbed = newEmbed("Red")
        .setTitle("Csatolmányok")
        .setDescription(attachments.map(a => a.url).join("\n"));
        content.setFooter(null);
        embeds.push(attachmentsEmbed);
    }
    await channel.send({ embeds });
}

function attachmentsToFields(oldMessage: Message): EmbedField[] {
    return oldMessage.attachments?.map((e, i) => ({
        name: `Csatolmány ${i + 1}`,
        value: e.url,
        inline: false
    })) ?? <EmbedField[]>[];
}

function contentEquals(oldMessage: Message, newMessage: Message) {
    const newAttachments = newMessage.attachments;
    return oldMessage.content === newMessage.content && oldMessage.attachments.every((e, i) => newAttachments.find(x => x.id === i) === e);
}

export async function logMessageEdit(oldMessage: Message, newMessage: Message) {
    const channel = textChannel(config.channels.messageEdits);
    if (contentEquals(oldMessage, newMessage) || newMessage.author.bot)
        return;
    if (channel == null) {
        logRaw("logMessageEdit: Log csatorna nem található!");
        return;
    }
    if (!isText(channel))
        return;
    if (config.channels.loggerIgnored.includes(oldMessage.channelId))
        return;
    const main = new EmbedBuilder()
    .setColor("Yellow")
    .setTitle(`Üzenet szerkesztve`)
    .addFields(
        {
            name: "Felhasználó",
            value: user(oldMessage.author),
            inline: true
        },
        {
            name: "Csatorna",
            value: channelMention(oldMessage.channel.id),
            inline: true
        },
        {
            name: "Idő",
            value: time(newMessage.createdTimestamp, TimeFormat.ShortDateTime),
            inline: true
        }
    );
    const old = new EmbedBuilder()
    .setColor("Yellow")
    .setTitle("Régi üzenet")
    .addFields(...attachmentsToFields(oldMessage));
    if (oldMessage.content)
        old.setDescription(oldMessage.content);
    const edit = newEmbed("Yellow")
    .setTitle("Új üzenet")
    .addFields(...attachmentsToFields(newMessage));
    if (newMessage.content)
        edit.setDescription(newMessage.content);
    await channel.send({ embeds: [ main, old, edit ] });
}

export async function logReactionAdded(reaction: MessageReaction, user: User) {
    if (user.bot)
        return;
    const channel = textChannel(config.channels.reactions);
    if (channel == null) {
        logRaw("logReactionRemoved: Log csatorna nem található!");
        return;
    }
    if (config.channels.loggerIgnored.includes(reaction.message.channelId)) return;
    const embed = newEmbed("Green")
    .setTitle("Emotikon hozzáadva")
    .addFields(
        {
            name: "Felhasználó",
            value: userMention(user.id),
            inline: true
        },
        {
            name: "Csatorna",
            value: channelMention(reaction.message.channel.id),
            inline: true
        },
        {
            name: "Emoji",
            value: reaction.emoji.name || "<ismeretlen>",
            inline: true
        },
        {
            name: "Időpont",
            value: now(),
            inline: true
        }
    );
    if (reaction.message.content)
        embed.setDescription(reaction.message.content);
    await channel.send({ embeds: [ embed ] });
}

export async function logReactionRemoved(reaction: MessageReaction, user: User) {
    if (user.bot)
        return;
    const channel = textChannel(config.channels.reactions);
    if (channel == null) {
        logRaw("logReactionRemoved: Log csatorna nem található!");
        return;
    }
    if (config.channels.loggerIgnored.includes(reaction.message.channelId)) return;
    const embed = newEmbed("Orange")
    .setTitle("Emotikon eltávolítva")
    .addFields(
        {
            name: "Felhasználó",
            value: userMention(user.id),
            inline: false
        },
        {
            name: "Csatorna",
            value: channelMention(reaction.message.channel.id),
            inline: false
        },
        {
            name: "Emoji",
            value: reaction.emoji.name || "<ismeretlen>",
            inline: false
        },
        {
            name: "Időpont",
            value: now(),
            inline: false
        }
    );
    if (reaction.message.content)
        embed.setDescription(reaction.message.content);
    await channel.send({ embeds: [ embed ] });
}

export async function logLockChannel(lockedchannel: TextChannel, user: User) {
    if (!lockedchannel || !user)
        return;
    const channel = textChannel(config.channels.reactions);
    if (channel == null) {
        logRaw("logLockChannel: Log csatorna nem található!");
        return;
    }
    const embed = newEmbed("DarkRed")
    .setTitle("Csatorna lezárva")
    .addFields(
        {
            name: "Staff",
            value: userMention(user.id),
            inline: false
        },
        {
            name: "Csatorna",
            value: channelMention(lockedchannel.id),
            inline: false
        },
        {
            name: "Időpont",
            value: now(),
            inline: false
        }
    );
    await channel.send({ embeds: [ embed ] });
}

export async function logUnLockChannel(channelToUnlock: TextChannel, user: User) {
    if (!channelToUnlock || !user)
        return;
    const channel = textChannel(config.channels.reactions);
    if (channel == null) {
        logRaw("logUnLockChannel: Log csatorna nem található!");
        return;
    }
    const embed = newEmbed("DarkGreen")
    .setTitle("Csatorna feloldva")
    .addFields(
        {
            name: "Staff",
            value: userMention(user.id),
            inline: false
        },
        {
            name: "Csatorna",
            value: channelMention(channel.id),
            inline: false
        },
        {
            name: "Időpont",
            value: now(),
            inline: false
        }
    );
    await channel.send({ embeds: [ embed ] });
}

export async function disconnectVoiceLog(member: GuildMember, oldChannel: VoiceBasedChannel) {
    const channel = textChannel(config.channels.reactions);
    if (channel == null) {
        logRaw("logUnLockChannel: Log csatorna nem található!");
        return;
    }
    if (config.channels.loggerIgnored.includes(oldChannel.id)) return;
    const embed = newEmbed("Red")
    .setTitle("Hangcsatorna lecsatlakozás")
    .addFields(
        {
            name: "Tag",
            value: userMention(member.user.id),
            inline: false
        },
        {
            name: "Csatorna",
            value: channelMention(oldChannel.id),
            inline: false
        },
        {
            name: "Időpont",
            value: now(),
            inline: false
        }
    );
    embed.addFields(
        {
            name: "Csatornában jelen levő tagok",
            value: oldChannel.members.size === 0 ? `Nincs senki a csatornnában` : `${Array.from(oldChannel.members.values()).join("\n")}`,
            inline: false
        }
    );
    await channel.send({ embeds: [ embed ] });
}

export async function joinVoiceLog(member: GuildMember, newChannel: StageChannel | VoiceChannel) {
    const channel = textChannel(config.channels.reactions);
    if (channel == null) {
        logRaw("logUnLockChannel: Log csatorna nem található!");
        return;
    }
    if (config.channels.loggerIgnored.includes(newChannel.id)) return;
    const embed = newEmbed("Green")
    .setTitle("Hangcsatorna csatlakozás")
    .addFields(
        {
            name: "Tag",
            value: userMention(member.user.id),
            inline: false
        },
        {
            name: "Csatorna",
            value: channelMention(newChannel.id),
            inline: false
        },
        {
            name: "Időpont",
            value: now(),
            inline: false
        }
    );
    embed.addFields(
        {
            name: "Csatornában jelen levő tagok",
            value: `${Array.from(newChannel.members.values()).join("\n")}`,
            inline: false
        }
    );
    await channel.send({ embeds: [ embed ] });
}

export async function moveVoiceLog(member: GuildMember, oldChannel: StageChannel | VoiceChannel, newChannel: StageChannel | VoiceChannel) {
    const channel = textChannel(config.channels.reactions);
    if (channel == null) {
        logRaw("logUnLockChannel: Log csatorna nem található!");
        return;
    }
    if (config.channels.loggerIgnored.includes(oldChannel.id) || config.channels.loggerIgnored.includes(newChannel.id)) return;
    const embed = newEmbed("DarkBlue")
    .setTitle("Hangcsatorna átlépés")
    .addFields(
        {
            name: "Tag",
            value: userMention(member.user.id),
            inline: false
        },
        {
            name: "Régi Csatorna",
            value: channelMention(oldChannel.id),
            inline: false
        },
        {
            name: "Új Csatorna",
            value: channelMention(newChannel.id),
            inline: false
        },
        {
            name: "Időpont",
            value: now(),
            inline: false
        }
    );
    if (oldChannel.members.first()) {
        embed.addFields(
            {
                name: "Régi csatornában jelen levő tagok",
                value: `${Array.from(oldChannel.members.values()).join("\n")}`,
                inline: false
            }
        );
    } else {
        embed.addFields(
            {
                name: "Régi csatornában jelen levő tagok",
                value: `Nincs senki a csatornnában`,
                inline: false
            }
        );
    }
    if (newChannel.members.first()) {
        embed.addFields(
            {
                name: "Új csatornában jelen levő tagok",
                value: `${Array.from(newChannel.members.values()).join("\n")}`,
                inline: false
            }
        );
    } else {
        embed.addFields(
            {
                name: "Új csatornában jelen levő tagok",
                value: `Nincs senki a csatornnában`,
                inline: false
            }
        );
    }

    await channel.send({ embeds: [ embed ] });
}