---
title: "Overdawn — Youngje Park"
description: "A 2.5D bullet-time shooter built in Unity. Director and lead engineer."
---

#### Selected work — 2025, Director / Lead engineer

# Overdawn.

A 2.5D bullet-time shooter built in Unity. As a blood-thirst merc in the dystopian city of Andrean, slow time, find your flow state, and punch a hole through the people trying to kill you.

- **Status** — Ongoing
- **Type** — Commercial
- **Duration** — ~3 years
- **Stack** — Unity (C#), SteamAPI, GitHub, Odin Inspector, Yarn Spinner
- **Role** — Game director, lead engineer, technical designer, artist

#### 01

## Trailer.

https://www.youtube.com/watch?v=E7KgVHyf0ak

Overdawn is a narrative-driven game about memory and consequence. The trailer hints at the world, characters, and a few seconds of the core combat loop — slow time, line up an arc, fire.

[Linktree](https://linktr.ee/overdawn) [Steam Store](https://store.steampowered.com/app/3519070/Overdawn/)

#### 02

## Awards & recognition.

- 2025 Game Development World Championship — Best Student Game finalist.
- Tencent GWB 2025 — Student Category, bronze.
- 2025 SAGE — Design runner-up.
- Featured at the USC Games Expo.

![GDWC finalist badge|147](public/projects/gdwcBadge.png)

[GDWC entry](https://thegdwc.com/games/b665386f-fdca-4ca3-aa1c-a46ac55c31b4) [SAGE Awards](https://sageawards.promote.fyi/)

#### 03

## Founding a team.

After releasing Dawngeon in high school, I started Overdawn as a solo project. It iterated for years — from a PvP game into, finally, a bullet-hell, bullet-time shooter. Then I became a college student. I brought the game to USC and started assembling a team of people who shared the vision. Recruiting wasn't easy, but through game-development clubs and networking events the team grew to 30+ — programmers, artists, designers, writers. As director and lead engineer of Overdawn, I'm grateful every day for the people who keep this thing alive.

I led the design and implementation of 60+ gameplay systems, bridging creative vision and engineering constraints in Unity and C#.

#### 04

## System engineering — the architecture.

A modular, scalable architecture in Unity and C# that lets distinct game systems — controls, level management, quests — develop in parallel without stepping on each other.

**Scenes.** A central SceneManager handles transitions, async load and unload, and a PersistentGameplay layer that survives scene changes.

**State.** A singleton GameManager owns the high-level states — Main Menu, In-Game, Paused, Game Over — and the transitions between them.

**Events.** A decoupled event bus connects systems without coupling their lifetimes. Same backbone underneath the sequence system.

**Persistence.** A save/load layer that retains player choices and progression across sessions.

![Overdawn architecture diagram](public/projects/ODArchitectureSimplified.png)

#### Debug tools

![Overdawn debug console](public/projects/ODConsole.png)

### An in-game console.

An in-game console for executing commands, inspecting variables, and editing state at runtime — built early because the cost of bad debugging compounds across a 3-year project.

#### Designer tools

![Custom Painter tool](public/projects/ODPainter.png)

### Custom Unity editor tools.

Built on Odin Inspector. A custom Painter for terrain and prop placement on our 2.5D levels. A Scene Switcher and Scene Behavior pair so designers can manage transitions and per-scene logic without leaving the editor.

![Scene switcher](public/projects/ODSceneSwitcher.png)
![Scene behavior tool](public/projects/ODSceneBehavior.png)

#### Quest system

![Quest preview UI](public/projects/ODQuestPreview.png)

### Authoring the player's day.

A quest system covering objectives, progress, and rewards across main quests and optional side objectives. Quests are ScriptableObjects so designers can author and iterate without code. Bound directly to the UI for clear, immediate feedback.

![Quest system editor](public/projects/ODQuestSystem.png)

#### Navigation

![Cross-scene navigation](public/projects/ODNavigation.gif)

### A seamless cross-scene NavMesh.

Unity ships basic pathfinding through NavMesh, but Overdawn's async, multi-scene levels asked for more. Each scene is indexed with valid navigation points; a NavigationManager calculates paths across scenes via BFS so NPCs and enemies can move through the world regardless of scene boundaries.

The same layer powers the transportation system that subways and elevators ride on — they pivot on the player's currently active NavMesh, which determines which scene's behavior is active at any moment.

![Seamless elevator](public/projects/ODElevator.png)

#### Sequence graph

![XNode graph (v2)](public/projects/ODXNODE.png)

### Three iterations to a working narrative tool.

The sequence system is event-driven for modularity. Dialog runs through Yarn Spinner. Authoring the surrounding sequences took three rewrites:

**v1.** A simple GameObject-based system. Quickly unmanageable as sequences grew.

**v2.** A graph built with XNode for visual scripting. Better, but Unity IMGUI made it slow and unfriendly.

**v3.** Unity 6's Behavior Tree. Originally for character behaviors, but the model fit our actor-centric authoring far better. Designers gained real flexibility over individual actions.

![Behavior tree authoring (v3)](public/projects/ODFINALSGB.png)

#### 05

## Gameplay programming.

#### Player

![Character hierarchy](public/projects/ODCharacterHierarchy.png)

### An expandable actor hierarchy.

Responsive movement, combat, and interaction. The actor class hierarchy is built to extend — new behaviors land as subclasses without touching the player core. A custom animation layer drives our 2.5D environments across multiple camera angles. Object structure is tuned for the dense interactions a bullet-time shooter demands.

#### Weapons & projectiles

![Weapon system](public/projects/ODWeapon.png)

### Pooled, behavior-driven projectiles.

A flexible weapon system that makes new weapons cheap to add. Projectiles share a pool to keep performance steady through the heaviest combat. Behaviors compose: homing, bouncing, AoE. Damage flows through an IDamageable interface, keeping the health system decoupled from any particular weapon.

![Projectile system](public/projects/ODProjectile.png)
![Enemy behavior](public/projects/ODRev.png)

#### Enemies

### FOV, cover, and a behavior tree.

Multiple enemy archetypes, each with distinct attacks and decision logic. The Behavior Tree drives moment-to-moment choices; an FOV system and take-cover behavior add depth so combat doesn't collapse into a shooting gallery.

#### UI

![Inventory UI](public/projects/ODInventory.png)

### HUD, inventory, the rest.

Health, ammo, inventory — and the surrounding chrome that ties the rest of the UI together. Built so the player always knows what's going on without ever having to stop to read.

![Skill tree](public/projects/ODSkill.png)

#### Skill tree

### Acquire, upgrade, plan ahead.

A skill system tied to a visual skill-tree UI — players can see what's coming, weigh trade-offs, and own their build before committing.

[← Back to index](/)
