import { useRef } from 'react';

export function Legal() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <footer className="footer">
      <span>TrendLens &mdash; a mechanical read, not advice.</span>
      {/* BASE_URL-aware: the GitHub Pages copy is served under /trendlens/. */}
      <a className="linklike" href={`${import.meta.env.BASE_URL}guide/`}>
        Tutorial
      </a>
      <button type="button" className="linklike" onClick={() => dialogRef.current?.showModal()}>
        Privacy &amp; terms
      </button>

      <dialog ref={dialogRef} className="legal-dialog" aria-labelledby="legal-title">
        <div className="legal-body">
          <div className="legal-head">
            <h2 id="legal-title">Privacy &amp; terms</h2>
            <button
              type="button"
              className="linklike"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
            >
              Close
            </button>
          </div>

          <h3>Privacy</h3>
          <p>
            TrendLens has no accounts, sets no cookies, and runs no analytics or trackers. Nothing
            you enter is stored. The only request the app makes is to its own market-data proxy (a
            Cloudflare Worker at <code>trendlens-api.chartlens101.workers.dev</code>): the ticker,
            market, and interval you choose are sent there and forwarded to a third-party
            market-data provider &mdash; Yahoo Finance, or merolagani.com for NEPSE symbols &mdash;
            to fetch prices. Cloudflare may keep short-lived request logs (IP, timestamp, path) for
            abuse prevention. No personal data is collected, sold, or shared.
          </p>

          <h3>Terms &amp; disclaimer</h3>
          <p>
            TrendLens is provided <strong>as-is</strong>, with no warranty, for informational and
            educational use only.
          </p>
          <ul>
            <li>
              It is <strong>not financial, investment, or trading advice</strong>, and nothing
              here is a recommendation or a prediction. The &ldquo;confidence&rdquo; figure is a
              mechanical agreement score across three indicators &mdash; not a probability that
              price does anything.
            </li>
            <li>
              The long/short zones are <strong>geometry, not entry or exit signals</strong>: thirds
              of the most recent swing range, plus the level that ends that structure and the far
              side it runs to. No position, size, stop, or target is implied or recommended.
            </li>
            <li>
              Market data comes from a third party (Yahoo Finance, or merolagani.com for NEPSE
              symbols) and may be delayed, adjusted, incomplete, or wrong. Verify independently
              before relying on it.
            </li>
            <li>
              You are solely responsible for any decision you make. The authors accept no
              liability for losses arising from use of this tool.
            </li>
          </ul>
          <p>By using TrendLens you accept these terms.</p>
        </div>
      </dialog>
    </footer>
  );
}
