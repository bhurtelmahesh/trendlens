export function HonestyPanel() {
  return (
    <section className="honesty" aria-label="What this is">
      <div>
        <h2>What this is</h2>
        <p>
          A mechanical read of a price series: the slope of an exponential moving average, the
          sequence of swing highs and lows, and whether the latest close has broken the most
          recent swing. The chart, the numbers, and the words all come from the same calculation.
        </p>
      </div>
      <div>
        <h2>What this isn&rsquo;t</h2>
        <p>
          Not advice, not a prediction, not a signal. The confidence figure is an agreement score between the inputs — and it is about whichever verdict is shown, so on a &ldquo;no clean trend&rdquo; read it measures how clearly there is no direction, not how likely a move is.
          Market data can be delayed, adjusted, or wrong. Decide for yourself.
        </p>
      </div>
    </section>
  );
}
