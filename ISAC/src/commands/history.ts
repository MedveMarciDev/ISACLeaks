import CommandBase from "./commandBase";
import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    EmbedBuilder
} from "discord.js";
import { command, options } from "./decorators";
import {
    getAgeChecksByNickname,
    getAgeChecksByUserID,
    getBansByIP,
    getBansByNickname,
    getBansByUserID,
    getWantedListByNickname,
    getWarningsByIP,
    getWarningsByNickname,
    getWarningsByUserID
} from "../modules/sanctionSystem/sanctionManager";
import {
    LoggableSanctionBase,
    regexIP,
    regexSteamDigits,
    regexUserID
} from "../modules/sanctionSystem/sanctionSytem.types";
import logError from "../helpers/errorLogger";
import { createSanctionEmbed } from "../modules/sanctionSystem/embedHelpers";

@command("history", "Játékos szankcióinak megtekintése")
@options({
    name: "query",
    description: "Játékos azonosítója vagy neve",
    type: ApplicationCommandOptionType.String,
    required: true
})
export default class History extends CommandBase {
    protected async executeInternal(command: ChatInputCommandInteraction): Promise<void> {
        const query = this.str("query").trim();
        const isID = regexSteamDigits.test(query) || regexUserID.test(query);
        const isIP = regexIP.test(query);

        const sanctions = <LoggableSanctionBase[]>(isIP ? getBansByIP : isID ? getBansByUserID : getBansByNickname)(query);
        const banCount = sanctions.length;
        const warnings = (isIP ? getWarningsByIP : isID ? getWarningsByUserID : getWarningsByNickname)(query);
        const warningCount = warnings.length;
        sanctions.push(...warnings);
        const ageChecks = isID ? getAgeChecksByUserID(query) : getAgeChecksByNickname(query);
        const ageCheckCount = ageChecks.length;
        sanctions.push(...ageChecks);

        const wantedList: EmbedBuilder[] = isID ? [] : getWantedListByNickname(query).sort(timeComparer).map(e => createSanctionEmbed(e, true));
        if (sanctions.length === 0 && wantedList.length === 0) {
            await command.reply(`Nem található feljegyzés ${isIP ? "IP" : isID ? "SteamID" : "név"} alapján.`);
            return;
        }
        const embeds = sanctions.sort(timeComparer).map(e => createSanctionEmbed(e, true));
        embeds.push(...wantedList);
        let replied = false;

        try {
            await command.reply({
                content: `Feljegyzések ${isIP ? "IP" : isID ? "SteamID" : "név"} alapján \"${query}\" felhasználóról:`,
                embeds: embeds.slice(0, 10),
                ephemeral: true
            });
            replied = true;
            if (embeds.length > 10)
                for (let i = 10; i < embeds.length; i += 10)
                    await command.followUp({
                        embeds: embeds.slice(i, i + 10),
                        ephemeral: true
                    });
            await command.followUp({
                content: `**${banCount}** ban, **${warningCount}** figyelmeztetés, **${ageCheckCount}** életkor ellenőrzés, **${wantedList.length}** körözés`,
                ephemeral: true
            });
        } catch (e) {
            logError("Failed to send full sanction list:", e);
            await (replied ? command.editReply : command.reply)("Nem sikerült a teljes lista megjelenítése.");
        }
    }
}

function timeComparer(a: LoggableSanctionBase, b: LoggableSanctionBase) {
    return a.created!.getTime() - b.created!.getTime();
}
