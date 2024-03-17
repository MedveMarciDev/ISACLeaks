import { SanctionGUIInstantiator, textInput } from "./sanctionGUIInstantiator";
import { WantedIndividual } from "../sanctionSytem.types";
import { EmbedField, TextInputBuilder } from "discord.js";
import { playerName } from "../sanctionReader";
import { getDiscordRoleFromServer } from "../../serverStatus/status.types";

export class WantedInstantiator extends SanctionGUIInstantiator<WantedIndividual> {
    readonly type = "Körözött Személy";
    readonly description = "Kattints az alábbi gombra, hogy létrehozz egy körözött személy feljegyzést";

    constructor() {
        super();
        this.tracked = true;
    }

    get newSanction(): WantedIndividual {
        return new WantedIndividual();
    }

    createEmbedFields(data: WantedIndividual): EmbedField[] {
        return [
            {
                name: "Szerver",
                value: data.servers.map(getDiscordRoleFromServer).join("\n") || `< üres >`,
                inline: true
            }
        ];
    }

    createModalInputs(data: WantedIndividual): TextInputBuilder[] {
        return [ textInput("Indok", "reason", data.reason, 2048, true) ];
    }

    setField(obj: WantedIndividual, key: string, value: string): void {
        switch (key) {
            case playerName:
                obj.playerName = value;
                break;
            case "reason":
                obj.reason = value;
                break;
        }
    }
}