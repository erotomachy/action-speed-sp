export interface Config {
    speedMultMalus: number;
    weaponSpeedMultOneHanderMalus: number;
    weaponSpeedMultTwoHanderMalus: number;
    weaponSpeedMultRangedMalus: number;
    staminaRateMultMalus: number;
    magickaRateMultMalus: number;
    powerAttackStaminaMultMalus: number;
    spellCostMalus: number;

    lightCuirassBase: number; 
    lightGauntletsBase: number; 
    lightBootsBase: number; 
    lightHelmetBase: number; 
    heavyCuirassBase: number; 
    heavyGauntletsBase: number; 
    heavyBootsBase: number; 
    heavyHelmetBase: number; 
    shieldBase: number; 

    enableSkillBonuses: boolean,
    speedMultLightArmorSkillBonus: number;
    speedMultHeavyArmorSkillBonus: number;
    weaponSpeedMultOneHandedSkillBonus: number;
    weaponSpeedMultTwoHandedSkillBonus: number;
    weaponSpeedMultMarksmanSkillBonus: number;
    staminaRateMultLightArmorSkillBonus: number;
    staminaRateMultHeavyArmorSkillBonus: number;
    magickaRateMultMagicSkillBonus: number;
    powerAttackStaminaOneHandedSkillBonus: number;
    powerAttackStaminaTwoHandedSkillBonus: number;
    spellCostSkillBonus: number;

    racialOffsets: Record<string, MalusOffset[]>;
    spellCostArgonianLightArmorRestorationPctOffset: number;
    spellCostArgonianLightArmorAlterationPctOffset: number;
    spellCostDunmerLightArmorFireDamagePctOffset: number;
    spellCostImperialHeavyArmorRestorationPctOffset: number;

    factionalOffsets: Record<string, MalusOffset[]>;
    spellCostThalmorLightArmorPctOffset: number;

    lightArmorPerkFormId: string;
    lightArmorPerkOffsetPct: number;
    heavyArmorPerkFormId: string;
    heavyArmorPerkOffsetPct: number;

    debug: boolean;
    useCloak: boolean;
}

type Types = "string" | "number" | "boolean" | "object";
export function asConfig(data: unknown): Config {
    const keyValidators: Record<keyof Config, Types> = {
        speedMultMalus: "number",
        weaponSpeedMultOneHanderMalus: "number",
        weaponSpeedMultTwoHanderMalus: "number",
        weaponSpeedMultRangedMalus: "number",
        staminaRateMultMalus: "number",
        magickaRateMultMalus: "number",
        powerAttackStaminaMultMalus: "number",
        spellCostMalus: "number",

        lightCuirassBase: "number", 
        lightGauntletsBase: "number", 
        lightBootsBase: "number", 
        lightHelmetBase: "number", 
        heavyCuirassBase: "number", 
        heavyGauntletsBase: "number", 
        heavyBootsBase: "number", 
        heavyHelmetBase: "number", 
        shieldBase: "number", 

        enableSkillBonuses: "boolean",
        speedMultLightArmorSkillBonus: "number",
        speedMultHeavyArmorSkillBonus: "number",
        weaponSpeedMultOneHandedSkillBonus: "number",
        weaponSpeedMultTwoHandedSkillBonus: "number",
        weaponSpeedMultMarksmanSkillBonus: "number",
        staminaRateMultLightArmorSkillBonus: "number",
        staminaRateMultHeavyArmorSkillBonus: "number",
        magickaRateMultMagicSkillBonus: "number",
        powerAttackStaminaOneHandedSkillBonus: "number",
        powerAttackStaminaTwoHandedSkillBonus: "number",
        spellCostSkillBonus: "number",

        racialOffsets: "object",
        spellCostArgonianLightArmorRestorationPctOffset: "number",
        spellCostArgonianLightArmorAlterationPctOffset: "number",
        spellCostDunmerLightArmorFireDamagePctOffset: "number",
        spellCostImperialHeavyArmorRestorationPctOffset: "number",

        factionalOffsets: "object",
        spellCostThalmorLightArmorPctOffset: "number",
    
        lightArmorPerkFormId: "string",
        lightArmorPerkOffsetPct: "number",
        heavyArmorPerkFormId: "string",
        heavyArmorPerkOffsetPct: "number",
    
        debug: "boolean",
        useCloak: "boolean",
    }

    if (typeof data === 'object' && data !== null) {
        let maybeConfig = data as Config
        for (const key of Object.keys(keyValidators) as Array<keyof Config>) {
            if (typeof maybeConfig[key] !== keyValidators[key]) {
                throw new Error(`data is not a Config: ${key} has type ${typeof maybeConfig[key]}`);
            }
            if (key === "racialOffsets") {
                const maybeOffsets = maybeConfig[key];
                Object.keys(maybeOffsets).map(key => maybeOffsets[key].map(maybeOffset => asMalusOffset(maybeOffset)));
            }
        }
        return maybeConfig;
    }

    throw new Error('data is not a Config');
}

type Malus = "SpeedMult" | "WeaponSpeedMult" | "StaminaRateMult" | "MagickaRateMult";
type ArmorKeyword = "ArmorLight" | "ArmorHeavy" | "Any";
type WeaponKeyword = "WeapTypeSword" | "WeapTypeDagger" | "WeapTypeWarAxe" | "WeapTypeMace" | "WeapTypeGreatsword" | "WeapTypeBattleaxe" | "WeapTypeWarhammer" | "WeapTypeBow" | "WeapTypeCrossbow"  | "Any";
export interface MalusOffset {
    malus: Malus;
    armorKeyword: ArmorKeyword;
    weaponKeyword: WeaponKeyword;
    requiresShield: boolean;
    pctOffset: number;
}

export function asMalusOffset(data: unknown): MalusOffset {
    const keyValidators: Record<keyof MalusOffset, Types> = {
        malus: "string",
        armorKeyword: "string",
        weaponKeyword: "string",
        requiresShield: "boolean",
        pctOffset: "number",
    }

    if (typeof data === 'object' && data !== null) {
        let maybeMalusOffset = data as MalusOffset
        for (const key of Object.keys(keyValidators) as Array<keyof MalusOffset>) {
            if (typeof maybeMalusOffset[key] !== keyValidators[key]) {
                throw new Error(`data is not a MalusOffset: ${key} has type ${typeof maybeMalusOffset[key]}`);
            }
        }
        return maybeMalusOffset;
    }

    throw new Error('data is not a MalusOffset');
}
