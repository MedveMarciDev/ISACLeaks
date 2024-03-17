import { Ban } from "../sanctionSytem.types";
import { getDiscordRoleFromServer } from "../../serverStatus/status.types";
import { DurationParser } from "../parsers/stringParsers";
import { playerName } from "../sanctionReader";
import { SanctionGUIInstantiator, textInput } from "./sanctionGUIInstantiator";
import { EmbedField, TextInputBuilder } from "discord.js";
import { time } from "../../../helpers/common";
import TimeFormat from "../../../helpers/timeFormat";

export class BanInstantiator extends SanctionGUIInstantiator<Ban> {
    readonly type = "Ban";
    readonly description = "Válaszd ki a szervereket, majd kattints a gombra, hogy feljegyezd a szankciót";

    constructor() {
        super();
        this.tracked = true;
    }

    createEmbedFields(data: Ban): EmbedField[] {
        return [
            { name: "Steam ID", value: data.steamID || `< üres >`, inline: true },
            { name: "IP", value: `||${data.IP}||`, inline: false },
            {
                name: "Szerver",
                value: data.servers.map(getDiscordRoleFromServer).join("\n") || `< üres >`,
                inline: true
            },
            { name: "Időtartam", value: DurationParser.secondsToString(data.duration)!, inline: true },
            {
                name: "Lejár",
                value: time(data.created!.getTime() + data.duration * 1000, TimeFormat.LongDateTime),
                inline: true
            }
        ];
    }

    createModalInputs(data: Ban): TextInputBuilder[] {
        return [
            textInput("Steam ID", "steamID", data.steamID, 32),
            textInput("IP", "IP", data.IP, 32)
            .setMinLength(7),
            textInput("Indok", "reason", data.reason, 2048, true),
            textInput("Időtartam", "duration", data.duration > 0 ? DurationParser.secondsToString(data.duration) : null, 32)
        ];
    }

    setField(obj: Ban, key: string, value: string): void {
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
            case "duration":
                obj.duration = DurationParser.instance.parse(value);
                break;
        }
    }

    get newSanction(): Ban {
        return new Ban();
    }
}