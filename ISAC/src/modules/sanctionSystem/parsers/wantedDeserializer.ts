import { DeserializerBase, IFieldParser, IFieldValue } from "./parsers.baseTypes";
import { WantedIndividual } from "../sanctionSytem.types";
import { BasicStringParser } from "./stringParsers";
import ServerListParser from "./serverListParser";
import { Server } from "../../serverStatus/status.types";

export class WantedDeserializer extends DeserializerBase<WantedIndividual> {
    readonly type = "WantedIndividual";

    createObject(): WantedIndividual {
        return new WantedIndividual();
    }

    protected fields: IFieldParser<IFieldValue>[] = [
        BasicStringParser.nameParser,
        BasicStringParser.reasonParser,
        ServerListParser.instance
    ];

    setField(obj: WantedIndividual, key: string, value: IFieldValue): void {
        switch (key) {
            case "név":
                obj.playerName = <string>value;
                break;
            case "indok":
                obj.reason = <string>value;
                break;
            case "szerver":
                obj.servers = <Server[]>value;
                break;
        }
    }
}