import { DeserializerBase, IFieldParser, IFieldValue } from "./parsers.baseTypes";
import { Ban } from "../sanctionSytem.types";
import ServerListParser from "./serverListParser";
import { BasicStringParser, DurationParser } from "./stringParsers";
import { Server } from "../../serverStatus/status.types";

export default class BanDeserializer extends DeserializerBase<Ban> {
    public readonly type: string = "Ban";

    createObject(): Ban {
        return new Ban();
    }

    fields: IFieldParser<IFieldValue>[] = [
        BasicStringParser.nameParser,
        BasicStringParser.IDParser,
        BasicStringParser.reasonParser,
        BasicStringParser.IPParser,
        ServerListParser.instance,
        DurationParser.instance
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
            case "idő":
                obj.duration = <number>value;
                break;
        }
    }

};