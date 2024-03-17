import { IFieldParser } from "./parsers.baseTypes";
import parse from "parse-duration";
import { normalizeText } from "../../../helpers/common";

export class BasicStringParser implements IFieldParser<string> {
    public static nameParser = new BasicStringParser("Név", "Name", "Felhasználó");
    public static IDParser = new BasicStringParser("SteamID", "ID", "UserID", "Steam ID");
    public static reasonParser = new BasicStringParser("Indok", "Ok", "Reason");
    public static IPParser = new BasicStringParser("IP", "IP cím", "IP address");

    names: string[];

    parse(value: string): string {
        return value;
    }

    constructor(...names: string[]) {
        this.names = names ?? [];
    }
}

parse["y"] = parse["yr"] = parse["year"] = parse["ev"] = parse["day"] * 365;
parse["masodperc"] = parse["sec"];
parse["perc"] = parse["min"];
parse["ora"] = parse["hour"];
parse["nap"] = parse["day"];
parse["het"] = parse["week"];

export class DurationParser implements IFieldParser<number> {
    names: string[];
    static instance = new DurationParser("Idő", "Időtartam", "Time", "Duration");

    static secondsToString(seconds: number | null): string | null {
        if (seconds == null || isNaN(seconds) || seconds < 0)
            return null;
        let highestScalar = 1;
        let scalarName = "másodperc";
        for (const key of Object.keys(scalarToFullUnit)) {
            const scalar = parseInt(key);
            if (seconds % scalar === 0 && scalar > highestScalar) {
                highestScalar = scalar;
                scalarName = scalarToFullUnit[scalar];
            }
        }

        return `${seconds / highestScalar} ${scalarName}`;
    }

    parse(value: string): number {
        const normalized = normalizeText(value);
        return normalizeText(normalized.replaceAll(/\d/g, "")).length === 0
            ? parseInt(normalized)
            : parse(normalized, "second");
    }

    constructor(...names: string[]) {
        this.names = names ?? [];
    }
}

const scalarToFullUnit: { [key: number]: string; } = {
    60: "perc",
    3600: "óra",
    86400: "nap",
    604800: "hét",
    31536000: "év"
};
const dateRegex = /(\d{4})[./\s-]+?(0?\d)[./\s-]+?(0?\d)[./\s-]+?/;

export class DateOfBirthParser implements IFieldParser<string> {
    names: string[];
    static instance = new DateOfBirthParser("Születési idő", "Születési dátum", "Birth date", "Date of birth", "Szül. idő", "Szül. dátum", "Szül.idő", "Szül.dátum");

    parse(value: string): string | null {
        dateRegex.lastIndex = 0;
        const match = dateRegex.exec(value);
        if (!match)
            return null;
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const date = parseInt(match[3]);
        if (isNaN(year) || isNaN(month) || isNaN(date) || year > new Date().getFullYear() || month > 12 || month < 1 || date > 31 || date < 1)
            return null;
        const monthPretty = month < 10 ? `0${month}` : month.toString();
        const datePretty = date < 10 ? `0${date}` : date.toString();
        return `${year}. ${monthPretty}. ${datePretty}.`;
    }

    constructor(...names: string[]) {
        this.names = names ?? [];
    }

}