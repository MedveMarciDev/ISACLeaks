import { LoggableSanctionBase } from "../sanctionSytem.types";
import { SanctionGUIInstantiator } from "./sanctionGUIInstantiator";
import { WarningInstantiator } from "./warningInstantiator";
import { BanInstantiator } from "./banInstantiator";
import { AgeCheckInstantiator } from "./ageCheckInstantiator";
import { WantedInstantiator } from "./wantedInstantiator";

export const banInst = new BanInstantiator();
export const warningInst = new WarningInstantiator();
export const ageCheckInst = new AgeCheckInstantiator();
export const wantedInst = new WantedInstantiator();

const allEmbedCreators: { [key: string]: SanctionGUIInstantiator<LoggableSanctionBase> } = {
    "Ban": banInst,
    "Warning": warningInst,
    "AgeCheck": ageCheckInst,
    "WantedIndividual": wantedInst
};

export default allEmbedCreators;