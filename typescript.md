# TypeScript Data Modeling: Sum Types → Generics → Conditionals


A progression for modeling data and process state in TypeScript, with examples, pitfalls, and when to reach for heavier tools.


## The Ordering


1. **Sum types first** — model the domain. Discriminated unions make impossible states unrepresentable.
2. **Generics second** — only on the axis that actually varies, placed on the arms that need them.
3. **Conditionals last** — for deriving views *out of* a model, never for defining the core shape.


Reaching for generics and conditionals before you know the shape of your data is how you end up with `Result<T, E, M, C>` monstrosities.


---


## Persisted Data vs Process State


The right ordering differs:


- **Persisted data** (DB rows, API payloads): schema first (Zod/Valibot) → infer types → sum types fall out.
- **Process state** (reducers, workflows): sum types first (states are discrete) → generics for the payload → conditionals only for derived views.


---


## Stage 1 — Sum types model the domain


```ts
type PaymentMethod =
  | { kind: 'card'; last4: string; brand: 'visa' | 'mc' | 'amex' }
  | { kind: 'bank'; accountLast4: string; routing: string }
  | { kind: 'wallet'; provider: 'apple' | 'google'; deviceId: string };


function describe(p: PaymentMethod): string {
  switch (p.kind) {
    case 'card':   return `${p.brand} •••• ${p.last4}`;
    case 'bank':   return `Bank •••• ${p.accountLast4}`;
    case 'wallet': return `${p.provider} Pay`;
  }
}
```


The `kind` discriminant is load-bearing. Without it, TS can only narrow by structural checks (`'last4' in p`), which is fragile.


Prefer string literal unions over `enum` — they distribute through unions better and have no runtime cost.


---


## Stage 2 — Generics over the sum, not instead of it


```ts
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };
```


Generics appear **only on the arms that need them**. Don't parametrize `loading` with `<T>` — it's noise.


### Bad pattern


```ts
// ❌ flat shape, lost invariants
type AsyncState<T> = { status: string; data?: T; error?: Error };
```


Every field becomes optional, every consumer does null checks, and the invariant "if status is success then data exists" is thrown away.


### Discipline


- `T` tracks **one axis of variation**. If you have `<T, U, V, W>`, split the type or some params are really discriminants in disguise.
- Default generic params where you can (`E = Error`) so the common case reads `Job<X>`, not `Job<X, Error>`.
- Ask: is `E` worth parametrizing? In most apps, errors converge to one shape (a tagged `AppError`). If so, drop `E`.


---


## Stage 3 — Conditionals for derived views only


Conditionals earn their keep when **deriving** a type from another, not authoring one from scratch.


```ts
type DataOf<S> = S extends { status: 'success'; data: infer D } ? D : never;
type X = DataOf<AsyncState<User>>; // User


type ExtractByKind<T, K> = T extends { kind: K } ? T : never;
type CardPayment = ExtractByKind<PaymentMethod, 'card'>;
```


When you reach for a conditional, ask: **could a well-named sum type have prevented this?** Half the conditional-type gymnastics in the wild is recovering information that was thrown away by a bad earlier model.


### Suspect signals (all hint at a flattened model upstream)


- `T extends { kind: 'X' } ? ... : never` to recover a branch
- `infer` to pull a field out of an object that could have been its own arm
- `as` casts inside generic helpers
- `NonNullable<T['data']>` to strip optionality you added yourself


---


## Distribution is a default, not a feature


```ts
type EventOf<P> = P extends { kind: infer K } ? { type: `${string & K}_done` } : never;
type E = EventOf<PaymentMethod>;
// { type: 'card_done' } | { type: 'bank_done' } | { type: 'wallet_done' }
```


Distribution happens automatically when a naked type parameter hits `extends`. This is usually what you want. Suppress it with tuple-wrapping when you need to:


```ts
type IsUnion<T> = [T] extends [infer U] ? (U extends U ? 1 : 2) : never;
```


If you're writing `[T] extends [X]` more than occasionally, your type is doing too much. Split it.


---


## Where sum-types-first prevents conditional-type gymnastics


### Example 1 — Form fields


**Bad:**


```ts
type Field = {
  type: 'text' | 'number' | 'select';
  value: string | number | string[];
  options?: string[];
  min?: number;
  max?: number;
};


// forces this kind of workaround:
type ValueFor<T extends Field['type']> =
  T extends 'text'   ? string   :
  T extends 'number' ? number   :
  T extends 'select' ? string[] :
  never;


function getValue<T extends Field['type']>(f: Field & { type: T }): ValueFor<T> {
  return f.value as ValueFor<T>; // ← `as` is the tell — TS can't prove it
}
```


**Good:**


```ts
type Field =
  | { type: 'text';   value: string }
  | { type: 'number'; value: number; min?: number; max?: number }
  | { type: 'select'; value: string[]; options: string[] };


function getValue(f: Field) {
  return f.value; // TS knows the type per branch — no conditional, no cast
}
```


### Example 2 — API response


**Bad:**


```ts
type Response<T> = { ok: boolean; data?: T; error?: string };
type DataWhenOk<R> = R extends { ok: true; data: infer D } ? D : never;
```


**Good:**


```ts
type Response<T> =
  | { ok: true;  data: T }
  | { ok: false; error: string };


if (res.ok) res.data;   // narrows, no optionals
else        res.error;
```


**Rule of thumb:** if two fields are only valid together (or only together under a certain discriminant), they belong in the same arm of a union, not as siblings with `?` on both.


---


## Process State — worked example: `Job<T>`


### Stage 1: enumerate the states


```ts
type Job =
  | { state: 'queued';    queuedAt: Date }
  | { state: 'running';   startedAt: Date; progress: number }
  | { state: 'succeeded'; result: unknown; completedAt: Date }
  | { state: 'failed';    error: Error; failedAt: Date }
  | { state: 'cancelled'; cancelledAt: Date };
```


`progress` can't exist on `queued`. `result` can't exist on `failed`. Impossible states are unrepresentable.


**State discipline:** if the UI renders it differently, it's its own state. If not, it's a boolean flag on an existing state. Don't proliferate states for internal bookkeeping.


### Stage 2: generic over the varying axis


```ts
type Job<T, E = Error> =
  | { state: 'queued';    queuedAt: Date }
  | { state: 'running';   startedAt: Date; progress: number }
  | { state: 'succeeded'; result: T; completedAt: Date }
  | { state: 'failed';    error: E; failedAt: Date }
  | { state: 'cancelled'; cancelledAt: Date };


type ReportJob = Job<ReportUrl>;
type UploadJob = Job<{ fileId: string; bytes: number }>;
```


### Stage 3: derived views


```ts
type ResultOf<J>   = J extends { state: 'succeeded'; result: infer R } ? R : never;
type Terminal<J>   = J extends { state: 'succeeded' | 'failed' | 'cancelled' } ? J : never;


type Next<S extends Job<unknown>['state']> =
  S extends 'queued'    ? 'running' | 'cancelled' :
  S extends 'running'   ? 'succeeded' | 'failed' | 'cancelled' :
  S extends 'succeeded' | 'failed' | 'cancelled' ? never :
  never;
```


`Next<S>` is the legitimate use of conditionals: encoding a rule that can't be expressed as a plain sum.


---


## Where this ordering breaks down


### Breakdown 1 — State explosion from orthogonal flags


Pure sum-type-per-state assumes a clean chain. Orthogonal attributes (`isPaused`, `hasWarnings`, `retryCount`) explode combinatorially.


```ts
// ❌ forcing orthogonal flags into the discriminant
type Job =
  | { state: 'running'; progress: number }
  | { state: 'running_paused'; progress: number }
  | { state: 'running_with_warnings'; progress: number; warnings: Warning[] }
  | { state: 'running_paused_with_warnings'; /* ... */ }
  // 16 arms and climbing
```


**Fix — nested model.** Outer record for cross-cutting attributes, inner sum for the state machine.


```ts
type LifecycleState =
  | { kind: 'queued' }
  | { kind: 'running'; progress: number; paused: boolean }
  | { kind: 'succeeded'; result: unknown }
  | { kind: 'failed'; error: Error };


type Job = {
  id: string;
  lifecycle: LifecycleState;   // the state machine
  warnings: Warning[];         // accumulates across all states
  retryCount: number;          // accumulates across all states
  history: StateChange[];      // accumulates across all states
};
```


**Discipline:** a field belongs in the **sum** if it's meaningful in exactly one state. It belongs in the **outer record** if it accumulates or persists across states. Getting this split wrong is the #1 cause of a type that "feels wrong" but you can't say why.


### Breakdown 2 — Statecharts (parallel regions)


Multiple concurrent state machines in one entity. A media player has:


- Playback: idle / loading / playing / paused
- Network: online / offline / reconnecting
- Captions: off / on


Nested record works up to a point:


```ts
type Player = {
  playback: { kind: 'idle' } | { kind: 'loading' } | { kind: 'playing' } | { kind: 'paused' };
  network:  { kind: 'online' } | { kind: 'offline' } | { kind: 'reconnecting' };
  captions: { kind: 'off' }   | { kind: 'on'; lang: 'en' | 'es' };
};
```


But cross-region rules ("can't play while offline", "auto-pause on network drop") become hand-written guards in reducers. TS can't enforce correlations *between* sum types easily.


**Decision rule:**


| Situation | Tool |
|---|---|
| 1 region, <10 states, <3 guards | Plain sum type + reducer |
| 1 region, many guards, want exhaustiveness | Typed transition table (below) |
| 2 regions, no cross-region rules | Nested record of sums |
| 2+ regions with cross-region guards/effects | XState |
| Drawing a state chart on a whiteboard to explain it | XState (the whiteboard IS the model) |


### Breakdown 3 — Persistence (DB shape ≠ runtime shape)


A discriminated union doesn't fit in a SQL row. The row shape is necessarily flat and nullable:


```ts
type JobRow = {
  id: string;
  state: 'queued' | 'running' | 'succeeded' | 'failed';
  queued_at: string | null;      // ISO strings, not Date
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  progress: number | null;
  result_json: string | null;
  error_json: string | null;
};
```


**Mistake:** trying to make *one* type serve both runtime and storage. This poisons every consumer with optionals.


**Fix:** keep two types and a parser between them.


```ts
function toJob<T>(row: JobRow, parseResult: (s: string) => T): Job<T> {
  switch (row.state) {
    case 'queued':
      return { state: 'queued', queuedAt: new Date(row.queued_at!) };
    case 'running':
      return { state: 'running', startedAt: new Date(row.started_at!), progress: row.progress! };
    // ...
  }
}
```


The `!`s are localized to the parser — one place, one responsibility. Everywhere else works with the clean `Job<T>`.


Same principle applies to API payloads, form state vs submitted values, and wire formats.


---


## The Middle Ground — Typed Transition Table (complete example)


Between hand-rolled reducers and full XState: a typed transition table. Works when you have one region with many states/guards and want compile-time exhaustiveness without pulling in a library.


### 1. Domain


```ts
type State =
  | { kind: 'idle' }
  | { kind: 'loading'; url: string }
  | { kind: 'ready';   url: string; durationMs: number }
  | { kind: 'playing'; url: string; durationMs: number; positionMs: number }
  | { kind: 'paused';  url: string; durationMs: number; positionMs: number }
  | { kind: 'error';   message: string };


type Event =
  | { type: 'LOAD';      url: string }
  | { type: 'LOADED';    durationMs: number }
  | { type: 'LOAD_FAIL'; message: string }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK';      positionMs: number }
  | { type: 'STOP' };


type Context = {
  volume: number;
  muted: boolean;
  isOnline: boolean;
};
```


### 2. Transition table type


```ts
type Kind      = State['kind'];
type EventType = Event['type'];


type StateOf<K extends Kind>      = Extract<State, { kind: K }>;
type EventOf<T extends EventType> = Extract<Event, { type: T }>;


type Transitions = {
  [K in Kind]: {
    [T in EventType]?: (state: StateOf<K>, event: EventOf<T>, ctx: Context) => State;
  };
};
```


- `[K in Kind]` is **required** — new state = compile error until you add a row.
- `[T in EventType]?` is **optional** — not every state handles every event.


### 3. The table


```ts
const transitions: Transitions = {
  idle: {
    LOAD: (_s, e) => ({ kind: 'loading', url: e.url }),
  },


  loading: {
    LOADED:    (s, e) => ({ kind: 'ready', url: s.url, durationMs: e.durationMs }),
    LOAD_FAIL: (_s, e) => ({ kind: 'error', message: e.message }),
    STOP:      () => ({ kind: 'idle' }),
  },


  ready: {
    PLAY: (s, _e, ctx) =>
      ctx.isOnline
        ? { kind: 'playing', url: s.url, durationMs: s.durationMs, positionMs: 0 }
        : s, // guard: refuse, return same state = no-op
    STOP: () => ({ kind: 'idle' }),
  },


  playing: {
    PAUSE: (s) => ({ ...s, kind: 'paused' }),
    SEEK:  (s, e) => ({ ...s, positionMs: clamp(e.positionMs, 0, s.durationMs) }),
    STOP:  () => ({ kind: 'idle' }),
  },


  paused: {
    PLAY:  (s, _e, ctx) => (ctx.isOnline ? { ...s, kind: 'playing' } : s),
    SEEK:  (s, e) => ({ ...s, positionMs: clamp(e.positionMs, 0, s.durationMs) }),
    STOP:  () => ({ kind: 'idle' }),
  },


  error: {
    LOAD: (_s, e) => ({ kind: 'loading', url: e.url }),
    STOP: () => ({ kind: 'idle' }),
  },
};


function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
```


Inside each handler, `s` and `e` are fully narrowed. `s.url` works in `playing` but errors in `idle`.


### 4. Reducer


```ts
function reduce(state: State, event: Event, ctx: Context): State {
  const row = transitions[state.kind];
  const handler = (row as Record<string, unknown>)[event.type] as
    | ((s: State, e: Event, c: Context) => State)
    | undefined;


  return handler ? handler(state, event, ctx) : state;
}
```


One localized cast — unavoidable because TS can't prove at the lookup site that `state.kind` and `event.type` came from the same row. Every *definition* in the table is still fully type-checked.


### 5. Usage


```ts
let state: State = { kind: 'idle' };
const ctx: Context = { volume: 0.8, muted: false, isOnline: true };


state = reduce(state, { type: 'LOAD', url: 'song.mp3' }, ctx);
// → { kind: 'loading', url: 'song.mp3' }


state = reduce(state, { type: 'LOADED', durationMs: 180_000 }, ctx);
// → { kind: 'ready', url: 'song.mp3', durationMs: 180000 }


state = reduce(state, { type: 'PLAY' }, { ...ctx, isOnline: false });
// → unchanged (guard refused)


state = reduce(state, { type: 'PLAY' }, ctx);
// → { kind: 'playing', url, durationMs, positionMs: 0 }


state = reduce(state, { type: 'SEEK', positionMs: 30_000 }, ctx);
// → { kind: 'playing', ..., positionMs: 30000 }


state = reduce(state, { type: 'PAUSE' }, ctx);
// → { kind: 'paused', ..., positionMs: 30000 }
```


### 6. Exhaustiveness demo


Adding a new state like `buffering`:


```ts
type State =
  | /* ...existing arms... */
  | { kind: 'buffering'; url: string; durationMs: number; positionMs: number };
```


TS immediately flags `transitions`:


> Property `'buffering'` is missing in type `'{ idle: ...; loading: ...; ... }'`.


You cannot ship a new state without deciding what events it handles. Exhaustiveness is enforced at the *table* level — catch it once, not once per reducer.


Adding a new event does **not** force you to handle it in every state. This is almost always the right tradeoff — new events matter in a few states, not all.


### 7. Side effects


**Option A — return effects alongside state:**


```ts
type Effect =
  | { type: 'AUDIO_PLAY';  url: string; at: number }
  | { type: 'AUDIO_PAUSE' }
  | { type: 'AUDIO_STOP' };


type Transitions = {
  [K in Kind]: {
    [T in EventType]?: (
      s: StateOf<K>, e: EventOf<T>, ctx: Context
    ) => { next: State; effects?: Effect[] };
  };
};
```


**Option B — keep reducer pure, run effects in a separate on-transition function** that compares `prev.kind` and `next.kind`. Cleaner separation, a bit more plumbing.


Pick A if effects are tightly coupled to the event. Pick B if you want the reducer provably pure for testing.


### 8. Limits of the middle ground


Graduate to XState when you hit:


1. **Nested states** — `playing` with substates `playing.withCaptions` and `playing.plain`.
2. **Parallel regions** — more than two coordinated machines.
3. **Delayed transitions** — "after 5s of loading, go to timeout."
4. **Activities** — things that run *while in* a state (polling intervals).


---


## Adjacent tools worth knowing


### `as const` + `satisfies`


Often replaces what people reach for generics and conditionals to do:


```ts
const routes = {
  home:  { path: '/',       auth: false },
  admin: { path: '/admin',  auth: true  },
} as const satisfies Record<string, RouteConfig>;


type RouteName = keyof typeof routes; // 'home' | 'admin'
```


Sum type derived from data, without writing one.


### Branded types for primitives


```ts
type UserId = string & { __brand: 'UserId' };
```


Catches more bugs than most generic machinery.


### Parse, don't validate


Zod/Valibot schemas at the boundary → inferred types flow inward. Much of the conditional-type work disappears because bad data never enters the type system.


---


## Summary rules


1. **Sum type first** — enumerate states/variants. If you can't list them, you don't understand the domain yet.
2. **Generic on the varying axis only** — one generic per axis, placed on arms that use it. Default where you can.
3. **Conditionals for projections only** — `ResultOf`, `Terminal`, transition rules. Never for the core shape.
4. **Two fields only valid together belong in the same arm**, not as siblings with `?` on both.
5. **Cross-cutting attributes go in an outer record**, not smuggled into every arm of a union.
6. **Runtime shape ≠ storage shape** — keep two types and a parser when persistence is involved.
7. **Graduate tools when the domain demands it** — plain sum → nested record → typed transition table → XState.






























