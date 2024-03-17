import { Server } from "../serverStatus/status.types";
import { ColorResolvable } from "discord.js";

export enum SanctionReaderInteraction {
    Accept = "readAcceptSanction",
    Edit = "readEditSanction",
    Delete = "readDeleteSanction",
    SubmitChanges = "readSubmitChanges"
}

export enum SanctionLogInteraction {
    Edit = "editSanction",
    Delete = "deleteSanction",
    SubmitChanges = "submitChanges"
}

export enum ActionCreationMode {
    Log,
    Valid,
    Invalid
}

export type SanctionConfig = {
    oldVerification: OldSanctionVerification
    banLogChannel: string
    warnLogChannel: string
    ageCheckChannel: string
    wantedIndividualsChannel: string
    permittedRoles: string[]
    logCreationChannel: string
    deleteOverrideRoles: string[]
    deletionLog: string
}

export type OldSanctionVerification = {
    enabled: boolean
    bans: string
    warnings: string
    ageChecks: string
    wantedIndividuals: string
    sendTo: string
}

export abstract class LoggableSanctionBase {
    issuedBy: string = "";
    playerName: string = "";
    created: Date | null = null;
    color: ColorResolvable = "Red";
    id: number = -1;

    isValid(): boolean {
        return this.validate() == null;
    }

    validate(): string | null {
        return !!this.playerName ? null : "Játékos neve üres";
    }

    copyTo(target: LoggableSanctionBase) {
        target.issuedBy = this.issuedBy;
        target.playerName = this.playerName;
        target.created = this.created;
        target.color = this.color;
        target.id = this.id;
        this.copyAdditionalData(target);
    }

    abstract copyAdditionalData(target: LoggableSanctionBase): void;
}

export interface IReason {
    reason: string;
}

export interface ISteamID {
    steamID: string;
}

export interface IServers {
    servers: Server[];
}

export interface ITracked extends ISteamID, IServers {
    IP: string;
}

export interface IDeletable {
    canEveryoneDelete: boolean;
}

const regexIP = /^(\d{1,3}\.){3}\d{1,3}$/;
const regexUserID = /^(\S+?)@(?:steam|northwood|discord|patreon)$/i;

const regexSteamDigits = /^\d{17}$/;

export { regexIP, regexUserID, regexSteamDigits };

export class Ban extends LoggableSanctionBase implements IReason, ITracked {
    reason: string = "";
    steamID: string = "";
    duration: number = 0;
    servers: Server[] = [];
    IP: string = "";

    validate(): string | null {
        if (!regexUserID.test(this.steamID))
            return "Helytelen User ID";
        if (!this.reason)
            return "Üres indok";
        if (this.duration <= 0)
            return "Helytelen időtartam";
        if (!regexIP.test(this.IP))
            return "Helytelen IP cím";
        if (this.servers.length < 1)
            return "Nincs szerver kiválasztva";
        return super.validate();
    }

    copyAdditionalData(target: Ban) {
        target.reason = this.reason;
        target.steamID = this.steamID;
        target.duration = this.duration;
        target.servers = this.servers;
        target.IP = this.IP;
    }
}

export class Warning extends LoggableSanctionBase implements IReason, ITracked {
    reason: string = "";
    steamID: string = "";
    servers: Server[] = [];
    IP: string = "";
    color: ColorResolvable = "Yellow";

    validate(): string | null {
        if (!regexUserID.test(this.steamID))
            return "Helytelen User ID";
        if (!this.reason)
            return "Üres indok";
        if (!regexIP.test(this.IP))
            return "Helytelen IP cím";
        if (this.servers.length < 1)
            return "Nincs szerver kiválasztva";
        return super.validate();
    }

    copyAdditionalData(target: Warning): void {
        target.reason = this.reason;
        target.steamID = this.steamID;
        target.servers = this.servers;
        target.IP = this.IP;
    }
}

export class AgeCheck extends LoggableSanctionBase implements ISteamID {
    apparentDateOfBirth: string = "";
    steamID: string = "";
    color: ColorResolvable = "Green";

    validate(): string | null {
        if (!regexUserID.test(this.steamID))
            return "Helytelen User ID";
        if (!this.apparentDateOfBirth)
            return "Date of birth is not set";
        return super.validate();
    }

    copyAdditionalData(target: AgeCheck): void {
        target.apparentDateOfBirth = this.apparentDateOfBirth;
        target.steamID = this.steamID;
    }
}

export class WantedIndividual extends LoggableSanctionBase implements IReason, IServers, IDeletable {
    reason: string = "";
    servers: Server[] = [];
    color: ColorResolvable = "DarkRed";
    canEveryoneDelete = true;

    validate(): string | null {
        if (!this.reason)
            return "Üres indok";
        if (this.servers.length < 1)
            return "Nincs szerver kiválasztva";
        return super.validate();
    }

    copyAdditionalData(target: WantedIndividual): void {
        target.reason = this.reason;
        target.servers = this.servers;
    }
}
