import { ApplicationCommandOption, ApplicationCommandType } from "discord.js";

export function command(name: string, description: string) {
    return function(constructor: Function) {
        constructor.prototype.commandName = name;
        constructor.prototype.description = description;
    };
}

export function contextName(name: string) {
    return function(constructor: Function) {
        constructor.prototype.contextName = name;
    };
}

export function contextType(type: ApplicationCommandType) {
    return function(constructor: Function) {
        constructor.prototype.contextType = type;
    };
}

export function options(...values: ApplicationCommandOption[]) {
    return function(constructor: Function) {
        constructor.prototype.options = values;
    };
}

export function globallyAvailable() {
    return function(constructor: Function) {
        constructor.prototype.noRequiredPermissions = true;
    };
}