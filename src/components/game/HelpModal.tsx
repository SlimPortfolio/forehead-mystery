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
  return <p className="mt-3 text-sm leading-relaxed text-slate-500">{children}</p>;
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
        The goal of Forehead Mystery is to correctly identify your own hidden
        card before the round is out. You can see everyone else&apos;s card but
        your own — read the table, rank yourself, and deduce what you&apos;re
        holding.
      </Lead>

      <Section number={1} title="The Setup">
        <p>
          Every player is dealt a single card that stays hidden from them but
          is visible to everyone else at the table.
        </p>
        <BulletList
          items={[
            "You see all other players' cards, never your own.",
            "Cards range from Ace (low) through King (high).",
            "Each game deals a fresh hand to every player.",
            "Play continues until every card is identified.",
          ]}
        />
      </Section>

      <Section number={2} title="The Ranking Phase">
        <p>
          On your turn, estimate where your hidden card ranks against the cards
          you can see and lock in a guess for its position.
        </p>
      </Section>

      <Section number={3} title="The Guessing Phase">
        <p>
          When it&apos;s your turn to guess, name the exact card you think is
          on your forehead. Guess correctly and you&apos;re identified for the
          round.
        </p>
        <Note>
          Note: This is a styled starter template — replace this copy with your
          own rules whenever you&apos;re ready.
        </Note>
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
