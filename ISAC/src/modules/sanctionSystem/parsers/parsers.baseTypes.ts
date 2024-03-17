import { LoggableSanctionBase } from "../sanctionSytem.types";
import { normalizeText } from "../../../helpers/common";
import { Server } from "../../serverStatus/status.types";

export type IFieldValue = string | number | Server[];

export interface IFieldParser<T extends IFieldValue> {
    names: string[];
    parse: (value: string) => T | null;
}

export abstract class DeserializerBase<T extends LoggableSanctionBase> {
    abstract readonly type: string;

    protected abstract fields: IFieldParser<IFieldValue>[];

    abstract createObject(): T;

    deserialize(values: IPair[]): T {
        const obj = this.createObject();
        for (const v of values) {
            if (!v.key || !v.value)
                continue;
            const key = normalizeText(v.key.trim());
            const field = this.fields.find(f => f.names.some(n => normalizeText(n) === key));
            if (!field)
                continue;
            const value = field.parse(v.value.trim());
            if (value != null)
                this.setField(obj, field.names[0].toLowerCase(), value);
        }

        return obj;
    }

    abstract setField(obj: T, key: string, value: IFieldValue): void;
}

export interface IPair {
    key: string;
    value: string;
}