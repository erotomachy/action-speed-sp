import { on, once, printConsole, settings, getExtraContainerChanges, Game, Perk, Weapon, WeaponType, Armor, Actor, Spell, ExtraCount, EquipEvent, SlotMask, Faction, Keyword, Menu, hooks, Debug } from "skyrimPlatform"
import { asConfig, MalusOffset } from "config"

enum AV {
    MovementSpeed = 'SpeedMult',
    WeaponSpeedRight = 'WeaponSpeedMult',
    WeaponSpeedLeft = 'LeftWeaponSpeedMult',
    StaminaRegen = 'StaminaRateMult',
    MagickaRegen = 'MagickaRateMult',

    Encumbrance = 'IgnoreCrippledLimbs',
    MoveSpeedAndAttackSpeed = 'Fame',
    StaminaRegenAndMagickaRegen = 'Infamy',
}

enum WeightClass {
    Light = 0,
    Heavy,
    None,
}

class EncumbranceFactors {
    encumbrance: number;
    weapon: Weapon | null;
    weightClass: WeightClass;

    constructor(encumbrance: number, weapon: Weapon | null, weightClass: WeightClass) {
        this.encumbrance = encumbrance;
        this.weapon = weapon;
        this.weightClass = weightClass;
    }
}

export let main = () => {

    const idMap = new Map<number, number>();

    const perkPowerAtkSpellCostMalusId = 0x802;
    const perkPowerAtkSkillBonusId = 0x80C;
    const perkSpellCostSkillBonusId = 0x80B;

    const perkDunmerSpellCostId = 0x80E;
    const perkImperialSpellCostId = 0x815;
    const perkArgonianSpellCostId = 0x817;
    const perkThalmorSpellCostId = 0x81D;

    const cloakSpellId = 0x806;
    const cloakHitEffectId = 0x805;
    const cloakAppliedSpellId = 0x808;
    const cloakAppliedEffectId = 0x809;

    const config = asConfig(settings['action-speed-sp']);

    const baseEncumbrances = [
        [0, SlotMask.Body,  config.lightCuirassBase],
        [0, SlotMask.Hands, config.lightGauntletsBase],
        [0, SlotMask.Feet,  config.lightBootsBase],
        [0, SlotMask.Head,  config.lightHelmetBase],
        [1, SlotMask.Body,  config.heavyCuirassBase],
        [1, SlotMask.Hands, config.heavyGauntletsBase],
        [1, SlotMask.Feet,  config.heavyBootsBase],
        [1, SlotMask.Head,  config.heavyHelmetBase],
    ];

    const weightClassSkillValueGetters = new Map<WeightClass, (actor:Actor) => number>([
        [WeightClass.Heavy, (actor) => actor.getActorValue('HeavyArmor')],
        [WeightClass.Light, (actor) => actor.getActorValue('LightArmor')],
        [WeightClass.None,  () => 0.0],
    ]);

    const movementSpeedSkillBonusFactors = new Map<WeightClass, number>([
        [WeightClass.Heavy, config.speedMultHeavyArmorSkillBonus],
        [WeightClass.Light, config.speedMultLightArmorSkillBonus],
        [WeightClass.None,  0.0],
    ]);

    const staminaRegenSkillBonusFactors = new Map<WeightClass, number>([
        [WeightClass.Heavy, config.staminaRateMultHeavyArmorSkillBonus],
        [WeightClass.Light, config.staminaRateMultLightArmorSkillBonus],
        [WeightClass.None,  0.0],
    ]);

    const weaponSpeedSkillBonusFactors = new Map<string | undefined, number>([
        ['OneHanded', config.weaponSpeedMultOneHandedSkillBonus],
        ['TwoHanded', config.weaponSpeedMultTwoHandedSkillBonus],
        ['Marksman',  config.weaponSpeedMultMarksmanSkillBonus],
        [undefined,   0.0]
    ]);

    const weaponTypeKeywords = {
        'WeapTypeBattleaxe':  0x0006D932,
        'WeapTypeBow':        0x0001E715,
        'WeapTypeDagger':     0x0001E713,
        'WeapTypeGreatsword': 0x0006D931,
        'WeapTypeWarhammer':  0x0006D930,
        'WeapTypeMace':       0x0001E714,
        'WeapTypeSword':      0x0001E711,
        'WeapTypeWaraxe':     0x0001E712,
    }

    const factionOffsets = new Map<number, MalusOffset[]>();
    const perkOffsetIds = new Map<WeightClass, number>();

    const powerAttackSpellCostValueMap = new Map<number, number>([
        [0, 0],
        [1, config.powerAttackStaminaMultMalus],
        [2, config.spellCostMalus]
    ]);

    const powerAttackSkillBonusValueMap = new Map<number, number>([
        [0, -config.powerAttackStaminaOneHandedSkillBonus],
        [1, -config.powerAttackStaminaTwoHandedSkillBonus]
    ]);

    const perkArgonianSpellCostOffsetValueMap = new Map<number, number>([
        [0, -config.spellCostArgonianLightArmorAlterationPctOffset],
        [1, -config.spellCostArgonianLightArmorRestorationPctOffset]
    ]);

    once('update', () => {
        initialize();
    });

    on('loadGame', () => {
        initialize();
    });

    function initialize() {
        const player = Game.getPlayer()!;

        // Get load-order Form IDs
        idMap.set(perkPowerAtkSpellCostMalusId, Game.getFormFromFile(perkPowerAtkSpellCostMalusId, 'ActionSpeedSP.esp')!.getFormID());
        idMap.set(perkPowerAtkSkillBonusId, Game.getFormFromFile(perkPowerAtkSkillBonusId, 'ActionSpeedSP.esp')!.getFormID());
        idMap.set(perkSpellCostSkillBonusId, Game.getFormFromFile(perkSpellCostSkillBonusId, 'ActionSpeedSP.esp')!.getFormID());

        idMap.set(perkDunmerSpellCostId, Game.getFormFromFile(perkDunmerSpellCostId, 'ActionSpeedSP.esp')!.getFormID());
        idMap.set(perkImperialSpellCostId, Game.getFormFromFile(perkImperialSpellCostId, 'ActionSpeedSP.esp')!.getFormID());
        idMap.set(perkArgonianSpellCostId, Game.getFormFromFile(perkArgonianSpellCostId, 'ActionSpeedSP.esp')!.getFormID());
        idMap.set(perkThalmorSpellCostId, Game.getFormFromFile(perkThalmorSpellCostId, 'ActionSpeedSP.esp')!.getFormID());

        const [lightArmorPerkFormId, lightArmorPerkFilename] = config.lightArmorPerkFormId.split('~');
        perkOffsetIds.set(WeightClass.Light, Game.getFormFromFile(parseInt(lightArmorPerkFormId, 16), lightArmorPerkFilename)!.getFormID());
        const [heavyArmorPerkFormId, heavyArmorPerkFilename] = config.heavyArmorPerkFormId.split('~');
        perkOffsetIds.set(WeightClass.Heavy, Game.getFormFromFile(parseInt(heavyArmorPerkFormId, 16), heavyArmorPerkFilename)!.getFormID());

        // Set power attack & spell cost perk effect magnitudes from config
        const perkPowerAtkSpellCostMalus = Perk.from(Game.getFormEx(idMap.get(perkPowerAtkSpellCostMalusId)!))!;
        for (const idx of [0, 1, 2]) {
            const priority = perkPowerAtkSpellCostMalus.getNthEntryPriority(idx);
            perkPowerAtkSpellCostMalus?.setNthEntryValue(idx, 1, powerAttackSpellCostValueMap.get(priority)!);
        }

        const perkPowerAtkSkillBonus = Perk.from(Game.getFormEx(idMap.get(perkPowerAtkSkillBonusId)!))!;
        for (const idx of [0, 1]) {
            const priority = perkPowerAtkSkillBonus.getNthEntryPriority(idx);
            printConsole(`Was ${perkPowerAtkSkillBonus?.getNthEntryValue(idx, 1)}, setting to ${powerAttackSkillBonusValueMap.get(priority)!}`);
            perkPowerAtkSkillBonus?.setNthEntryValue(idx, 1, powerAttackSkillBonusValueMap.get(priority)!);
        }

        const perkSpellCostSkillBonus = Perk.from(Game.getFormEx(idMap.get(perkSpellCostSkillBonusId)!));
        perkSpellCostSkillBonus?.setNthEntryValue(0, 1, -config.spellCostSkillBonus);
        perkSpellCostSkillBonus?.setNthEntryValue(1, 1, -config.spellCostSkillBonus);
        perkSpellCostSkillBonus?.setNthEntryValue(2, 1, -config.spellCostSkillBonus);
        perkSpellCostSkillBonus?.setNthEntryValue(3, 1, -config.spellCostSkillBonus);
        perkSpellCostSkillBonus?.setNthEntryValue(4, 1, -config.spellCostSkillBonus);

        const perkDunmerSpellCost = Perk.from(Game.getFormEx(idMap.get(perkDunmerSpellCostId)!));
        perkDunmerSpellCost?.setNthEntryValue(0, 1, -config.spellCostDunmerLightArmorFireDamagePctOffset * config.spellCostMalus);

        const perkImperialSpellCost = Perk.from(Game.getFormEx(idMap.get(perkImperialSpellCostId)!));
        perkImperialSpellCost?.setNthEntryValue(0, 1, -config.spellCostImperialHeavyArmorRestorationPctOffset * config.spellCostMalus);

        const perkArgonianSpellCost = Perk.from(Game.getFormEx(idMap.get(perkArgonianSpellCostId)!))!;
        for (const idx of [0, 1]) {
            const priority = perkArgonianSpellCost.getNthEntryPriority(idx);
            perkArgonianSpellCost?.setNthEntryValue(idx, 1, perkArgonianSpellCostOffsetValueMap.get(priority)! * config.spellCostMalus);
        }

        const perkThalmorSpellCost = Perk.from(Game.getFormEx(idMap.get(perkThalmorSpellCostId)!));
        perkThalmorSpellCost?.setNthEntryValue(0, 1, -config.spellCostThalmorLightArmorPctOffset * config.spellCostMalus);
        
        // Parse faction offsets config
        for (const key of Object.keys(config.factionalOffsets)) {
            const keyParts = key.split('|')[1];
            const [formId, filename] = keyParts.split('~');
            factionOffsets.set(Game.getFormFromFile(parseInt(formId, 16), filename)!.getFormID(), config.factionalOffsets[key]);
        }

        // Initialize player
        if (!player.hasPerk(perkPowerAtkSpellCostMalus)) {
            printConsole(`Adding perk ${perkPowerAtkSpellCostMalus?.getName()}`);
            player.addPerk(perkPowerAtkSpellCostMalus);
            updateQueue.add(player.getFormID());
        }

        if (config.enableSkillBonuses && !player.hasPerk(perkPowerAtkSkillBonus)) {
            player.addPerk(perkPowerAtkSkillBonus);
            player.addPerk(perkSpellCostSkillBonus);
            updateQueue.add(player.getFormID());
        } else if (!config.enableSkillBonuses && player.hasPerk(perkPowerAtkSkillBonus)) {
            player.removePerk(perkPowerAtkSkillBonus);
            player.removePerk(perkSpellCostSkillBonus);
            updateQueue.add(player.getFormID());
        }

        if (config.useCloak) {
            idMap.set(cloakHitEffectId, Game.getFormFromFile(cloakHitEffectId, 'ActionSpeedSP.esp')!.getFormID());
            idMap.set(cloakAppliedSpellId, Game.getFormFromFile(cloakAppliedSpellId, 'ActionSpeedSP.esp')!.getFormID());
            idMap.set(cloakAppliedEffectId, Game.getFormFromFile(cloakAppliedEffectId, 'ActionSpeedSP.esp')!.getFormID());

            const cloakSpell = Spell.from(Game.getFormFromFile(cloakSpellId, 'ActionSpeedSP.esp'));
            if (!player.hasSpell(cloakSpell)) {
                player.addSpell(cloakSpell, false);
            }
        }

        printConsole(`Action Speed SP initialized.`);
    }

    const updateQueue = new Set<number>();

    on('update', () => {
        updateQueue.forEach(actorId => update(Actor.from(Game.getFormEx(actorId))));
        updateQueue.clear();
    });

    on('switchRaceComplete', (event) => {
        const actor = Actor.from(event.subject);
        if (!actor || !actor.getRace()){
            return;
        }

        const racialPerks = new Map<string, number>([
            ['dark elf', perkDunmerSpellCostId],
            ['imperial', perkImperialSpellCostId],
            ['argonian', perkArgonianSpellCostId],
        ]); 

        racialPerks.forEach((perkId, race) => {
            const perk = Perk.from(Game.getFormEx(idMap.get(perkId)!));
            const isRace = actor.getRace()!.getName().indexOf(race) > -1;
            if (isRace && !actor.hasPerk(perk)) {
                actor.addPerk(perk);
            } else if (!isRace && actor.hasPerk(perk)) {
                actor.removePerk(perk);
            }
        })

        updateQueue.add(event.subject.getFormID());
    })

    on('menuClose', (event) => {
        if (event.name === Menu.LevelUp) {
            updateQueue.add(Game.getPlayer()!.getFormID());
        }
    })

    on('equip', (equipEvent) => {
        handleEquipEvent(equipEvent);
    });

    on('unequip', (equipEvent) => {
        handleEquipEvent(equipEvent);
    });
    
    function handleEquipEvent(equipEvent: EquipEvent) {
        if (updateQueue.has(equipEvent.actor.getFormID())) {
            return;
        }

        const armor = Armor.from(equipEvent.baseObj);
        const weapon = Weapon.from(equipEvent.baseObj);
        
        if (!armor && !weapon) {
            return;
        }

        updateQueue.add(equipEvent.actor.getFormID());
    }

    const debugValues = new Array<number>();

    function update(actor: Actor | null) {
        if (!actor) {
            return;
        }

        if (config['debug'] as boolean) {
            debugValues[0] = actor.getActorValue(AV.Encumbrance);
            debugValues[1] = actor.getActorValue(AV.MovementSpeed);
            debugValues[2] = actor.getActorValue(AV.WeaponSpeedRight);
            debugValues[3] = actor.getActorValue(AV.WeaponSpeedLeft);
            debugValues[4] = actor.getActorValue(AV.StaminaRegen);
            debugValues[5] = actor.getActorValue(AV.MagickaRegen);
        }

        revertMaluses(actor);

        const factors = calculateEncumbrance(actor);

        const movementSpeedMalus = factors.encumbrance * raceFactionModifier(actor, factors, AV.MovementSpeed) * config.speedMultMalus;
        const weaponSpeedMalus   = factors.encumbrance * raceFactionModifier(actor, factors, AV.WeaponSpeedRight) * calculateWeaponSpeedMalusFactor(actor);
        const staminaRegenMalus  = factors.encumbrance * raceFactionModifier(actor, factors, AV.StaminaRegen) * config.staminaRateMultMalus;
        const magickaRegenMalus  = factors.encumbrance * raceFactionModifier(actor, factors, AV.MagickaRegen) * config.magickaRateMultMalus;

        let movementSpeedBonus = 0;
        let weaponSpeedBonus   = 0;
        let staminaRegenBonus  = 0;
        let magickaRegenBonus  = 0;

        if (config.enableSkillBonuses) {
            movementSpeedBonus = weightClassSkillValueGetters.get(factors.weightClass)!(actor) * movementSpeedSkillBonusFactors.get(factors.weightClass)!;
            weaponSpeedBonus   = (weaponSpeedSkillBonusFactors.get(factors.weapon?.getSkill()) || 0.0) * (factors.weapon ? actor.getActorValue(factors.weapon.getSkill()) : 0.0);
            staminaRegenBonus  = weightClassSkillValueGetters.get(factors.weightClass)!(actor) * staminaRegenSkillBonusFactors.get(factors.weightClass)!;
            magickaRegenBonus  = ['Conjuration', 'Destruction', 'Illusion', 'Alteration', 'Restoration'].map(skill => actor.getActorValue(skill)).reduce((a, b) => a + b) * config.magickaRateMultMagicSkillBonus;                         
        }

        const [packedMovementSpeedMalus, packedWeaponSpeedMalus, speedAVValue] = pack(movementSpeedMalus - movementSpeedBonus, weaponSpeedMalus - weaponSpeedBonus);
        const [packedStaminaRateMalus, packedMagickaRegenMalus, regenAVValue] = pack(staminaRegenMalus- staminaRegenBonus, magickaRegenMalus - magickaRegenBonus);

        actor.modActorValue(AV.MovementSpeed, -packedMovementSpeedMalus);
        actor.modActorValue(AV.WeaponSpeedRight, -0.01 * packedWeaponSpeedMalus);
        actor.modActorValue(AV.WeaponSpeedLeft, -0.01 * packedWeaponSpeedMalus);
        actor.modActorValue(AV.StaminaRegen, -packedStaminaRateMalus);
        actor.modActorValue(AV.MagickaRegen, -packedMagickaRegenMalus);

        actor.setActorValue(AV.Encumbrance, factors.encumbrance);
        actor.setActorValue(AV.MoveSpeedAndAttackSpeed, speedAVValue);
        actor.setActorValue(AV.StaminaRegenAndMagickaRegen, regenAVValue);

        if (config['debug'] as boolean) {
            const name = actor.getName() || actor.getLeveledActorBase()?.getName();
            printConsole(`${name}: ` +
                `Enc: ${debugValues[0].toFixed(1)} > ${factors.encumbrance.toFixed(1)} ` +
                `Spd: ${debugValues[1].toFixed(1)} > ${actor.getActorValue(AV.MovementSpeed).toFixed(1)} ` +
                `WpR: ${debugValues[2].toFixed(3)} > ${actor.getActorValue(AV.WeaponSpeedRight).toFixed(3)} ` +
                `WpL: ${debugValues[3].toFixed(3)} > ${actor.getActorValue(AV.WeaponSpeedLeft).toFixed(3)} ` +
                `Sta: ${debugValues[4].toFixed(1)} > ${actor.getActorValue(AV.StaminaRegen).toFixed(1)} ` +
                `Mag: ${debugValues[5].toFixed(1)} > ${actor.getActorValue(AV.MagickaRegen).toFixed(1)} `);
        }
    }

    function revertMaluses(actor: Actor) {
        // Revert previous changes
        const [moveSpeedMalus, weaponSpeedMalus] = unpack(actor.getActorValue(AV.MoveSpeedAndAttackSpeed));
        const [staminaRegenMalus, magickaRegenMalus] = unpack(actor.getActorValue(AV.StaminaRegenAndMagickaRegen));

        actor.modActorValue(AV.MovementSpeed, moveSpeedMalus);
        actor.modActorValue(AV.WeaponSpeedRight, 0.01 * weaponSpeedMalus);
        actor.modActorValue(AV.WeaponSpeedLeft, 0.01 * weaponSpeedMalus);
        actor.modActorValue(AV.StaminaRegen, staminaRegenMalus);
        actor.modActorValue(AV.MagickaRegen, magickaRegenMalus);
    }

    function calculateEncumbrance(actor: Actor) {
        const extraContainerChanges = getExtraContainerChanges(actor.getFormID());

        let encumbrance = 0.0;
        const weightClassCounts = [0, 0, 0];

        for (const entry of extraContainerChanges.filter(e => e.extendDataList)) {
            const armor = Armor.from(Game.getFormEx(entry.baseId));

            if (!armor) {
                continue;
            }

            for (const extraDataList of entry.extendDataList.filter(list => list.find(datum => datum.type === 'Worn'))) {
                weightClassCounts[armor.getWeightClass()]++;

                const extraCount = extraDataList.find(datum => datum.type === 'Count');
                let count = extraCount ? (extraCount as ExtraCount).count : 1;

                encumbrance += count * getEncumbrance(armor);
            }
        }

        const weightClass = weightClassCounts[0] >= 3 && weightClassCounts[1] < 3 ? WeightClass.Light
                          : weightClassCounts[1] >= 3                             ? WeightClass.Heavy
                          :                                                         WeightClass.None;

        const perkModifier = weightClass === WeightClass.Light && actor.hasPerk(Perk.from(Game.getFormEx(perkOffsetIds.get(WeightClass.Light)!))) ? (1 - config.lightArmorPerkOffsetPct)
                           : weightClass === WeightClass.Heavy && actor.hasPerk(Perk.from(Game.getFormEx(perkOffsetIds.get(WeightClass.Heavy)!))) ? (1 - config.heavyArmorPerkOffsetPct)
                           :                                                                                                                         1;

        const weapon = Weapon.from(actor.getEquippedWeapon(false)) || Weapon.from(actor.getEquippedWeapon(true));

        return new EncumbranceFactors(encumbrance * perkModifier, weapon, weightClass);
    }

    function getEncumbrance(armor: Armor) {
        const weightClass = armor.getWeightClass();
        const slotMask = armor.getSlotMask();

        const baseEncumbrance = baseEncumbrances.filter(([wtClass, slot]) => wtClass === weightClass && (slotMask & slot) > 0)
                                                .map(([_w, _s, base]) => base)
                                                .reduce((accum, val) => accum + val, 0);

        return baseEncumbrance + armor.getWeight();
    }

    function calculateWeaponSpeedMalusFactor(actor: Actor) {
        const weaponRight = actor.getEquippedWeapon(false);

        return weaponRight
            ? getWeaponSpeedMalusFactor(weaponRight)
            : getWeaponSpeedMalusFactor(actor.getEquippedWeapon(true));
    }

    function getWeaponSpeedMalusFactor(weapon: Weapon | null) {
        if (!weapon) {
            return 0.0
        }

        switch (weapon.getWeaponType()) {
            case WeaponType.Sword:
            case WeaponType.Dagger:
            case WeaponType.WarAxe:
            case WeaponType.Mace:
                return config.weaponSpeedMultOneHanderMalus;
            case WeaponType.Greatsword:
            case WeaponType.Battleaxe:
            case WeaponType.Warhammer:
                return config.weaponSpeedMultTwoHanderMalus;
            case WeaponType.Bow:
            case WeaponType.Crossbow:
                return config.weaponSpeedMultRangedMalus;
        }

        return 0.0;
    }

    function raceFactionModifier(actor: Actor, factors: EncumbranceFactors, malus: AV) {
        const racialOffsetsKey = Object.keys(config.racialOffsets).find(key => key.toLowerCase() === actor.getRace()?.getName()?.toLowerCase());
        const racialOffsets = racialOffsetsKey ? config.racialOffsets[racialOffsetsKey] : []
        const matchingRacialOffset = racialOffsets.find(offset => offsetMatches(actor, factors, malus, offset));

        const factionalOffsetsKey = Array.from(factionOffsets.keys()).find(formId => actor.getFactionRank(Faction.from(Game.getFormEx(formId))) >= 0);
        const factionalOffsets = (factionalOffsetsKey ? factionOffsets.get(factionalOffsetsKey) : []) ?? [];
        const matchingFactionalOffset = factionalOffsets.find(offset => offsetMatches(actor, factors, malus, offset));

        return (matchingRacialOffset ? (1.0 - matchingRacialOffset.pctOffset) : 1.0)
            * (matchingFactionalOffset ? (1.0 - matchingFactionalOffset.pctOffset) : 1.0);
    }

    function offsetMatches(actor: Actor, factors: EncumbranceFactors, malus: AV, offset: MalusOffset) {
        if (offset.malus !== malus) {
            return false;
        };

        if (offset.requiresShield && !actor.getEquippedShield()) {
            return false;
        }

        if (offset.weaponKeyword !== 'Any' && !(factors.weapon && isWeaponType(factors.weapon, offset.weaponKeyword))) {
            return false;
        }

        if (offset.armorKeyword !== 'Any' 
            && ((offset.armorKeyword === 'ArmorHeavy' && factors.weightClass !== WeightClass.Heavy)|| 
                (offset.armorKeyword === 'ArmorLight' && factors.weightClass !== WeightClass.Light))) {
            return false;
        }

        return true;
    }

    function isWeaponType(weapon: Weapon, keyword: string) {
        switch (keyword) {
            case 'WeapTypeSword':
                return weapon.getWeaponType() === WeaponType.Sword;
            case 'WeapTypeDagger':     
                return weapon.getWeaponType() === WeaponType.Dagger;
            case 'WeapTypeWarAxe':     
                return weapon.getWeaponType() === WeaponType.WarAxe;
            case 'WeapTypeMace':       
                return weapon.getWeaponType() === WeaponType.Mace;
            case 'WeapTypeGreatsword':
                return weapon.getWeaponType() === WeaponType.Greatsword;
            case 'WeapTypeBattleaxe':
                return weapon.hasKeyword(Keyword.from(Game.getFormEx(weaponTypeKeywords.WeapTypeBattleaxe)));
            case 'WeapTypeWarhammer':
                return weapon.hasKeyword(Keyword.from(Game.getFormEx(weaponTypeKeywords.WeapTypeWarhammer)));
            case 'WeapTypeBow':
                return weapon.getWeaponType() === WeaponType.Bow;
            case 'WeapTypeCrossbow':
                return weapon.getWeaponType() === WeaponType.Crossbow;
            default:
                printConsole(`Keyword ${keyword} is not a recognized weapon type.`);
                return false;
        }
    }

    if (config['useCloak'] as boolean) {
        // We shouldn't need this; the on('equip') event should catch everyone
        on('magicEffectApply', (event) => {
            if (event.effect.getFormID() === idMap.get(cloakHitEffectId) || event.effect.getFormID() === idMap.get(cloakAppliedEffectId)) {
                const target = Actor.from(event.target);

                if (!target) {
                    return;
                }

                let name : string | undefined = target.getName();
                if (!name || name.length < 1)
                    name = target.getLeveledActorBase()?.getName();

                switch(event.effect.getFormID()) {
                    case idMap.get(cloakHitEffectId):
                        const spell = Spell.from(Game.getFormEx(idMap.get(cloakAppliedSpellId)!));
                        target.addSpell(spell, false);
                        break;
                    case idMap.get(cloakAppliedEffectId):
                        updateQueue.add(target.getFormID());
                        break;
                }
            }
        });
    }

    function pack(value1: number, value2: number) {
        let component1 = Math.round(0.01 * Math.min(100, Math.abs(value1)) * 4096);
        component1 += ((value1 < 0) !== (component1 % 2 === 1)) ? -1 : 0;

        let component2 = Math.round(0.01 * Math.min(100, Math.abs(value2)) * 4096);
        component2 += ((value2 < 0) !== (component2 % 2 === 1)) ? -1 : 0;

        return [100 * component1 / 4096 * (component1 % 2 === 0 ? 1 : -1), 100 * component2 / 4096 * (component2 % 2 === 0 ? 1 : -1), component1 + 4096 * component2];
    }

    function unpack(value: number) {
        const component1 = value % 4096;
        const component2 = (value - component1) / 4096;
        return [100 * component1 / 4096 * (component1 % 2 === 0 ? 1 : -1), 100 * component2 / 4096 * (component2 % 2 === 0 ? 1 : -1)];
    }
};
