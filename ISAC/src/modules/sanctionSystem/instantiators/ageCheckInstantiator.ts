import { SanctionGUIInstantiator, textInput } from "./sanctionGUIInstantiator";
import { AgeCheck } from "../sanctionSytem.types";
import { EmbedField, TextInputBuilder } from "discord.js";
import { playerName } from "../sanctionReader";
import { timeFromDate } from "../../../helpers/common";
import TimeFormat from "../../../helpers/timeFormat";

export class AgeCheckInstantiator extends SanctionGUIInstantiator<AgeCheck> {
    readonly type = "Életkor Ellenőrzés";
    readonly description = "Kattints az alábbi gombra, hogy létrehozz egy életkor ellenőrzést";

    get newSanction(): AgeCheck {
        return new AgeCheck();
    }

    createEmbedFields(data: AgeCheck): EmbedField[] {
        const birthDateSet = !!data.apparentDateOfBirth;
        const birthDate = birthDateSet ? new Date(data.apparentDateOfBirth) : null;
        return [
            { name: "Steam ID", value: data.steamID || `< üres >`, inline: true },
            {
                name: "Születési dátum",
                value: birthDateSet
                    ? `${timeFromDate(birthDate!, TimeFormat.LongDate)} ${timeFromDate(birthDate!, TimeFormat.Relative)}`
                    : `< üres >`,
                inline: false
            }
        ];
    }

    createModalInputs(data: AgeCheck): TextInputBuilder[] {
        return [
            textInput("Steam ID", "steamID", data.steamID, 32),
            textInput("Születési dátum", "birthDate", data.apparentDateOfBirth, 32)
        ];
    }

    setField(obj: AgeCheck, key: string, value: string): void {
        switch (key) {
            case playerName:
                obj.playerName = value;
                break;
            case "steamID":
                obj.steamID = value;
                break;
            case "birthDate":
                obj.apparentDateOfBirth = value;
                break;
        }
    }

}