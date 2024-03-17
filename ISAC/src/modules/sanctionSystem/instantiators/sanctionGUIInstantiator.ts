import { EmbedField, TextInputBuilder, TextInputStyle } from "discord.js";
import { LoggableSanctionBase } from "../sanctionSytem.types";

export abstract class SanctionGUIInstantiator<T extends LoggableSanctionBase> {
    protected tracked: boolean = false;
    abstract description: string;

    get isTracked(): boolean {
        return this.tracked;
    }

    abstract get newSanction(): T;

    abstract readonly type: string;

    abstract createEmbedFields(data: T): EmbedField[];

    abstract createModalInputs(data: T): TextInputBuilder[];

    abstract setField(obj: T, key: string, value: string): void;
}

export function textInput(label: string, id: string, value: string | null | undefined, maxLength: number, paragraph?: boolean): TextInputBuilder {
    const input = new TextInputBuilder()
    .setStyle(paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setLabel(label)
    .setCustomId(id)
    .setRequired(true)
    .setMaxLength(maxLength);
    input.setStyle(paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short);
    if (!!value)
        input.setValue(value);
    return input;
}
