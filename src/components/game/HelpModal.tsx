"use client";

import { ReactNode, useState } from "react";
import Modal from "./Modal";

type HelpModalProps = {
  onClose: () => void;
};

type TabKey = "rules" | "tools";

const TABS: { key: TabKey; label: string }[] = [
  { key: "rules", label: "Rules" },
  { key: "tools", label: "Tools" },
];

/* ---------- Reusable layout pieces ----------
   These mirror the typographic hierarchy of a good "How to Play" page:
   a big title, a muted intro, numbered sections with sub-headings, tidy
   bulleted lists, and small footnotes. Swap the copy below to taste. */

/** The large screen title shown at the top of a tab's content. */
function TabTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
      {children}
    </h2>
  );
}

/** Muted lead paragraph that sits under the title. */
function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-relaxed text-slate-500">{children}</p>
  );
}

/** A numbered section heading, e.g. "1. The Setup". */
function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-7">
      <h3 className="flex items-baseline gap-2 text-lg font-bold text-ink">
        <span className="text-slate-400">{number}.</span>
        {title}
      </h3>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </section>
  );
}

/** Bulleted list with muted markers; two columns from the `sm` breakpoint up. */
function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span className="mt-0.5 text-slate-400">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Small muted footnote, e.g. an exception or "coming soon" caveat. */
function Note({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs text-slate-400">{children}</p>;
}

/** A single tool entry: name + short description. */
function Tool({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <h4 className="text-sm font-bold text-ink">{name}</h4>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

/* ---------- Tab content ----------
   Rules is a styled starter template — edit the copy freely.
   Tools describes the real tools already in the game. */

function RulesTab() {
  return (
    <div>
      <TabTitle>How to Play</TabTitle>
      <Lead>
        In Forehead Mystery, every player must identify their own card. The
        catch: you can see everyone else&apos;s cards but not your own. Help
        your teammates discover theirs, and work together to figure out yours.
      </Lead>

      <Section number={1} title="The Setup">
        <p>
          Every player is dealt a single card that stays hidden from them but is
          visible to everyone else at the table.
        </p>
        <BulletList
          items={[
            "You see all other players' cards, never your own.",
            "Cards range from Ace (low) through King (high).",
            "There are no duplicate cards, all are from the same suit",
            "Each game deals a fresh hand to every player.",
          ]}
        />
      </Section>

      <Section number={2} title="Round 1: The Ranking Phase">
        <p>
          Look at your teammates&apos; cards and guess your rank in the group.
          If you're an early player, base your guess on the cards and
          probability. However, if you're a later player, you may consider your
          teammates' guesses to help narrow down your position. Your goal here
          is not merely to be correct, but rather to communicate information to
          your teammates.
        </p>
      </Section>

      <Section number={3} title="Round 2: The Guessing Phase">
        <p>
          Now that everyone has guessed their rank, it&apos;s time to guess your
          card. When it&apos;s your turn, select the card you think you have.
          Use the deduction tools to help! You can reference the deduction tools
          in the tab above.
        </p>
        <p>If everyone guesses correctly, you've won!</p>
      </Section>
    </div>
  );
}

function ToolsTab() {
  return (
    <div>
      <TabTitle>Your Tools</TabTitle>
      <Lead>
        A few helpers are built into the table to keep track of your reads and
        keep the game lively. Everything here is available during play.
      </Lead>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Tool name="Scratchpad">
          Privately mark each card as possible, impossible, or most likely. Your
          markings stay on your device only — nobody else can see them.
        </Tool>
        <Tool name="Window View (ⓘ)">
          Tap the ⓘ next to any player to open their Window View and see the
          game exactly as it looks from their seat.
        </Tool>
        <Tool name="Emote">
          Send a bit of friendly trash talk to the table — your message pops up
          as a speech bubble for everyone to see.
        </Tool>
        <Tool name="Menu">
          Open the in-game menu to review your options or leave the current
          game.
        </Tool>
      </div>
    </div>
  );
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("rules");

  const tabBar = (
    <div className="flex gap-1 rounded-full bg-slate-100 p-1">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-ink text-white shadow-sm"
                : "text-slate-500 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <Modal
      title="How to Play"
      onClose={onClose}
      subheader={tabBar}
      maxWidthClassName="max-w-2xl"
    >
      {activeTab === "rules" ? <RulesTab /> : <ToolsTab />}
    </Modal>
  );
}
