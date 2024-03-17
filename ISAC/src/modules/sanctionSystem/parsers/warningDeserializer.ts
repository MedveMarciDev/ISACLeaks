import { DeserializerBase, IFieldParser, IFieldValue } from "./parsers.baseTypes";
import { Ban, Warning } from "../sanctionSytem.types";
import ServerListParser from "./serverListParser";
import { BasicStringParser } from "./stringParsers";
import { Server } from "../../serverStatus/status.types";

export default class WarningDeserializer extends DeserializerBase<Warning> {
    public readonly type: string = "Warning";

    createObject(): Warning {
        return new Warning();
    }

    fields: IFieldParser<IFieldValue>[] = [
        BasicStringParser.nameParser,
        BasicStringParser.IDParser,
        BasicStringParser.reasonParser,
        BasicStringParser.IPParser,
        ServerListParser.instance
    ];

    setField(obj: Ban, key: string, value: IFieldValue): void {
        switch (key) {
            case "név":
                obj.playerName = <string>value;
                break;
            case "steamid":
                obj.steamID = <string>value;
                break;
            case "indok":
                obj.reason = <string>value;
                break;
            case "szerver":
                obj.servers = <Server[]>value;
                break;
            case "ip":
                obj.IP = <string>value;
                break;
        }
    }

};
