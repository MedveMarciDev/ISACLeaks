import { command, options } from "./decorators";
import CommandBase from "./commandBase";
import { ApplicationCommandOptionType, ChatInputCommandInteraction, CommandInteraction } from "discord.js";
import { regexIP, regexSteamDigits, regexUserID } from "../modules/sanctionSystem/sanctionSytem.types";
import {
    getBansByIP,
    getBansByUserID,
    getWantedListByAllNicknames,
    getWantedListByNickname,
    getWarningsByIP,
    getWarningsByUserID
} from "../modules/sanctionSystem/sanctionManager";
import logError from "../helpers/errorLogger";
import { createSanctionEmbed } from "../modules/sanctionSystem/embedHelpers";

@command("wanted", "Egy játékos körözési listájának lekérése")
@options({
    name: "query",
    description: "Játékos azonosítója vagy neve",
    type: ApplicationCommandOptionType.String,
    required: true
})
export default class WantedList extends CommandBase {
    protected async executeInternal(command: ChatInputCommandInteraction): Promise<void> {
        const query = this.str("query").trim();
        const isID = regexSteamDigits.test(query) || regexUserID.test(query);
        const isIP = regexIP.test(query);
        replied = false;
        try {
            const fn = isIP ? queryByIP : isID ? queryBySteamID : queryByNickname;
            await fn(query, command);
        } catch (e) {
            logError("Failed to send full wanted list:", e);
            await (replied ? command.editReply : command.reply)("Nem sikerült a teljes lista megjelenítése.");
        }
    }

}

let replied = false;

async function queryByNickname(query: string, interaction: CommandInteraction) {
    const list = getWantedListByNickname(query);
    if (list.length === 0) {
        await interaction.reply(`Nem található körözés név alapján.`);
        return;
    }
    const embeds = list.map(e => createSanctionEmbed(e, true));
    await interaction.reply({
        content: `Körözések név alapján \"${query}\" felhasználóról:`,
        embeds: embeds.slice(0, 10),
        ephemeral: true
    });
    replied = true;
    if (embeds.length > 10)
        for (let i = 10; i < embeds.length; i += 10)
            await interaction.followUp({
                embeds: embeds.slice(i, i + 10),
                ephemeral: true
            });
    await interaction.followUp({
        content: `Összesen ${list.length} körözés`,
        ephemeral: true
    });
}

async function queryBySteamID(query: string, interaction: CommandInteraction) {
    const nicknames = new Set<string>();
    for (const ban of getBansByUserID(query))
        nicknames.add(ban.playerName);
    for (const warning of getWarningsByUserID(query))
        nicknames.add(warning.playerName);
    await processNicknameSet(nicknames, interaction, "azonosító", query);
}

async function queryByIP(query: string, interaction: CommandInteraction) {
    const nicknames = new Set<string>();
    for (const ban of getBansByIP(query))
        nicknames.add(ban.playerName);
    for (const warning of getWarningsByIP(query))
        nicknames.add(warning.playerName);
    await processNicknameSet(nicknames, interaction, "IP", query);
}

async function processNicknameSet(nicknames: Set<string>, interaction: CommandInteraction, type: any, query: string) {
    if (nicknames.size === 0) {
        await interaction.reply(`Nem található körözés ${type} alapján.`);
        return;
    }

    const list = getWantedListByAllNicknames(Array.from(nicknames));
    if (list.length === 0) {
        await interaction.reply(`Nem található körözés ${type} alapján.`);
        return;
    }

    const embeds = list.map(e => createSanctionEmbed(e, true));
    await interaction.reply({
        content: `Körözések ${type} alapján \"${query}\" felhasználóról:`,
        embeds: embeds.slice(0, 10),
        ephemeral: true
    });
    replied = true;
    if (embeds.length > 10)
        for (let i = 10; i < embeds.length; i += 10)
            await interaction.followUp({
                embeds: embeds.slice(i, i + 10),
                ephemeral: true
            });
    await interaction.followUp({ content: `Összesen ${embeds.length} körözés`, ephemeral: true });
}
