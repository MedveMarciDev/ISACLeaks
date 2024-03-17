import { EmbedBuilder } from "discord.js";
import { firstMessage, textChannel } from "../helpers/common";
import config from "../configuration";
import { getGuildEmoji } from "../helpers/emojiResolver";
import logError from "../helpers/errorLogger";

export default async function initInfo() {
    try {
        const channel = textChannel(config.channels.info);
        const first = await firstMessage(channel);
        if (first == null)
            await channel.send({ embeds: [ createEmbed() ] });
        else
            await first.edit({ embeds: [ createEmbed() ] });
    } catch (e) {
        logError("Failed to initialize info message", e);
    }
}

function createEmbed(): EmbedBuilder {
    const upEmoji = getGuildEmoji(config.autoVote.upvote)!;
    const downEmoji = getGuildEmoji(config.autoVote.downvote)!;
    return new EmbedBuilder()
    .setTitle("**I.S.A.C.**")
    .setColor("#ff0000")
    .setThumbnail("https://cdn.discordapp.com/avatars/844266348150128670/e0c5b1f682dcc01de96de6000bb33707.webp?size=256")
    .setDescription(`Üdvözöllek, az én nevem I.S.A.C.\n\nÉn egy discord bot vagyok a szerveren, azzal a céllal jöttem, hogy segítsek a közösség növekedésében és fenntartásában!\n\n**A következőkre vagyok képes:**\n- Képes vagyok figyelni a négy játékszervert, és részletes adatokat jelenítek meg.\n- Az új event ajánlásokra automatikusan reagálok (<:${config.autoVote.upvote}:${upEmoji}> / <:${config.autoVote.downvote}:${downEmoji}>)\n- Üdvözlöm az újonnal érkezett tagokat\n- Rendelkezem chat szűrési képességgel\n- Rendelkezem moderátori parancsokkal (Némítás, üzenettörlés, stb.)\n- Jelzem ha valaki boostolja a szervert\n\nQ&A:`)
    .addFields(
        {
            "name": `Mikor készültem?`,
            "value": `<t:1610106960:D>`
        },
        {
            "name": `Mit jelent a neved?`,
            "value": `A nevem a következőt jelenti:\nImproved Server Authentication Core.\n\n`
        },
        {
            "name": `Mi célt szolgálsz majd a szerveren?\n`,
            "value": `Megpróbálom a tőlem telhető legjobbat kihozni, hogy előre segítsem e közösség fejlődését a jövőben!`
        },
        {
            "name": `Fognak majd jönni új funkciók is?`,
            "value": `Igen. Idővel új funkciókat fogok kapni, ezáltal még több dologra leszek képes.`
        },
        {
            "name": `Kik a fejlesztőim?`,
            "value": `Jelenleg <@435474959595208704>`
        },
        {
            "name": `Hányas verzióban vagy jelenleg?`,
            "value": `Jelenlegi verzióm: v2.0`
        })
    .setFooter({ text: "Improved Server Authentication Core" });
}