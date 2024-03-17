import { Warning } from "../sanctionSytem.types";
import { EmbedField, TextInputBuilder } from "discord.js";
import { getDiscordRoleFromServer } from "../../serverStatus/status.types";
import { playerName } from "../sanctionReader";
import { SanctionGUIInstantiator, textInput } from "./sanctionGUIInstantiator";

export class WarningInstantiator extends SanctionGUIInstantiator<Warning> {
    readonly type = "Figyelmeztetés";
    readonly description = "Válassz szervereket, majd kattints a gombra, hogy létrehozz egy figyelmeztetést";

    constructor() {
        super();
        this.tracked = true;
    }

    createEmbedFields(data: Warning): EmbedField[] {
        return [
            { name: "Steam ID", value: data.steamID || `< üres >`, inline: true },
            { name: "IP", value: `||${data.IP}||`, inline: false },
            {
                name: "Szerver",
                value: data.servers.map(getDiscordRoleFromServer).join("\n") || `< üres >`,
                inline: true
            }
        ];
    }

    createModalInputs(data: Warning): TextInputBuilder[] {
        return [
            textInput("Steam ID", "steamID", data.steamID, 32),
            textInput("IP", "IP", data.IP, 32)
            .setMinLength(7),
            textInput("Indok", "reason", data.reason, 2048, true)
        ];
    }

    setField(obj: Warning, key: string, value: string): void {
        switch (key) {
            case playerName:
                obj.playerName = value;
                break;
            case "steamID":
                obj.steamID = value;
                break;
            case "IP":
                obj.IP = value;
                break;
            case "reason":
                obj.reason = value;
                break;
        }
    }

    get newSanction(): Warning {
        return new Warning();
    }

}