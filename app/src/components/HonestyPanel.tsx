export function HonestyPanel() {
  return (
    <section className="honesty" aria-label="What this is">
      <div>
        <h3>What this is</h3>
        <p>
          A mechanical read of a price series: the slope of an exponential moving average, the
          sequence of swing highs and lows, and whether the latest close has broken the most
          recent swing. The chart, the numbers, and the words all come from the same calculation.
        </p>
      </div>
      <div>
        <h3>What this isn&rsquo;t</h3>
        <p>
          Not advice, not a prediction, not a signal. The confidence figure is how strongly those
          three inputs agree with each other &mdash; not a probability that price goes anywhere.
          Market data can be delayed, adjusted, or wrong. Decide for yourself.
        </p>
      </div>
    </section>
  );
}
