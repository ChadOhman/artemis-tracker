# Plan 5: Crew & Spacecraft Modals

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add crew information and spacecraft specifications as modal overlays accessible from the top bar, completing the informational panels of the dashboard.

**Architecture:** A reusable Modal component triggered by buttons in the TopBar. Crew modal shows 4 astronaut cards with bios and notable firsts. Spacecraft modal shows SLS Block 1 and Orion specs in a grid layout. Both modals match the dark mission-control theme.

**Tech Stack:** React, CSS

---

## File Structure

```
src/
├── components/
│   ├── TopBar.tsx                      # Add crew/spacecraft buttons
│   ├── shared/
│   │   └── Modal.tsx                   # Reusable modal overlay
│   └── modals/
│       ├── CrewModal.tsx               # Crew information cards
│       └── SpacecraftModal.tsx         # SLS + Orion specs
```

---

### Task 1: Modal Component + Crew Modal + Spacecraft Modal

**Files:**
- Create: `src/components/shared/Modal.tsx`
- Create: `src/components/modals/CrewModal.tsx`
- Create: `src/components/modals/SpacecraftModal.tsx`
- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Read existing TopBar**

Read src/components/TopBar.tsx to understand the current structure and where to add buttons.

- [ ] **Step 2: Create Modal component**

A reusable modal overlay component:
- Dark semi-transparent backdrop that closes on click
- Centered content panel with max-width, max-height, overflow-y scroll
- Close button (X) in top-right
- Title in header
- Escape key closes
- Matches dark theme

```tsx
// src/components/shared/Modal.tsx
"use client";
import { useEffect, useCallback, ReactNode } from "react";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ title, isOpen, onClose, children, maxWidth = "800px" }: ModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0, 0, 0, 0.8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-panel)",
        borderRadius: "8px",
        maxWidth, width: "100%",
        maxHeight: "85vh",
        overflowY: "auto",
        position: "relative",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-panel)",
          position: "sticky", top: 0,
          background: "var(--bg-secondary)",
          zIndex: 1,
        }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-cyan)", letterSpacing: "2px" }}>
            {title}
          </span>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-secondary)",
            fontSize: "18px", cursor: "pointer", fontFamily: "var(--font-mono)",
            padding: "4px 8px",
          }}>✕</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create CrewModal**

Four crew cards with:
- Name, role, agency, flag emoji
- Brief bio
- Notable firsts highlighted in accent color

Crew data:
1. Reid Wiseman — Commander, NASA 🇺🇸 — Navy Captain, test pilot (F-35, F/A-18). ISS Expedition 40/41 (2014). Former Chief of the Astronaut Office.
2. Victor Glover — Pilot, NASA 🇺🇸 — Naval aviator and test pilot. SpaceX Crew-1, 4 spacewalks. FIRST person of color beyond low Earth orbit.
3. Christina Koch — Mission Specialist 1, NASA 🇺🇸 — Electrical engineer. 328 days on ISS (women's record at the time). First all-female spacewalks. FIRST woman beyond low Earth orbit.
4. Jeremy Hansen — Mission Specialist 2, CSA 🇨🇦 — CF-18 fighter pilot, Canadian Space Agency. First spaceflight. FIRST Canadian & non-U.S. citizen beyond LEO.

Layout: 2x2 grid of cards on desktop.

- [ ] **Step 4: Create SpacecraftModal**

Two sections side by side:

**SLS Block 1 (Rocket):**
- Height: 322 ft (98 m)
- Thrust: 8.8M lbs at liftoff
- Engines: 4x RS-25 + 2x SRBs
- Payload LEO: 77 t
- Liftoff Weight: 5.75M lbs (2,608 metric tons)
- Type: Super Heavy — most powerful ever flown

**Orion "Integrity" (Spacecraft):**
- Crew: 4 astronauts
- Duration: 21 days max capability
- Service Module: ESM (European Space Agency)
- Heat Shield: 16.5 ft, AVCOAT ablative
- Re-entry Speed: 40,000 km/h (~25,000 mph)
- Solar Arrays: ~62 ft wingspan

Layout: two columns, each with a header (ROCKET / SPACECRAFT in accent color) and a grid of spec cards.

- [ ] **Step 5: Add buttons to TopBar**

Add a crew button (👥 or "CREW" text) and spacecraft button ("VEHICLE" text) to the TopBar that open the respective modals. Place them near the right side of the top bar. Use useState in TopBar to manage modal open state.

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/Modal.tsx src/components/modals/ src/components/TopBar.tsx
git commit -m "feat: add crew and spacecraft info modals accessible from top bar"
```
