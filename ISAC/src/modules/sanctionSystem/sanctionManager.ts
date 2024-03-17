import { AgeCheck, Ban, LoggableSanctionBase, regexUserID, WantedIndividual, Warning } from "./sanctionSytem.types";
import { normalizeText } from "../../helpers/common";

const bans: Ban[] = [];

const warnings: Warning[] = [];

const ageChecks: AgeCheck[] = [];

const wantedList: WantedIndividual[] = [];

export function addBan(ban: Ban, banId: number) {
    ban.id = banId;
    bans.push(ban);
}

export function addWarning(warning: Warning, warnId: number) {
    warning.id = warnId;
    warnings.push(warning);
}

export function addAgeCheck(ageCheck: AgeCheck, checkId: number) {
    ageCheck.id = checkId;
    ageChecks.push(ageCheck);
}

export function addWantedIndividual(wantedIndividual: WantedIndividual, entryId: number) {
    wantedIndividual.id = entryId;
    wantedList.push(wantedIndividual);
}

export function getBansByUserID(id: string): Ban[] {
    const trimmed = extractUserID(id);
    return !trimmed ? [] : bans.filter(e => extractUserID(e.steamID) === trimmed);
}

export function getBansByIP(ip: string): Ban[] {
    return bans.filter(e => e.IP === ip);
}

export function getBansByNickname(nickname: string): Ban[] {
    const normalized = normalizeText(nickname);
    return bans.filter(e => normalizeText(e.playerName) === normalized);
}

export function getWarningsByUserID(id: string): Warning[] {
    const trimmed = extractUserID(id);
    return !trimmed ? [] : warnings.filter(e => extractUserID(e.steamID) === trimmed);
}

export function getWarningsByIP(ip: string): Warning[] {
    return warnings.filter(e => e.IP === ip);
}

export function getWarningsByNickname(nickname: string): Warning[] {
    const normalized = normalizeText(nickname);
    return warnings.filter(e => normalizeText(e.playerName) === normalized);
}

export function getAgeChecksByUserID(id: string): AgeCheck[] {
    const trimmed = extractUserID(id);
    return !trimmed ? [] : ageChecks.filter(e => extractUserID(e.steamID) === trimmed);
}

export function getAgeChecksByNickname(nickname: string): AgeCheck[] {
    const normalized = normalizeText(nickname);
    return ageChecks.filter(e => normalizeText(e.playerName) === normalized);
}

export function getWantedListByNickname(nickname: string): WantedIndividual[] {
    const normalized = normalizeText(nickname);
    return wantedList.filter(e => normalizeText(e.playerName) === normalized);
}

export function getWantedListByAllNicknames(nicknames: string[]): WantedIndividual[] {
    const normalized = nicknames.map(e => normalizeText(e));
    return wantedList.filter(e => normalized.includes(normalizeText(e.playerName)));
}

export function extractUserID(s: string) {
    regexUserID.lastIndex = 0;
    return regexUserID.exec(s.trim())?.[1] ?? s;
}

function getArray(type: string): LoggableSanctionBase[] {
    switch (type) {
        case "Ban":
            return bans;
        case "Warning":
            return warnings;
        case "AgeCheck":
            return ageChecks;
        case "WantedIndividual":
            return wantedList;
        default:
            return [];
    }
}

export function getSanctionById(type: string, id: number): LoggableSanctionBase | null {
    return getArray(type).find(e => e.id === id) ?? null;
}

export function removeSanction(sanction: LoggableSanctionBase) {
    const array = getArray(sanction.constructor.name);
    const index = array.indexOf(sanction);
    if (index >= 0)
        array.splice(index, 1);
}

export function getAllIssuedBy(id: string): LoggableSanctionBase[] {
    return [ ...bans, ...warnings, ...ageChecks, ...wantedList ].filter(e => e.issuedBy === id);
}