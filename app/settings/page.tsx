import type { Metadata } from "next";
import { OwnModelSettings } from "@/components/OwnModelSettings";
import { shell } from "@/components/ui";

export const metadata: Metadata = {
  title: "Settings",
  description: "Use your own AI model for Causius analyses.",
};

export default function SettingsPage() {
  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <h1 className="font-heading text-4xl font-semibold tracking-display">Settings</h1>

      <section id="ai" aria-labelledby="ai-title" className="mt-10 scroll-mt-8">
        <h2 id="ai-title" className="font-heading text-2xl font-semibold">
          Your own model
        </h2>
        <div className="mt-3 grid max-w-prose gap-3 leading-relaxed text-fg-secondary">
          <p>
            Without a key, Causius reads letters with free shared models. They have a small daily
            budget that every visitor draws on, and they are not the strongest available.
          </p>
          <p>
            A legal letter deserves the best reading you can give it. Connect an API key from a
            provider below and your analyses run on the strongest model that key can use, on your
            own budget. The key is kept in this browser only: it is sent with each analysis to
            reach your provider and is never stored by Causius.
          </p>
          <p>
            Use an API key, ideally one with a spending cap. Causius never asks for a subscription
            login such as Claude Pro or ChatGPT Plus.
          </p>
        </div>
        <div className="mt-8">
          <OwnModelSettings />
        </div>
      </section>
    </main>
  );
}
