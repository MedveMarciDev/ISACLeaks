import { LoggableSanctionBase } from "../sanctionSytem.types";
import { splitFirst } from "../../../helpers/common";
import { DeserializerBase, IPair } from "./parsers.baseTypes";
import BanDeserializer from "./banDeserializer";
import WarningDeserializer from "./warningDeserializer";
import { AgeCheckDeserializer } from "./ageCheckDeserializer";
import { WantedDeserializer } from "./wantedDeserializer";

const deserializers: DeserializerBase<LoggableSanctionBase>[] = [
    new BanDeserializer(),
    new WarningDeserializer(),
    new AgeCheckDeserializer(),
    new WantedDeserializer()
];

export function deserializeString(value: string, typeName: string): LoggableSanctionBase | null {
    const lines = value.split(/\r?\n/);
    for (const deserializer of deserializers)
        if (deserializer.type === typeName)
            return deserializer.deserialize(lines.map(line => {
                const [ key, value ] = splitFirst(line, ":");
                return <IPair>{ key, value };
            }));
    return null;
}