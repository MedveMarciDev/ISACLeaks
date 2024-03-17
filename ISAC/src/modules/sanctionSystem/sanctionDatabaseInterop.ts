import {
    ActionCreationMode,
    AgeCheck,
    Ban,
    LoggableSanctionBase,
    WantedIndividual,
    Warning
} from "./sanctionSytem.types";
import database from "../database";
import logError from "../../helpers/errorLogger";
import config from "../../configuration";
import { textChannel } from "../../helpers/common";
import { createActionRows, createSanctionEmbed, findCreator } from "./embedHelpers";
import { addAgeCheck, addBan, addWantedIndividual, addWarning } from "./sanctionManager";
import { Server } from "../serverStatus/status.types";
import { GuildEmoji, Message, ReactionEmoji, User } from "discord.js";

export const logIdentifier = "Feljegyzés Azonosítója";

async function sendSanctionLog(entry: LoggableSanctionBase, channelID: string, user?: User, reactions?: (GuildEmoji | ReactionEmoji)[]): Promise<string> {
    const channel = textChannel(channelID);
    if (!channel)
        return ":x: Channel not found";
    const creator = findCreator(entry);
    if (!creator)
        return ":x: Embed creator not found";
    const validate = entry.validate();
    if (validate != null)
        return ":x: Invalid entry provided: " + validate;
    const embed = createSanctionEmbed(entry, false, creator);
    if (user)
        embed.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() });
    embed.addFields({ name: logIdentifier, value: entry.id.toString(), inline: false });
    const components = createActionRows(ActionCreationMode.Log, `-${entry.constructor.name}-${entry.id}`, entry);
    let msg: Message;
    try {
        msg = await channel.send({ embeds: [ embed ], components });
    } catch (e: any) {
        logError("Failed to send sanction message:", e);
        return ":x: Failed to send message";
    }

    try {
        for (const reaction of reactions ?? [])
            await msg.react(reaction);
        return "";
    } catch (e) {
        logError("Failed to add reactions to sanction message", e);
        return ":x: Failed to add reactions";
    }
}

export async function uploadBan(entry: Ban, user?: User, reactions?: (GuildEmoji | ReactionEmoji)[]): Promise<string> {
    if (!entry)
        return Promise.reject("Ban entry is null");
    if (!entry.issuedBy || entry.created == null)
        return Promise.reject("User or creation date is not set");
    const validate = entry.validate();
    if (validate != null)
        return Promise.reject(validate);
    try {
        const created = await database.con.bans.create({
            data: {
                created: entry.created!.toISOString(),
                duration: entry.duration,
                bannedBy: entry.issuedBy,
                steamId: entry.steamID,
                nickname: entry.playerName,
                IP: entry.IP,
                servers: entry.servers.join("|"),
                reason: entry.reason
            }
        });
        addBan(entry, created.banId);
        return Promise.resolve("Ban sikeresen feltöltve\n" + await sendSanctionLog(entry, config.sanctionSystem.banLogChannel, user, reactions));
    } catch (e: any) {
        logError("Ban upload failed:", e);
        return Promise.reject("Sikertelen feltöltés!");
    }
}

export async function uploadWarning(entry: Warning, user?: User, reactions?: (GuildEmoji | ReactionEmoji)[]): Promise<string> {
    if (!entry)
        return Promise.reject("Warning entry is null");
    if (!entry.issuedBy || entry.created == null)
        return Promise.reject("User or creation date is not set");
    const validate = entry.validate();
    if (validate != null)
        return Promise.reject(validate);
    try {
        const created = await database.con.warnings.create({
            data: {
                created: entry.created!.toISOString(),
                warnedBy: entry.issuedBy,
                steamId: entry.steamID,
                nickname: entry.playerName,
                IP: entry.IP,
                servers: entry.servers.join("|"),
                reason: entry.reason
            }
        });
        addWarning(entry, created.warnId);
        return Promise.resolve("Figyelmeztetés sikeresen feltöltve\n" + await sendSanctionLog(entry, config.sanctionSystem.warnLogChannel, user, reactions));
    } catch (e: any) {
        logError("Warning upload failed:", e);
        return Promise.reject("Sikertelen feltöltés!");
    }
}

export async function uploadAgeCheck(entry: AgeCheck, user?: User, reactions?: (GuildEmoji | ReactionEmoji)[]): Promise<string> {
    if (!entry)
        return Promise.reject("Age check entry is null");
    if (!entry.issuedBy || entry.created == null)
        return Promise.reject("User or creation date is not set");
    const validate = entry.validate();
    if (validate != null)
        return Promise.reject(validate);
    try {
        const created = await database.con.ageChecks.create({
            data: {
                created: entry.created!.toISOString(),
                checkedBy: entry.issuedBy,
                steamId: entry.steamID,
                nickname: entry.playerName,
                apparentDateOfBirth: entry.apparentDateOfBirth
            }
        });
        addAgeCheck(entry, created.checkId);
        return Promise.resolve("Életkor ellenőrzés sikeresen feltöltve\n" + await sendSanctionLog(entry, config.sanctionSystem.ageCheckChannel, user, reactions));
    } catch (e: any) {
        logError("Age check upload failed:", e);
        return Promise.reject("Sikertelen feltöltés!");
    }
}

export async function uploadWantedIndividual(entry: WantedIndividual, user?: User, reactions?: (GuildEmoji | ReactionEmoji)[]): Promise<string> {
    if (!entry)
        return Promise.reject("Wanted individual entry is null");
    if (!entry.issuedBy || entry.created == null)
        return Promise.reject("User or creation date is not set");
    const validate = entry.validate();
    if (validate != null)
        return Promise.reject(validate);
    try {
        const created = await database.con.wantedIndividuals.create({
            data: {
                created: entry.created!.toISOString(),
                issuer: entry.issuedBy,
                nickname: entry.playerName,
                servers: entry.servers.join("|"),
                reason: entry.reason
            }
        });
        addWantedIndividual(entry, created.entryId);
        return Promise.resolve("Körözött személy sikeresen feltöltve\n" + await sendSanctionLog(entry, config.sanctionSystem.wantedIndividualsChannel, user, reactions));
    } catch (e: any) {
        logError("Wanted individual upload failed", e);
        return Promise.reject("Sikertelen feltöltés!");
    }
}

export async function editBan(entry: Ban): Promise<string> {
    if (!entry)
        return Promise.reject("Ban entry is null");
    if (!entry.issuedBy || entry.created == null)
        return Promise.reject("User or creation date is not set");
    const validate = entry.validate();
    if (validate != null)
        return Promise.reject(validate);
    try {
        await database.con.bans.update({
            where: { banId: entry.id },
            data: {
                created: entry.created!.toISOString(),
                duration: entry.duration,
                bannedBy: entry.issuedBy,
                steamId: entry.steamID,
                nickname: entry.playerName,
                IP: entry.IP,
                servers: entry.servers.join("|"),
                reason: entry.reason
            }
        });
        return Promise.resolve("Ban sikeresen módosítva");
    } catch (e: any) {
        logError("Ban edit failed", e);
        return Promise.reject("Sikertelen módosítás!");
    }
}

export async function editWarning(entry: Warning): Promise<string> {
    if (!entry)
        return Promise.reject("Warning entry is null");
    if (!entry.issuedBy || entry.created == null)
        return Promise.reject("User or creation date is not set");
    const validate = entry.validate();
    if (validate != null)
        return Promise.reject(validate);
    try {
        await database.con.warnings.update({
            where: { warnId: entry.id },
            data: {
                created: entry.created!.toISOString(),
                warnedBy: entry.issuedBy,
                steamId: entry.steamID,
                nickname: entry.playerName,
                IP: entry.IP,
                servers: entry.servers.join("|"),
                reason: entry.reason
            }
        });
        return Promise.resolve("Figyelmeztetés sikeresen módosítva");
    } catch (e: any) {
        logError("Warning edit failed", e);
        return Promise.reject("Sikertelen módosítás!");
    }
}

export async function editAgeCheck(entry: AgeCheck): Promise<string> {
    if (!entry)
        return Promise.reject("Age check entry is null");
    if (!entry.issuedBy || entry.created == null)
        return Promise.reject("User or creation date is not set");
    const validate = entry.validate();
    if (validate != null)
        return Promise.reject(validate);
    try {
        await database.con.ageChecks.update({
            where: { checkId: entry.id },
            data: {
                created: entry.created!.toISOString(),
                checkedBy: entry.issuedBy,
                steamId: entry.steamID,
                nickname: entry.playerName,
                apparentDateOfBirth: entry.apparentDateOfBirth
            }
        });
        return Promise.resolve("Életkor ellenőrzés sikeresen módosítva");
    } catch (e: any) {
        logError("Age check edit failed", e);
        return Promise.reject("Sikertelen módosítás!");
    }
}

export async function editWantedIndividual(entry: WantedIndividual): Promise<string> {
    if (!entry)
        return Promise.reject("Wanted individual entry is null");
    if (!entry.issuedBy || entry.created == null)
        return Promise.reject("User or creation date is not set");
    const validate = entry.validate();
    if (validate != null)
        return Promise.reject(validate);
    try {
        await database.con.wantedIndividuals.update({
            where: { entryId: entry.id },
            data: {
                created: entry.created!.toISOString(),
                issuer: entry.issuedBy,
                nickname: entry.playerName,
                servers: entry.servers.join("|"),
                reason: entry.reason
            }
        });
        return Promise.resolve("Körözött személy sikeresen módosítva");
    } catch (e: any) {
        logError("Wanted individual edit failed", e);
        return Promise.reject("Sikertelen módosítás!");
    }
}

async function fetchBans() {
    try {
        const bans = await database.con.bans.findMany();
        for (const entry of bans) {
            const ban = new Ban();
            ban.steamID = entry.steamId;
            ban.playerName = entry.nickname;
            ban.issuedBy = entry.bannedBy;
            ban.created = new Date(entry.created);
            ban.duration = entry.duration;
            ban.IP = entry.IP;
            ban.reason = entry.reason;
            ban.servers = entry.servers.split("|").map(e => <Server>e);
            addBan(ban, entry.banId);
        }
    } catch (e: any) {
        logError("Failed to fetch bans", e);
    }
}

async function fetchWarnings() {
    try {
        const warnings = await database.con.warnings.findMany();
        for (const entry of warnings) {
            const warning = new Warning();
            warning.steamID = entry.steamId;
            warning.playerName = entry.nickname;
            warning.issuedBy = entry.warnedBy;
            warning.created = new Date(entry.created);
            warning.IP = entry.IP;
            warning.reason = entry.reason;
            warning.servers = entry.servers.split("|").map(e => <Server>e);
            addWarning(warning, entry.warnId);
        }
    } catch (e: any) {
        logError("Failed to fetch warnings", e);
    }
}

async function fetchAgeChecks() {
    try {
        const ageChecks = await database.con.ageChecks.findMany();
        for (const entry of ageChecks) {
            const ageCheck = new AgeCheck();
            ageCheck.steamID = entry.steamId;
            ageCheck.playerName = entry.nickname;
            ageCheck.issuedBy = entry.checkedBy;
            ageCheck.created = new Date(entry.created);
            ageCheck.apparentDateOfBirth = entry.apparentDateOfBirth;
            addAgeCheck(ageCheck, entry.checkId);
        }
    } catch (e: any) {
        logError("Failed to fetch age checks", e);
    }
}

async function fetchWantedIndividuals() {
    try {
        const wantedIndividuals = await database.con.wantedIndividuals.findMany();
        for (const entry of wantedIndividuals) {
            const wantedIndividual = new WantedIndividual();
            wantedIndividual.playerName = entry.nickname;
            wantedIndividual.issuedBy = entry.issuer;
            wantedIndividual.created = new Date(entry.created);
            wantedIndividual.servers = entry.servers.split("|").map(e => <Server>e);
            wantedIndividual.reason = entry.reason;
            addWantedIndividual(wantedIndividual, entry.entryId);
        }
    } catch (e: any) {
        logError("Failed to fetch wanted individuals", e);
    }
}

export function fetchSanctionData() {
    return Promise.all([
        fetchBans(),
        fetchWarnings(),
        fetchAgeChecks(),
        fetchWantedIndividuals()
    ]);
}

export function getUploadFunction(type: string): (sanction: any, user?: User, reactions?: (GuildEmoji | ReactionEmoji)[]) => Promise<string> {
    switch (type) {
        case "Ban":
            return uploadBan;
        case "Warning":
            return uploadWarning;
        case "AgeCheck":
            return uploadAgeCheck;
        case "WantedIndividual":
            return uploadWantedIndividual;
        default:
            return () => Promise.reject("Unknown type: " + type);
    }
}

export function getEditFunction(type: string): (sanction: any) => Promise<string> {
    switch (type) {
        case "Ban":
            return editBan;
        case "Warning":
            return editWarning;
        case "AgeCheck":
            return editAgeCheck;
        case "WantedIndividual":
            return editWantedIndividual;
        default:
            return () => Promise.reject("Unknown type: " + type);
    }
}