---
title: "Thang — Youngje Park"
description: "A casual multiplayer freeze-tag shooter on UE5, with a Next.js + MongoDB backend on AWS GameLift."
---

#### Selected work — Multiplayer system engineer

# Thang.

A casual multiplayer shooter where players compete to freeze each other in a fast, action-packed arena. Architected the full ecosystem — UE5 client, Next.js / Node.js / MongoDB backend, Firebase Auth, AWS GameLift.

![Thang poster](public/projects/ThangHorizontal.png)

#### Vital signs

- **Status** — Ongoing
- **Type** — Overdawn Studio commercial project
- **Duration** — 2 months
- **Stack** — Unreal Engine 5, Next.js, MongoDB, Firebase Auth, AWS GameLift
- **Role** — Multiplayer system engineer, technical designer

[Learn more](https://thang-backend.vercel.app/)

#### 01

## What I built.

#### Core systems

### Server-side rewind for latency-free input.

Engineered 5+ core systems, including a server-side rewind algorithm for latency compensation that lets shooting, freeze states, and tag mechanics all feel instantaneous regardless of the player's connection. The whole game balances on this — without SSR the rest doesn't matter.

#### Unreal Engine

### Movement, shooting, freeze, power-ups.

A network of gameplay systems in C++ and Blueprints — player movement, shooting mechanics, freeze states, power-ups — all designed to compose with the rewind layer underneath them.

#### Full-stack architecture

### Client, backend, identity, deploy.

Stitched the UE5 client to a RESTful Next.js / Node.js backend with MongoDB underneath. Identity flows through Firebase Auth; the backend lives on Vercel. The seam between the client and the web stack had to be invisible to players, and is.

#### Party & matchmaking

### End-to-end on AWS GameLift.

Designed and shipped the party and matchmaking UX on AWS GameLift, prioritizing a frictionless flow across distributed dedicated server instances. The shortest path from "open the game" to "in a match with friends" is the one I cared about most.

[← Back to index](/)
