import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy · Designator",
  description:
    "What Designator collects (very little), why, and how to get it removed.",
};

const CONTACT = "designatorapp@gmail.com";
const UPDATED = "6 November 2026";

export default function PrivacyPage() {
  return (
    <div className="site-container pt-14 pb-24">
      <article className="max-w-[760px]">
        <p className="font-pixel text-[12px] uppercase tracking-[0.16em] text-accent mb-3">
          Privacy
        </p>
        <h1 className="font-heading text-[2.4rem] sm:text-[3rem] leading-[1.02] text-ink">
          Small site, small footprint.
        </h1>
        <p className="mt-4 text-[14px] text-ink-subtle font-sans">
          Last updated {UPDATED}
        </p>

        <Section title="The short version">
          <Prose>
            <p>
              Designator has no accounts and no ads, and never sells or shares
              your data. If you subscribe, I keep your email address so I can
              send the daily digest. I also use two analytics tools to see how
              the site is used, so I can make it better.
            </p>
          </Prose>
        </Section>

        <Section title="If you subscribe">
          <Prose>
            <p>
              Your email address is stored in Designator&apos;s own database
              (hosted on Supabase), along with when you subscribed. It is used
              only to send the daily digest and a one-time welcome email. Emails
              are delivered through Resend.
            </p>
            <p>
              Every email has a one-click unsubscribe link. After you
              unsubscribe, your address is kept marked as unsubscribed so you
              are never emailed again by mistake. To have it deleted completely,
              email {CONTACT}.
            </p>
          </Prose>
        </Section>

        <Section title="Analytics">
          <Prose>
            <p>
              <strong className="text-ink">Google Analytics</strong> counts page
              views and gives rough information like country, device and how
              you found the site.
            </p>
            <p>
              <strong className="text-ink">Microsoft Clarity</strong> records
              sessions (clicks, scrolling and page movement) and
              builds heatmaps, so I can spot confusing or broken parts of the
              site. Text you type into fields is masked and not recorded.
            </p>
            <p>
              Both tools set cookies in your browser. You can block them with
              your browser settings or a content blocker, and the site works
              exactly the same.
            </p>
          </Prose>
        </Section>

        <Section title="Feedback">
          <Prose>
            <p>
              The feedback widget sends your rating and any comment you write to
              the Designator inbox. It does not collect your name or email, so
              please don&apos;t include personal details you don&apos;t want to
              share.
            </p>
          </Prose>
        </Section>

        <Section title="Everything else">
          <Prose>
            <p>
              Your light or dark theme choice is saved in your own browser, not
              on a server. Article images and the Product Hunt badge load
              directly from the publishers&apos; servers, which see your IP
              address like any website would. Designator is hosted on Vercel,
              which keeps standard short-lived server logs.
            </p>
            <p>
              Articles link out to other sites, which have their own privacy
              policies.
            </p>
          </Prose>
        </Section>

        <Section title="Contact">
          <Prose>
            <p>
              Questions, or want your data removed? Email{" "}
              <a href={`mailto:${CONTACT}`} className="text-accent hover:underline">
                {CONTACT}
              </a>
              .
            </p>
          </Prose>
        </Section>

        <Link
          href="/"
          className="inline-block mt-16 text-[13px] font-medium text-accent hover:underline"
        >
          ← Back to today&apos;s edition
        </Link>
      </article>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-[16px] leading-relaxed text-ink-muted">
      {children}
    </div>
  );
}

/** Same section shape as the About page: pixel divider + Pixelify heading. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-12">
      <div
        className="h-1 w-12 mb-4"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--color-accent) 0 6px, transparent 6px 12px)",
        }}
        aria-hidden
      />
      <h2 className="font-pixel text-[13px] uppercase tracking-[0.16em] text-ink mb-5">
        {title}
      </h2>
      {children}
    </section>
  );
}
