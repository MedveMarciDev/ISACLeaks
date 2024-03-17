import { DeserializerBase, IFieldParser, IFieldValue } from "./parsers.baseTypes";
import { AgeCheck } from "../sanctionSytem.types";
import { BasicStringParser, DateOfBirthParser } from "./stringParsers";

export class AgeCheckDeserializer extends DeserializerBase<AgeCheck> {
    readonly type: string = "AgeCheck";

    createObject(): AgeCheck {
        return new AgeCheck();
    }

    protected fields: IFieldParser<IFieldValue>[] = [
        BasicStringParser.nameParser,
        BasicStringParser.IDParser,
        DateOfBirthParser.instance
    ];

    setField(obj: AgeCheck, key: string, value: IFieldValue): void {
        switch (key) {
            case "név":
                obj.playerName = <string>value;
                break;
            case "steamid":
                obj.steamID = <string>value;
                break;
            case "születési idő":
                obj.apparentDateOfBirth = <string>value;
                break;
        }
    }
}